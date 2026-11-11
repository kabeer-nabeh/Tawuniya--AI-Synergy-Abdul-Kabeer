// UC03 Data quality: scan overview, findings, finding detail, AI summary, rules and scan trace.
import { runScan, compareScans, priorityObjects } from './quality-engine.js';
import { scopeFor } from './quality-data.js';
import { CATEGORIES, CATEGORY_ORDER, SEVERITIES, SEVERITY_LABEL, OBJECT_TYPES, STATUSES, RULES, RULE_BY_ID, PARAMS, DEFAULT_CONFIG, normalizeConfig, configKey, isEnabled } from './quality-rules.js';
import { can } from './demo-access.js';

export const PAGE_STEP = 12;
export const freshQuality = () => ({
  severity: 'all', category: 'all', objectType: 'all', rule: 'all', status: 'attention', search: '', object: null, newOnly: false, shown: PAGE_STEP,
  selected: null, statuses: {}, config: normalizeConfig(DEFAULT_CONFIG), draft: null, baseline: null, scanMeta: null, scanning: false,
  summary: { state: 'idle', scope: 'all', keys: [], label: '' }, method: false, trace: false, rulesNote: false,
});

const MONTHS = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'] };
export const ATTENTION = ['open', 'acknowledged'];

export function qualityUI({ t, icon, escape, account, q }) {
  const L = pair => t(...pair);
  const ar = t('en', 'ar') === 'ar';
  const config = normalizeConfig(q.config);
  const draft = normalizeConfig(q.draft || q.config);
  const dirty = configKey(draft) !== configKey(config);
  const canAct = can(account, 'scan'), canConfigure = can(account, 'admin');
  const plural = (n, one, many, arOne, arMany) => `${n} ${ar ? (n >= 2 && n <= 10 ? arMany : arOne) : (n === 1 ? one : many)}`;
  const findingsLabel = n => plural(n, 'finding', 'findings', 'ملاحظة', 'ملاحظات');
  const objectsLabel = n => plural(n, 'object', 'objects', 'كائن', 'كائنات');
  const period = p => { if (!p) return '—'; const [y, m] = p.split('-').map(Number); return `${MONTHS[ar ? 'ar' : 'en'][m - 1]} ${y}`; };
  const dateTime = ms => new Date(ms).toLocaleString(ar ? 'ar-SA-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const f1 = n => String(Math.round(n * 10) / 10);

  // ---------- Data in this account's scope ----------
  const scope = scopeFor(account);
  const scan = runScan('current', config);
  const baselineScan = runScan('previous', config);
  const inScope = f => f.objectType === 'project' ? scope.projects.has(f.objectId) : scope.kpis.has(f.objectId);
  const all = scan.findings.filter(inScope);
  const baselineAll = (q.baseline || baselineScan.findings).filter(inScope);
  const cmp = compareScans(all, baselineAll);
  const newKeys = new Set(cmp.added.map(f => f.key));
  const statusOf = f => q.statuses[f.key]?.status || 'open';
  const attention = all.filter(f => ATTENTION.includes(statusOf(f)));
  const reviewedCount = all.length - attention.length;
  const affected = new Set(attention.map(f => `${f.objectType}:${f.objectId}`)).size;
  const objectsInScope = scope.projects.size + scope.kpis.size;
  const sev = Object.fromEntries(SEVERITIES.map(s => [s, attention.filter(f => f.severity === s).length]));
  const scanId = q.scanMeta?.id || scan.scan.id;
  const scanWhen = q.scanMeta ? dateTime(q.scanMeta.at) : L(scan.scan.label);
  const baselineId = q.baseline ? q.scanMeta?.previousId : baselineScan.scan.id;

  const sevBadge = s => `<span class="dq-sev ${s}">${L(SEVERITY_LABEL[s])}</span>`;
  const statusBadge = st => st === 'open' ? `<span class="dq-status open">${L(STATUSES.open)}</span>` : `<span class="dq-status ${st}">${icon(st === 'acknowledged' ? 'eye' : 'check')}${L(STATUSES[st])}</span>`;
  const catName = c => L(CATEGORIES[c].name);
  const stack = (counts, order) => { const parts = order.filter(k => counts[k]); return `<span class="fc-stack tall" aria-hidden="true">${parts.map(k => `<span class="dq-seg ${k}" style="flex-grow:${counts[k]}"></span>`).join('') || '<span class="none" style="flex-grow:1"></span>'}</span>`; };

  // ---------- Filters ----------
  const matches = f => {
    const st = statusOf(f);
    if (q.status === 'attention' ? !ATTENTION.includes(st) : q.status !== 'all' && st !== q.status) return false;
    if (q.severity !== 'all' && f.severity !== q.severity) return false;
    if (q.category !== 'all' && f.category !== q.category) return false;
    if (q.objectType !== 'all' && f.objectType !== q.objectType) return false;
    if (q.rule !== 'all' && f.ruleId !== q.rule) return false;
    if (q.object && `${f.objectType}:${f.objectId}` !== q.object) return false;
    if (q.newOnly && !newKeys.has(f.key)) return false;
    const needle = q.search.trim().toLowerCase();
    if (needle && ![f.code, f.objectName[0], f.objectName[1], f.title[0], f.title[1], f.reason[0], f.reason[1], f.owner[0], f.owner[1], f.period || ''].join(' ').toLowerCase().includes(needle)) return false;
    return true;
  };
  const filtered = all.filter(matches);
  const hasFilters = q.severity !== 'all' || q.category !== 'all' || q.objectType !== 'all' || q.rule !== 'all' || q.status !== 'attention' || q.object || q.newOnly || q.search.trim();

  // ---------- Run bar ----------
  function runBar() {
    return `<div class="fc-runbar dq-runbar"><span>${icon('history')}${t('Scan', 'الفحص')} ${scanId} · ${scanWhen}</span><span>${icon('check-circle')}${t(`${plural(scope.projects.size, 'project', 'projects', 'مشروع', 'مشاريع')} and ${plural(scope.kpis.size, 'KPI', 'KPIs', 'مؤشر', 'مؤشرات')} checked`, `تم فحص ${plural(scope.projects.size, 'project', 'projects', 'مشروع', 'مشاريع')} و${plural(scope.kpis.size, 'KPI', 'KPIs', 'مؤشر', 'مؤشرات')}`)}</span><span>${icon('shield')}${t(`${scan.coverage.rules} of ${RULES.length} rules on`, `${scan.coverage.rules} من ${RULES.length} قاعدة مفعّلة`)}</span><span class="fc-sample">${t('Sample data · illustrative rules', 'بيانات تجريبية · قواعد توضيحية')}</span><span class="dq-run-actions"><button class="text-button" data-action="dq-method" aria-expanded="${q.method}" aria-controls="dq-method">${icon('help')}${t('How detection works', 'كيف يعمل الكشف')}</button><button class="text-button" data-action="dq-rules">${icon('settings')}${t('Rules', 'القواعد')}${dirty ? `<span class="dq-dot" title="${t('Unapplied changes', 'تغييرات غير مطبقة')}"></span>` : ''}</button><button class="secondary-button" data-action="dq-rescan" ${q.scanning || !canAct ? 'disabled' : ''} ${canAct ? '' : `title="${t('Re-scan is available to EPMO and project managers', 'إعادة الفحص متاحة لمكتب إدارة المشاريع ومديري المشاريع')}"`}>${icon('refresh')}${q.scanning ? t('Scanning…', 'جارٍ الفحص…') : t('Re-scan', 'إعادة الفحص')}</button></span></div>${q.method ? method() : ''}`;
  }
  function method() {
    return `<section class="fc-method dq-method" id="dq-method" aria-label="${t('How detection works', 'كيف يعمل الكشف')}"><div><h3>${t('Detection finds issues', 'الكشف يجد المشكلات')}</h3><p>${t(`Rules and simple statistics check every project record and KPI value. Every finding has a reason computed by code, such as “112.5% is outside 0–100%”. There are no hidden scores.`, 'تفحص القواعد والإحصاءات البسيطة كل سجل مشروع وكل قيمة مؤشر. لكل ملاحظة سبب محسوب بالشيفرة، مثل "112.5% خارج النطاق 0–100%". ولا توجد درجات خفية.')}</p></div><div><h3>${t('AI explains and summarizes', 'الذكاء الاصطناعي يشرح ويلخّص')}</h3><p>${t('After detection, AI can write a summary and plain-language explanations. It can only repeat numbers the scan computed, and it never decides what is an issue.', 'بعد الكشف يمكن للذكاء الاصطناعي كتابة ملخص وشروح مبسطة. ولا يكرّر إلا أرقامًا حسبها الفحص، ولا يقرر ما هو مشكلة.')}</p></div><div><h3>${t('You decide', 'أنت تقرر')}</h3><p>${t('For each finding you can acknowledge it, explain why it is correct, or mark it as a false positive. Fixing data happens in Synergy: this tool never changes records. Re-scan afterwards to confirm.', 'لكل ملاحظة يمكنك الاطلاع عليها أو تبرير صحتها أو تحديدها كإنذار خاطئ. وتصحيح البيانات يتم في سينرجي: هذه الأداة لا تغيّر السجلات أبدًا. أعد الفحص بعدها للتأكد.')}</p></div><p class="fc-method-note">${icon('shield')}${t('Rule set, severities and thresholds are working assumptions to confirm with EPMO. In production the engine runs on the approved model gateway with Corporater APIs only (no direct database access), on a schedule and on demand.', 'مجموعة القواعد ودرجات الخطورة والحدود افتراضات عمل تحتاج إلى تأكيد من مكتب إدارة المشاريع. في الإنتاج يعمل المحرك عبر بوابة النموذج المعتمدة وواجهات Corporater فقط (دون وصول مباشر إلى قاعدة البيانات)، بجدولة وعند الطلب.')}</p></section>`;
  }
  const dirtyBanner = () => dirty && !q.scanning ? `<div class="fc-banner info" role="status">${icon('settings')}<div><strong>${t('Rule changes are not applied yet', 'تغييرات القواعد لم تُطبَّق بعد')}</strong><p>${t('Re-scan to see the results with your new rules. Existing review notes are kept.', 'أعد الفحص لرؤية النتائج بالقواعد الجديدة. تبقى ملاحظات المراجعة الحالية.')}</p></div>${canConfigure ? `<button class="secondary-button" data-action="dq-rescan">${icon('refresh')}${t('Re-scan with new rules', 'إعادة الفحص بالقواعد الجديدة')}</button>` : ''}</div>` : '';
  const scanningState = () => `<div class="fc-loading" aria-busy="true" role="status"><p>${icon('refresh')}${t(`Scanning ${plural(scope.projects.size, 'project', 'projects', 'مشروع', 'مشاريع')} and ${plural(scope.kpis.size, 'KPI', 'KPIs', 'مؤشر', 'مؤشرات')}…`, `جارٍ فحص ${plural(scope.projects.size, 'project', 'projects', 'مشروع', 'مشاريع')} و${plural(scope.kpis.size, 'KPI', 'KPIs', 'مؤشر', 'مؤشرات')}…`)}</p><div class="fc-skeleton tall"></div><div class="fc-skeleton-row"><div class="fc-skeleton"></div><div class="fc-skeleton"></div></div></div>`;

  // ---------- Overview ----------
  function overview() {
    const high = sev.high;
    const headline = attention.length ? t(`<strong>${findingsLabel(attention.length)}</strong> need attention across ${affected} of ${objectsInScope} objects.`, `<strong>${findingsLabel(attention.length)}</strong> تحتاج إلى متابعة في ${affected} من ${objectsInScope} كائنًا.`) : t(`<strong class="on">No findings need attention.</strong> All ${objectsInScope} objects in scope passed the active rules.`, `<strong class="on">لا توجد ملاحظات تحتاج إلى متابعة.</strong> اجتازت جميع الكائنات البالغ عددها ${objectsInScope} القواعد المفعّلة.`);
    const sub = attention.length ? [high ? t(`${high} ${high === 1 ? 'is' : 'are'} high severity.`, `${high} منها مرتفعة الخطورة.`) : t('None is high severity.', 'لا توجد ملاحظات مرتفعة الخطورة.'), reviewedCount ? t(`${reviewedCount} more ${reviewedCount === 1 ? 'was' : 'were'} explained or marked as false positive.`, `و${reviewedCount} أخرى تم تبريرها أو تحديدها كإنذارات خاطئة.`) : ''].filter(Boolean).join(' ') : (reviewedCount ? t(`${reviewedCount} reviewed ${reviewedCount === 1 ? 'finding was' : 'findings were'} explained or marked as false positive.`, `تمت مراجعة ${reviewedCount} من الملاحظات وتبريرها أو تحديدها كإنذارات خاطئة.`) : '');
    const legend = SEVERITIES.map(s => `<button class="fc-legend-item ${s}" data-action="dq-severity" data-value="${s}" aria-pressed="${q.severity === s}" ${sev[s] ? '' : 'disabled'}><span class="dq-swatch ${s}"></span><strong>${sev[s]}</strong>${L(SEVERITY_LABEL[s])}</button>`).join('');
    const change = (cls, n, label) => `<li class="${cls}"><b>${n}</b><span>${label}</span></li>`;
    const changeBlock = `<div class="fc-outlook-ipi dq-changes"><p class="dv-eyebrow">${t(`SINCE ${baselineId}`, `منذ ${baselineId}`)}</p><ul class="dq-change-list">${change('new', cmp.added.length, t('new findings', 'ملاحظات جديدة'))}${change('resolved', cmp.resolved.length, t('resolved', 'تمت معالجتها'))}${change('same', cmp.persisting.length, t('still present', 'لا تزال قائمة'))}</ul>${cmp.added.length ? `<button class="text-button" data-action="dq-show-new">${t(`Show the ${cmp.added.length} new`, `عرض الجديدة (${cmp.added.length})`)}${icon('right')}</button>` : ''}${cmp.resolved.length ? `<details class="dq-resolved"><summary>${t(`See ${cmp.resolved.length} resolved`, `عرض المعالجة (${cmp.resolved.length})`)}</summary><ul>${cmp.resolved.slice(0, 8).map(f => `<li>${icon('check')}<span>${escape(L(f.objectName))} · ${escape(L(f.title))}</span></li>`).join('')}</ul></details>` : ''}<p class="fc-note">${t('A finding counts as resolved when the latest scan no longer detects it, including when its rule was switched off or loosened.', 'تُعد الملاحظة معالجة عندما لا يكتشفها آخر فحص، بما في ذلك عند إيقاف قاعدتها أو تخفيف حدّها.')}</p></div>`;
    return `<section class="fc-card fc-outlook dq-overview" aria-labelledby="dq-overview-title"><div class="fc-outlook-main"><p class="dv-eyebrow">${t('SCAN RESULT', 'نتيجة الفحص')}</p><h2 id="dq-overview-title" class="fc-headline">${headline}</h2><p class="fc-sub">${sub}</p>${stack(sev, SEVERITIES)}<div class="fc-legend" role="group" aria-label="${t('Filter findings by severity', 'تصفية الملاحظات حسب الخطورة')}">${legend}</div></div>${changeBlock}</section>`;
  }

  // ---------- Categories and priorities ----------
  function categories() {
    const max = Math.max(1, ...CATEGORY_ORDER.map(c => attention.filter(f => f.category === c).length));
    const rows = CATEGORY_ORDER.map(c => {
      const n = attention.filter(f => f.category === c).length, was = baselineAll.filter(f => f.category === c).length, now = all.filter(f => f.category === c).length;
      const d = now - was;
      return `<button class="dq-cat-row" data-action="dq-category" data-value="${c}" aria-pressed="${q.category === c}" ${n || q.category === c ? '' : 'disabled'}><span class="dq-cat-name"><strong>${catName(c)}</strong><small>${L(CATEGORIES[c].hint)}</small></span><span class="dq-cat-bar" aria-hidden="true"><span style="width:${Math.round(n / max * 100)}%"></span></span><span class="dq-cat-count">${n}</span><span class="dq-cat-delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}" title="${t('Change since the previous scan', 'التغير منذ الفحص السابق')}">${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${Math.abs(d) || ''}</span></button>`;
    }).join('');
    return `<section class="fc-card dq-categories" aria-labelledby="dq-cat-title"><div class="dv-section-heading"><h2 id="dq-cat-title">${t('What kind of problems', 'أنواع المشكلات')}</h2><span>${t('Needs attention · vs previous scan', 'تحتاج متابعة · مقارنة بالفحص السابق')}</span></div><div class="dq-cats" role="group" aria-label="${t('Filter findings by category', 'تصفية الملاحظات حسب الفئة')}">${rows}</div></section>`;
  }
  function priorities() {
    const top = priorityObjects(attention, 5);
    if (!top.length) return `<section class="fc-card dq-priorities"><div class="dv-section-heading"><h2>${t('Fix first', 'ابدأ بهذه')}</h2></div><p class="fc-alert-empty">${icon('check-circle')}${t('Nothing to fix right now.', 'لا شيء يحتاج إلى إصلاح الآن.')}</p></section>`;
    const owners = new Map();
    attention.forEach(f => { const k = L(f.owner); owners.set(k, (owners.get(k) || 0) + 1); });
    const topOwners = [...owners.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    return `<section class="fc-card dq-priorities" aria-labelledby="dq-fix-title"><div class="dv-section-heading"><div><h2 id="dq-fix-title">${t('Fix first', 'ابدأ بهذه')}</h2><p class="dv-helper">${t('Objects with the most serious findings. High counts 5, medium 2, low 1.', 'الكائنات ذات الملاحظات الأخطر. المرتفعة بـ 5 والمتوسطة بـ 2 والمنخفضة بـ 1.')}</p></div></div><ol class="dq-fix-list">${top.map(o => `<li><button data-action="dq-object" data-value="${escape(`${o.objectType}:${o.objectId}`)}" aria-pressed="${q.object === `${o.objectType}:${o.objectId}`}"><span class="dq-fix-main"><strong>${escape(L(o.name))}</strong><small>${L(OBJECT_TYPES[o.objectType])} · ${escape(L(o.owner))}</small></span><span class="dq-fix-counts">${o.high ? `<span class="dq-sev high">${o.high} ${t('high', 'مرتفعة')}</span>` : ''}<span class="dq-total">${findingsLabel(o.total)}</span></span></button></li>`).join('')}</ol>${topOwners.length > 1 ? `<p class="dq-owner-line">${icon('briefcase')}<span>${t('Most findings sit with', 'أكثر الملاحظات لدى')} ${topOwners.map(([name, n]) => `<strong>${escape(name)}</strong> (${n})`).join(ar ? '، ' : ', ')}.</span></p>` : ''}</section>`;
  }

  // ---------- AI summary ----------
  function summaryParts(list, whole) {
    const numbers = [];
    const N = (label, value) => { numbers.push({ label, value }); return value; };
    const high = list.filter(f => f.severity === 'high');
    const objs = new Set(list.map(f => `${f.objectType}:${f.objectId}`)).size;
    const byCat = CATEGORY_ORDER.map(c => [c, list.filter(f => f.category === c).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
    const paras = [];
    paras.push(whole
      ? t(`This scan checked ${N('Projects checked', scope.projects.size)} projects and ${N('KPIs checked', scope.kpis.size)} KPIs. ${N('Findings needing attention', list.length)} findings need attention across ${N('Objects affected', objs)} objects, and ${N('High severity', high.length)} are high severity.`, `فحص هذا الفحص ${N('Projects checked', scope.projects.size)} مشروعًا و${N('KPIs checked', scope.kpis.size)} مؤشرًا. تحتاج ${N('Findings needing attention', list.length)} ملاحظة إلى متابعة في ${N('Objects affected', objs)} كائنًا، منها ${N('High severity', high.length)} مرتفعة الخطورة.`)
      : t(`The ${N('Findings in this view', list.length)} findings in the current view affect ${N('Objects affected', objs)} objects, and ${N('High severity', high.length)} are high severity.`, `تؤثر الملاحظات الـ ${N('Findings in this view', list.length)} في العرض الحالي على ${N('Objects affected', objs)} كائنًا، منها ${N('High severity', high.length)} مرتفعة الخطورة.`));
    if (byCat.length) paras.push(byCat.length === 1 ? t(`All of them are ${catName(byCat[0][0]).toLowerCase()} issues.`, `جميعها مشكلات من فئة ${catName(byCat[0][0])}.`) : t(`The largest group is ${catName(byCat[0][0]).toLowerCase()} (${N(catName(byCat[0][0]), byCat[0][1])}), followed by ${catName(byCat[1][0]).toLowerCase()} (${N(catName(byCat[1][0]), byCat[1][1])}).`, `أكبر مجموعة هي ${catName(byCat[0][0])} (${N(catName(byCat[0][0]), byCat[0][1])})، تليها ${catName(byCat[1][0])} (${N(catName(byCat[1][0]), byCat[1][1])}).`));
    const byRule = [...new Set(high.map(f => f.ruleId))].map(r => [r, high.filter(f => f.ruleId === r).length]).sort((a, b) => b[1] - a[1]).slice(0, 2);
    if (byRule.length) paras.push(t(`Start with the high-severity findings: ${byRule.map(([r, n]) => `${N(L(RULE_BY_ID[r].title), n)} × ${L(RULE_BY_ID[r].title).toLowerCase()}`).join(' and ')}. They change numbers that reports and forecasts rely on.`, `ابدأ بالملاحظات مرتفعة الخطورة: ${byRule.map(([r, n]) => `${N(L(RULE_BY_ID[r].title), n)} × ${L(RULE_BY_ID[r].title)}`).join(' و')}. فهي تغيّر أرقامًا تعتمد عليها التقارير والتوقعات.`));
    const owners = new Map(); list.forEach(f => owners.set(L(f.owner), (owners.get(L(f.owner)) || 0) + 1));
    const topOwner = [...owners.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topOwner && owners.size > 1) paras.push(t(`Most findings sit with ${topOwner[0]} (${N('Findings with top owner', topOwner[1])}).`, `أكثر الملاحظات لدى ${topOwner[0]} (${N('Findings with top owner', topOwner[1])}).`));
    if (whole) paras.push(t(`Compared with ${baselineId}, ${N('New findings', cmp.added.length)} findings are new and ${N('Resolved findings', cmp.resolved.length)} were resolved.`, `مقارنة بـ ${baselineId}، هناك ${N('New findings', cmp.added.length)} ملاحظة جديدة و${N('Resolved findings', cmp.resolved.length)} تمت معالجتها.`));
    return { paras, numbers };
  }
  function summaryCard() {
    const s = q.summary;
    const busy = s.state === 'writing';
    const chosen = s.scope === 'filtered';
    const scopeControl = `<div class="fc-segmented" role="group" aria-label="${t('What to summarize', 'ما الذي سيُلخَّص')}"><button data-action="dq-summary-scope" data-value="all" aria-pressed="${!chosen}">${t(`All needing attention (${attention.length})`, `كل ما يحتاج متابعة (${attention.length})`)}</button><button data-action="dq-summary-scope" data-value="filtered" aria-pressed="${chosen}" ${hasFilters ? '' : 'disabled'}>${t(`Current view (${filtered.length})`, `العرض الحالي (${filtered.length})`)}</button></div>`;
    let body;
    if (busy) body = `<div class="dq-writing" aria-busy="true" role="status"><p>${icon('refresh')}${t('Writing a summary from the scan numbers…', 'جارٍ كتابة ملخص من أرقام الفحص…')}</p><div class="fc-skeleton" style="height:14px;margin-bottom:8px"></div><div class="fc-skeleton" style="height:14px;width:82%;margin-bottom:8px"></div><div class="fc-skeleton" style="height:14px;width:64%"></div></div>`;
    else if (s.state === 'done') {
      const list = s.keys.map(k => scan.byKey.get(k)).filter(Boolean);
      const { paras, numbers } = summaryParts(list, s.whole);
      body = `<div class="dq-summary-body"><p class="dq-summary-scope">${icon('document')}${t('Summary of', 'ملخص لـ')} <strong>${escape(s.label)}</strong></p>${paras.map(p => `<p>${p}</p>`).join('')}<details class="dq-trace-numbers"><summary>${icon('check-circle')}${t(`Number traceability: ${numbers.length} numbers, all from scan ${scanId}`, `تتبّع الأرقام: ${numbers.length} رقمًا، جميعها من الفحص ${scanId}`)}</summary><ul>${numbers.map(n => `<li><span>${escape(n.label)}</span><b>${n.value}</b></li>`).join('')}</ul></details><div class="fc-summary-actions"><button class="secondary-button" data-action="dq-copy-summary">${icon('copy')}${t('Copy summary', 'نسخ الملخص')}</button><button class="text-button" data-action="dq-summarize">${icon('refresh')}${t('Write again', 'اكتب مرة أخرى')}</button></div></div>`;
    } else body = `<p class="fc-sub">${t('Get a short, readable summary of what the scan found and where to start. It only repeats numbers computed by the scan.', 'احصل على ملخص قصير ومقروء لما وجده الفحص ومن أين تبدأ. ولا يكرّر إلا أرقامًا حسبها الفحص.')}</p>${scopeControl}<div class="fc-summary-actions"><button class="primary-button" data-action="dq-summarize" ${attention.length || filtered.length ? '' : 'disabled'}>${icon('assistant')}${t('Write AI summary', 'اكتب ملخصًا بالذكاء الاصطناعي')}</button></div>`;
    return `<section class="fc-card fc-summary dq-summary" aria-labelledby="dq-summary-title"><div class="dv-section-heading"><div><h2 id="dq-summary-title">${t('AI summary', 'ملخص الذكاء الاصطناعي')}</h2><p class="dv-helper">${t('Written after detection. Review before sharing.', 'يُكتب بعد الكشف. راجعه قبل المشاركة.')}</p></div><span class="fc-sample">${icon('assistant')}${t('Sample template', 'قالب تجريبي')}</span></div>${body}</section>`;
  }

  // ---------- Findings table ----------
  function filterBar() {
    const opt = (v, l, cur) => `<option value="${escape(v)}" ${v === cur ? 'selected' : ''}>${escape(l)}</option>`;
    const select = (id, label, options) => `<label class="dq-filter"><span class="sr-only">${label}</span><select id="${id}">${options}</select>${icon('chevron')}</label>`;
    const ruleOptions = opt('all', t('All rules', 'كل القواعد'), q.rule) + CATEGORY_ORDER.map(c => `<optgroup label="${escape(catName(c))}">${RULES.filter(r => r.category === c).map(r => opt(r.id, L(r.title), q.rule)).join('')}</optgroup>`).join('');
    return `<div class="dq-filters">${select('dq-severity-select', t('Severity', 'الخطورة'), opt('all', t('All severities', 'كل درجات الخطورة'), q.severity) + SEVERITIES.map(s => opt(s, L(SEVERITY_LABEL[s]), q.severity)).join(''))}${select('dq-category-select', t('Category', 'الفئة'), opt('all', t('All categories', 'كل الفئات'), q.category) + CATEGORY_ORDER.map(c => opt(c, catName(c), q.category)).join(''))}${select('dq-type-select', t('Object type', 'نوع الكائن'), opt('all', t('Projects and KPIs', 'المشاريع والمؤشرات'), q.objectType) + Object.entries(OBJECT_TYPES).map(([k, v]) => opt(k, L(v), q.objectType)).join(''))}${select('dq-rule-select', t('Rule', 'القاعدة'), ruleOptions)}${select('dq-status-select', t('Review status', 'حالة المراجعة'), opt('attention', t('Needs attention', 'تحتاج متابعة'), q.status) + opt('all', t('All statuses', 'كل الحالات'), q.status) + Object.entries(STATUSES).map(([k, v]) => opt(k, L(v), q.status)).join(''))}<label class="dq-search"><span class="sr-only">${t('Search findings', 'بحث في الملاحظات')}</span>${icon('eye')}<input id="dq-search" type="search" value="${escape(q.search)}" placeholder="${t('Search ID, name, owner, reason…', 'ابحث بالمعرّف أو الاسم أو المالك أو السبب…')}" autocomplete="off"></label></div>`;
  }
  function chips() {
    if (!hasFilters) return '';
    const chip = (action, text) => `<button class="fc-chip" data-action="${action}" aria-label="${t(`Remove filter ${text}`, `إزالة عامل التصفية ${text}`)}">${escape(text)}${icon('close')}</button>`;
    const out = [];
    if (q.object) { const f = all.find(x => `${x.objectType}:${x.objectId}` === q.object); out.push(chip('dq-clear-object', f ? L(f.objectName) : q.object)); }
    if (q.newOnly) out.push(chip('dq-clear-new', t('New since last scan', 'جديدة منذ الفحص السابق')));
    if (q.status !== 'attention') out.push(chip('dq-clear-status', q.status === 'all' ? t('All statuses', 'كل الحالات') : L(STATUSES[q.status])));
    return `<div class="fc-chips" role="group" aria-label="${t('Active filters', 'عوامل التصفية النشطة')}">${out.join('')}<button class="text-button" data-action="dq-clear">${t('Clear all filters', 'مسح كل عوامل التصفية')}</button></div>`;
  }
  function row(f) {
    const st = statusOf(f);
    return `<tr class="${newKeys.has(f.key) ? 'is-new' : ''}"><td data-label="${t('Severity', 'الخطورة')}">${sevBadge(f.severity)}</td><th scope="row"><button class="fc-project-name dq-finding-name" data-action="dq-open" data-key="${escape(f.key)}"><strong>${escape(L(f.title))}${newKeys.has(f.key) ? `<span class="dq-new">${t('New', 'جديد')}</span>` : ''}</strong><small>${catName(f.category)}</small></button></th><td class="dq-object"><strong>${escape(L(f.objectName))}</strong><small>${L(OBJECT_TYPES[f.objectType])} · ${escape(f.code)}</small></td><td>${period(f.period)}</td><td class="dq-reason">${escape(L(f.reason))}</td><td>${statusBadge(st)}</td><td class="fc-row-go">${icon('chevron')}</td></tr>`;
  }
  function findingsSection() {
    const visible = filtered.slice(0, q.shown);
    const more = filtered.length - visible.length;
    return `<section class="fc-card dq-findings" aria-labelledby="dq-findings-title"><div class="dv-section-heading fc-projects-heading"><div><h2 id="dq-findings-title">${t('Findings', 'الملاحظات')}</h2><p class="dv-helper" aria-live="polite">${t(`Showing ${visible.length} of ${filtered.length}${hasFilters ? ` matching (${all.length} in scope)` : ''}. Select a finding for evidence and review options.`, `عرض ${visible.length} من ${filtered.length}${hasFilters ? ` مطابقة (${all.length} ضمن النطاق)` : ''}. اختر ملاحظة لعرض الأدلة وخيارات المراجعة.`)}</p></div><button class="secondary-button" data-action="dq-export" ${filtered.length ? '' : 'disabled'}>${icon('document')}${t('Download CSV', 'تنزيل CSV')}</button></div>${filterBar()}${chips()}${filtered.length ? `<div class="fc-table-wrap"><table class="fc-table dq-table"><caption class="sr-only">${t('Data-quality findings', 'ملاحظات جودة البيانات')}</caption><thead><tr><th scope="col">${t('Severity', 'الخطورة')}</th><th scope="col">${t('Finding', 'الملاحظة')}</th><th scope="col">${t('Object', 'الكائن')}</th><th scope="col">${t('Period', 'الفترة')}</th><th scope="col">${t('Reason', 'السبب')}</th><th scope="col">${t('Review', 'المراجعة')}</th><th scope="col"><span class="sr-only">${t('Open', 'فتح')}</span></th></tr></thead><tbody>${visible.map(row).join('')}</tbody></table></div>${more > 0 ? `<button class="secondary-button fc-show-all" data-action="dq-more">${t(`Show ${Math.min(PAGE_STEP, more)} more (${more} left)`, `عرض ${Math.min(PAGE_STEP, more)} أخرى (متبقٍ ${more})`)}</button>` : ''}` : `<div class="dv-filter-empty">${all.length ? t('No findings match these filters.', 'لا توجد ملاحظات مطابقة لعوامل التصفية.') : t('No findings in this scope.', 'لا توجد ملاحظات في هذا النطاق.')} ${hasFilters ? `<button class="text-button" data-action="dq-clear">${t('Clear filters', 'مسح عوامل التصفية')}</button>` : ''}</div>`}</section>`;
  }
  function trace() {
    const byCat = CATEGORY_ORDER.map(c => `${catName(c)} ${all.filter(f => f.category === c).length}`).join(' · ');
    const steps = [
      [t('Read records', 'قراءة السجلات'), t(`${scope.projects.size} project records, ${scope.kpis.size} KPI definitions and their monthly values, through the Corporater API (sample data here).`, `${scope.projects.size} سجل مشروع و${scope.kpis.size} تعريف مؤشر وقيمها الشهرية عبر واجهة Corporater (بيانات تجريبية هنا).`)],
      [t('Apply rules', 'تطبيق القواعد'), t(`${scan.coverage.rules} rules checked completeness, validity, consistency, uniqueness and timeliness. ${byCat}.`, `فحصت ${scan.coverage.rules} قاعدة الاكتمال والصلاحية والاتساق والتفرد والتوقيت. ${byCat}.`)],
      [t('Statistical checks', 'الفحوص الإحصائية'), t(`${scope.kpis.size} KPI series were checked for spikes, sustained level shifts and repeated values. Values that failed validity checks were left out so they cannot hide other problems.`, `فُحصت ${scope.kpis.size} سلسلة مؤشرات بحثًا عن القفزات وتغيّر المستوى المستمر والقيم المكررة. استُبعدت القيم التي فشلت في فحوص الصلاحية كي لا تخفي مشكلات أخرى.`)],
      [t('AI summary (optional)', 'ملخص الذكاء الاصطناعي (اختياري)'), t('Runs only when you ask. It rewrites numbers computed above and never decides what counts as an issue.', 'يعمل عند الطلب فقط. يعيد صياغة أرقام حُسبت أعلاه ولا يقرر ما يُعد مشكلة.')],
    ];
    return `<div class="dq-trace"><button class="text-button" data-action="dq-trace" aria-expanded="${q.trace}" aria-controls="dq-trace-body">${icon('history')}${q.trace ? t('Hide scan details', 'إخفاء تفاصيل الفحص') : t('Show how this scan ran', 'عرض كيفية تنفيذ هذا الفحص')}</button>${q.trace ? `<ol class="dq-trace-steps" id="dq-trace-body">${steps.map(([h, d], i) => `<li><span>${i + 1}</span><div><strong>${h}</strong><p>${d}</p></div></li>`).join('')}</ol>` : ''}</div>`;
  }

  function page() {
    const heading = `<div class="dv-page-heading"><div><h1 id="workspace-heading">${t('Data quality', 'جودة البيانات')}</h1><p>${t('Find incomplete, invalid or unusual project and KPI data before it reaches reports and forecasts.', 'اكتشف بيانات المشاريع والمؤشرات الناقصة أو غير الصحيحة أو غير المعتادة قبل أن تصل إلى التقارير والتوقعات.')}</p></div><div class="fc-heading-side"><span class="scope-tag">${icon('briefcase')}${L(account.scopeLabel)} · ${plural(scope.projects.size, 'project', 'projects', 'مشروع', 'مشاريع')}${scope.kpis.size ? ` · ${plural(scope.kpis.size, 'KPI', 'KPIs', 'مؤشر', 'مؤشرات')}` : ''}</span></div></div>`;
    if (!objectsInScope) return `<section class="dv-page fc-page dq-page" aria-labelledby="workspace-heading">${heading}<div class="scope-empty">${icon('briefcase')}<h3>${t('Nothing to scan', 'لا يوجد ما يُفحص')}</h3><p>${t('This demo account has no assigned projects or KPIs. Switch accounts to explore data quality.', 'لا توجد مشاريع أو مؤشرات مسندة لهذا الحساب التجريبي. بدّل الحساب لاستكشاف جودة البيانات.')}</p><button class="text-button" data-action="accounts">${t('Switch demo account', 'تبديل الحساب التجريبي')}${icon('right')}</button></div></section>`;
    const kpiNote = !scope.kpis.size ? `<p class="fc-footnote">${icon('help')}${t('KPI findings belong to sector owners and are shown to EPMO and sector leadership. Your scope shows project findings only.', 'ملاحظات المؤشرات تخص مالكي القطاعات وتظهر لمكتب إدارة المشاريع وقيادة القطاعات. يعرض نطاقك ملاحظات المشاريع فقط.')}</p>` : '';
    const viewOnly = !canAct ? `<p class="fc-footnote">${icon('eye')}${t('View only. EPMO and project managers can re-scan and review findings. This is a working assumption to confirm.', 'عرض فقط. يمكن لمكتب إدارة المشاريع ومديري المشاريع إعادة الفحص ومراجعة الملاحظات. هذا افتراض عمل يحتاج إلى تأكيد.')}</p>` : '';
    const body = q.scanning ? scanningState() : `${dirtyBanner()}${overview()}<div class="fc-columns fc-columns-even">${categories()}${priorities()}</div>${summaryCard()}${findingsSection()}`;
    return `<section class="dv-page fc-page dq-page" aria-labelledby="workspace-heading">${heading}${runBar()}${body}${trace()}${kpiNote}${viewOnly}<p class="dv-boundary">${icon('shield')}${t('Sample data and illustrative rules. This tool detects and explains issues; it never corrects data. Fix records in Synergy, then re-scan.', 'بيانات تجريبية وقواعد توضيحية. تكتشف هذه الأداة المشكلات وتشرحها ولا تصحّح البيانات أبدًا. صحّح السجلات في سينرجي ثم أعد الفحص.')}</p></section>`;
  }

  // ---------- Finding detail ----------
  function kpiChart(series) {
    const pts = series.points, flags = new Set(series.flags);
    const base = pts.filter(p => p.value != null && !flags.has(p.period)).map(p => p.value);
    if (base.length < 3) return '';
    let lo = Math.min(...base), hi = Math.max(...base);
    const r = Math.max(hi - lo, 1);
    lo -= r * 0.2; hi += r * 0.2;
    const span = hi - lo;
    const pinned = {};
    for (const p of pts) if (flags.has(p.period) && p.value != null) { if (p.value > hi + span * 1.2) { pinned[p.period] = 'top'; } else if (p.value < lo - span * 1.2) { pinned[p.period] = 'bottom'; } else { lo = Math.min(lo, p.value - r * 0.1); hi = Math.max(hi, p.value + r * 0.1); } }
    const w = 460, h = 150, left = 34, right = 10, top = 14, bottom = 24, n = pts.length;
    const x = i => left + (n <= 1 ? 0 : i / (n - 1) * (w - left - right)), y = v => top + (1 - (v - lo) / (hi - lo)) * (h - top - bottom);
    const segs = []; let cur = [];
    pts.forEach((p, i) => { if (p.value == null || pinned[p.period]) { if (cur.length) segs.push(cur); cur = []; } else cur.push(`${x(i).toFixed(1)},${y(p.value).toFixed(1)}`); });
    if (cur.length) segs.push(cur);
    const marks = pts.map((p, i) => { if (!flags.has(p.period)) return ''; if (p.value == null) return `<line class="dq-miss" x1="${x(i)}" x2="${x(i)}" y1="${top}" y2="${h - bottom}"/><text class="dq-flag-label" x="${x(i)}" y="${top + 10}" text-anchor="middle">${t('missing', 'مفقود')}</text>`; const py = pinned[p.period] === 'top' ? top + 2 : pinned[p.period] === 'bottom' ? h - bottom - 2 : y(p.value); return `<circle class="dq-flag" cx="${x(i)}" cy="${py}" r="5"/><text class="dq-flag-label" x="${x(i)}" y="${py + (pinned[p.period] === 'bottom' ? -9 : py < top + 16 ? 16 : -9)}" text-anchor="middle">${pinned[p.period] === 'top' ? '↑ ' : pinned[p.period] === 'bottom' ? '↓ ' : ''}${Math.round(p.value * 100) / 100}</text>`; }).join('');
    const ticks = pts.map((p, i) => (i === 0 || i === n - 1 || i % 6 === 0) && !(i !== n - 1 && n - 1 - i < 3) ? `<text class="fc-axis" x="${x(i)}" y="${h - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${period(p.period)}</text>` : '').join('');
    const unit = series.unit === '%' ? '%' : '';
    return `<svg class="dq-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${t(`KPI values for the last ${n} periods. The flagged value is highlighted.`, `قيم المؤشر لآخر ${n} فترة. القيمة المُبلَّغ عنها مميّزة.`)}" dir="ltr"><line class="fc-grid" x1="${left}" x2="${w - right}" y1="${y(lo + span * 0.1)}" y2="${y(lo + span * 0.1)}"/><line class="fc-grid" x1="${left}" x2="${w - right}" y1="${y(hi - span * 0.1)}" y2="${y(hi - span * 0.1)}"/><text class="fc-axis" x="${left - 6}" y="${y(hi - span * 0.1) + 3}" text-anchor="end">${Math.round(hi - span * 0.1)}${unit}</text><text class="fc-axis" x="${left - 6}" y="${y(lo + span * 0.1) + 3}" text-anchor="end">${Math.round(lo + span * 0.1)}${unit}</text>${segs.map(s => `<polyline class="dq-line" points="${s.join(' ')}"/>`).join('')}${marks}${ticks}</svg>`;
  }
  function auditTrail(f) {
    const h = q.statuses[f.key]?.history || [];
    const events = [{ text: newKeys.has(f.key) ? t(`Detected in scan ${scanId} (new)`, `اكتُشفت في الفحص ${scanId} (جديدة)`) : t(`Detected in scan ${baselineId} or earlier, still present in ${scanId}`, `اكتُشفت في الفحص ${baselineId} أو قبله، ولا تزال قائمة في ${scanId}`), at: null }, ...h.map(e => ({ text: `${L(STATUSES[e.status])}${e.note ? `: “${escape(e.note)}”` : ''} — ${escape(e.by)}`, at: e.at }))];
    return `<ol class="dq-audit">${events.map(e => `<li><span class="dq-audit-dot"></span><div><p>${e.text}</p>${e.at ? `<small>${dateTime(e.at)}</small>` : `<small>${scanWhen}</small>`}</div></li>`).join('')}</ol>`;
  }
  function findingPanel(key) {
    const f = all.find(x => x.key === key);
    if (!f) return `<p class="inspector-intro">${t('This finding is not in your current scope or is no longer detected.', 'هذه الملاحظة ليست ضمن نطاقك الحالي أو لم تعد تُكتشف.')}</p>`;
    const rule = RULE_BY_ID[f.ruleId], st = statusOf(f), entry = q.statuses[f.key];
    const idx = filtered.findIndex(x => x.key === key), prev = idx > 0 ? filtered[idx - 1] : null, next = idx >= 0 && idx < filtered.length - 1 ? filtered[idx + 1] : null;
    const nav = idx >= 0 ? `<div class="dq-nav"><button class="text-button" data-action="dq-open" data-key="${prev ? escape(prev.key) : ''}" ${prev ? '' : 'disabled'}>${icon('right')}${t('Previous', 'السابقة')}</button><span>${idx + 1} / ${filtered.length}</span><button class="text-button" data-action="dq-open" data-key="${next ? escape(next.key) : ''}" ${next ? '' : 'disabled'}>${t('Next', 'التالية')}${icon('right')}</button></div>` : '';
    const review = canAct ? `<div class="dq-review"><label for="dq-note">${t('Note', 'ملاحظة')} <small>${t('(required to explain or mark as a false positive)', '(مطلوبة للتبرير أو للتحديد كإنذار خاطئ)')}</small></label><textarea id="dq-note" rows="2" maxlength="240" placeholder="${t('For example: the target was changed on purpose after the restructure.', 'مثال: تم تغيير المستهدف عمدًا بعد إعادة الهيكلة.')}">${escape(entry?.note || '')}</textarea><div class="dq-review-actions">${st !== 'acknowledged' ? `<button class="secondary-button" data-action="dq-status" data-value="acknowledged" data-key="${escape(f.key)}">${icon('eye')}${t('Acknowledge', 'تم الاطلاع')}</button>` : ''}<button class="secondary-button" data-action="dq-status" data-value="explained" data-key="${escape(f.key)}">${icon('check')}${t('Mark explained', 'تحديد كمبرَّر')}</button><button class="secondary-button" data-action="dq-status" data-value="false-positive" data-key="${escape(f.key)}">${icon('close')}${t('False positive', 'إنذار خاطئ')}</button>${st !== 'open' ? `<button class="text-button" data-action="dq-status" data-value="open" data-key="${escape(f.key)}">${icon('refresh')}${t('Reopen', 'إعادة فتح')}</button>` : ''}</div><p class="fc-footnote">${icon('shield')}${t('Marking a finding does not change Synergy data. Explained and false-positive findings are hidden from “Needs attention” but kept in the audit trail.', 'تحديد الملاحظة لا يغيّر بيانات سينرجي. تُخفى الملاحظات المبرَّرة والإنذارات الخاطئة من "تحتاج متابعة" لكنها تبقى في سجل التدقيق.')}</p></div>` : `<p class="fc-footnote">${icon('eye')}${t('View only. EPMO and project managers can review findings.', 'عرض فقط. يمكن لمكتب إدارة المشاريع ومديري المشاريع مراجعة الملاحظات.')}</p>`;
    return `<div class="dq-panel-head"><span>${sevBadge(f.severity)}<span class="dq-cat-chip">${catName(f.category)}</span>${statusBadge(st)}</span></div><h3>${escape(L(f.title))}</h3><p class="fc-panel-meta"><strong>${escape(L(f.objectName))}</strong> · ${L(OBJECT_TYPES[f.objectType])} · ${escape(f.code)}${f.period ? ` · ${period(f.period)}` : ''}</p>${nav}<h4>${t('Why it was flagged', 'سبب الإبلاغ')}</h4><p class="dq-reason-big">${escape(L(f.reason))}</p><p class="fc-footnote">${icon('check-circle')}${t('This reason was computed by the rule, not written by AI.', 'حُسب هذا السبب بواسطة القاعدة ولم يكتبه الذكاء الاصطناعي.')}</p><h4>${t('Evidence', 'الأدلة')}</h4><dl class="source-metadata dq-evidence">${f.evidence.map(e => `<div><dt>${L(e.label)}</dt><dd>${escape(e.value)}</dd></div>`).join('')}</dl>${f.series ? `<div class="dq-chart-wrap">${kpiChart(f.series)}</div>` : ''}<h4>${t('What it means', 'ماذا يعني')}</h4><p class="dq-prose">${L(rule.what)}</p><h4>${t('What to do', 'ما العمل')}</h4><p class="dq-prose">${L(rule.fix)}</p><p class="dq-owner">${icon('briefcase')}<span>${t('Who can fix it', 'من يستطيع الإصلاح')}: <strong>${escape(L(f.owner))}</strong><small>${t('Correct the record in Synergy, then re-scan to confirm.', 'صحّح السجل في سينرجي ثم أعد الفحص للتأكد.')}</small></span></p><p class="fc-footnote">${icon('assistant')}${t('Explanation text is a sample template. In production the approved model writes it from the computed evidence.', 'نص الشرح قالب تجريبي. في الإنتاج يكتبه النموذج المعتمد من الأدلة المحسوبة.')}</p><h4>${t('Review', 'المراجعة')}</h4>${review}<h4>${t('Audit trail', 'سجل التدقيق')}</h4>${auditTrail(f)}<div class="fc-panel-actions"><button class="secondary-button" data-action="dq-ask-why" data-key="${escape(f.key)}">${icon('assistant')}${t('Ask in AI Assistance', 'اسأل في المساعدة الذكية')}</button></div>`;
  }

  // ---------- Rules panel ----------
  function rulesPanel() {
    const group = c => `<section class="dq-rule-group"><h4>${catName(c)}</h4>${RULES.filter(r => r.category === c).map(r => {
      const on = isEnabled(draft, r.id), param = Object.entries(PARAMS).find(([, p]) => p.rule === r.id);
      return `<div class="dq-rule ${on ? '' : 'is-off'}"><button class="dq-rule-toggle" data-action="dq-rule-toggle" data-value="${r.id}" aria-pressed="${on}" ${canConfigure ? '' : 'disabled'}><span class="dq-switch" aria-hidden="true"></span><span><strong>${L(r.title)}</strong><small>${sevBadge(r.severity)} ${L(OBJECT_TYPES[r.objectType])}</small></span></button>${on && param ? `<div class="dq-param"><p>${L(param[1].label)}</p><div class="fc-options" role="group" aria-label="${L(param[1].label)}">${param[1].options.map(v => `<button data-action="dq-param" data-param="${param[0]}" data-value="${v}" aria-pressed="${draft.params[param[0]] === v}" ${canConfigure ? '' : 'disabled'}>${v}</button>`).join('')}</div><small>${L(param[1].note)}</small></div>` : ''}</div>`;
    }).join('')}</section>`;
    return `<p class="inspector-intro">${t('Choose which rules run and how sensitive the statistical checks are. Changes take effect when you re-scan.', 'اختر القواعد التي تعمل ومدى حساسية الفحوص الإحصائية. تسري التغييرات عند إعادة الفحص.')}</p>${canConfigure ? '' : `<div class="fc-banner info" role="note">${icon('eye')}<div><strong>${t('View only', 'عرض فقط')}</strong><p>${t('Rules are set by EPMO for everyone, so your account can read but not change them.', 'تحدد إدارة المشاريع القواعد للجميع، لذا يمكن لحسابك قراءتها دون تغييرها.')}</p></div></div>`}${CATEGORY_ORDER.map(group).join('')}${canConfigure ? `<div class="dq-rules-footer"><button class="primary-button" data-action="dq-rescan" ${dirty ? '' : 'disabled'}>${icon('refresh')}${t('Re-scan with these rules', 'إعادة الفحص بهذه القواعد')}</button><button class="text-button" data-action="dq-rules-reset" ${configKey(draft) !== configKey(DEFAULT_CONFIG) ? '' : 'disabled'}>${t('Reset to defaults', 'استعادة الافتراضي')}</button></div><p class="fc-footnote">${icon('chat')}${t('Alerts by email or Synergy notifications are not connected in this prototype.', 'التنبيهات عبر البريد الإلكتروني أو إشعارات سينرجي غير متصلة في هذا النموذج.')}</p>` : ''}`;
  }

  // ---------- Export, assistant text ----------
  function csv() {
    const head = ['Scan', 'Severity', 'Category', 'Finding', 'Object type', 'Object ID', 'Object name', 'Sector', 'Owner', 'Period', 'Reason', 'Review status', 'Review note'];
    const cell = v => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = filtered.map(f => [scanId, f.severity, f.category, f.title[0], f.objectType, f.code, f.objectName[0], f.sector || '', f.owner[0], f.period || '', f.reason[0], statusOf(f), q.statuses[f.key]?.note || '']);
    return { filename: `data-quality-${scanId}.csv`, content: '﻿' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n') };
  }
  function summaryText() {
    const s = q.summary, list = s.keys.map(k => scan.byKey.get(k)).filter(Boolean);
    const { paras } = summaryParts(list, s.whole);
    return [t(`Data-quality summary · ${L(account.scopeLabel)} · scan ${scanId}`, `ملخص جودة البيانات · ${L(account.scopeLabel)} · الفحص ${scanId}`), t(`Summary of ${s.label}`, `ملخص لـ ${s.label}`), ...paras.map(p => `• ${p.replace(/<[^>]+>/g, '')}`), t('Sample data. Advisory only.', 'بيانات تجريبية. استشاري فقط.')].join('\n');
  }
  const whyQuestion = key => { const f = all.find(x => x.key === key); return f ? t(`Why was ${L(f.objectName)} flagged for “${L(f.title)}”?`, `لماذا أُبلغ عن ${L(f.objectName)} بسبب "${L(f.title)}"؟`) : ''; };
  function whyResponse(key) {
    const f = all.find(x => x.key === key);
    if (!f) return `<h2>${t('That finding is outside your scope', 'هذه الملاحظة خارج نطاقك')}</h2><p>${t('I can only explain findings for objects in your current scope.', 'يمكنني شرح الملاحظات للكائنات ضمن نطاقك الحالي فقط.')}</p>`;
    const rule = RULE_BY_ID[f.ruleId], st = statusOf(f);
    return `<div class="response-meta">${t('DATA-QUALITY EXPLANATION', 'شرح جودة البيانات')}<span>${t(`Scan ${scanId} · Sample data`, `الفحص ${scanId} · بيانات تجريبية`)}</span></div><h2>${escape(L(f.objectName))}: ${escape(L(f.title))}</h2><p>${t('Why it was flagged', 'سبب الإبلاغ')}: <strong>${escape(L(f.reason))}</strong></p><p>${L(rule.what)}</p><p>${t('What to do', 'ما العمل')}: ${L(rule.fix)} ${t(`Owner: ${L(f.owner)}.`, `المالك: ${L(f.owner)}.`)}</p>${st !== 'open' ? `<p class="small-copy">${t(`Review status: ${L(STATUSES[st])}.`, `حالة المراجعة: ${L(STATUSES[st])}.`)}</p>` : ''}<p class="small-copy">${t('The reason above was computed by the rule. This explanation is written from it and does not change any data.', 'حُسب السبب أعلاه بواسطة القاعدة. كُتب هذا الشرح منه ولا يغيّر أي بيانات.')}</p><button class="secondary-button" data-action="quality-open" data-key="${escape(f.key)}">${icon('shield')}${t('Open in Data quality', 'فتح في جودة البيانات')}</button>`;
  }

  return {
    page, findingPanel, rulesPanel, csv, summaryText, whyQuestion, whyResponse,
    ctx: { all, attention, filtered, scan, scanId, baselineId, cmp, config, draft, dirty, canAct, canConfigure, inScope, scope, statusOf, summaryKeys: which => (which === 'filtered' ? filtered : attention).map(f => f.key), hasFilters, newKeys, objectsInScope },
  };
}
