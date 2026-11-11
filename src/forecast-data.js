// Illustrative forecast fixtures. Generated from a fixed seed so every load shows the same sample values.
import { PROJECTS, inScope } from './demo-access.js';
import { mulberry32, hashSeed, normal, clamp, addMonths, monthsBetween, plannedProgress, simulate, aggregate, round, historyUntil, indexHistory, PLAN } from './forecast-model.js';

export const AS_OF = '2026-10';
export const RUN = { id: 'FC-2026-10-01', model: ['Illustrative sample model v0', 'نموذج توضيحي تجريبي الإصدار 0'] };

export const SECTORS = {
  'Health': ['Health', 'الصحة'],
  'Motor': ['Motor', 'المركبات'],
  'Property and Casualty': ['Property & Casualty', 'الممتلكات والحوادث'],
  'Strategy and Transformation': ['Strategy & Transformation', 'الاستراتيجية والتحول'],
  'Corporate Services': ['Corporate Services', 'الخدمات المؤسسية'],
};
export const PORTFOLIOS = {
  'Technology': ['Technology', 'التقنية'],
  'Operational Excellence': ['Operational Excellence', 'التميز التشغيلي'],
  'Customer Experience': ['Customer Experience', 'تجربة العملاء'],
  'Regulatory Compliance': ['Regulatory Compliance', 'الامتثال التنظيمي'],
  'Infrastructure': ['Infrastructure', 'البنية التحتية'],
};
const OWNERS = [
  ['Sara Alqahtani', 'سارة القحطاني'], ['Fahad Alharbi', 'فهد الحربي'], ['Noura Alshehri', 'نورة الشهري'], ['Khalid Almutairi', 'خالد المطيري'],
  ['Reem Alzahrani', 'ريم الزهراني'], ['Omar Aldosari', 'عمر الدوسري'], ['Lama Alghamdi', 'لمى الغامدي'], ['Yousef Alanazi', 'يوسف العنزي'],
  ['Hind Alsubaie', 'هند السبيعي'], ['Turki Alshammari', 'تركي الشمري'],
];

