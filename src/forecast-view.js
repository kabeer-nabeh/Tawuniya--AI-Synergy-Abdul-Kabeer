// UC02 Forecasts: overview, drivers, breakdown, watch list, project detail and scenarios.
import { AS_OF, RUN, RUN_META, PREVIOUS_AS_OF, BACKTEST_FROM, forecastProjectsFor, baselineFor, previousFor, backtestFor, scenarioFor, summaryFor, whatIfFor } from './forecast-data.js';
import { PLAN, RUNS, OUTCOME_THRESHOLDS, MIN_HISTORY, ti, indexHistory, weights, monthsBetween, classify, detectPatterns } from './forecast-model.js';
import { alertsFor, toCsv, DEFAULT_RULES } from './forecast-insights.js';

export const freshForecast = () => ({
  outcome: null, driver: null, group: null, groupBy: 'sector', sort: 'chance', showAll: false, method: false, trend: false,
  selected: null, scenarios: {}, draft: { type: 'index', index: 'pi', delta: 0.5, months: 3 },
  view: 'all', hidden: [], whatIf: { target: 'all', values: {} },
  measure: 'ipi', horizon: 'end', preview: 'normal', accuracy: false,
  alertFilter: 'all', alertsAll: false, reviewed: [], showReviewed: false, rules: { chanceDrop: 15, improvements: true, patterns: true }, following: [], saved: [],
});
export const MAX_SCENARIOS = 3;
export const PAGE_SIZE = 10;

const INDEX = {
  ti: { name: ['Schedule', 'الجدول الزمني'], abbr: 'TI', hint: ['Combines progress vs plan (80%) and start delay (20%).', 'يجمع التقدم مقابل الخطة (80%) وتأخر البدء (20%).'] },
  pi: { name: ['Progress vs plan', 'التقدم مقابل الخطة'], abbr: 'PI', hint: ['Actual progress compared with planned progress.', 'الإنجاز الفعلي مقارنة بالإنجاز المخطط.'] },
  ai: { name: ['Start delay', 'تأخر البدء'], abbr: 'AI', hint: ['How late work started against the plan. Fixed once work starts.', 'مدى تأخر بدء العمل مقارنة بالخطة. ثابت بعد بدء العمل.'] },
  mi: { name: ['Deliverables', 'المخرجات'], abbr: 'MI', hint: ['Required project artifacts delivered on time.', 'تسليم مستندات المشروع المطلوبة في وقتها.'] },
  ci: { name: ['Cost', 'التكلفة'], abbr: 'CI', hint: ['Spend against the approved budget.', 'الإنفاق مقابل الميزانية المعتمدة.'] },
};
const OUTCOMES = {
  on: { label: ['On plan', 'ضمن الخطة'], icon: 'check-circle' },
  risk: { label: ['At risk', 'معرّض للخطر'], icon: 'warning' },
  below: { label: ['Below plan', 'دون الخطة'], icon: 'warning' },
};
const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

