// Deterministic data-quality detection. Rules (validity, completeness, ...) and simple statistics produce findings;
// every finding carries a reason and evidence computed by code. AI only explains and summarizes them afterwards.
import { RULE_BY_ID, RULES, isEnabled, normalizeConfig, configKey } from './quality-rules.js';
import { datasetFor, daysBetween, endOfMonth } from './quality-data.js';
import { addMonths, monthsBetween } from './forecast-model.js';

const bi = (en, ar) => [en, ar];
const fmt = v => String(Math.round(Number(v) * 100) / 100);
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
const mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1)); };
const mad = (a, m = median(a)) => median(a.map(v => Math.abs(v - m))) * 1.4826;
const STATUS_WORD = { active: bi('active', 'النشط'), 'on-hold': bi('on-hold', 'المتوقف'), 'not-started': bi('not-started', 'الذي لم يبدأ'), completed: bi('completed', 'المكتمل') };
const RATIO_NAME = { ai: bi('Start delay (AI)', 'تأخر البدء (AI)'), mi: bi('Deliverables (MI)', 'المخرجات (MI)'), ci: bi('Cost (CI)', 'التكلفة (CI)') };
export const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };

const row = (en, ar, value) => ({ label: bi(en, ar), value: String(value) });

/** One scan of a snapshot with a rule configuration. Results are cached per snapshot and configuration. */
const cache = new Map();
export function runScan(snapshot, configInput) {
  const config = normalizeConfig(configInput);
  const key = `${snapshot}|${configKey(config)}`;
  if (cache.has(key)) return cache.get(key);
  const data = datasetFor(snapshot);
  const findings = [];
  const on = id => isEnabled(config, id);

  const add = (ruleId, object, extra) => {
    if (!on(ruleId)) return;
    const rule = RULE_BY_ID[ruleId];
    const detail = extra.period || extra.sub || '';
    findings.push({
      key: `${ruleId}|${object.id}|${detail}`, ruleId, category: rule.category, severity: extra.severity || rule.severity, title: rule.title,
      objectType: rule.objectType, objectId: object.id, objectName: object.name, sector: object.sector, owner: object.owner,
      period: extra.period || null, reason: extra.reason, evidence: extra.evidence || [], series: extra.series || null,
      code: object.code || object.id,
    });
  };

  // ---------- Projects ----------
  for (const p of data.projects) {
    const status = STATUS_WORD[p.status] || STATUS_WORD.active;
    const tracked = p.status === 'active' || p.status === 'on-hold' || p.status === 'completed';
    const base = [row('Status', 'الحالة', p.status), row('Project ID', 'معرّف المشروع', p.code.replace(/ /g, '␠'))];
    if (p.budget == null && tracked) add('c-missing-budget', p, { reason: bi(`No current budget is recorded for this ${status[0]} project.`, `لا توجد ميزانية حالية مسجّلة لهذا المشروع ${status[1]}.`), evidence: [...base, row('Current budget', 'الميزانية الحالية', '—')] });
    if (!p.manager) add('c-missing-manager', p, { reason: bi('No project manager is assigned.', 'لم يُعيَّن مدير للمشروع.'), evidence: [...base, row('Project manager', 'مدير المشروع', '—')] });
    if (!p.phase) add('c-missing-phase', p, { reason: bi('No project phase is set.', 'لم تُحدَّد مرحلة المشروع.'), evidence: [...base, row('Phase', 'المرحلة', '—')] });
    if (!p.actualStart && (p.status === 'active' || p.status === 'completed')) add('c-missing-start', p, { reason: bi(`This ${status[0]} project has no actual start date.`, `لا يوجد تاريخ بدء فعلي لهذا المشروع ${status[1]}.`), evidence: [...base, row('Planned start', 'البدء المخطط', p.start), row('Actual start', 'البدء الفعلي', '—')] });
    for (const [key, ratio] of Object.entries(p.ratios)) {
      if (ratio > 1) add('v-ratio-cap', p, { sub: key, reason: bi(`${RATIO_NAME[key][0]} ratio is ${fmt(ratio)}; the cap is 1.0.`, `نسبة ${RATIO_NAME[key][1]} هي ${fmt(ratio)}؛ والحد الأقصى 1.0.`), evidence: [...base, row(`${RATIO_NAME[key][0]} ratio`, `نسبة ${RATIO_NAME[key][1]}`, fmt(ratio)), row('Cap', 'الحد الأقصى', '1.0')] });
    }
    if (p.planned > 100) add('v-planned-over-100', p, { reason: bi(`Planned progress is ${fmt(p.planned)}%; it cannot exceed 100%.`, `التقدم المخطط ${fmt(p.planned)}%؛ ولا يمكن أن يتجاوز 100%.`), evidence: [...base, row('Planned progress', 'التقدم المخطط', `${fmt(p.planned)}%`), row('Actual progress', 'التقدم الفعلي', `${fmt(p.progress)}%`)] });
    const stray = [...new Set(p.code.match(/[^A-Za-z0-9_-]/g) || [])];
    if (stray.length) add('v-stray-chars', p, { reason: bi(`Project ID "${p.code.replace(/ /g, '␠')}" contains a character that is not allowed (${stray.map(c => c === ' ' ? 'space' : c).join(', ')}).`, `يحتوي معرّف المشروع "${p.code.replace(/ /g, '␠')}" على حرف غير مسموح (${stray.map(c => c === ' ' ? 'مسافة' : c).join('، ')}).`), evidence: [row('Project ID', 'معرّف المشروع', p.code.replace(/ /g, '␠')), row('Allowed characters', 'الأحرف المسموحة', 'A–Z a–z 0–9 _ -')] });
    if (p.status === 'active' && p.progress >= 100) add('s-active-complete', p, { reason: bi(`Status is Active but progress is ${fmt(p.progress)}%.`, `الحالة نشط لكن التقدم ${fmt(p.progress)}%.`), evidence: [...base, row('Progress', 'التقدم', `${fmt(p.progress)}%`), row('End date', 'تاريخ الانتهاء', p.end)] });
    if (p.status === 'not-started' && p.progress > 0) add('s-notstarted-progress', p, { reason: bi(`Status is Not started but progress is ${fmt(p.progress)}%.`, `الحالة لم يبدأ لكن التقدم ${fmt(p.progress)}%.`), evidence: [...base, row('Progress', 'التقدم', `${fmt(p.progress)}%`)] });
    if (p.status === 'on-hold' && !p.resumeDate) add('s-hold-no-resume', p, { reason: bi('Status is On hold with no expected resume date.', 'الحالة متوقف دون تاريخ استئناف متوقع.'), evidence: [...base, row('Expected resume date', 'تاريخ الاستئناف المتوقع', '—')] });
    if (p.start > p.end) add('s-dates-order', p, { reason: bi(`End date ${p.end} is before start date ${p.start}.`, `تاريخ الانتهاء ${p.end} قبل تاريخ البدء ${p.start}.`), evidence: [row('Start date', 'تاريخ البدء', p.start), row('End date', 'تاريخ الانتهاء', p.end)] });
    if (p.status === 'active' && p.end < data.scan.date) {
      const days = daysBetween(p.end, data.scan.date);
      add('t-past-end', p, { severity: days > 60 ? 'high' : 'medium', reason: bi(`Still active ${days} days after its end date ${p.end}.`, `لا يزال نشطًا بعد ${days} يومًا من تاريخ انتهائه ${p.end}.`), evidence: [...base, row('End date', 'تاريخ الانتهاء', p.end), row('Days past end', 'أيام بعد الانتهاء', days), row('Progress', 'التقدم', `${fmt(p.progress)}%`)] });
    }
    if (p.status === 'on-hold' && p.resumeDate && p.resumeDate < data.scan.date) {
      const days = daysBetween(p.resumeDate, data.scan.date);
      add('t-overdue-resume', p, { reason: bi(`Planned resume date ${p.resumeDate} passed ${days} days ago; the project is still on hold.`, `مضى تاريخ الاستئناف المخطط ${p.resumeDate} قبل ${days} يومًا؛ والمشروع لا يزال متوقفًا.`), evidence: [...base, row('Planned resume', 'الاستئناف المخطط', p.resumeDate), row('Days overdue', 'أيام التأخر', days)] });
    }
  }

  // ---------- KPIs ----------
  for (const k of data.kpis) {
    const periods = [];
    for (let p = k.firstPeriod; monthsBetween(p, k.lastPeriod) >= 0; p = addMonths(p, 1)) periods.push(p);
    const byPeriod = new Map();
    for (const e of k.entries) (byPeriod.get(e.period) || byPeriod.set(e.period, []).get(e.period)).push(e);
    const latest = p => { const list = byPeriod.get(p); return list ? list.at(-1).value : null; };
    const unit = k.unit === '%' ? '%' : '';
    const withUnit = v => `${fmt(v)}${unit}`;
    const inRange = periods.map(latest).filter(v => v != null && (k.unit !== '%' || (v >= 0 && v <= 100)));
    const typical = median(inRange.filter(v => v > 0));
    const bad = new Set();
    const seriesOf = flag => ({ unit: k.unit, flags: [flag].flat(), points: periods.slice(-18).map(p => ({ period: p, value: latest(p) })) });
    const objectBase = [row('KPI', 'المؤشر', `${k.id} · ${k.name[0]}`)];

    for (const p of periods) {
      const v = latest(p); if (v == null) continue;
      if (k.unit === '%' && (v < 0 || v > 100)) {
        bad.add(p);
        add('v-percent-range', k, { period: p, reason: bi(`${fmt(v)}% is outside 0–100%.`, `${fmt(v)}% خارج النطاق 0–100%.`), evidence: [...objectBase, row('Period', 'الفترة', p), row('Value', 'القيمة', `${fmt(v)}%`), row('Allowed range', 'النطاق المسموح', '0–100%')], series: seriesOf(p) });
      } else if (typical >= 10 && v > 0 && v / typical >= 0.004 && v / typical <= 0.02) {
        bad.add(p);
        add('v-scale-100', k, { period: p, reason: bi(`${fmt(v)} vs a typical ${fmt(typical)} — looks like a percentage entered as a fraction.`, `${fmt(v)} مقابل ${fmt(typical)} المعتاد — يبدو أن النسبة أُدخلت ككسر.`), evidence: [...objectBase, row('Period', 'الفترة', p), row('Value', 'القيمة', fmt(v)), row('Typical level', 'المستوى المعتاد', fmt(typical)), row('Ratio to typical', 'النسبة إلى المعتاد', fmt(v / typical))], series: seriesOf(p) });
      }
    }
    for (const p of periods) {
      if (byPeriod.has(p)) continue;
      const i = periods.indexOf(p), prev = [...periods.slice(0, i)].reverse().map(latest).find(v => v != null), next = periods.slice(i + 1).map(latest).find(v => v != null);
      add('c-missing-period', k, { period: p, severity: p === k.lastPeriod ? 'high' : 'medium', reason: bi(p === k.lastPeriod ? `No value for ${p}, the latest period.` : `No value for ${p}.`, p === k.lastPeriod ? `لا توجد قيمة للفترة ${p}، وهي الأحدث.` : `لا توجد قيمة للفترة ${p}.`), evidence: [...objectBase, row('Period', 'الفترة', p), row('Value before', 'القيمة السابقة', prev == null ? '—' : withUnit(prev)), row('Value after', 'القيمة اللاحقة', next == null ? '—' : withUnit(next))], series: seriesOf(p) });
    }
    for (const [p, list] of byPeriod) {
      if (list.length > 1) {
        const [a, b] = list;
        add('u-dup-period', k, { period: p, reason: bi(`Two entries for ${p}: ${withUnit(a.value)} (entered ${a.enteredOn}) and ${withUnit(b.value)} (entered ${b.enteredOn}).`, `إدخالان للفترة ${p}: ${withUnit(a.value)} (أُدخل في ${a.enteredOn}) و${withUnit(b.value)} (أُدخل في ${b.enteredOn}).`), evidence: [...objectBase, row('Period', 'الفترة', p), row('First entry', 'الإدخال الأول', `${withUnit(a.value)} · ${a.enteredOn}`), row('Second entry', 'الإدخال الثاني', `${withUnit(b.value)} · ${b.enteredOn}`), row('Difference', 'الفرق', fmt(Math.abs(b.value - a.value)))], series: seriesOf(p) });
      }
      const first = list[0], days = daysBetween(endOfMonth(p), first.enteredOn);
      if (days > config.params.lateDays) add('t-late-entry', k, { period: p, reason: bi(`${p} value entered ${days} days after the period ended (limit ${config.params.lateDays} days).`, `أُدخلت قيمة ${p} بعد ${days} يومًا من نهاية الفترة (الحد ${config.params.lateDays} يومًا).`), evidence: [...objectBase, row('Period ended', 'نهاية الفترة', endOfMonth(p)), row('Entered on', 'تاريخ الإدخال', first.enteredOn), row('Days late', 'أيام التأخير', days), row('Allowed', 'المسموح', `${config.params.lateDays}`)], series: seriesOf(p) });
    }

    // Statistics use only values that passed the validity checks, so one bad number cannot hide another.
    const valid = periods.map(p => ({ period: p, value: latest(p) })).filter(x => x.value != null && !bad.has(x.period));
    const vals = valid.map(x => x.value);
    for (let i = 6; i < vals.length; i++) {
      const baseVals = vals.slice(i - 6, i), med = median(baseVals);
      const sdv = Math.max(mad(baseVals, med), 0.02 * Math.abs(med), 0.3), dev = vals[i] - med, z = dev / sdv;
      if (Math.abs(z) < config.params.spikeZ) continue;
      const half = Math.abs(dev) / 2;
      if (Math.abs(vals[i - 1] - med) >= half || (i + 1 < vals.length && Math.abs(vals[i + 1] - med) >= half)) continue;
      const p = valid[i].period, above = dev > 0;
      add('x-spike', k, { period: p, reason: bi(`${p}: ${withUnit(vals[i])} is ${fmt(Math.abs(z))} standard deviations ${above ? 'above' : 'below'} the typical ${withUnit(med)} of the previous 6 periods.`, `${p}: ${withUnit(vals[i])} ${above ? 'أعلى' : 'أدنى'} بـ ${fmt(Math.abs(z))} انحرافًا معياريًا من المعتاد ${withUnit(med)} في الفترات الـ 6 السابقة.`), evidence: [...objectBase, row('Period', 'الفترة', p), row('Value', 'القيمة', withUnit(vals[i])), row('Typical (previous 6)', 'المعتاد (آخر 6)', withUnit(med)), row('Deviation', 'الانحراف', `${above ? '+' : '−'}${fmt(Math.abs(dev))}`), row('Next period', 'الفترة التالية', i + 1 < vals.length ? withUnit(vals[i + 1]) : '—')], series: seriesOf(p) });
    }
    if (vals.length >= 9) {
      const recent = vals.slice(-3), before = vals.slice(-9, -3), mb = mean(before), sdb = Math.max(sd(before), 0.02 * Math.abs(mb), 0.3), diff = mean(recent) - mb;
      if (Math.abs(diff) >= config.params.shiftSd * sdb && recent.every(v => Math.sign(v - mb) === Math.sign(diff) && Math.abs(v - mb) >= 1.5 * sdb)) {
        const p = valid.at(-3).period, up = diff > 0;
        add('x-shift', k, { period: p, reason: bi(`Last 3 periods average ${withUnit(mean(recent))} vs ${withUnit(mb)} before — a sustained ${up ? 'rise' : 'fall'} of ${fmt(Math.abs(diff))} (${fmt(Math.abs(diff / mb) * 100)}%) since ${p}.`, `متوسط آخر 3 فترات ${withUnit(mean(recent))} مقابل ${withUnit(mb)} قبلها — ${up ? 'ارتفاع' : 'انخفاض'} مستمر بمقدار ${fmt(Math.abs(diff))} (${fmt(Math.abs(diff / mb) * 100)}%) منذ ${p}.`), evidence: [...objectBase, row('Shift starts', 'بداية التغيّر', p), row('Average before (6 periods)', 'المتوسط قبل (6 فترات)', withUnit(mb)), row('Average since (3 periods)', 'المتوسط منذ (3 فترات)', withUnit(mean(recent))), row('Change', 'التغيّر', `${up ? '+' : '−'}${fmt(Math.abs(diff))}`)], series: seriesOf(valid.slice(-3).map(x => x.period)) });
      }
    }
    let runStart = 0;
    for (let i = 1; i <= valid.length; i++) {
      const same = i < valid.length && valid[i].value === valid[runStart].value && monthsBetween(valid[i - 1].period, valid[i].period) === 1;
      if (same) continue;
      const len = i - runStart;
      if (len >= config.params.repeatMin) {
        const from = valid[runStart].period, to = valid[i - 1].period;
        add('x-repeat', k, { period: to, reason: bi(`The value ${withUnit(valid[runStart].value)} repeats for ${len} periods in a row (${from} to ${to}).`, `تتكرر القيمة ${withUnit(valid[runStart].value)} لـ ${len} فترات متتالية (من ${from} إلى ${to}).`), evidence: [...objectBase, row('Value', 'القيمة', withUnit(valid[runStart].value)), row('Periods in a row', 'فترات متتالية', len), row('From', 'من', from), row('To', 'إلى', to)], series: seriesOf(valid.slice(runStart, i).map(x => x.period)) });
      }
      runStart = i;
    }
  }

  findings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.objectId.localeCompare(b.objectId) || a.key.localeCompare(b.key));
  const byKey = new Map(findings.map(f => [f.key, f]));
  const result = {
    snapshot, config, scan: data.scan, findings, byKey,
    coverage: { projects: data.projects.length, kpis: data.kpis.length, values: data.kpis.reduce((n, k) => n + k.entries.length, 0), rules: RULES.filter(r => on(r.id)).length, seriesChecked: data.kpis.length },
  };
  cache.set(key, result);
  return result;
}

/** Findings new to this scan, resolved since the baseline, and still present. */
export function compareScans(current, baselineFindings) {
  const before = new Set(baselineFindings.map(f => f.key)), now = new Set(current.map(f => f.key));
  return { added: current.filter(f => !before.has(f.key)), resolved: baselineFindings.filter(f => !now.has(f.key)), persisting: current.filter(f => before.has(f.key)) };
}

/** Objects ranked by weighted severity, so owners know where to start. */
export function priorityObjects(findings, limit = 5) {
  const weight = { high: 5, medium: 2, low: 1 }, map = new Map();
  for (const f of findings) {
    const o = map.get(`${f.objectType}:${f.objectId}`) || { objectType: f.objectType, objectId: f.objectId, name: f.objectName, owner: f.owner, score: 0, high: 0, total: 0 };
    o.score += weight[f.severity]; o.total++; if (f.severity === 'high') o.high++;
    map.set(`${f.objectType}:${f.objectId}`, o);
  }
  return [...map.values()].sort((a, b) => b.score - a.score || a.objectId.localeCompare(b.objectId)).slice(0, limit);
}