// [id, English, Arabic, sector, portfolio, start, end, performance ratio, MI level, CI level (null = no cost data), AI (start delay), manager]
const SPECS = [
  ['alpha', 'Project Alpha', 'مشروع ألفا', 'Health', 'Technology', '2025-07', '2027-06', 0.86, 3.6, 2.9, 2.6, 'afnan'],
  ['claims', 'Claims service improvement', 'تحسين خدمة المطالبات', 'Health', 'Operational Excellence', '2025-04', '2027-03', 0.97, 4.1, 3.1, 3.0],
  ['platform', 'Platform modernization', 'تحديث المنصة', 'Strategy and Transformation', 'Technology', '2025-01', '2027-09', 0.93, 3.4, 2.7, 2.2],
  ['member-app', 'Member mobile app', 'تطبيق الأعضاء للجوال', 'Health', 'Customer Experience', '2025-10', '2027-04', 1.04, 4.2, 3.3, 3.2, 'afnan'],
  ['provider-network', 'Provider network expansion', 'توسيع شبكة مقدمي الخدمة', 'Health', 'Operational Excellence', '2025-05', '2027-02', 0.93, 3.1, null, 2.8, 'afnan'],
  ['preauth', 'Pre-authorization automation', 'أتمتة الموافقات المسبقة', 'Health', 'Technology', '2025-03', '2027-01', 0.82, 3.9, 2.8, 2.4],
  ['chronic-care', 'Chronic care programme', 'برنامج الرعاية المزمنة', 'Health', 'Customer Experience', '2025-08', '2027-08', 1.06, 4.4, 3.4, 3.4],
  ['fraud-analytics', 'Health fraud analytics', 'تحليلات الاحتيال الصحي', 'Health', 'Regulatory Compliance', '2025-02', '2026-12', 0.88, 4.0, null, 2.5],
  ['billing', 'Medical billing reconciliation', 'تسوية الفواتير الطبية', 'Health', 'Operational Excellence', '2025-06', '2027-05', 0.8, 2.6, 2.6, 2.0],
  ['telemedicine', 'Telemedicine partnership', 'شراكة الطب الاتصالي', 'Health', 'Customer Experience', '2026-09', '2027-12', 1.0, 3.5, null, 3.0],
  ['motor-claims', 'Motor claims digital journey', 'الرحلة الرقمية لمطالبات المركبات', 'Motor', 'Customer Experience', '2025-04', '2027-04', 0.9, 4.3, 3.0, 2.7],
  ['ubi-pricing', 'Usage-based motor pricing', 'تسعير المركبات حسب الاستخدام', 'Motor', 'Technology', '2025-09', '2027-10', 0.71, 3.3, null, 2.1],
  ['najm', 'Najm integration upgrade', 'ترقية التكامل مع نجم', 'Motor', 'Technology', '2025-11', '2027-02', 1.08, 4.5, 3.5, 3.5],
  ['workshops', 'Workshop network rollout', 'توسيع شبكة الورش', 'Motor', 'Operational Excellence', '2025-01', '2026-12', 0.84, 3.7, 2.9, 2.6],
  ['renewals', 'Motor renewals retention', 'الاحتفاظ بتجديدات المركبات', 'Motor', 'Customer Experience', '2025-07', '2027-01', 0.98, 4.2, 3.1, 3.1],
  ['total-loss', 'Total loss process redesign', 'إعادة تصميم إجراءات الخسارة الكلية', 'Motor', 'Operational Excellence', '2025-03', '2027-03', 0.93, 3.0, 2.5, 1.6],
  ['commercial-uw', 'Commercial property underwriting', 'اكتتاب الممتلكات التجارية', 'Property and Casualty', 'Operational Excellence', '2025-05', '2027-05', 0.92, 4.0, 3.0, 2.9],
  ['cat-model', 'Catastrophe risk model', 'نموذج مخاطر الكوارث', 'Property and Casualty', 'Technology', '2025-02', '2027-06', 0.95, 3.6, null, 2.4],
  ['marine-portal', 'Marine cargo portal', 'بوابة الشحن البحري', 'Property and Casualty', 'Customer Experience', '2025-10', '2027-03', 1.03, 4.1, 3.2, 3.3],
  ['engineering-pricing', 'Engineering lines pricing review', 'مراجعة تسعير الخطوط الهندسية', 'Property and Casualty', 'Regulatory Compliance', '2025-06', '2026-12', 0.95, 3.8, 3.0, 3.0],
  ['broker-portal', 'Broker self-service portal', 'بوابة الوسطاء للخدمة الذاتية', 'Property and Casualty', 'Customer Experience', '2025-08', '2027-07', 0.9, 2.6, 2.8, 2.5],
  ['reinsurance', 'Reinsurance treaty system', 'نظام اتفاقيات إعادة التأمين', 'Property and Casualty', 'Technology', '2025-01', '2027-01', 0.72, 3.1, 2.4, 1.9],
  ['ifrs17', 'IFRS 17 reporting', 'تقارير المعيار الدولي 17', 'Corporate Services', 'Regulatory Compliance', '2024-11', '2027-02', 0.94, 4.4, 3.1, 2.8],
  ['data-platform', 'Enterprise data platform', 'منصة البيانات المؤسسية', 'Strategy and Transformation', 'Infrastructure', '2025-03', '2027-09', 0.95, 3.7, 2.7, 2.3],
  ['cloud-wave2', 'Cloud migration wave 2', 'المرحلة الثانية من الترحيل السحابي', 'Strategy and Transformation', 'Infrastructure', '2025-09', '2027-06', 0.89, 3.9, null, 2.7],
  ['customer-360', 'Customer 360', 'رؤية العميل الشاملة', 'Strategy and Transformation', 'Customer Experience', '2025-05', '2027-08', 1.01, 4.0, 3.2, 3.1],
  ['claims-triage', 'AI claims triage', 'فرز المطالبات بالذكاء الاصطناعي', 'Strategy and Transformation', 'Technology', '2025-12', '2027-05', 0.76, 3.4, 2.7, 2.2],
  ['sustainability', 'Vision 2030 sustainability programme', 'برنامج الاستدامة لرؤية 2030', 'Strategy and Transformation', 'Regulatory Compliance', '2025-04', '2027-12', 1.05, 4.3, null, 3.3],
  ['agile-model', 'Agile operating model', 'نموذج التشغيل المرن', 'Strategy and Transformation', 'Operational Excellence', '2025-02', '2026-12', 0.86, 3.8, 3.0, 2.8],
  ['cyber', 'Cybersecurity uplift', 'تعزيز الأمن السيبراني', 'Corporate Services', 'Infrastructure', '2025-06', '2027-04', 0.99, 4.2, 3.0, 3.1],
  ['iam', 'Identity and access management', 'إدارة الهوية والصلاحيات', 'Corporate Services', 'Infrastructure', '2025-08', '2027-02', 1.05, 3.6, 2.1, 2.6],
  ['e-sourcing', 'Procurement e-sourcing', 'الشراء الإلكتروني', 'Corporate Services', 'Operational Excellence', '2025-10', '2027-01', 0.97, 2.5, null, 2.9],
  ['talent', 'HR talent platform', 'منصة المواهب للموارد البشرية', 'Corporate Services', 'Technology', '2025-04', '2027-03', 0.97, 2.7, 2.9, 2.2],
  ['finance-close', 'Finance close automation', 'أتمتة الإقفال المالي', 'Corporate Services', 'Operational Excellence', '2025-07', '2027-01', 1.02, 4.1, 3.3, 3.2],
  ['datacentre', 'Data centre consolidation', 'دمج مراكز البيانات', 'Corporate Services', 'Infrastructure', '2025-01', '2027-03', 0.82, 3.2, 2.5, 2.0],
  ['academy', 'Saudization training academy', 'أكاديمية تدريب التوطين', 'Corporate Services', 'Regulatory Compliance', '2025-09', '2027-06', 0.96, 4.0, null, 3.0],
  ['contact-centre', 'Contact centre modernization', 'تحديث مركز الاتصال', 'Corporate Services', 'Customer Experience', '2025-03', '2027-02', 1.06, 3.4, 2.2, 2.6],
  ['aml', 'Anti-money laundering screening', 'فحص مكافحة غسل الأموال', 'Corporate Services', 'Regulatory Compliance', '2025-05', '2026-12', 0.97, 4.3, 3.1, 3.0],
  ['dms', 'Document management system', 'نظام إدارة الوثائق', 'Corporate Services', 'Technology', '2026-09', '2027-09', 1.0, 3.5, null, 3.0],
  ['branches', 'Branch network redesign', 'إعادة تصميم شبكة الفروع', 'Motor', 'Infrastructure', '2025-02', '2027-05', 0.8, 3.4, 2.6, 2.4],
];