export function forecastUI({ t, icon, escape, account, fc }) {
  const L = pair => t(...pair);
  const ar = t('en', 'ar') === 'ar';
  const f2 = n => Number(n).toFixed(2);
  const pct = n => n > 0 && n < 0.01 ? '<1%' : n > 0.99 && n < 1 ? '>99%' : `${Math.round(n * 100)}%`;
  const signed = (n, digits = 2) => { const r = Number(Number(n).toFixed(digits)); return `${r > 0 ? '+' : r < 0 ? '−' : '±'}${Math.abs(r).toFixed(digits)}`; };
  const month = (ym, short = false) => { const [y, m] = ym.split('-').map(Number); const name = MONTHS[ar ? 'ar' : 'en'][m - 1]; return short ? `${name} ${String(y).slice(2)}` : `${name} ${y}`; };
  const plural = (n, one, many, arOne, arMany) => `${n} ${t(n === 1 ? one : many, n === 1 ? arOne : arMany)}`;
  const projectsLabel = n => plural(n, 'project', 'projects', 'مشروع', 'مشاريع');
  const outcomeBadge = outcome => `<span class="fc-badge ${outcome}">${icon(OUTCOMES[outcome].icon)}${L(OUTCOMES[outcome].label)}</span>`;
  const indexName = key => `${L(INDEX[key].name)} <abbr title="${L(INDEX[key].name)}">${INDEX[key].abbr}</abbr>`;

  const scoped = forecastProjectsFor(account);
  // The Projects menu narrows the page to a sector, portfolio or single project inside the account's scope.
  const [viewType, viewValue] = String(fc.view || 'all').split(/:(.*)/s);
  const viewed = viewType === 'project' ? scoped.filter(p => p.id === viewValue) : ['sector', 'portfolio'].includes(viewType) ? scoped.filter(p => p[viewType] === viewValue) : scoped;
  const projects = viewed.length ? viewed : scoped;
  const rows = projects.map(project => ({ project, result: baselineFor(project.id) }));
  const summary = summaryFor(projects);
  const okIds = rows.filter(r => r.result.status === 'ok').map(r => r.project.id);
  const whatIfTargets = okIds.includes(fc.whatIf?.target) ? [fc.whatIf.target] : okIds;
  const whatIf = whatIfFor(projects, whatIfTargets, fc.whatIf?.values);
  // A scope inside one sector (or portfolio) cannot be split by it, so offer only the grouping that has more than one group.
  const groupCount = key => new Set(projects.map(p => p[key])).size;
  const groupOptions = ['sector', 'portfolio'].filter(key => groupCount(key) > 1);
  const groupKey = groupOptions.includes(fc.groupBy) ? fc.groupBy : groupOptions[0] || 'sector';
  const groupLabel = project => L(groupKey === 'portfolio' ? project.portfolioLabel : project.sectorLabel);
  const hasFilters = Boolean(fc.outcome || fc.driver || fc.group);

  // ---------- Small SVG building blocks (charts keep left-to-right scale direction in both languages) ----------
  // Tracks use a zoomed 1.5–4.5 window around the plan line so ranges stay legible; values outside are pinned to the edge.
  const LO = 1.5, HI = 4.5;
  const x5 = (v, w, pad) => pad + ((Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO)) * (w - pad * 2);
  function track({ now, end, low, high, w = 150, h = 22, labels = false, label = '' }) {
    const pad = 5, y = labels ? 13 : h / 2;
    const band = low != null ? `<rect class="fc-band" x="${x5(low, w, pad)}" y="${y - 5}" width="${Math.max(2, x5(high, w, pad) - x5(low, w, pad))}" height="10" rx="5"/>` : '';
    const ticks = labels ? [2, 3, 4].map(v => `<text class="fc-axis" x="${x5(v, w, pad)}" y="${h - 1}" text-anchor="middle">${v}</text>`).join('') : '';
    return `<svg class="fc-track" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${escape(label)}" dir="ltr"><line class="fc-track-line" x1="${pad}" x2="${w - pad}" y1="${y}" y2="${y}"/><line class="fc-plan-tick" x1="${x5(PLAN, w, pad)}" x2="${x5(PLAN, w, pad)}" y1="${y - 8}" y2="${y + 8}"/>${band}${now != null ? `<circle class="fc-dot-now" cx="${x5(now, w, pad)}" cy="${y}" r="3.6"/>` : ''}<circle class="fc-dot-end ${end < PLAN ? 'below' : ''}" cx="${x5(end, w, pad)}" cy="${y}" r="4.2"/>${ticks}</svg>`;
  }
  function outcomeStack(counts, total, tall = false) {
    const parts = ['on', 'risk', 'below'].filter(k => counts[k]);
    return `<span class="fc-stack ${tall ? 'tall' : ''}" aria-hidden="true">${parts.map(k => `<span class="${k}" style="flex-grow:${counts[k]}"></span>`).join('') || '<span class="none" style="flex-grow:1"></span>'}</span>`;
  }
  function lineChart({ series, months, from = 0, to = 5, w = 680, h = 220, forecast = null, label }) {
    const left = 34, right = 14, top = 12, bottom = 26;
    const n = months.length;
    const x = i => left + (n <= 1 ? 0 : (i / (n - 1)) * (w - left - right));
    const y = v => top + (1 - (v - from) / (to - from)) * (h - top - bottom);
    const steps = to - from <= 2 ? 0.5 : 1;
    const grid = [];
    for (let v = from; v <= to + 1e-9; v += steps) grid.push(`<line class="fc-grid" x1="${left}" x2="${w - right}" y1="${y(v)}" y2="${y(v)}"/><text class="fc-axis" x="${left - 7}" y="${y(v) + 3}" text-anchor="end">${Number.isInteger(v) ? v : v.toFixed(1)}</text>`);
    const every = Math.max(1, Math.ceil(n / 7));
    const ticks = months.map((m, i) => (i % every === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= every / 2) ? `<text class="fc-axis" x="${x(i)}" y="${h - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${month(m, true)}</text>` : '').join('');
    const plan = `<line class="fc-plan-line" x1="${left}" x2="${w - right}" y1="${y(PLAN)}" y2="${y(PLAN)}"/><text class="fc-plan-label" x="${left + 4}" y="${y(PLAN) - 5}" text-anchor="start">${t('Plan', 'الخطة')} 3.0</text>`;
    let fan = '';
    if (forecast) {
      const start = forecast.startIndex;
      const area = (lo, hi) => `M${forecast.points.map((p, i) => `${x(start + i)},${y(p[hi])}`).join(' L')} L${forecast.points.map((p, i) => `${x(start + i)},${y(p[lo])}`).reverse().join(' L')} Z`;
      fan = `<rect class="fc-future" x="${x(start)}" y="${top}" width="${w - right - x(start)}" height="${h - top - bottom}"/><text class="fc-future-label" x="${x(start) + 6}" y="${top + 12}">${t('Forecast', 'التوقع')}</text><path class="fc-fan-80" d="${area('p10', 'p90')}"/><path class="fc-fan-50" d="${area('p25', 'p75')}"/><polyline class="fc-median" points="${forecast.points.map((p, i) => `${x(start + i)},${y(p.p50)}`).join(' ')}"/><circle class="fc-dot-end ${forecast.points.at(-1).p50 < PLAN ? 'below' : ''}" cx="${x(n - 1)}" cy="${y(forecast.points.at(-1).p50)}" r="4.5"/>`;
    }
    const lines = series.map(s => { const pts = s.values.map((v, i) => v == null ? null : `${x(i)},${y(v)}`).filter(Boolean); return pts.length ? `<polyline class="fc-series ${s.cls}" points="${pts.join(' ')}"/>` : ''; }).join('');
    return `<svg class="fc-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escape(label)}" dir="ltr">${grid.join('')}${fan}${plan}${lines}${ticks}</svg>`;
  }

  // ---------- Measure and horizon (the "lens" used by outlook, breakdown, table and what-if) ----------
  const MEASURES = { ipi: { name: ['IPI (overall)', 'IPI (الإجمالي)'], abbr: 'IPI' }, ti: INDEX.ti, pi: INDEX.pi, mi: INDEX.mi, ci: INDEX.ci };
  const HORIZONS = [['end', ['each project’s end date', 'تاريخ انتهاء كل مشروع']], ['2026-12', ['year-end 2026', 'نهاية عام 2026']], ['2027-03', ['end of Q1 2027', 'نهاية الربع الأول 2027']], ['2027-06', ['end of Q2 2027', 'نهاية الربع الثاني 2027']]];
  const measure = MEASURES[fc.measure] ? fc.measure : 'ipi';
  const horizon = HORIZONS.some(h => h[0] === fc.horizon) ? fc.horizon : 'end';
  const defaultLens = measure === 'ipi' && horizon === 'end';
  const mName = measure === 'ipi' ? 'IPI' : L(MEASURES[measure].name);
  const hName = L(HORIZONS.find(h => h[0] === horizon)[1]);
  const atLabel = horizon === 'end' ? t('at end', 'عند الانتهاء') : month(horizon);
  function lens(result) {
    if (!result || result.status !== 'ok') return null;
    if (defaultLens) return { p10: result.forecast.ipi.p10, p50: result.forecast.ipi.p50, p90: result.forecast.ipi.p90, chance: result.chance, outcome: result.outcome, month: result.end, now: result.now.ipi, ended: false };
    if (!result.monthly) return null;
    const i = horizon === 'end' ? result.monthly.length - 1 : Math.max(0, Math.min(result.monthly.length - 1, monthsBetween(AS_OF, horizon)));
    const s = result.monthly[i][measure];
    if (!s) return null;
    return { ...s, outcome: classify(s.chance), month: result.monthly[i].month, now: result.now[measure], ended: horizon !== 'end' && monthsBetween(result.end, horizon) > 0 };
  }
  function lensSummary(results) {
    const vals = results.map(lens).filter(Boolean);
    const counts = { on: 0, risk: 0, below: 0 };
    vals.forEach(v => counts[v.outcome]++);
    const mean = fn => vals.length ? vals.reduce((s, v) => s + fn(v), 0) / vals.length : 0;
    return { n: vals.length, counts, chance: mean(v => v.chance), now: mean(v => v.now), p50: mean(v => v.p50), p10: mean(v => v.p10), p90: mean(v => v.p90), excluded: results.length - vals.length, noCost: measure === 'ci' ? results.filter(r => r?.status === 'ok' && !r.hasCost).length : 0 };
  }
  const lensAll = lensSummary(rows.map(r => r.result));
  function lensControls() {
    const sel = (id, options, value, label) => `<label class="fc-lens-select"><span class="sr-only">${label}</span><select id="${id}">${options.map(([v, l]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${escape(l)}</option>`).join('')}</select>${icon('chevron')}</label>`;
    return `<div class="fc-lens" role="group" aria-label="${t('What to forecast', 'ما الذي يتم توقعه')}"><span>${t('Forecast', 'توقع')}</span>${sel('fc-measure', Object.entries(MEASURES).map(([k, m]) => [k, k === 'ipi' ? L(m.name) : `${L(m.name)} (${m.abbr})`]), measure, t('Measure', 'المقياس'))}<span>${t('at', 'عند')}</span>${sel('fc-horizon', HORIZONS.map(([k, l]) => [k, L(l)]), horizon, t('Horizon', 'الأفق'))}${defaultLens ? '' : `<button class="text-button" data-action="fc-lens-reset">${t('Back to IPI at end date', 'العودة إلى IPI عند الانتهاء')}</button>`}</div>`;
  }

  // ---------- Run bar, method and service states ----------
  function runBar() {
    const busy = fc.preview === 'loading';
    return `<div class="fc-runbar"><span>${icon('history')}${t('As of', 'حتى')} ${month(AS_OF)}</span><span>${icon('refresh')}${busy ? t('Calculating…', 'جارٍ الحساب…') : t(`Synergy data synced ${dayLabel(RUN_META.synced)}`, `مزامنة بيانات سينرجي ${dayLabel(RUN_META.synced)}`)}</span><span>${icon('chart')}${RUNS.toLocaleString('en')} ${t('simulated futures per project', 'مستقبل محاكى لكل مشروع')}</span><span class="fc-sample">${t('Sample data · illustrative model', 'بيانات تجريبية · نموذج توضيحي')}</span><button class="text-button" data-action="fc-method" aria-expanded="${fc.method}" aria-controls="fc-method">${icon('help')}${t('How this forecast works', 'كيف يعمل هذا التوقع')}</button></div>${fc.method ? method() : ''}${lensControls()}`;
  }
  function dayLabel(ymd) { const [y, m, d] = ymd.split('-').map(Number); return `${d} ${MONTHS[ar ? 'ar' : 'en'][m - 1]} ${y}`; }
  function method() {
    const states = [['normal', t('Normal', 'عادي')], ['loading', t('Calculating', 'جارٍ الحساب')], ['stale', t('Out-of-date run', 'تشغيل قديم')], ['partial', t('Partial data', 'بيانات ناقصة')], ['error', t('Service unavailable', 'الخدمة غير متاحة')]];
    return `<section class="fc-method" id="fc-method" aria-label="${t('How this forecast works', 'كيف يعمل هذا التوقع')}"><div><h3>${t('What is forecast', 'ما الذي يتم توقعه')}</h3><p>${t('Each project’s IPI (integrated performance index) and its parts, by month to its end date. Every index runs from 0 to 5, and 3 means on plan. Use “Forecast … at …” to change the measure and the date.', 'مؤشر الأداء المتكامل (IPI) لكل مشروع ومكوناته، شهريًا حتى تاريخ انتهائه. يتراوح كل مؤشر من 0 إلى 5، وتعني القيمة 3 أنه ضمن الخطة. استخدم "توقع … عند …" لتغيير المقياس والتاريخ.')}</p><p class="fc-formula" dir="ltr">IPI = 50% TI + 25% MI + 25% CI · ${t('without cost data', 'دون بيانات تكلفة')}: 75% TI + 25% MI<br>TI = 80% PI + 20% AI</p></div><div><h3>${t('How', 'الطريقة')}</h3><p>${t(`The model continues each project’s recent progress pace and index trends, ${RUNS.toLocaleString('en')} times with random variation. The middle result is the forecast; the 80% range covers the middle 80% of results. Early warnings compare this run with the ${month(PREVIOUS_AS_OF)} run and look for patterns in recent months.`, `يواصل النموذج وتيرة التقدم واتجاهات المؤشرات الأخيرة لكل مشروع، ${RUNS.toLocaleString('en')} مرة مع تباين عشوائي. النتيجة الوسطى هي التوقع، ويغطي نطاق 80% النتائج الوسطى. تقارن الإنذارات المبكرة هذا التشغيل بتشغيل ${month(PREVIOUS_AS_OF)} وتبحث عن أنماط في الأشهر الأخيرة.`)}</p></div><div><h3>${t('Outcome groups', 'فئات النتيجة')}</h3><p>${t(`On plan: at least ${pct(OUTCOME_THRESHOLDS.on)} of futures are at 3 or above. At risk: ${pct(OUTCOME_THRESHOLDS.risk)}–${Math.round(OUTCOME_THRESHOLDS.on * 100) - 1}%. Below plan: under ${pct(OUTCOME_THRESHOLDS.risk)}. Projects with under ${MIN_HISTORY} months of history are not forecast.`, `ضمن الخطة: ${pct(OUTCOME_THRESHOLDS.on)} على الأقل من النتائج عند 3 أو أعلى. معرّض للخطر: ${pct(OUTCOME_THRESHOLDS.risk)}–${Math.round(OUTCOME_THRESHOLDS.on * 100) - 1}%. دون الخطة: أقل من ${pct(OUTCOME_THRESHOLDS.risk)}. لا يتم توقع المشاريع التي لديها أقل من ${MIN_HISTORY} أشهر من البيانات.`)}</p></div><div class="fc-preview-states"><h3>${t('Preview service states', 'معاينة حالات الخدمة')}</h3><p>${t('For design review only. Shows how the page behaves when the forecasting service is busy, out of date or unavailable.', 'لمراجعة التصميم فقط. يوضح سلوك الصفحة عندما تكون خدمة التوقع مشغولة أو قديمة أو غير متاحة.')}</p><div class="fc-options" role="group" aria-label="${t('Service state', 'حالة الخدمة')}">${states.map(([v, l]) => `<button data-action="fc-preview" data-value="${v}" aria-pressed="${(fc.preview || 'normal') === v}">${l}</button>`).join('')}</div></div><p class="fc-method-note">${icon('shield')}${t(`${L(RUN.model)} · run ${RUN.id} · previous run ${RUN_META.previousId}. Thresholds and plain-language index names are working assumptions to confirm with EPMO. In production, forecasts come from the forecasting service through the approved model gateway and Corporater APIs. Forecasts are advisory and do not change any project plan.`, `${L(RUN.model)} · التشغيل ${RUN.id} · التشغيل السابق ${RUN_META.previousId}. الحدود وأسماء المؤشرات افتراضات عمل تحتاج إلى تأكيد من مكتب إدارة المشاريع. في الإنتاج، تأتي التوقعات من خدمة التوقع عبر بوابة النموذج المعتمدة وواجهات Corporater. التوقعات استشارية ولا تغيّر أي خطة مشروع.`)}</p></section>`;
  }
  function stateBanner() {
    if (fc.preview === 'stale') return `<div class="fc-banner warning" role="status">${icon('warning')}<div><strong>${t('Synergy data changed after this forecast was calculated', 'تغيّرت بيانات سينرجي بعد حساب هذا التوقع')}</strong><p>${t(`New monthly results arrived on 9 November 2026. This forecast still uses data synced on ${dayLabel(RUN_META.synced)}, so some numbers may be out of date.`, `وصلت نتائج شهرية جديدة في 9 نوفمبر 2026. لا يزال هذا التوقع يستخدم بيانات تمت مزامنتها في ${dayLabel(RUN_META.synced)}، لذا قد تكون بعض الأرقام قديمة.`)}</p></div><button class="secondary-button" data-action="fc-preview" data-value="normal">${icon('refresh')}${t('Recalculate forecast', 'إعادة حساب التوقع')}</button></div>`;
    if (fc.preview === 'partial') return `<div class="fc-banner info" role="status">${icon('help')}<div><strong>${t('Some cost data was not available', 'بعض بيانات التكلفة غير متاحة')}</strong><p>${t('Cost (CI) could not be loaded for 6 projects in this run. They are forecast without cost, so schedule weighs 75% of their IPI. Other results are complete.', 'تعذّر تحميل التكلفة (CI) لـ 6 مشاريع في هذا التشغيل. تُتوقع دون تكلفة، لذا يزن الجدول الزمني 75% من IPI. النتائج الأخرى مكتملة.')}</p></div></div>`;
    return '';
  }
  function loadingState() {
    return `<div class="fc-loading" aria-busy="true" role="status"><p>${icon('refresh')}${t(`Calculating forecasts for ${projectsLabel(rows.length)}. This usually takes under a minute.`, `جارٍ حساب التوقعات لـ ${projectsLabel(rows.length)}. يستغرق ذلك عادةً أقل من دقيقة.`)}</p><div class="fc-skeleton tall"></div><div class="fc-skeleton-row"><div class="fc-skeleton"></div><div class="fc-skeleton"></div></div><div class="fc-skeleton chart"></div></div>`;
  }
  function errorState() {
    return `<div class="fc-card fc-error" role="alert">${icon('warning')}<h2>${t('The forecasting service is not responding', 'خدمة التوقع لا تستجيب')}</h2><p>${t(`Your Synergy data and project scope are fine; the forecasting service did not return results. Try again in a few minutes. The ${month(PREVIOUS_AS_OF)} run is still available to Synergy reports.`, `بيانات سينرجي ونطاق مشاريعك سليمة؛ لكن خدمة التوقع لم تُرجع نتائج. حاول مرة أخرى بعد بضع دقائق. لا يزال تشغيل ${month(PREVIOUS_AS_OF)} متاحًا لتقارير سينرجي.`)}</p><div class="fc-error-actions"><button class="primary-button" data-action="fc-preview" data-value="normal">${icon('refresh')}${t('Try again', 'حاول مرة أخرى')}</button><small>${t('Reference: FC-SVC-503 · 11 Nov 2026 10:42', 'المرجع: FC-SVC-503 · 11 نوفمبر 2026 10:42')}</small></div></div>`;
  }

  // ---------- 1. Outlook ----------
  function outlook() {
    const { counts, n } = lensAll;
    const single = rows.length === 1 && lens(rows[0].result) ? rows[0] : null;
    const sl = single && lens(single.result);
    const where = defaultLens ? '' : t(` on ${mName} by ${hName}`, ` في ${mName} بحلول ${hName}`);
    const headline = single ? t(`<strong class="${sl.outcome}">${L(single.project.name)}</strong> is ${{ on: 'forecast on plan', risk: 'at risk of falling below plan', below: 'forecast below plan' }[sl.outcome]}${where || ' at its end date'}.`, `<strong class="${sl.outcome}">${L(single.project.name)}</strong> ${{ on: 'متوقع ضمن الخطة', risk: 'معرّض لخطر الانخفاض دون الخطة', below: 'متوقع دون الخطة' }[sl.outcome]}${where || ' عند تاريخ انتهائه'}.`)
      : counts.below ? (defaultLens ? t(`<strong>${counts.below} of ${n}</strong> projects are forecast to finish below plan.`, `من المتوقع أن ينتهي <strong>${counts.below} من ${n}</strong> مشاريع دون الخطة.`) : t(`<strong>${counts.below} of ${n}</strong> projects are forecast below plan${where}.`, `من المتوقع أن يكون <strong>${counts.below} من ${n}</strong> مشاريع دون الخطة${where}.`))
      : counts.risk ? t(`No project is forecast below plan${where}, but <strong>${counts.risk}</strong> ${counts.risk === 1 ? 'is' : 'are'} at risk.`, `لا يُتوقع أي مشروع دون الخطة${where}، لكن <strong>${counts.risk}</strong> معرّضة للخطر.`)
      : t(`All <strong>${n}</strong> forecast projects are on plan${where}.`, `جميع المشاريع المتوقعة وعددها <strong>${n}</strong> ضمن الخطة${where}.`);
    const sub = single ? `${t(`${pct(sl.chance)} chance of being on plan by ${month(sl.month)}.`, `فرصة ${pct(sl.chance)} لأن يكون ضمن الخطة بحلول ${month(sl.month)}.`)} <button class="text-button fc-inline-open" data-action="forecast-open" data-id="${single.project.id}">${t('Open project forecast', 'فتح توقع المشروع')}${icon('right')}</button>` : [counts.below && counts.risk ? t(`${counts.risk} more ${counts.risk === 1 ? 'is' : 'are'} at risk.`, `و${counts.risk} أخرى معرّضة للخطر.`) : '', t(`On average, a project has a ${pct(lensAll.chance)} chance of being on plan.`, `في المتوسط، لدى المشروع فرصة ${pct(lensAll.chance)} لأن يكون ضمن الخطة.`)].filter(Boolean).join(' ');
    const legend = ['below', 'risk', 'on'].map(k => `<button class="fc-legend-item ${k}" data-action="fc-outcome" data-value="${k}" aria-pressed="${fc.outcome === k}" ${counts[k] ? '' : 'disabled'}><span class="fc-swatch ${k}"></span><strong>${counts[k]}</strong>${L(OUTCOMES[k].label)}<small>${n ? Math.round(counts[k] / n * 100) : 0}%</small></button>`).join('');
    const range = defaultLens ? { now: summary.now, p10: summary.end.p10, p50: summary.end.p50, p90: summary.end.p90 } : { now: lensAll.now, p10: lensAll.p10, p50: lensAll.p50, p90: lensAll.p90 };
    const delta = range.p50 - range.now;
    const notes = [summary.insufficient ? t(`${projectsLabel(summary.insufficient)} not forecast: under ${MIN_HISTORY} months of history.`, `${projectsLabel(summary.insufficient)} دون توقع: أقل من ${MIN_HISTORY} أشهر من البيانات.`) : '', lensAll.noCost ? t(`${projectsLabel(lensAll.noCost)} without cost data are left out of the cost forecast.`, `${projectsLabel(lensAll.noCost)} دون بيانات تكلفة مستبعدة من توقع التكلفة.`) : '', horizon !== 'end' ? t('Projects that end before this date are shown at their end date.', 'تُعرض المشاريع التي تنتهي قبل هذا التاريخ عند تاريخ انتهائها.') : ''].filter(Boolean);
    return `<section class="fc-card fc-outlook" aria-labelledby="fc-outlook-title"><div class="fc-outlook-main"><p class="dv-eyebrow">${defaultLens ? t('OUTLOOK AT PROJECT END DATES', 'النظرة عند تواريخ انتهاء المشاريع') : t(`OUTLOOK · ${mName.toUpperCase()} AT ${hName.toUpperCase()}`, `النظرة · ${mName} عند ${hName}`)}</p><h2 id="fc-outlook-title" class="fc-headline">${headline}</h2><p class="fc-sub">${sub}</p>${outcomeStack(counts, n, true)}<div class="fc-legend" role="group" aria-label="${t('Filter projects by outcome', 'تصفية المشاريع حسب النتيجة')}">${legend}</div>${notes.map(x => `<p class="fc-footnote">${icon('history')}${x}</p>`).join('')}</div><div class="fc-outlook-ipi"><p class="dv-eyebrow">${t(`AVERAGE ${mName.toUpperCase()}`, `متوسط ${mName}`)}</p><div class="fc-ipi-values"><span><small>${t('Now', 'الآن')}</small><b>${f2(range.now)}</b></span><span class="fc-arrow" aria-hidden="true">${icon('right')}</span><span><small>${horizon === 'end' ? t('At end dates', 'عند الانتهاء') : month(horizon)}</small><b class="${range.p50 < PLAN ? 'below' : 'on'}">${f2(range.p50)}</b></span></div>${track({ now: range.now, end: range.p50, low: range.p10, high: range.p90, w: 240, h: 34, labels: true, label: t(`Average ${mName} ${f2(range.now)} now, forecast ${f2(range.p50)}, 80% range ${f2(range.p10)} to ${f2(range.p90)}. Plan is 3.`, `متوسط ${mName} الآن ${f2(range.now)}، والتوقع ${f2(range.p50)}، ونطاق 80% من ${f2(range.p10)} إلى ${f2(range.p90)}. الخطة 3.`) })}<p class="fc-note">${t(`${signed(delta)} · 80% range ${f2(range.p10)}–${f2(range.p90)}${defaultLens ? '' : ' (average of project ranges)'} · plan is 3.00`, `${signed(delta)} · نطاق 80% ${f2(range.p10)}–${f2(range.p90)}${defaultLens ? '' : ' (متوسط نطاقات المشاريع)'} · الخطة 3.00`)}</p><p class="fc-key"><span><i class="fc-key-now"></i>${t('Now', 'الآن')}</span><span><i class="fc-key-end"></i>${t('Forecast', 'التوقع')}</span><span><i class="fc-key-band"></i>${t('80% range', 'نطاق 80%')}</span></p></div></section>`;
  }

  // ---------- 2. Drivers ----------
  function driverRow({ key, now, end, weight, count, interactive = true, child = false, note = '' }) {
    const tag = interactive ? 'button' : 'div';
    const attrs = interactive ? `data-action="fc-driver" data-value="${key}" aria-pressed="${fc.driver === key}" ${count ? '' : 'disabled'}` : '';
    const label = t(`${L(INDEX[key].name)}: ${f2(now)} now, ${f2(end)} forecast. Plan is 3.`, `${L(INDEX[key].name)}: ${f2(now)} الآن، و${f2(end)} متوقع. الخطة 3.`);
    return `<${tag} class="fc-driver-row ${child ? 'child' : ''} ${interactive ? '' : 'static'}" ${attrs}><span class="fc-driver-name"><strong>${indexName(key)}</strong><small>${note || L(INDEX[key].hint)}</small></span><span class="fc-driver-track">${track({ now, end, label })}</span><span class="fc-driver-values"><span>${f2(now)}</span>${icon('right')}<b class="${end < PLAN ? 'below' : 'on'}">${f2(end)}</b></span><span class="fc-driver-weight">${weight}</span>${interactive ? `<span class="fc-driver-count">${count ? t(`Main driver · ${count}`, `العامل الرئيسي · ${count}`) : t('Not a main driver', 'ليس عاملًا رئيسيًا')}</span>` : '<span class="fc-driver-count"></span>'}</${tag}>`;
  }
  function drivers() {
    const idx = summary.indices, d = summary.drivers;
    const top = Object.entries(d).sort((a, b) => b[1] - a[1])[0];
    const insight = top && top[1] ? t(`<strong>${L(INDEX[top[0]].name)}</strong> is the main reason for ${top[1]} of the ${projectsLabel(summary.counts.risk + summary.counts.below)} at risk or below plan. Select a driver to see them.`, `<strong>${L(INDEX[top[0]].name)}</strong> هو السبب الرئيسي لـ ${top[1]} من ${projectsLabel(summary.counts.risk + summary.counts.below)} معرّضة للخطر أو دون الخطة. اختر عاملًا لعرضها.`) : t('Every forecast project is on plan.', 'جميع المشاريع المتوقعة ضمن الخطة.');
    const costNote = idx.ci.coverage < summary.forecast ? t(`${idx.ci.coverage} of ${summary.forecast} projects report cost. Without cost, schedule weighs 75%.`, `${idx.ci.coverage} من ${summary.forecast} مشاريع تُبلغ عن التكلفة. دون التكلفة، يزن الجدول الزمني 75%.`) : '';
    return `<section class="fc-card fc-drivers-card" aria-labelledby="fc-drivers-title"><div class="dv-section-heading"><h2 id="fc-drivers-title">${t('What drives the outlook', 'ما الذي يحرك النظرة المستقبلية')}</h2><span>${t('Average now → at end dates', 'المتوسط الآن ← عند الانتهاء')}</span></div><p class="fc-insight">${icon('idea')}<span>${insight}</span></p><div class="fc-drivers" role="group" aria-label="${t('Filter projects by main driver', 'تصفية المشاريع حسب العامل الرئيسي')}">${driverRow({ key: 'ti', now: idx.ti.now, end: idx.ti.end, weight: t('50% of IPI', '50% من IPI'), interactive: false })}${driverRow({ key: 'pi', now: idx.pi.now, end: idx.pi.end, weight: t('80% of TI', '80% من TI'), count: d.pi, child: true })}${driverRow({ key: 'ai', now: idx.ai.now, end: idx.ai.end, weight: t('20% of TI', '20% من TI'), count: d.ai, child: true })}${driverRow({ key: 'mi', now: idx.mi.now, end: idx.mi.end, weight: t('25% of IPI', '25% من IPI'), count: d.mi })}${idx.ci.coverage ? driverRow({ key: 'ci', now: idx.ci.now, end: idx.ci.end, weight: t('25% of IPI', '25% من IPI'), count: d.ci, note: costNote }) : ''}</div></section>`;
  }
  // ---------- 3. Breakdown ----------
  function breakdown() {
    const groups = [...new Set(projects.map(p => p[groupKey]))];
    if (projects.length <= 3 || groups.length < 2) return '';
    const items = groups.map(value => {
      const list = rows.filter(r => r.project[groupKey] === value);
      return { value, label: groupLabel(list[0].project), size: list.length, s: lensSummary(list.map(r => r.result)) };
    }).sort((a, b) => (a.s.n ? a.s.chance : 2) - (b.s.n ? b.s.chance : 2));
    return `<section class="fc-card fc-breakdown" aria-labelledby="fc-breakdown-title"><div class="dv-section-heading"><h2 id="fc-breakdown-title">${t('Breakdown', 'التوزيع')}</h2><div class="fc-segmented" role="group" aria-label="${t('Group by', 'التجميع حسب')}">${[['sector', t('Sector', 'القطاع')], ['portfolio', t('Portfolio', 'المحفظة')]].filter(([v]) => groupOptions.includes(v)).map(([v, l]) => `<button data-action="fc-groupby" data-value="${v}" aria-pressed="${groupKey === v}">${l}</button>`).join('')}</div></div><div class="fc-groups" role="group" aria-label="${t('Filter projects by group', 'تصفية المشاريع حسب المجموعة')}">${items.map(g => `<button class="fc-group-row" data-action="fc-group" data-value="${escape(g.value)}" aria-pressed="${fc.group === g.value}"><span class="fc-group-name"><strong>${g.label}</strong><small>${projectsLabel(g.size)}${g.s.excluded ? ` · ${g.s.excluded} ${t('not forecast', 'دون توقع')}` : ''}</small></span>${outcomeStack(g.s.counts, g.s.n)}<span class="fc-group-counts" aria-label="${t(`${g.s.counts.on} on plan, ${g.s.counts.risk} at risk, ${g.s.counts.below} below plan`, `${g.s.counts.on} ضمن الخطة، ${g.s.counts.risk} معرّض للخطر، ${g.s.counts.below} دون الخطة`)}">${g.s.counts.below}<small>${t('below', 'دون')}</small></span><span class="fc-group-chance"><b>${g.s.n ? pct(g.s.chance) : '—'}</b><small>${t('chance on plan', 'فرصة ضمن الخطة')}</small></span></button>`).join('')}</div></section>`;
  }

  // ---------- 4. Projects ----------
  const following = new Set(fc.following || []);
  function filteredRows() {
    const list = rows.filter(({ project, result }) => {
      const v = lens(result);
      if (fc.group && project[groupKey] !== fc.group) return false;
      if (fc.outcome && (!v || v.outcome !== fc.outcome)) return false;
      if (fc.driver && (result.status !== 'ok' || result.outcome === 'on' || result.mainDriver !== fc.driver)) return false;
      return true;
    });
    const key = { chance: r => lens(r.result).chance, forecast: r => lens(r.result).p50, end: r => monthsBetween(AS_OF, r.result.end), change: r => changeOf(r.project.id) ?? 0 }[fc.sort] || (r => lens(r.result).chance);
    const ok = list.filter(r => lens(r.result)).sort((a, b) => key(a) - key(b));
    return [...ok, ...list.filter(r => !lens(r.result))];
  }
  /** Change in chance of finishing on plan (IPI at end date) since the previous run, in percentage points. */
  function changeOf(id) {
    const now = baselineFor(id), prev = previousFor(id);
    return now?.status === 'ok' && prev?.status === 'ok' ? Math.round((now.chance - prev.chance) * 100) : null;
  }
  const changeCell = id => { const c = changeOf(id); if (c == null) return `<span class="fc-muted">${t('New', 'جديد')}</span>`; if (Math.abs(c) < 3) return `<span class="fc-change-pill">±0</span>`; return `<span class="fc-change-pill ${c > 0 ? 'up' : 'down'}" aria-label="${t(`${Math.abs(c)} points ${c > 0 ? 'higher' : 'lower'} than ${month(PREVIOUS_AS_OF)}`, `${Math.abs(c)} نقطة ${c > 0 ? 'أعلى' : 'أقل'} من ${month(PREVIOUS_AS_OF)}`)}">${c > 0 ? '▲' : '▼'} ${Math.abs(c)}</span>`; };
  function activeFilters() {
    const chips = [];
    if (fc.outcome) chips.push(['fc-outcome', fc.outcome, L(OUTCOMES[fc.outcome].label)]);
    if (fc.driver) chips.push(['fc-driver', fc.driver, t(`Main driver: ${L(INDEX[fc.driver].name)}`, `العامل الرئيسي: ${L(INDEX[fc.driver].name)}`)]);
    if (fc.group) { const p = projects.find(x => x[groupKey] === fc.group); if (p) chips.push(['fc-group', fc.group, groupLabel(p)]); }
    if (!chips.length) return '';
    return `<div class="fc-chips" role="group" aria-label="${t('Active filters', 'عوامل التصفية النشطة')}">${chips.map(([action, value, text]) => `<button class="fc-chip" data-action="${action}" data-value="${escape(value)}" aria-label="${t(`Remove filter ${text}`, `إزالة عامل التصفية ${text}`)}">${escape(text)}${icon('close')}</button>`).join('')}<button class="text-button" data-action="fc-clear">${t('Clear filters', 'مسح عوامل التصفية')}</button></div>`;
  }
  function projectRow({ project, result }) {
    const star = following.has(project.id) ? `<span class="fc-star" title="${t('Following', 'متابَع')}" aria-label="${t('Following', 'متابَع')}">★</span>` : '';
    const name = `<button class="fc-project-name" data-action="forecast-open" data-id="${project.id}"><strong>${star}${L(project.name)}</strong><small>${L(project.owner)} · ${groupLabel(project)}</small></button>`;
    if (result.status !== 'ok') return `<tr class="is-insufficient"><th scope="row">${name}</th><td>${month(project.end)}</td><td colspan="5" class="fc-muted">${icon('history')}${t(`Not forecast: ${result.months} of ${MIN_HISTORY} months of history needed`, `دون توقع: ${result.months} من ${MIN_HISTORY} أشهر مطلوبة من البيانات`)}</td><td class="fc-row-go">${icon('chevron')}</td></tr>`;
    const v = lens(result);
    if (!v) return `<tr class="is-insufficient"><th scope="row">${name}</th><td>${month(project.end)}</td><td colspan="5" class="fc-muted">${icon('help')}${t('No cost data reported for this project', 'لا توجد بيانات تكلفة لهذا المشروع')}</td><td class="fc-row-go">${icon('chevron')}</td></tr>`;
    const left = result.remaining;
    return `<tr><th scope="row">${name}</th><td><span class="fc-cell-main">${month(result.end)}</span><small>${plural(left, 'month left', 'months left', 'شهر متبقٍ', 'أشهر متبقية')}</small></td><td class="fc-num">${f2(v.now)}</td><td class="fc-forecast-cell">${track({ now: v.now, end: v.p50, low: v.p10, high: v.p90, w: 120, label: t(`Forecast ${f2(v.p50)}, 80% range ${f2(v.p10)} to ${f2(v.p90)}`, `التوقع ${f2(v.p50)}، ونطاق 80% من ${f2(v.p10)} إلى ${f2(v.p90)}`) })}<span><b>${f2(v.p50)}</b><small dir="ltr">${f2(v.p10)}–${f2(v.p90)}</small></span></td><td><span class="fc-cell-main">${pct(v.chance)}</span>${outcomeBadge(v.outcome)}</td><td>${changeCell(project.id)}</td><td>${result.mainDriver && result.outcome !== 'on' ? `<span class="fc-driver-tag">${L(INDEX[result.mainDriver].name)}</span>` : `<span class="fc-muted">${t('None', 'لا يوجد')}</span>`}</td><td class="fc-row-go">${icon('chevron')}</td></tr>`;
  }
  function projectsSection() {
    const list = filteredRows();
    const visible = fc.showAll ? list : list.slice(0, PAGE_SIZE);
    const sorts = [['chance', t('Chance on plan', 'فرصة ضمن الخطة')], ['forecast', t('Forecast', 'التوقع')], ['change', t('Biggest drop', 'أكبر انخفاض')], ['end', t('End date', 'تاريخ الانتهاء')]];
    return `<section class="fc-card fc-projects" aria-labelledby="fc-projects-title"><div class="dv-section-heading fc-projects-heading"><div><h2 id="fc-projects-title">${hasFilters ? t('Matching projects', 'المشاريع المطابقة') : t('Projects to watch', 'مشاريع تحتاج إلى متابعة')}</h2><p class="dv-helper">${t(`${projectsLabel(list.length)} · ${mName} ${atLabel}. Select a project for its forecast, drivers and scenarios.`, `${projectsLabel(list.length)} · ${mName} ${atLabel}. اختر مشروعًا لعرض توقعه وعوامله وسيناريوهاته.`)}</p></div><div class="fc-sort" role="group" aria-label="${t('Sort projects by', 'ترتيب المشاريع حسب')}"><span>${t('Sort', 'ترتيب')}</span>${sorts.map(([v, l]) => `<button data-action="fc-sort" data-value="${v}" aria-pressed="${fc.sort === v}">${l}</button>`).join('')}</div></div>${activeFilters()}${list.length ? `<div class="fc-table-wrap"><table class="fc-table"><caption class="sr-only">${t(`Project forecasts: ${mName} ${atLabel}`, `توقعات المشاريع: ${mName} ${atLabel}`)}</caption><thead><tr><th scope="col">${t('Project', 'المشروع')}</th><th scope="col">${t('End date', 'تاريخ الانتهاء')}</th><th scope="col" class="fc-num">${t(`${mName} now`, `${mName} الآن`)}</th><th scope="col">${t(`${mName} ${atLabel} · 80% range`, `${mName} ${atLabel} · نطاق 80%`)}</th><th scope="col">${t('Chance on plan', 'فرصة ضمن الخطة')}</th><th scope="col" title="${t('Change in chance of finishing on plan since the previous run', 'التغير في فرصة الانتهاء ضمن الخطة منذ التشغيل السابق')}">${t(`Since ${month(PREVIOUS_AS_OF, true)}`, `منذ ${month(PREVIOUS_AS_OF, true)}`)}</th><th scope="col">${t('Main driver', 'العامل الرئيسي')}</th><th scope="col"><span class="sr-only">${t('Open', 'فتح')}</span></th></tr></thead><tbody>${visible.map(projectRow).join('')}</tbody></table></div>${list.length > PAGE_SIZE ? `<button class="secondary-button fc-show-all" data-action="fc-show-all" aria-expanded="${fc.showAll}">${fc.showAll ? t('Show fewer', 'عرض أقل') : t(`Show all ${list.length}`, `عرض الكل (${list.length})`)}</button>` : ''}` : `<div class="dv-filter-empty">${t('No projects match these filters.', 'لا توجد مشاريع مطابقة لعوامل التصفية.')} <button class="text-button" data-action="fc-clear">${t('Clear filters', 'مسح عوامل التصفية')}</button></div>`}</section>`;
  }

  // ---------- Projects menu (scopes the whole page) ----------
  function viewSelect() {
    const option = (value, label) => `<option value="${escape(value)}" ${fc.view === value ? 'selected' : ''}>${escape(label)}</option>`;
    const groupsOf = key => [...new Set(scoped.map(p => p[key]))].map(value => { const list = scoped.filter(p => p[key] === value); return { value, label: L(key === 'portfolio' ? list[0].portfolioLabel : list[0].sectorLabel), n: list.length }; }).sort((a, b) => a.label.localeCompare(b.label));
    const group = (key, title) => { const g = groupsOf(key); return g.length > 1 ? `<optgroup label="${title}">${g.map(x => option(`${key}:${x.value}`, `${x.label} (${x.n})`)).join('')}</optgroup>` : ''; };
    return `<label class="fc-view-select"><span>${t('Projects', 'المشاريع')}</span><select id="fc-view">${option('all', t(`All my projects (${scoped.length})`, `جميع مشاريعي (${scoped.length})`))}${group('sector', t('Sector', 'القطاع'))}${group('portfolio', t('Portfolio', 'المحفظة'))}${scoped.length > 1 ? `<optgroup label="${t('Project', 'المشروع')}">${[...scoped].sort((a, b) => L(a.name).localeCompare(L(b.name))).map(p => option(`project:${p.id}`, L(p.name))).join('')}</optgroup>` : ''}</select>${icon('chevron')}</label>`;
  }

  // ---------- Main chart: monthly actuals and the forecast to end dates ----------
  const SERIES = [
    { key: 'ipi', label: () => 'IPI', name: () => t('IPI (overall)', 'IPI (الإجمالي)') },
    { key: 'ti', label: () => 'TI', name: () => L(INDEX.ti.name) },
    { key: 'mi', label: () => 'MI', name: () => L(INDEX.mi.name) },
    { key: 'ci', label: () => 'CI', name: () => L(INDEX.ci.name) },
  ];
  function mainChart() {
    const ok = rows.filter(r => r.result.status === 'ok');
    if (!ok.length) return '';
    const hists = ok.map(r => indexHistory(r.project));
    const histMonths = [...new Set(hists.flat().map(h => h.month))].sort().slice(-12);
    const mean = vals => vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const avgH = key => histMonths.map(m => mean(hists.map(h => h.find(x => x.month === m)?.[key]).filter(v => v != null)));
    const path = summary.path, wiPath = whatIf?.summary.path;
    const nh = histMonths.length, months = [...histMonths, ...path.slice(1).map(p => p.month)], n = months.length;
    const hasCost = summary.indices.ci.coverage > 0;
    const hidden = new Set(fc.hidden || []);
    const series = SERIES.filter(s => s.key !== 'ci' || hasCost).map(s => ({ ...s, visible: !hidden.has(s.key), hist: avgH(s.key), fut: path.map(p => s.key === 'ipi' ? p.p50 : p[s.key]) }));
    const shown = series.filter(s => s.visible);
    const values = [PLAN, ...shown.flatMap(s => [...s.hist, ...s.fut]), ...(shown.some(s => s.key === 'ipi') ? path.flatMap(p => [p.p10, p.p90]) : []), ...(wiPath ? wiPath.map(p => p.p50) : [])].filter(v => v != null);
    const from = Math.max(0, Math.floor(Math.min(...values) * 2 - 0.6) / 2), to = Math.min(5, Math.ceil(Math.max(...values) * 2 + 0.6) / 2);
    const w = 1000, h = 300, left = 36, right = 104, top = 18, bottom = 30;
    const x = i => left + (n <= 1 ? 0 : (i / (n - 1)) * (w - left - right));
    const y = v => top + (1 - (v - from) / (to - from)) * (h - top - bottom);
    const pts = (arr, offset = 0) => arr.map((v, i) => v == null ? null : `${x(i + offset).toFixed(1)},${y(v).toFixed(1)}`).filter(Boolean).join(' ');
    const step = to - from <= 2 ? 0.5 : 1;
    let grid = '';
    for (let v = Math.ceil(from / step) * step; v <= to + 1e-9; v += step) grid += `<line class="fc-grid" x1="${left}" x2="${w - right}" y1="${y(v)}" y2="${y(v)}"/><text class="fc-axis" x="${left - 8}" y="${y(v) + 3}" text-anchor="end">${Number.isInteger(v) ? v : v.toFixed(1)}</text>`;
    const every = Math.max(1, Math.ceil(n / 9));
    const ticks = months.map((m, i) => (i % every === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= every / 2) ? `<text class="fc-axis" x="${x(i)}" y="${h - 8}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${month(m, true)}</text>` : '').join('');
    const nowX = x(nh - 1);
    const future = `<rect class="fc-future" x="${nowX}" y="${top}" width="${x(n - 1) - nowX}" height="${h - top - bottom}"/><text class="fc-future-label" x="${nowX + 8}" y="${top + 13}">${t('Forecast', 'التوقع')}</text><line class="fc-now-line" x1="${nowX}" x2="${nowX}" y1="${top}" y2="${h - bottom}"/><text class="fc-future-label" x="${nowX - 6}" y="${top + 13}" text-anchor="end">${t('Now', 'الآن')}</text>`;
    const hIdx = horizon === 'end' ? -1 : months.indexOf(horizon);
    const horizonMark = hIdx > 0 ? `<line class="fc-horizon-line" x1="${x(hIdx)}" x2="${x(hIdx)}" y1="${top}" y2="${h - bottom}"/><text class="fc-horizon-label" x="${x(hIdx) + 5}" y="${h - bottom - 6}">${month(horizon, true)}</text>` : '';
    const ipiShown = shown.some(s => s.key === 'ipi');
    const band = ipiShown ? `<path class="fc-fan-80" d="M${path.map((p, i) => `${x(nh - 1 + i)},${y(p.p90)}`).join(' L')} L${path.map((p, i) => `${x(nh - 1 + i)},${y(p.p10)}`).reverse().join(' L')} Z"/>` : '';
    const plan = `<line class="fc-plan-line" x1="${left}" x2="${w - right}" y1="${y(PLAN)}" y2="${y(PLAN)}"/><text class="fc-plan-label" x="${left + 4}" y="${y(PLAN) - 5}">${t('On plan = 3', 'ضمن الخطة = 3')}</text>`;
    const lines = shown.map(s => `<polyline class="fc-series ${s.key} ${s.key === measure ? 'focus' : ''}" points="${pts(s.hist)}"/><polyline class="fc-series ${s.key} dashed ${s.key === measure ? 'focus' : ''}" points="${pts(s.fut, nh - 1)}"/><circle class="fc-end-dot ${s.key}" cx="${x(n - 1)}" cy="${y(s.fut.at(-1))}" r="4.5"/>`).join('');
    // End labels, nudged apart so they never overlap.
    const labels = shown.map(s => ({ text: `${s.label()} ${f2(s.fut.at(-1))}`, cls: s.key, y: y(s.fut.at(-1)) }));
    if (wiPath) labels.push({ text: `${t('What-if', 'ماذا لو')} ${f2(wiPath.at(-1).p50)}`, cls: 'whatif', y: y(wiPath.at(-1).p50) });
    labels.sort((a, b) => a.y - b.y).forEach((l, i, all) => { if (i && l.y - all[i - 1].y < 15) l.y = all[i - 1].y + 15; });
    const labelSvg = labels.map(l => `<text class="fc-end-label ${l.cls}" x="${x(n - 1) + 10}" y="${l.y + 4}">${l.text}</text>`).join('');
    const wi = wiPath ? `<polyline class="fc-whatif-line" points="${pts(wiPath.map(p => p.p50), nh - 1)}"/><circle class="fc-whatif-ring" cx="${nowX}" cy="${y(whatIf.summary.whatIfNow ?? wiPath[0].p50)}" r="7"/><circle class="fc-whatif-ring" cx="${x(n - 1)}" cy="${y(wiPath.at(-1).p50)}" r="6"/>` : '';
    // Hover targets: one column per month carrying its values.
    const colW = (w - left - right) / Math.max(1, n - 1);
    const hits = months.map((m, i) => {
      const isFuture = i > nh - 1, pi = i - (nh - 1);
      const lines = [`${month(m)} · ${isFuture ? t('forecast', 'توقع') : t('actual', 'فعلي')}`];
      series.filter(s => s.visible).forEach(s => { const v = isFuture ? s.fut[pi] : s.hist[i]; if (v != null) lines.push(`${s.name()}: ${f2(v)}`); });
      if (isFuture && ipiShown) lines.push(`${t('IPI 80% range', 'نطاق IPI 80%')}: ${f2(path[pi].p10)}–${f2(path[pi].p90)}`);
      if (wiPath && i >= nh - 1) lines.push(`${t('What-if IPI', 'IPI ماذا لو')}: ${f2(wiPath[Math.min(pi, wiPath.length - 1)].p50)}`);
      return `<rect class="fc-hit" x="${Math.max(left, x(i) - colW / 2)}" y="${top}" width="${colW}" height="${h - top - bottom}" data-x="${x(i)}" data-tip="${escape(lines.join('|'))}"/>`;
    }).join('');
    const legend = series.map(s => `<button class="fc-series-toggle" data-action="fc-series" data-value="${s.key}" aria-pressed="${s.visible}"><i class="fc-line-key ${s.key}"></i>${s.name()}<b>${f2(s.hist.at(-1))} → ${f2(s.fut.at(-1))}</b></button>`).join('');
    const label = t(`Monthly averages for ${projectsLabel(ok.length)} over the last ${nh} months, and the forecast to ${month(months.at(-1))}. IPI is ${f2(summary.now)} now and forecast at ${f2(summary.end.p50)}.`, `المتوسطات الشهرية لـ ${projectsLabel(ok.length)} خلال آخر ${nh} أشهر، والتوقع حتى ${month(months.at(-1))}. IPI الآن ${f2(summary.now)} ومتوقع عند ${f2(summary.end.p50)}.`);
    return `<section class="fc-card fc-main-chart" aria-labelledby="fc-chart-title"><div class="dv-section-heading"><div><h2 id="fc-chart-title">${t('IPI, TI, MI and CI: monthly actuals and the forecast to end dates', 'IPI وTI وMI وCI: القيم الشهرية الفعلية والتوقع حتى تواريخ الانتهاء')}</h2><p class="dv-helper">${t('Select a measure to hide or show its line. Hover a month for its values.', 'اختر مقياسًا لإخفاء خطه أو إظهاره. مرّر فوق شهر لعرض قيمه.')}</p></div></div><div class="fc-series-legend" role="group" aria-label="${t('Show or hide lines', 'إظهار الخطوط أو إخفاؤها')}">${legend}</div><div class="fc-chart-wrap" data-chart><svg class="fc-chart fc-chart-main" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escape(label)}" dir="ltr">${grid}${future}${horizonMark}${band}${plan}${lines}${wi}${labelSvg}${ticks}<line class="fc-hover-line" x1="0" x2="0" y1="${top}" y2="${h - bottom}" visibility="hidden"/>${hits}</svg><div class="fc-tooltip" role="presentation" hidden></div></div><p class="fc-key fc-chart-key"><span><i class="fc-line-key ipi"></i>${t('Solid: actual monthly average', 'متصل: المتوسط الشهري الفعلي')}</span><span><i class="fc-line-key median"></i>${t('Dashed: forecast', 'متقطع: التوقع')}</span>${ipiShown ? `<span><i class="fc-key-band"></i>${t('IPI 80% range', 'نطاق IPI 80%')}</span>` : ''}${wiPath ? `<span><i class="fc-key-ring"></i>${t('What-if IPI', 'IPI ماذا لو')}</span>` : ''}</p></section>`;
  }

  // ---------- What-if sliders ----------
  function whatIfCard() {
    const forecastable = rows.filter(r => r.result.status === 'ok');
    if (!forecastable.length) return '';
    const targets = whatIfTargets.map(id => baselineFor(id)).filter(r => r?.status === 'ok');
    const mean = fn => targets.reduce((s, r) => s + fn(r), 0) / Math.max(1, targets.length);
    const withCost = targets.filter(r => r.hasCost);
    const now = { pi: mean(r => r.now.pi), ai: mean(r => r.now.ai), mi: mean(r => r.now.mi), ci: withCost.length ? withCost.reduce((s, r) => s + r.now.ci, 0) / withCost.length : null };
    const v = fc.whatIf.values;
    const shownPi = v.pi ?? now.pi, shownAi = v.ai ?? now.ai;
    const current = { pi: shownPi, ai: shownAi, ti: v.ti ?? ti(shownPi, shownAi), mi: v.mi ?? now.mi, ci: v.ci ?? now.ci };
    const state = key => v[key] != null ? t('what-if', 'ماذا لو') : key === 'ti' ? t('from PI and AI', 'من PI وAI') : t('average now', 'المتوسط الآن');
    const one = targets.length === 1;
    const slider = key => {
      const disabled = key === 'ci' && current.ci == null;
      return `<div class="fc-slider ${v[key] != null ? 'is-set' : ''}"><label for="fc-wi-${key}"><span>${L(INDEX[key].name)} <abbr>${INDEX[key].abbr}</abbr></span><output id="fc-wi-${key}-out" for="fc-wi-${key}">${disabled ? '—' : f2(current[key])}</output><small id="fc-wi-${key}-state">${disabled ? t('no cost data', 'لا توجد بيانات تكلفة') : one ? state(key).replace(t('average now', 'المتوسط الآن'), t('now', 'الآن')) : state(key)}</small></label><input type="range" id="fc-wi-${key}" class="fc-range" data-whatif="${key}" min="0" max="5" step="0.05" value="${disabled ? 0 : current[key].toFixed(2)}" ${disabled ? 'disabled' : ''} aria-describedby="fc-wi-${key}-state"><span class="fc-range-ticks" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map(n => `<span>${n}</span>`).join('')}</span></div>`;
    };
    const targetOptions = `<option value="all" ${fc.whatIf.target === 'all' ? 'selected' : ''}>${t(`All projects shown (${forecastable.length})`, `جميع المشاريع المعروضة (${forecastable.length})`)}</option>${forecastable.map(r => `<option value="${r.project.id}" ${fc.whatIf.target === r.project.id ? 'selected' : ''}>${escape(L(r.project.name))}</option>`).join('')}`;
    let result = '';
    if (whatIf) {
      const b = lensAll, s = lensSummary(whatIf.results);
      const cmp = (label, a, c, d) => `<div><span>${label}</span><b>${a}</b>${icon('right')}<b class="${d > 0.004 ? 'on' : d < -0.004 ? 'below' : ''}">${c}</b></div>`;
      result = `<div class="fc-whatif-result" aria-live="polite"><p class="dv-eyebrow">${t('WHAT-IF RESULT', 'نتيجة ماذا لو')}</p><div class="fc-whatif-figures">${cmp(t(`Average ${mName} ${atLabel}`, `متوسط ${mName} ${atLabel}`), f2(b.p50), f2(s.p50), s.p50 - b.p50)}${cmp(t('Chance on plan', 'فرصة ضمن الخطة'), pct(b.chance), pct(s.chance), s.chance - b.chance)}${cmp(L(OUTCOMES.on.label), b.counts.on, s.counts.on, s.counts.on - b.counts.on)}${cmp(L(OUTCOMES.risk.label), b.counts.risk, s.counts.risk, 0)}${cmp(L(OUTCOMES.below.label), b.counts.below, s.counts.below, b.counts.below - s.counts.below)}</div><p class="fc-caveat">${t(`Holds the set values from now to each end date for ${one ? L(rows.find(r => r.project.id === targets[0].id).project.name) : projectsLabel(targets.length)}${targets.length < forecastable.length ? '; other projects keep their baseline' : ''}. Advisory only: it does not change any project plan.`, `يثبت القيم المحددة من الآن حتى تاريخ الانتهاء لـ ${one ? L(rows.find(r => r.project.id === targets[0].id).project.name) : projectsLabel(targets.length)}${targets.length < forecastable.length ? '؛ وتحتفظ المشاريع الأخرى بخط الأساس' : ''}. استشاري فقط: لا يغيّر أي خطة مشروع.`)}</p></div>`;
    }
    const changed = Boolean(whatIf);
    const savedCount = (fc.saved || []).length;
    const save = changed ? `<div class="fc-save-row"><label for="fc-save-name">${t('Scenario name', 'اسم السيناريو')}</label><input id="fc-save-name" maxlength="40" value="${escape(t(`Scenario ${savedCount + 1}`, `سيناريو ${savedCount + 1}`))}"><button class="secondary-button" data-action="fc-save-scenario" ${savedCount >= 4 ? 'disabled' : ''}>${icon('plus')}${t('Save scenario', 'حفظ السيناريو')}</button>${savedCount >= 4 ? `<small>${t('Up to 4 saved scenarios. Delete one to save another.', 'حتى 4 سيناريوهات محفوظة. احذف واحدًا لحفظ آخر.')}</small>` : `<small>${t('Saved for this session, with the current projects and values.', 'يُحفظ لهذه الجلسة مع المشاريع والقيم الحالية.')}</small>`}</div>` : '';
    return `<section class="fc-card fc-whatif" aria-labelledby="fc-whatif-title"><div class="fc-whatif-head"><h2 id="fc-whatif-title">${t('What-if', 'ماذا لو')}</h2><label class="fc-whatif-target"><span>${t('for', 'لـ')}</span><select id="fc-whatif-target">${targetOptions}</select>${icon('chevron')}</label><div class="fc-whatif-actions"><button class="secondary-button" data-action="fc-whatif-ask" ${changed ? '' : 'disabled'}>${icon('assistant')}${t('Ask the assistant about this', 'اسأل المساعد عن هذا')}</button><button class="secondary-button" data-action="fc-whatif-reset" ${changed ? '' : 'disabled'}>${icon('refresh')}${t('Reset', 'إعادة تعيين')}</button></div></div><p class="dv-helper">${t('Set an index value (0 to 5) and hold it from now to the end date. A slider sets that value for every project in “for”. Schedule (TI) follows progress and start delay unless you move it.', 'حدّد قيمة مؤشر (من 0 إلى 5) وثبّتها من الآن حتى تاريخ الانتهاء. يضبط المنزلق هذه القيمة لكل مشروع في "لـ". يتبع الجدول الزمني (TI) التقدم وتأخر البدء ما لم تحرّكه.')}</p><div class="fc-sliders">${['pi', 'ai', 'ti', 'mi', 'ci'].map(slider).join('')}</div>${result}${save}${savedScenarios()}</section>`;
  }

  // ---------- Early warnings ----------
  const rules = { ...DEFAULT_RULES, ...(fc.rules || {}) };
  const allAlerts = alertsFor(projects, { baseline: baselineFor, previous: previousFor, rules });
  const reviewed = new Set(fc.reviewed || []);
  const nameOf = id => L(scoped.find(p => p.id === id)?.name || ['', '']);
  const SEVERITY_LABEL = { high: ['High', 'مرتفع'], medium: ['Medium', 'متوسط'], low: ['Watch', 'للمتابعة'], positive: ['Good news', 'خبر جيد'], info: ['New', 'جديد'] };
  function alertText(a) {
    const name = escape(nameOf(a.projectId));
    const out = k => L(OUTCOMES[k].label).toLowerCase();
    const idx = k => L(INDEX[k].name);
    const p = a.pattern;
    switch (a.type) {
      case 'worsened': return [t(`<strong>${name}</strong> moved from ${out(a.from)} to ${out(a.to)}`, `انتقل <strong>${name}</strong> من ${out(a.from)} إلى ${out(a.to)}`), t(`Chance of finishing on plan ${pct(a.prevChance)} → ${pct(a.chance)} since the ${month(PREVIOUS_AS_OF)} run.`, `فرصة الانتهاء ضمن الخطة ${pct(a.prevChance)} ← ${pct(a.chance)} منذ تشغيل ${month(PREVIOUS_AS_OF)}.`)];
      case 'improved': return [t(`<strong>${name}</strong> improved from ${out(a.from)} to ${out(a.to)}`, `تحسّن <strong>${name}</strong> من ${out(a.from)} إلى ${out(a.to)}`), t(`Chance of finishing on plan ${pct(a.prevChance)} → ${pct(a.chance)}.`, `فرصة الانتهاء ضمن الخطة ${pct(a.prevChance)} ← ${pct(a.chance)}.`)];
      case 'chance-drop': return [t(`<strong>${name}</strong>: chance on plan fell ${a.drop} points`, `<strong>${name}</strong>: انخفضت فرصة ضمن الخطة ${a.drop} نقطة`), t(`${pct(a.prevChance)} → ${pct(a.chance)}; still ${out(a.to)}.`, `${pct(a.prevChance)} ← ${pct(a.chance)}؛ لا يزال ${out(a.to)}.`)];
      case 'first-forecast': return [t(`<strong>${name}</strong> has its first forecast`, `أول توقع لـ <strong>${name}</strong>`), t(`${L(OUTCOMES[a.to].label)}, ${pct(a.chance)} chance of finishing on plan.`, `${L(OUTCOMES[a.to].label)}، فرصة ${pct(a.chance)} للانتهاء ضمن الخطة.`)];
      default:
        if (p.type === 'decline') return [t(`<strong>${name}</strong>: ${idx(p.key)} fell ${p.months} months in a row`, `<strong>${name}</strong>: انخفض ${idx(p.key)} ${p.months} أشهر متتالية`), t(`${f2(p.from)} → ${f2(p.to)}. An early sign before the outcome changes.`, `${f2(p.from)} ← ${f2(p.to)}. إشارة مبكرة قبل تغيّر النتيجة.`)];
        if (p.type === 'rise') return [t(`<strong>${name}</strong>: progress vs plan rose ${p.months} months in a row`, `<strong>${name}</strong>: ارتفع التقدم مقابل الخطة ${p.months} أشهر متتالية`), `${f2(p.from)} → ${f2(p.to)}.`];
        if (p.type === 'stall') return [t(`<strong>${name}</strong>: progress has stalled`, `<strong>${name}</strong>: توقف التقدم`), t(`Moved ${p.gain.toFixed(1)} points in 2 months while the plan moved ${p.planGain.toFixed(1)}.`, `تحرك ${p.gain.toFixed(1)} نقطة خلال شهرين بينما تحركت الخطة ${p.planGain.toFixed(1)}.`)];
        return [t(`<strong>${name}</strong>: ${idx(p.key)} below plan for ${p.months} months`, `<strong>${name}</strong>: ${idx(p.key)} دون الخطة منذ ${p.months} أشهر`), t(`Now ${f2(p.to)} against a plan of 3.`, `الآن ${f2(p.to)} مقابل خطة قدرها 3.`)];
    }
  }
  function alertsCard() {
    const groupsOf = { all: () => true, changes: a => a.type !== 'pattern', patterns: a => a.type === 'pattern', following: a => following.has(a.projectId) };
    const filter = groupsOf[fc.alertFilter] ? fc.alertFilter : 'all';
    const open = allAlerts.filter(a => !reviewed.has(a.id));
    const inFilter = (fc.showReviewed ? allAlerts : open).filter(groupsOf[filter]);
    const shown = fc.alertsAll ? inFilter : inFilter.slice(0, 5);
    const tabs = [['all', t('All', 'الكل')], ['changes', t(`Since ${month(PREVIOUS_AS_OF, true)}`, `منذ ${month(PREVIOUS_AS_OF, true)}`)], ['patterns', t('Patterns', 'الأنماط')], ['following', t('Following', 'المتابَعة')]];
    const count = k => open.filter(groupsOf[k]).length;
    const item = a => { const [title, detail] = alertText(a); const done = reviewed.has(a.id); return `<li class="fc-alert ${a.severity} ${done ? 'is-reviewed' : ''}"><span class="fc-alert-mark" aria-hidden="true"></span><div class="fc-alert-body"><p><span class="fc-alert-sev">${L(SEVERITY_LABEL[a.severity])}</span>${title}</p><small>${detail}</small><div class="fc-alert-actions"><button class="text-button" data-action="forecast-open" data-id="${a.projectId}">${t('Open project', 'فتح المشروع')}${icon('right')}</button>${done ? `<span class="fc-muted">${icon('check')}${t('Reviewed', 'تمت المراجعة')}</span>` : `<button class="text-button" data-action="fc-alert-review" data-value="${escape(a.id)}">${icon('check')}${t('Mark reviewed', 'تحديد كمراجَع')}</button>`}</div></div></li>`; };
    const empty = filter === 'following' && !following.size ? t('You are not following any project yet. Open a project and select Follow to get its warnings here.', 'لا تتابع أي مشروع بعد. افتح مشروعًا واختر متابعة لتظهر إنذاراته هنا.') : t('No open warnings here.', 'لا توجد إنذارات مفتوحة هنا.');
    return `<section class="fc-card fc-alerts" aria-labelledby="fc-alerts-title"><div class="dv-section-heading"><div><h2 id="fc-alerts-title">${t('Early warnings', 'الإنذارات المبكرة')} ${open.length ? `<span class="fc-count">${open.length}</span>` : ''}</h2><p class="dv-helper">${t(`Changes since the ${month(PREVIOUS_AS_OF)} run and patterns in recent months.`, `التغيرات منذ تشغيل ${month(PREVIOUS_AS_OF)} والأنماط في الأشهر الأخيرة.`)}</p></div><button class="icon-button" data-action="fc-alert-settings" aria-label="${t('Alert rules and delivery', 'قواعد الإنذارات وطريقة الإرسال')}" title="${t('Alert rules and delivery', 'قواعد الإنذارات وطريقة الإرسال')}">${icon('settings')}</button></div><div class="fc-segmented fc-alert-tabs" role="group" aria-label="${t('Show warnings', 'عرض الإنذارات')}">${tabs.map(([v, l]) => `<button data-action="fc-alert-filter" data-value="${v}" aria-pressed="${filter === v}">${l}<span>${count(v)}</span></button>`).join('')}</div>${shown.length ? `<ul class="fc-alert-list">${shown.map(item).join('')}</ul>` : `<p class="fc-alert-empty">${icon('check-circle')}${empty}</p>`}<div class="fc-alert-footer">${inFilter.length > 5 ? `<button class="text-button" data-action="fc-alerts-all" aria-expanded="${Boolean(fc.alertsAll)}">${fc.alertsAll ? t('Show fewer', 'عرض أقل') : t(`Show all ${inFilter.length}`, `عرض الكل (${inFilter.length})`)}</button>` : ''}${reviewed.size ? `<button class="text-button" data-action="fc-alerts-reviewed" aria-pressed="${Boolean(fc.showReviewed)}">${fc.showReviewed ? t('Hide reviewed', 'إخفاء المراجَعة') : t(`Show ${reviewed.size} reviewed`, `عرض ${reviewed.size} مراجَعة`)}</button>` : ''}</div></section>`;
  }
  function alertSettings() {
    const choice = (action, value, label, pressed, extra = '') => `<button data-action="${action}" data-value="${value}" aria-pressed="${pressed}" ${extra}>${label}</button>`;
    const followed = scoped.filter(p => following.has(p.id));
    return `<p class="inspector-intro">${t('Choose what counts as a warning for your account. Rules apply to this demo session.', 'اختر ما يُعد إنذارًا لحسابك. تنطبق القواعد على هذه الجلسة التجريبية.')}</p><h4>${t('Warn me when the chance of finishing on plan falls by', 'نبّهني عندما تنخفض فرصة الانتهاء ضمن الخطة بمقدار')}</h4><div class="fc-options" role="group">${[10, 15, 20, 30].map(v => choice('fc-rule-drop', v, t(`${v} points`, `${v} نقطة`), rules.chanceDrop === v)).join('')}</div><p class="fc-footnote">${t('Moving to a worse outcome group always raises a warning.', 'الانتقال إلى فئة نتيجة أسوأ يُنشئ إنذارًا دائمًا.')}</p><h4>${t('Also include', 'أضف أيضًا')}</h4><div class="fc-toggles">${choice('fc-rule-toggle', 'patterns', `${icon(rules.patterns ? 'check-circle' : 'plus')}${t('Pattern warnings (declines, stalls)', 'إنذارات الأنماط (الانخفاض، التوقف)')}`, rules.patterns)}${choice('fc-rule-toggle', 'improvements', `${icon(rules.improvements ? 'check-circle' : 'plus')}${t('Good news (improvements)', 'الأخبار الجيدة (التحسن)')}`, rules.improvements)}</div><h4>${t('Deliver to', 'الإرسال إلى')}</h4><ul class="fc-channels"><li>${icon('check-circle')}<span><strong>${t('This page', 'هذه الصفحة')}</strong><small>${t('Always on', 'مفعّل دائمًا')}</small></span></li><li class="is-off">${icon('chat')}<span><strong>${t('Email digest', 'ملخص بالبريد الإلكتروني')}</strong><small>${t('Needs email integration — not connected in this prototype', 'يحتاج إلى تكامل البريد — غير متصل في هذا النموذج')}</small></span></li><li class="is-off">${icon('history')}<span><strong>${t('Synergy notifications', 'إشعارات سينرجي')}</strong><small>${t('Needs Corporater notification API — to confirm', 'يحتاج إلى واجهة إشعارات Corporater — للتأكيد')}</small></span></li></ul><h4>${t('Projects you follow', 'المشاريع التي تتابعها')}</h4>${followed.length ? `<div class="fc-followed">${followed.map(p => `<div><span>★ ${L(p.name)}</span><button class="text-button" data-action="fc-follow" data-id="${p.id}">${t('Unfollow', 'إلغاء المتابعة')}</button></div>`).join('')}</div>` : `<p class="inspector-intro">${t('None yet. Open a project and select Follow.', 'لا يوجد بعد. افتح مشروعًا واختر متابعة.')}</p>`}`;
  }

  // ---------- Management summary and export ----------
  function summaryLines() {
    const lines = [];
    const { counts, n } = lensAll;
    lines.push(defaultLens ? t(`${counts.below} of ${n} projects are forecast to finish below plan and ${counts.risk} are at risk. Average chance of finishing on plan: ${pct(lensAll.chance)}.`, `من المتوقع أن ينتهي ${counts.below} من ${n} مشاريع دون الخطة و${counts.risk} معرّضة للخطر. متوسط فرصة الانتهاء ضمن الخطة: ${pct(lensAll.chance)}.`) : t(`${mName} by ${hName}: ${counts.below} of ${n} projects below plan, ${counts.risk} at risk, ${counts.on} on plan.`, `${mName} بحلول ${hName}: ${counts.below} من ${n} مشاريع دون الخطة، ${counts.risk} معرّضة للخطر، ${counts.on} ضمن الخطة.`));
    const changes = alertsFor(projects, { baseline: baselineFor, previous: previousFor, rules: { ...DEFAULT_RULES, patterns: false, improvements: true } });
    const worse = changes.filter(a => a.type === 'worsened'), better = changes.filter(a => a.type === 'improved');
    if (worse.length || better.length) lines.push(t(`Since the ${month(PREVIOUS_AS_OF)} run, ${worse.length} ${worse.length === 1 ? 'project' : 'projects'} moved to a worse outcome${worse.length ? ` (${worse.slice(0, 3).map(a => nameOf(a.projectId)).join(', ')})` : ''} and ${better.length} improved${better.length ? ` (${better.slice(0, 3).map(a => nameOf(a.projectId)).join(', ')})` : ''}.`, `منذ تشغيل ${month(PREVIOUS_AS_OF)}، انتقل ${worse.length} إلى نتيجة أسوأ${worse.length ? ` (${worse.slice(0, 3).map(a => nameOf(a.projectId)).join('، ')})` : ''} وتحسّن ${better.length}${better.length ? ` (${better.slice(0, 3).map(a => nameOf(a.projectId)).join('، ')})` : ''}.`));
    else lines.push(t(`No project changed outcome since the ${month(PREVIOUS_AS_OF)} run.`, `لم تتغير نتيجة أي مشروع منذ تشغيل ${month(PREVIOUS_AS_OF)}.`));
    const top = Object.entries(summary.drivers).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1]) lines.push(t(`${L(INDEX[top[0]].name)} is the main driver for ${top[1]} of the ${summary.counts.risk + summary.counts.below} projects at risk or below plan.`, `${L(INDEX[top[0]].name)} هو العامل الرئيسي لـ ${top[1]} من ${summary.counts.risk + summary.counts.below} مشاريع معرّضة للخطر أو دون الخطة.`));
    const lowest = rows.filter(r => lens(r.result)).sort((a, b) => lens(a.result).chance - lens(b.result).chance).slice(0, 3);
    if (lowest.length > 1) lines.push(t(`Needs attention first: ${lowest.map(r => `${L(r.project.name)} (${pct(lens(r.result).chance)})`).join(', ')}.`, `يحتاج إلى متابعة أولًا: ${lowest.map(r => `${L(r.project.name)} (${pct(lens(r.result).chance)})`).join('، ')}.`));
    const patterns = allAlerts.filter(a => a.type === 'pattern' && a.severity !== 'positive');
    if (patterns.length) lines.push(t(`${projectsLabel(new Set(patterns.map(a => a.projectId)).size)} show early-warning patterns, such as ${alertText(patterns[0])[0].replace(/<[^>]+>/g, '')}.`, `تُظهر ${projectsLabel(new Set(patterns.map(a => a.projectId)).size)} أنماط إنذار مبكر، مثل ${alertText(patterns[0])[0].replace(/<[^>]+>/g, '')}.`));
    if (whatIf) lines.push(t(`What-if (${Object.entries(whatIf.values).map(([k, v]) => `${INDEX[k].abbr} ${f2(v)}`).join(', ')}): average IPI at end dates ${f2(summary.end.p50)} → ${f2(whatIf.summary.end.p50)}.`, `ماذا لو (${Object.entries(whatIf.values).map(([k, v]) => `${INDEX[k].abbr} ${f2(v)}`).join('، ')}): متوسط IPI عند الانتهاء ${f2(summary.end.p50)} ← ${f2(whatIf.summary.end.p50)}.`));
    return lines;
  }
  function summaryText() {
    return [t(`Forecast summary · ${L(account.scopeLabel)} · as of ${month(AS_OF)}`, `ملخص التوقعات · ${L(account.scopeLabel)} · حتى ${month(AS_OF)}`), ...summaryLines().map(l => `• ${l}`), t('Sample data and an illustrative model. Advisory only.', 'بيانات تجريبية ونموذج توضيحي. استشاري فقط.')].join('\n');
  }
  function summaryCard() {
    return `<section class="fc-card fc-summary" aria-labelledby="fc-summary-title"><div class="dv-section-heading"><div><h2 id="fc-summary-title">${t('Management summary', 'ملخص للإدارة')}</h2><p class="dv-helper">${t('Written from this forecast. Review before sharing.', 'مكتوب من هذا التوقع. راجعه قبل المشاركة.')}</p></div><span class="fc-sample">${icon('assistant')}${t('Sample template', 'قالب تجريبي')}</span></div><ul class="fc-summary-list">${summaryLines().map(l => `<li>${escape(l)}</li>`).join('')}</ul><div class="fc-summary-actions"><button class="secondary-button" data-action="fc-copy-summary">${icon('copy')}${t('Copy summary', 'نسخ الملخص')}</button><button class="secondary-button" data-action="fc-export-csv">${icon('document')}${t('Download CSV', 'تنزيل CSV')}</button><button class="secondary-button" data-action="fc-print">${icon('document')}${t('Print or save as PDF', 'طباعة أو حفظ PDF')}</button></div><p class="fc-footnote">${icon('shield')}${t('In production this summary is written by the approved model from the same forecast numbers. The CSV contains the projects in the list below, with their current filters.', 'في الإنتاج يكتب النموذج المعتمد هذا الملخص من أرقام التوقع نفسها. يحتوي ملف CSV على المشاريع في القائمة أدناه مع عوامل التصفية الحالية.')}</p></section>`;
  }
  function csv() {
    const header = ['Project', 'Owner', 'Sector', 'Portfolio', 'End date', 'Measure', 'Horizon', 'Now', 'Forecast (middle)', '80% low', '80% high', 'Chance on plan (%)', 'Outcome', 'Main driver', `Chance change since ${PREVIOUS_AS_OF} (pts)`];
    const out = filteredRows().map(({ project, result }) => {
      const v = lens(result);
      const base = [L(project.name), L(project.owner), L(project.sectorLabel), L(project.portfolioLabel), project.end, measure.toUpperCase(), horizon === 'end' ? 'end date' : horizon];
      if (!v) return [...base, '', '', '', '', '', result.status === 'ok' ? 'No cost data' : 'Not forecast (insufficient history)', '', '', ''];
      return [...base, v.now.toFixed(2), v.p50.toFixed(2), v.p10.toFixed(2), v.p90.toFixed(2), Math.round(v.chance * 100), OUTCOMES[v.outcome].label[0], result.mainDriver && result.outcome !== 'on' ? INDEX[result.mainDriver].name[0] : '', changeOf(project.id) ?? ''];
    });
    const slug = String(fc.view || 'all').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    return { filename: `forecast-${slug}-${AS_OF}.csv`, content: toCsv(header, out) };
  }

  // ---------- Saved what-if scenarios ----------
  function projectsForView(view) {
    const [type, value] = String(view || 'all').split(/:(.*)/s);
    const list = type === 'project' ? scoped.filter(p => p.id === value) : ['sector', 'portfolio'].includes(type) ? scoped.filter(p => p[type] === value) : scoped;
    return list.length ? list : scoped;
  }
  function viewLabel(view) {
    const [type, value] = String(view || 'all').split(/:(.*)/s);
    if (type === 'project') return nameOf(value);
    if (type === 'sector' || type === 'portfolio') { const p = scoped.find(x => x[type] === value); return p ? L(type === 'sector' ? p.sectorLabel : p.portfolioLabel) : value; }
    return t('All my projects', 'جميع مشاريعي');
  }
  function savedScenarios() {
    const saved = fc.saved || [];
    if (!saved.length) return '';
    const cols = saved.map((s, i) => {
      const list = projectsForView(s.view);
      const ok = list.filter(p => baselineFor(p.id).status === 'ok').map(p => p.id);
      const targets = ok.includes(s.target) ? [s.target] : ok;
      const w = whatIfFor(list, targets, s.values);
      return { s, i, list, b: lensSummary(list.map(p => baselineFor(p.id))), w: w ? lensSummary(w.results) : null };
    });
    const cell = (a, b, fmt, better) => `<td>${fmt(a)} ${icon('right')} <b class="${better(b, a) > 0.004 ? 'on' : better(b, a) < -0.004 ? 'below' : ''}">${fmt(b)}</b></td>`;
    const row = (label, fn) => `<tr><th scope="row">${label}</th>${cols.map(c => fn(c)).join('')}</tr>`;
    return `<div class="fc-saved"><h3>${t('Saved scenarios', 'السيناريوهات المحفوظة')}</h3><p class="dv-helper">${t(`Compared with each scenario’s own baseline. ${mName} ${atLabel}.`, `مقارنة بخط الأساس لكل سيناريو. ${mName} ${atLabel}.`)}</p><div class="fc-table-wrap"><table class="fc-compare fc-saved-table"><thead><tr><th scope="col"><span class="sr-only">${t('Measure', 'المقياس')}</span></th>${cols.map(c => `<th scope="col"><span class="fc-saved-name">${escape(c.s.name)}</span><span class="fc-saved-actions"><button class="text-button" data-action="fc-load-saved" data-index="${c.i}">${t('Load', 'تحميل')}</button><button class="icon-button small" data-action="fc-delete-saved" data-index="${c.i}" aria-label="${t(`Delete ${c.s.name}`, `حذف ${c.s.name}`)}">${icon('close')}</button></span></th>`).join('')}</tr></thead><tbody>${row(t('Projects', 'المشاريع'), c => `<td>${escape(viewLabel(c.s.view))}${c.s.target !== 'all' ? ` · ${escape(nameOf(c.s.target))}` : ''}</td>`)}${row(t('Values held', 'القيم المثبتة'), c => `<td>${Object.entries(c.s.values).map(([k, v]) => `${INDEX[k].abbr} ${f2(v)}`).join(', ')}</td>`)}${row(t(`Average ${mName}`, `متوسط ${mName}`), c => c.w ? cell(c.b.p50, c.w.p50, f2, (x, y) => x - y) : '<td>—</td>')}${row(t('Chance on plan', 'فرصة ضمن الخطة'), c => c.w ? cell(c.b.chance, c.w.chance, pct, (x, y) => x - y) : '<td>—</td>')}${row(L(OUTCOMES.on.label), c => c.w ? cell(c.b.counts.on, c.w.counts.on, String, (x, y) => x - y) : '<td>—</td>')}${row(L(OUTCOMES.below.label), c => c.w ? cell(c.b.counts.below, c.w.counts.below, String, (x, y) => y - x) : '<td>—</td>')}</tbody></table></div></div>`;
  }

  // ---------- Model accuracy (backtest) ----------
  function accuracyCard() {
    const head = `<button class="fc-accuracy-toggle" data-action="fc-accuracy" aria-expanded="${Boolean(fc.accuracy)}"><span><strong>${t('How accurate has this model been?', 'ما مدى دقة هذا النموذج؟')}</strong><small>${t(`Forecasts made with data up to ${month(BACKTEST_FROM)}, checked against ${month(AS_OF)} actuals.`, `توقعات بُنيت على بيانات حتى ${month(BACKTEST_FROM)}، ومقارنة بالقيم الفعلية في ${month(AS_OF)}.`)}</small></span>${icon('chevron')}</button>`;
    if (!fc.accuracy) return `<section class="fc-card fc-accuracy">${head}</section>`;
    const b = backtestFor(projects);
    if (!b.count) return `<section class="fc-card fc-accuracy is-open">${head}<p class="fc-muted">${t('Not enough history in this selection to check accuracy.', 'لا توجد بيانات كافية في هذا الاختيار للتحقق من الدقة.')}</p></section>`;
    const cov = b.coverage;
    const verdict = cov > 0.9 ? t('The ranges are wider than they need to be: the model is cautious. Narrowing them is a tuning task for the forecasting team.', 'النطاقات أوسع من اللازم: النموذج حذر. تضييقها مهمة ضبط لفريق التوقع.') : cov >= 0.7 ? t('The 80% ranges behave as expected.', 'تتصرف نطاقات 80% كما هو متوقع.') : t('The ranges are too narrow: actual results fall outside them more often than they should.', 'النطاقات ضيقة جدًا: تقع النتائج الفعلية خارجها أكثر مما ينبغي.');
    const stat = (value, label, note) => `<div><b>${value}</b><span>${label}</span><small>${note}</small></div>`;
    return `<section class="fc-card fc-accuracy is-open" aria-label="${t('Model accuracy', 'دقة النموذج')}">${head}<div class="fc-accuracy-stats">${stat(`±${b.mae.toFixed(2)}`, t('Average IPI error', 'متوسط خطأ IPI'), t('on a 0–5 scale', 'على مقياس 0–5'))}${stat(pct(cov), t('Actuals inside the 80% range', 'القيم الفعلية داخل نطاق 80%'), t('about 80% is ideal', 'حوالي 80% هو المثالي'))}${stat(pct(b.sideAccuracy), t('Right side of plan', 'الجانب الصحيح من الخطة'), t('forecast and actual both above or both below 3', 'التوقع والفعلي كلاهما فوق 3 أو تحته'))}${stat(signed(b.bias), t('Average bias', 'متوسط الانحياز'), b.bias > 0.02 ? t('actuals came in higher', 'جاءت القيم الفعلية أعلى') : b.bias < -0.02 ? t('actuals came in lower', 'جاءت القيم الفعلية أقل') : t('no clear bias', 'لا يوجد انحياز واضح'))}</div><p class="fc-insight">${icon('idea')}<span>${verdict}</span></p><h3>${t('Largest misses', 'أكبر الفروقات')}</h3><div class="fc-table-wrap"><table class="fc-compare"><thead><tr><th scope="col">${t('Project', 'المشروع')}</th><th scope="col">${t(`Forecast for ${month(AS_OF)}`, `التوقع لـ ${month(AS_OF)}`)}</th><th scope="col">${t('80% range', 'نطاق 80%')}</th><th scope="col">${t('Actual', 'الفعلي')}</th><th scope="col">${t('Error', 'الخطأ')}</th></tr></thead><tbody>${b.rows.slice(0, 5).map(r => `<tr><th scope="row">${escape(nameOf(r.id))}</th><td>${f2(r.predicted)}</td><td dir="ltr">${f2(r.low)}–${f2(r.high)}</td><td>${f2(r.actual)}</td><td class="fc-change">${signed(r.error)}${r.inside ? '' : ` <span class="fc-badge below">${t('outside range', 'خارج النطاق')}</span>`}</td></tr>`).join('')}</tbody></table></div><p class="fc-footnote">${icon('shield')}${t(`Backtest on sample data for ${projectsLabel(b.count)}. In production the forecasting team publishes this check for every model version.`, `اختبار رجعي على بيانات تجريبية لـ ${projectsLabel(b.count)}. في الإنتاج ينشر فريق التوقع هذا الفحص لكل إصدار من النموذج.`)}</p></section>`;
  }

  function page() {
    const heading = `<div class="dv-page-heading"><div><h1 id="workspace-heading">${t('Forecasts', 'التوقعات')}</h1><p>${t('Where your projects are heading by their end dates, what is driving it, and what could change it.', 'إلى أين تتجه مشاريعك بحلول تواريخ انتهائها، وما الذي يحرك ذلك، وما الذي قد يغيّره.')}</p></div><div class="fc-heading-side">${scoped.length > 1 ? viewSelect() : ''}<span class="scope-tag">${icon('briefcase')}${L(account.scopeLabel)} · ${projectsLabel(scoped.length)}</span></div></div>`;
    if (!projects.length) return `<section class="dv-page fc-page" aria-labelledby="workspace-heading">${heading}<div class="scope-empty">${icon('briefcase')}<h3>${t('No projects to forecast', 'لا توجد مشاريع للتوقع')}</h3><p>${t('This demo account has no assigned projects, so there is nothing to forecast. Switch accounts to explore forecasts.', 'لا توجد مشاريع مسندة لهذا الحساب التجريبي، لذا لا يوجد ما يمكن توقعه. بدّل الحساب لاستكشاف التوقعات.')}</p><button class="text-button" data-action="accounts">${t('Switch demo account', 'تبديل الحساب التجريبي')}${icon('right')}</button></div></section>`;
    const body = fc.preview === 'loading' ? loadingState() : fc.preview === 'error' ? errorState() : `${stateBanner()}${summary.forecast ? `${outlook()}<div class="fc-columns fc-columns-even">${alertsCard()}${summaryCard()}</div>${mainChart()}${whatIfCard()}<div class="fc-columns ${breakdown() ? '' : 'single'}">${drivers()}${breakdown()}</div>` : ''}${projectsSection()}${summary.forecast ? accuracyCard() : ''}`;
    return `<section class="dv-page fc-page" aria-labelledby="workspace-heading">${heading}${runBar()}${body}<p class="dv-boundary">${icon('shield')}${t('Sample projects and an illustrative model. Forecasts are advisory: they do not change project plans, and a better scenario result is not a recommendation.', 'مشاريع تجريبية ونموذج توضيحي. التوقعات استشارية: لا تغيّر خطط المشاريع، والنتيجة الأفضل في سيناريو ليست توصية.')}</p></section>`;
  }

  // ---------- Project detail panel ----------
  const scenarioName = s => s.type === 'end' ? t(`End date +${s.months} ${s.months === 1 ? 'month' : 'months'}`, `تاريخ الانتهاء +${s.months} ${s.months === 1 ? 'شهر' : 'أشهر'}`) : `${L(INDEX[s.index].name)} +${s.delta}`;
  function fanChart(project, result) {
    const hist = indexHistory(project).slice(-12);
    const future = result.path.slice(1);
    const months = [...hist.map(h => h.month), ...future.map(p => p.month)];
    const values = [...hist.map(h => h.ipi), ...result.path.flatMap(p => [p.p10, p.p90])];
    const from = Math.max(0, Math.floor(Math.min(...values, PLAN) * 2 - 1) / 2), to = Math.min(5, Math.ceil(Math.max(...values, PLAN) * 2 + 1) / 2);
    const series = [{ cls: 'ipi', values: [...hist.map(h => h.ipi), ...future.map(() => null)] }];
    return lineChart({ series, months, from, to, w: 520, h: 220, forecast: { startIndex: hist.length - 1, points: result.path }, label: t(`IPI history and forecast for ${L(project.name)}. Forecast ${f2(result.forecast.ipi.p50)} in ${month(result.end)}, 80% range ${f2(result.forecast.ipi.p10)} to ${f2(result.forecast.ipi.p90)}.`, `سجل وتوقع IPI لمشروع ${L(project.name)}. التوقع ${f2(result.forecast.ipi.p50)} في ${month(result.end)}، ونطاق 80% من ${f2(result.forecast.ipi.p10)} إلى ${f2(result.forecast.ipi.p90)}.`) });
  }
  function scenarioBuilder(project, result, count) {
    const d = fc.draft;
    const keys = ['pi', 'ai', 'mi', ...(result.hasCost ? ['ci'] : [])];
    const choice = (action, value, label, pressed) => `<button data-action="${action}" data-value="${value}" aria-pressed="${pressed}">${label}</button>`;
    const full = count >= MAX_SCENARIOS;
    return `<div class="fc-builder"><div class="fc-segmented" role="group" aria-label="${t('Scenario type', 'نوع السيناريو')}">${choice('fc-draft-type', 'index', t('Improve an index', 'تحسين مؤشر'), d.type === 'index')}${choice('fc-draft-type', 'end', t('Move the end date', 'تغيير تاريخ الانتهاء'), d.type === 'end')}</div>${d.type === 'index' ? `<p class="fc-builder-label">${t('Index', 'المؤشر')}</p><div class="fc-options" role="group" aria-label="${t('Index', 'المؤشر')}">${keys.map(k => choice('fc-draft-index', k, `${L(INDEX[k].name)} <small>${f2(result.now[k])}</small>`, d.index === k)).join('')}</div><p class="fc-builder-label">${t('Raise it by', 'رفعه بمقدار')}</p><div class="fc-options" role="group" aria-label="${t('Raise it by', 'رفعه بمقدار')}">${[0.25, 0.5, 1].map(v => choice('fc-draft-delta', v, `+${v}`, d.delta === v)).join('')}</div>` : `<p class="fc-builder-label">${t(`Current end date: ${month(project.end)}. Move it by`, `تاريخ الانتهاء الحالي: ${month(project.end)}. تغييره بمقدار`)}</p><div class="fc-options" role="group" aria-label="${t('Move end date by', 'تغيير تاريخ الانتهاء بمقدار')}">${[1, 3, 6].map(v => choice('fc-draft-months', v, t(`+${v} ${v === 1 ? 'month' : 'months'}`, `+${v} ${v === 1 ? 'شهر' : 'أشهر'}`), d.months === v)).join('')}</div>`}<div class="fc-builder-actions"><button class="primary-button" data-action="fc-run-scenario" data-id="${project.id}" ${full ? 'disabled' : ''}>${icon('refresh')}${t('Compare with baseline', 'المقارنة بخط الأساس')}</button><small>${full ? t(`Up to ${MAX_SCENARIOS} scenarios. Remove one to add another.`, `حتى ${MAX_SCENARIOS} سيناريوهات. احذف واحدًا لإضافة آخر.`) : t('The baseline forecast never changes.', 'لا يتغير التوقع الأساسي أبدًا.')}</small></div></div>`;
  }
  function scenarioCard(project, base, s, i) {
    const r = scenarioFor(project.id, s.type === 'end' ? { type: 'end', months: s.months } : { type: 'index', index: s.index, delta: s.delta });
    if (!r || r.status !== 'ok') return `<article class="fc-scenario"><header><h5>${scenarioName(s)}</h5><button class="icon-button small" data-action="fc-remove-scenario" data-id="${project.id}" data-index="${i}" aria-label="${t('Remove scenario', 'حذف السيناريو')}">${icon('close')}</button></header><p class="fc-muted">${t('This scenario is not supported for this project.', 'هذا السيناريو غير مدعوم لهذا المشروع.')}</p></article>`;
    const capped = s.type === 'index' && base.now[s.index] + s.delta > 5;
    const line = (label, a, b, change) => `<tr><th scope="row">${label}</th><td>${a}</td><td>${b}</td><td class="fc-change">${change}</td></tr>`;
    const dChance = Math.round((r.chance - base.chance) * 100);
    const caveat = s.type === 'end' ? t('Same model with a later end date. It does not include the extra cost, contract or dependency effects of a delay. A better score is not a recommendation to delay.', 'النموذج نفسه مع تاريخ انتهاء لاحق. لا يشمل التكلفة الإضافية أو آثار العقود أو الاعتمادات الناتجة عن التأخير. النتيجة الأفضل ليست توصية بالتأخير.') : t(`Assumes ${L(INDEX[s.index].name)} rises by ${s.delta} from now and holds to the end date. Everything else follows the same simulated futures as the baseline.`, `يفترض ارتفاع ${L(INDEX[s.index].name)} بمقدار ${s.delta} من الآن واستمراره حتى تاريخ الانتهاء. ويتبع كل ما عدا ذلك نفس المستقبلات المحاكاة لخط الأساس.`);
    return `<article class="fc-scenario" aria-labelledby="fc-scenario-${i}"><header><h5 id="fc-scenario-${i}" tabindex="-1">${scenarioName(s)}</h5>${outcomeBadge(r.outcome)}<button class="icon-button small" data-action="fc-remove-scenario" data-id="${project.id}" data-index="${i}" aria-label="${t(`Remove scenario ${scenarioName(s)}`, `حذف السيناريو ${scenarioName(s)}`)}">${icon('close')}</button></header><table class="fc-compare"><thead><tr><th scope="col"><span class="sr-only">${t('Measure', 'المقياس')}</span></th><th scope="col">${t('Baseline', 'خط الأساس')}</th><th scope="col">${t('Scenario', 'السيناريو')}</th><th scope="col">${t('Change', 'التغيير')}</th></tr></thead><tbody>${line(t('Forecast IPI', 'IPI المتوقع'), f2(base.forecast.ipi.p50), f2(r.forecast.ipi.p50), signed(r.forecast.ipi.p50 - base.forecast.ipi.p50))}${line(t('80% range', 'نطاق 80%'), `<span dir="ltr">${f2(base.forecast.ipi.p10)}–${f2(base.forecast.ipi.p90)}</span>`, `<span dir="ltr">${f2(r.forecast.ipi.p10)}–${f2(r.forecast.ipi.p90)}</span>`, '')}${line(t('Chance on plan', 'فرصة ضمن الخطة'), pct(base.chance), pct(r.chance), `${dChance > 0 ? '+' : dChance < 0 ? '−' : '±'}${Math.abs(dChance)} ${t('pts', 'نقطة')}`)}${s.type === 'end' ? line(t('End date', 'تاريخ الانتهاء'), month(base.end), month(r.end), `+${s.months}`) + line(t('Progress needed / month', 'التقدم المطلوب / شهر'), `${base.pace.required.toFixed(1)}%`, `${r.pace.required.toFixed(1)}%`, signed(r.pace.required - base.pace.required, 1)) : ''}</tbody></table>${capped ? `<p class="fc-cap">${icon('warning')}${t('Capped at 5, the top of the scale.', 'بحد أقصى 5، أعلى المقياس.')}</p>` : ''}<p class="fc-caveat">${caveat}</p></article>`;
  }
  function panelChanges(id, result) {
    const prev = previousFor(id);
    const project = scoped.find(p => p.id === id);
    const pats = detectPatterns(project);
    const since = prev?.status === 'ok' ? (() => { const d = Math.round((result.chance - prev.chance) * 100); return `<p class="fc-since">${icon('history')}<span>${t(`In the ${month(PREVIOUS_AS_OF)} run: ${L(OUTCOMES[prev.outcome].label).toLowerCase()}, ${pct(prev.chance)} chance on plan`, `في تشغيل ${month(PREVIOUS_AS_OF)}: ${L(OUTCOMES[prev.outcome].label)}، فرصة ${pct(prev.chance)} ضمن الخطة`)} <b class="${d > 2 ? 'on' : d < -2 ? 'below' : ''}">(${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)} ${t('pts', 'نقطة')})</b></span></p>`; })() : `<p class="fc-since">${icon('history')}<span>${t('First forecast for this project.', 'أول توقع لهذا المشروع.')}</span></p>`;
    const list = pats.length ? `<h4>${t('Patterns in recent months', 'أنماط الأشهر الأخيرة')}</h4><ul class="fc-pattern-list">${pats.map(p => { const [title, detail] = alertText({ type: 'pattern', pattern: p, projectId: id }); return `<li class="${p.type === 'rise' ? 'positive' : ''}">${title.replace(/<strong>.*?<\/strong>: /, '')}<small>${detail}</small></li>`; }).join('')}</ul>` : '';
    return since + list;
  }
  function panel(id) {
    const project = scoped.find(p => p.id === id);
    if (!project) return `<p class="inspector-intro">${t('This project is not in your current scope.', 'هذا المشروع ليس ضمن نطاقك الحالي.')}</p>`;
    const result = baselineFor(id);
    const isFollowing = following.has(id);
    const head = `<div class="fc-panel-head"><p class="sample-label">${t('SAMPLE PROJECT FORECAST', 'توقع مشروع تجريبي')}</p><button class="secondary-button fc-follow ${isFollowing ? 'is-on' : ''}" data-action="fc-follow" data-id="${id}" aria-pressed="${isFollowing}">${isFollowing ? '★' : '☆'} ${isFollowing ? t('Following', 'متابَع') : t('Follow', 'متابعة')}</button></div><h3>${L(project.name)}</h3><p class="fc-panel-meta">${L(project.owner)} · ${L(project.sectorLabel)} · ${L(project.portfolioLabel)}</p>`;
    if (result.status !== 'ok') return `${head}<div class="fc-panel-empty">${icon('history')}<div><h4>${t('Not enough history to forecast', 'لا توجد بيانات كافية للتوقع')}</h4><p>${t(`This project has ${result.months} ${result.months === 1 ? 'month' : 'months'} of results. Forecasts need at least ${MIN_HISTORY}, so the first forecast will appear after ${MIN_HISTORY - result.months} more monthly update${MIN_HISTORY - result.months === 1 ? '' : 's'}.`, `لدى هذا المشروع ${result.months} أشهر من النتائج. تحتاج التوقعات إلى ${MIN_HISTORY} على الأقل، لذا سيظهر أول توقع بعد ${MIN_HISTORY - result.months} تحديث شهري إضافي.`)}</p></div></div><dl class="source-metadata"><div><dt>${t('Started', 'البدء')}</dt><dd>${month(project.start)}</dd></div><div><dt>${t('End date', 'تاريخ الانتهاء')}</dt><dd>${month(project.end)}</dd></div></dl>`;
    const r = result.forecast.ipi;
    const list = fc.scenarios[id] || [];
    const w = weights(result.hasCost);
    const pace = result.pace;
    const onTrackPace = pace.current >= pace.required;
    return `${head}<div class="fc-panel-summary">${outcomeBadge(result.outcome)}<p><strong>${pct(result.chance)}</strong> ${t('chance of finishing on plan', 'فرصة الانتهاء ضمن الخطة')}</p></div><dl class="fc-panel-figures"><div><dt>${t('IPI now', 'IPI الآن')}</dt><dd>${f2(result.now.ipi)}</dd></div><div><dt>${t(`Forecast · ${month(result.end)}`, `التوقع · ${month(result.end)}`)}</dt><dd class="${r.p50 < PLAN ? 'below' : 'on'}">${f2(r.p50)}</dd></div><div><dt>${t('80% range', 'نطاق 80%')}</dt><dd dir="ltr">${f2(r.p10)}–${f2(r.p90)}</dd></div></dl><div class="fc-panel-chart">${fanChart(project, result)}<p class="fc-key"><span><i class="fc-line-key ipi"></i>${t('Actual', 'الفعلي')}</span><span><i class="fc-line-key median"></i>${t('Forecast (middle)', 'التوقع (الوسط)')}</span><span><i class="fc-key-band"></i>${t('50% and 80% ranges', 'نطاقا 50% و80%')}</span></p></div>${panelChanges(id, result)}<h4>${t('What drives this forecast', 'ما الذي يحرك هذا التوقع')}</h4><div class="fc-drivers compact">${driverRow({ key: 'ti', now: result.now.ti, end: ti(result.forecast.pi, result.forecast.ai), weight: result.hasCost ? t('50% of IPI', '50% من IPI') : t('75% of IPI', '75% من IPI'), interactive: false })}${result.drivers.map(dv => driverRow({ key: dv.key, now: dv.now, end: dv.end, weight: t(`${Math.round(w[dv.key] * 100)}% of IPI`, `${Math.round(w[dv.key] * 100)}% من IPI`), interactive: false, child: dv.key === 'pi' || dv.key === 'ai', note: dv.key === result.mainDriver && result.outcome !== 'on' ? t('Main driver of the gap to plan', 'العامل الرئيسي للفجوة عن الخطة') : '' })).join('')}</div>${result.hasCost ? '' : `<p class="fc-footnote">${icon('help')}${t('No cost data is reported, so cost is excluded and schedule weighs 75%.', 'لا توجد بيانات تكلفة، لذا تُستبعد التكلفة ويزن الجدول الزمني 75%.')}</p>`}<h4>${t('Progress pace', 'وتيرة التقدم')}</h4><div class="fc-pace"><div><span>${t('Complete now', 'المنجز الآن')}</span><b>${pace.progress.toFixed(0)}%</b><small>${t(`plan: ${pace.planned.toFixed(0)}%`, `المخطط: ${pace.planned.toFixed(0)}%`)}</small></div><div><span>${t('Current pace', 'الوتيرة الحالية')}</span><b>${pace.current.toFixed(1)}%</b><small>${t('per month', 'شهريًا')}</small></div><div class="${onTrackPace ? 'on' : 'below'}"><span>${t('Needed to finish on time', 'المطلوب للانتهاء في الموعد')}</span><b>${pace.required.toFixed(1)}%</b><small>${t(`per month · ${plural(result.remaining, 'month left', 'months left', 'شهر متبقٍ', 'أشهر متبقية')}`, `شهريًا · ${plural(result.remaining, 'month left', 'months left', 'شهر متبقٍ', 'أشهر متبقية')}`)}</small></div></div><section class="fc-scenarios" aria-labelledby="fc-scenarios-title"><h4 id="fc-scenarios-title">${t('Try a scenario', 'جرّب سيناريو')}</h4><p class="inspector-intro">${t('Change one thing and compare it with the baseline forecast.', 'غيّر عاملًا واحدًا وقارنه بالتوقع الأساسي.')}</p>${scenarioBuilder(project, result, list.length)}${list.map((s, i) => scenarioCard(project, result, s, i)).join('')}</section><div class="fc-panel-actions"><button class="secondary-button" data-action="fc-ask-why" data-id="${project.id}">${icon('assistant')}${t('Ask why in AI Assistance', 'اسأل عن السبب في المساعدة الذكية')}</button></div><p class="fc-footnote">${icon('shield')}${t(`${L(RUN.model)} · run ${RUN.id} · as of ${month(AS_OF)}. Scenarios are kept for this session only.`, `${L(RUN.model)} · التشغيل ${RUN.id} · حتى ${month(AS_OF)}. تُحفظ السيناريوهات لهذه الجلسة فقط.`)}</p>`;
  }

  // ---------- AI Assistance explanation (restates the sample forecast) ----------
  function whyQuestion(id) { const p = scoped.find(x => x.id === id); return p ? t(`Why is ${L(p.name)} forecast this way?`, `لماذا جاء توقع ${L(p.name)} بهذا الشكل؟`) : ''; }
  function whyResponse(id) {
    const project = scoped.find(p => p.id === id);
    const result = project && baselineFor(id);
    if (!project) return `<h2>${t('That project is outside your scope', 'هذا المشروع خارج نطاقك')}</h2><p>${t('I can only explain forecasts for projects in your current scope.', 'يمكنني شرح التوقعات للمشاريع ضمن نطاقك الحالي فقط.')}</p>`;
    const open = `<button class="secondary-button" data-action="forecast-open" data-id="${id}">${icon('chart')}${t('Open in Forecasts', 'فتح في التوقعات')}</button>`;
    if (result.status !== 'ok') return `<h2>${t(`${L(project.name)} has no forecast yet`, `لا يوجد توقع لـ ${L(project.name)} بعد`)}</h2><p>${t(`It has ${result.months} months of results and needs ${MIN_HISTORY}.`, `لديه ${result.months} أشهر من النتائج ويحتاج إلى ${MIN_HISTORY}.`)}</p>${open}`;
    const r = result.forecast.ipi, main = result.mainDriver;
    const mainDriver = main ? result.drivers.find(d => d.key === main) : null;
    const title = { on: t(`${L(project.name)} is forecast to finish on plan`, `من المتوقع أن ينتهي ${L(project.name)} ضمن الخطة`), risk: t(`${L(project.name)} is at risk of finishing below plan`, `${L(project.name)} معرّض لخطر الانتهاء دون الخطة`), below: t(`Why ${L(project.name)} is forecast below plan`, `لماذا يُتوقع أن ينتهي ${L(project.name)} دون الخطة`) }[result.outcome];
    return `<div class="response-meta">${t('FORECAST EXPLANATION', 'شرح التوقع')}<span>${t(`As of ${month(AS_OF)} · Sample data`, `حتى ${month(AS_OF)} · بيانات تجريبية`)}</span></div><h2>${title}</h2><p>${t(`Its IPI is <strong>${f2(result.now.ipi)}</strong> now and is forecast at <strong>${f2(r.p50)}</strong> on its end date in ${month(result.end)} (80% range ${f2(r.p10)}–${f2(r.p90)}). In ${pct(result.chance)} of ${RUNS.toLocaleString('en')} simulated futures it finishes at 3 or above.`, `مؤشر IPI الخاص به <strong>${f2(result.now.ipi)}</strong> الآن، ومن المتوقع أن يبلغ <strong>${f2(r.p50)}</strong> في تاريخ انتهائه ${month(result.end)} (نطاق 80% ${f2(r.p10)}–${f2(r.p90)}). في ${pct(result.chance)} من ${RUNS.toLocaleString('en')} مستقبل محاكى ينتهي عند 3 أو أعلى.`)}</p>${mainDriver ? `<p>${t(`The main driver is <strong>${L(INDEX[main].name)}</strong>, forecast at ${f2(mainDriver.end)} against a plan of 3.`, `العامل الرئيسي هو <strong>${L(INDEX[main].name)}</strong>، ومن المتوقع أن يبلغ ${f2(mainDriver.end)} مقابل خطة قدرها 3.`)}${main === 'pi' ? ' ' + t(`Progress is ${result.pace.progress.toFixed(0)}% against ${result.pace.planned.toFixed(0)}% planned. It moves ${result.pace.current.toFixed(1)}% a month and needs ${result.pace.required.toFixed(1)}% to finish on time.`, `التقدم ${result.pace.progress.toFixed(0)}% مقابل ${result.pace.planned.toFixed(0)}% مخطط. يتحرك ${result.pace.current.toFixed(1)}% شهريًا ويحتاج إلى ${result.pace.required.toFixed(1)}% للانتهاء في الموعد.`) : ''}</p>` : `<p>${t('No index is forecast below plan.', 'لا يوجد مؤشر متوقع دون الخطة.')}</p>`}<div class="data-table"><table><thead><tr><th>${t('Index', 'المؤشر')}</th><th>${t('Now', 'الآن')}</th><th>${t('At end', 'عند الانتهاء')}</th></tr></thead><tbody>${result.drivers.map(d => `<tr><td>${L(INDEX[d.key].name)} (${INDEX[d.key].abbr})</td><td>${f2(d.now)}</td><td>${f2(d.end)}</td></tr>`).join('')}</tbody></table></div><p class="small-copy">${t('This explanation restates the sample forecast. It is not a recommendation.', 'يعيد هذا الشرح صياغة التوقع التجريبي. وليس توصية.')}</p>${open}`;
  }

  // ---------- What-if explanation for AI Assistance (snapshot of the slider values when asked) ----------
  const whatIfPayload = () => encodeURIComponent(JSON.stringify({ view: fc.view, target: fc.whatIf.target, values: fc.whatIf.values }));
  function whatIfQuestion() {
    const parts = Object.entries(fc.whatIf.values).map(([k, v]) => `${INDEX[k].abbr} ${f2(v)}`).join(', ');
    return t(`What happens if ${parts}?`, `ماذا يحدث إذا كانت ${parts}؟`);
  }
  function whatIfResponse(encoded) {
    let p; try { p = JSON.parse(decodeURIComponent(encoded)); } catch { p = null; }
    if (!p) return '';
    const [type, value] = String(p.view || 'all').split(/:(.*)/s);
    const list = type === 'project' ? scoped.filter(x => x.id === value) : ['sector', 'portfolio'].includes(type) ? scoped.filter(x => x[type] === value) : scoped;
    const ids = list.filter(x => baselineFor(x.id).status === 'ok').map(x => x.id);
    const targets = ids.includes(p.target) ? [p.target] : ids;
    const w = list.length ? whatIfFor(list, targets, p.values) : null;
    if (!w) return `<h2>${t('No what-if values were set', 'لم يتم تحديد قيم ماذا لو')}</h2>`;
    const b = summaryFor(list), s = w.summary;
    const who = targets.length === 1 ? L(scoped.find(x => x.id === targets[0]).name) : projectsLabel(targets.length);
    const set = Object.entries(w.values).map(([k, v]) => `<li>${L(INDEX[k].name)} (${INDEX[k].abbr}) ${t('held at', 'مثبت عند')} <strong>${f2(v)}</strong></li>`).join('');
    const row = (label, a, c) => `<tr><td>${label}</td><td>${a}</td><td>${c}</td></tr>`;
    return `<div class="response-meta">${t('WHAT-IF EXPLANATION', 'شرح ماذا لو')}<span>${t(`As of ${month(AS_OF)} · Sample data`, `حتى ${month(AS_OF)} · بيانات تجريبية`)}</span></div><h2>${t(`What-if for ${who}`, `ماذا لو لـ ${who}`)}</h2><ul>${set}</ul><p>${t(`Holding these values from now to each end date moves the average IPI at end dates from <strong>${f2(b.end.p50)}</strong> to <strong>${f2(s.end.p50)}</strong> (${signed(s.end.p50 - b.end.p50)}). The average chance of finishing on plan moves from ${pct(b.chance)} to ${pct(s.chance)}.`, `تثبيت هذه القيم من الآن حتى تواريخ الانتهاء ينقل متوسط IPI من <strong>${f2(b.end.p50)}</strong> إلى <strong>${f2(s.end.p50)}</strong> (${signed(s.end.p50 - b.end.p50)}). وتنتقل فرصة الانتهاء ضمن الخطة من ${pct(b.chance)} إلى ${pct(s.chance)}.`)}</p><div class="data-table"><table><thead><tr><th>${t('Outcome', 'النتيجة')}</th><th>${t('Baseline', 'خط الأساس')}</th><th>${t('What-if', 'ماذا لو')}</th></tr></thead><tbody>${row(L(OUTCOMES.on.label), b.counts.on, s.counts.on)}${row(L(OUTCOMES.risk.label), b.counts.risk, s.counts.risk)}${row(L(OUTCOMES.below.label), b.counts.below, s.counts.below)}</tbody></table></div><p class="small-copy">${t('A what-if holds index values constant; it does not say how to reach them, and it does not change any project plan.', 'يثبت سيناريو ماذا لو قيم المؤشرات؛ ولا يوضح كيفية الوصول إليها، ولا يغيّر أي خطة مشروع.')}</p><button class="secondary-button" data-action="workspace-handoff" data-view="forecasts">${icon('chart')}${t('Open in Forecasts', 'فتح في التوقعات')}</button>`;
  }

  // ---------- AI Assistance: suggested questions and answers for the Forecasts page ----------
  const TOPICS = {
    attention: ['Which projects need attention first?', 'ما المشاريع التي تحتاج إلى متابعة أولًا؟', 'warning'],
    changes: [`What changed since the ${month(PREVIOUS_AS_OF)} run?`, `ما الذي تغيّر منذ تشغيل ${month(PREVIOUS_AS_OF)}؟`, 'history'],
    drivers: ['What is pulling projects below plan?', 'ما الذي يدفع المشاريع إلى ما دون الخطة؟', 'chart'],
    summary: ['Summarize the outlook for management', 'لخّص التوقعات للإدارة', 'document'],
  };
  const topics = () => Object.entries(TOPICS).map(([key, [en, arText, symbol]]) => ['forecast-topic:' + key, symbol, t(en, arText)]);
  function topicResponse(key) {
    const meta = `<div class="response-meta">${t('FORECASTS', 'التوقعات')}<span>${t(`As of ${month(AS_OF)} · Sample data`, `حتى ${month(AS_OF)} · بيانات تجريبية`)}</span></div>`;
    const link = (id, extra) => `<button class="source-link" data-action="assist-open" data-view="forecasts" data-id="${escape(id)}">${icon('chart')}<span>${escape(nameOf(id))}${extra ? ` · ${extra}` : ''}</span>${icon('chevron')}</button>`;
    const viewing = viewType === 'all' ? '' : t(` in ${projectsLabel(projects.length)} you are viewing`, ` ضمن ${projectsLabel(projects.length)} المعروضة`);
    if (key === 'attention') {
      const list = rows.filter(r => lens(r.result) && lens(r.result).outcome !== 'on').sort((a, b) => lens(a.result).chance - lens(b.result).chance).slice(0, 5);
      if (!list.length) return `${meta}<h2>${t('No project needs attention right now', 'لا يوجد مشروع يحتاج إلى متابعة الآن')}</h2><p>${t('Every forecast project in this view is on plan.', 'جميع المشاريع المتوقعة في هذا العرض ضمن الخطة.')}</p>`;
      return `${meta}<h2>${t('Projects to look at first', 'المشاريع التي تحتاج إلى متابعة أولًا')}</h2><p>${t(`These have the lowest chance of finishing on plan${viewing}. Open one to see its drivers and try a scenario.`, `هذه المشاريع لديها أقل فرصة للانتهاء ضمن الخطة${viewing}. افتح أحدها لمعرفة العوامل وتجربة سيناريو.`)}</p>${list.map(r => link(r.project.id, `${pct(lens(r.result).chance)} ${t('chance on plan', 'فرصة ضمن الخطة')}`)).join('')}`;
    }
    if (key === 'changes') {
      const changes = alertsFor(projects, { baseline: baselineFor, previous: previousFor, rules: { ...DEFAULT_RULES, patterns: false, improvements: true } });
      const worse = changes.filter(a => a.type === 'worsened').length, better = changes.filter(a => a.type === 'improved').length;
      if (!changes.length) return `${meta}<h2>${t('Nothing changed outcome', 'لم تتغير أي نتيجة')}</h2><p>${t(`No project moved to a different outcome since the ${month(PREVIOUS_AS_OF)} run.`, `لم ينتقل أي مشروع إلى نتيجة مختلفة منذ تشغيل ${month(PREVIOUS_AS_OF)}.`)}</p>`;
      return `${meta}<h2>${t(`Since the ${month(PREVIOUS_AS_OF)} run`, `منذ تشغيل ${month(PREVIOUS_AS_OF)}`)}</h2><p>${t(`${worse} moved to a worse outcome and ${better} improved.`, `انتقل ${worse} إلى نتيجة أسوأ وتحسّن ${better}.`)}</p><ul>${changes.slice(0, 5).map(a => { const [title, detail] = alertText(a); return `<li>${title}. ${detail}</li>`; }).join('')}</ul>${changes.slice(0, 3).map(a => link(a.projectId)).join('')}`;
    }
    if (key === 'drivers') {
      const off = summary.counts.risk + summary.counts.below;
      const list = Object.entries(summary.drivers).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
      if (!list.length) return `${meta}<h2>${t('No project is off plan', 'لا يوجد مشروع خارج الخطة')}</h2>`;
      return `${meta}<h2>${t('What is pulling projects below plan', 'ما الذي يدفع المشاريع إلى ما دون الخطة')}</h2><p>${t(`For the ${off} projects at risk or below plan, this is the index that holds each one back the most:`, `لكل من المشاريع الـ${off} المعرّضة للخطر أو دون الخطة، هذا هو المؤشر الذي يؤخره أكثر:`)}</p><ul>${list.map(([k, n]) => `<li><strong>${L(INDEX[k].name)}</strong> (${INDEX[k].abbr}): ${projectsLabel(n)}</li>`).join('')}</ul><p>${t('Use the what-if sliders on the page to see how much a better value would help.', 'استخدم أشرطة ماذا لو في الصفحة لمعرفة أثر تحسين القيمة.')}</p>`;
    }
    return `${meta}<h2>${t('Forecast summary', 'ملخص التوقعات')}</h2><ul>${summaryLines().map(l => `<li>${escape(l)}</li>`).join('')}</ul><p class="small-copy">${t('Sample data and an illustrative model. Review before sharing.', 'بيانات تجريبية ونموذج توضيحي. راجع قبل المشاركة.')}</p>`;
  }

  return { page, panel, alertSettings, csv, summaryText, whyQuestion, whyResponse, topics, topicResponse, whatIfQuestion, whatIfResponse, whatIfPayload, inScope: id => scoped.some(p => p.id === id), projectName: id => { const p = scoped.find(x => x.id === id); return p ? L(p.name) : ''; } };
}