function generateHistory(id, start, end, ratio, miLevel, ciLevel) {
  const rand = mulberry32(hashSeed(`history:${id}`));
  const first = monthsBetween(start, addMonths(AS_OF, -17)) > 0 ? addMonths(AS_OF, -17) : start;
  const months = monthsBetween(first, AS_OF) + 1;
  const miSlope = (normal(rand) * 0.02) - 0.01, ciSlope = (normal(rand) * 0.02) - 0.01;
  let r = Math.min(1.12, ratio + 0.12), progress = 0;
  const history = [];
  for (let i = 0; i < months; i++) {
    const month = addMonths(first, i);
    r += 0.3 * (ratio - r) + normal(rand) * 0.025;
    const planned = plannedProgress(start, end, month);
    progress = Math.min(100, Math.max(progress, planned * r));
    const fromNow = i - (months - 1);
    history.push({
      month,
      progress: round(progress, 1),
      mi: round(clamp(miLevel + miSlope * fromNow + normal(rand) * 0.07), 2),
      ci: ciLevel == null ? null : round(clamp(ciLevel + ciSlope * fromNow + normal(rand) * 0.06), 2),
    });
  }
  return history;
}

export const FORECAST_PROJECTS = SPECS.map(([id, en, ar, sector, portfolio, start, end, ratio, mi, ci, ai, manager], i) => {
  const base = PROJECTS.find(project => project.id === id);
  return {
    id, name: base?.name ?? [en, ar], sector, sectorLabel: SECTORS[sector], portfolio, portfolioLabel: PORTFOLIOS[portfolio],
    manager: base?.manager ?? manager ?? 'demo-other',
    owner: base?.owner ?? (manager === 'afnan' ? ['Afnan Rayyani', 'أفنان رياني'] : OWNERS[i % OWNERS.length]),
    start, end, ai, history: generateHistory(id, start, end, ratio, mi, ci),
  };
});

export const forecastProjectsFor = account => FORECAST_PROJECTS.filter(project => inScope(account, project));

const baselineCache = new Map();
export function baselineFor(id) {
  if (!baselineCache.has(id)) {
    const project = FORECAST_PROJECTS.find(p => p.id === id);
    baselineCache.set(id, project ? simulate(project, { asOf: AS_OF }) : null);
  }
  return baselineCache.get(id);
}
const scenarioCache = new Map();
export function scenarioFor(id, scenario) {
  const key = `${id}:${JSON.stringify(scenario)}`;
  if (!scenarioCache.has(key)) {
    if (scenarioCache.size > 400) scenarioCache.clear();
    const project = FORECAST_PROJECTS.find(p => p.id === id);
    scenarioCache.set(key, project ? simulate(project, { asOf: AS_OF, scenario }) : null);
  }
  return scenarioCache.get(key);
}
const summaryCache = new Map();
export function summaryFor(projects) {
  const key = projects.map(p => p.id).join(',');
  if (!summaryCache.has(key)) summaryCache.set(key, aggregate(projects.map(project => baselineFor(project.id))));
  return summaryCache.get(key);
}

/** What-if values the user may set with the sliders. Only touched values are included. */
export const WHAT_IF_KEYS = ['pi', 'ai', 'ti', 'mi', 'ci'];
const whatIfCache = new Map();
/** Hold the given index values from now for each target project; other projects keep their baseline. */
export function whatIfFor(projects, targetIds, values) {
  const clean = Object.fromEntries(WHAT_IF_KEYS.filter(k => values?.[k] != null).map(k => [k, Math.round(values[k] * 100) / 100]));
  if (!Object.keys(clean).length || !targetIds.length) return null;
  const key = `${projects.map(p => p.id).join(',')}|${targetIds.join(',')}|${JSON.stringify(clean)}`;
  if (!whatIfCache.has(key)) {
    if (whatIfCache.size > 40) whatIfCache.clear();
    const targets = new Set(targetIds);
    const results = projects.map(p => targets.has(p.id) ? scenarioFor(p.id, { type: 'set', values: clean }) : baselineFor(p.id));
    whatIfCache.set(key, { values: clean, results, summary: aggregate(results) });
  }
  return whatIfCache.get(key);
}

// ---------- Previous run and backtest (illustrative; production reads stored runs) ----------
export const PREVIOUS_AS_OF = '2026-09';
export const BACKTEST_FROM = '2026-04';
export const RUN_META = { created: '2026-11-01', synced: '2026-11-01', previousId: 'FC-2026-09-01' };
const previousCache = new Map();
/** The forecast as it looked at the previous monthly run (history up to September). */
export function previousFor(id) {
  if (!previousCache.has(id)) {
    const project = FORECAST_PROJECTS.find(p => p.id === id);
    previousCache.set(id, project ? simulate(historyUntil(project, PREVIOUS_AS_OF), { asOf: PREVIOUS_AS_OF, runs: 500, monthly: false }) : null);
  }
  return previousCache.get(id);
}
const backtestCache = new Map();
/** Forecasts made in April for October, compared with the actual October IPI. */
export function backtestFor(projects) {
  const key = projects.map(p => p.id).join(',');
  if (backtestCache.has(key)) return backtestCache.get(key);
  const horizon = monthsBetween(BACKTEST_FROM, AS_OF);
  const rows = [];
  for (const project of projects) {
    const past = historyUntil(project, BACKTEST_FROM);
    const r = simulate(past, { asOf: BACKTEST_FROM, runs: 500, monthly: false });
    if (r.status !== 'ok' || r.path.length <= horizon) continue;
    const predicted = r.path[horizon], actual = indexHistory(project).at(-1).ipi;
    rows.push({ id: project.id, predicted: predicted.p50, low: predicted.p10, high: predicted.p90, actual, error: actual - predicted.p50, inside: actual >= predicted.p10 && actual <= predicted.p90, sideCorrect: (predicted.p50 >= PLAN) === (actual >= PLAN) });
  }
  const n = rows.length;
  const result = n ? {
    count: n, from: BACKTEST_FROM, to: AS_OF,
    mae: rows.reduce((s, r) => s + Math.abs(r.error), 0) / n,
    bias: rows.reduce((s, r) => s + r.error, 0) / n,
    coverage: rows.filter(r => r.inside).length / n,
    sideAccuracy: rows.filter(r => r.sideCorrect).length / n,
    rows: rows.sort((a, b) => Math.abs(b.error) - Math.abs(a.error)),
  } : { count: 0, rows: [] };
  backtestCache.set(key, result);
  return result;
}
