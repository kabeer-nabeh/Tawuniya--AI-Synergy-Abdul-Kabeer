// Illustrative data-quality fixtures: project records and monthly KPI values with deliberate, realistic defects.
// Two snapshots (previous and current scan) are generated from the same seed so "new" and "resolved" findings are real comparisons.
import { FORECAST_PROJECTS } from './forecast-data.js';
import { inScope } from './demo-access.js';
import { mulberry32, hashSeed, normal, plannedProgress, addMonths, monthsBetween, round } from './forecast-model.js';

export const SNAPSHOTS = {
  previous: { id: 'QS-2026-10-01', date: '2026-10-01', lastPeriod: '2026-09', label: ['1 Oct 2026', '1 أكتوبر 2026'] },
  current: { id: 'QS-2026-11-01', date: '2026-11-01', lastPeriod: '2026-10', label: ['1 Nov 2026', '1 نوفمبر 2026'] },
};
const P = ['previous'], C = ['current'], B = ['previous', 'current'];

const pad = n => String(n).padStart(2, '0');
export const endOfMonth = ym => { const [y, m] = ym.split('-').map(Number); return `${y}-${pad(m)}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`; };
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const addDays = (ymd, n) => new Date(Date.parse(ymd) + n * 86400000).toISOString().slice(0, 10);

// [snapshots, project id, patch]. Patch fields: budget, manager, phase, actualStart, ratios, planned, codeSuffix, status, progress, resumeDate, start, end.
const PROJECT_DEFECTS = [
  [C, 'provider-network', { budget: null }], [B, 'member-app', { status: 'on-hold', resumeDate: null }],
  [B, 'billing', { budget: null }], [C, 'ubi-pricing', { budget: null }], [B, 'cyber', { budget: null }], [P, 'agile-model', { budget: null }],
  [B, 'reinsurance', { manager: null }], [C, 'sustainability', { manager: null }], [P, 'customer-360', { manager: null }],
  [B, 'total-loss', { actualStart: null }], [C, 'finance-close', { actualStart: null }],
  [P, 'platform', { phase: null }], [C, 'datacentre', { phase: null }], [C, 'preauth', { phase: null }],
  [B, 'cat-model', { ratios: { ai: 1.12 } }], [B, 'data-platform', { ratios: { ai: 1.12, ci: 1.05 } }], [C, 'broker-portal', { ratios: { mi: 1.08 } }],
  [B, 'iam', { planned: 104 }],
  [C, 'e-sourcing', { codeSuffix: '#' }], [B, 'talent', { codeSuffix: ' ' }],
  [B, 'claims-triage', { progress: 100 }], [C, 'najm', { status: 'not-started', progress: 12 }],
  [B, 'contact-centre', { status: 'on-hold', resumeDate: null }], [C, 'dms', { status: 'on-hold', resumeDate: '2026-09-15' }],
  [B, 'workshops', { end: '2026-08-31' }], [C, 'engineering-pricing', { end: '2026-10-20' }], [P, 'cloud-wave2', { end: '2026-09-20' }],
  [C, 'aml', { start: '2027-01-01', end: '2026-12-31' }],
];

const OWNER_UNASSIGNED = ['Unassigned (EPMO follows up)', 'غير مسند (يتابع مكتب إدارة المشاريع)'];
const PHASES = ['Initiation', 'Planning', 'Execution', 'Closing'];

function buildProjects(snapshot) {
  const snap = SNAPSHOTS[snapshot], asMonth = snap.lastPeriod;
  return FORECAST_PROJECTS.map(fp => {
    const rand = mulberry32(hashSeed(`quality:${fp.id}`));
    const hist = fp.history.filter(h => monthsBetween(h.month, asMonth) >= 0);
    const last = hist.at(-1) || fp.history[0];
    const record = {
      id: fp.id, code: `EPMO_${(hashSeed(fp.id) % 900000) + 100000}`, name: fp.name, sector: fp.sector, sectorLabel: fp.sectorLabel, portfolio: fp.portfolio, portfolioLabel: fp.portfolioLabel,
      manager: fp.manager, owner: fp.owner, status: 'active', phase: PHASES[2 + (rand() > 0.85 ? -1 : 0)],
      budget: Math.round((600000 + rand() * 19000000) / 1000) * 1000, start: `${fp.start}-01`, actualStart: `${fp.start}-01`, end: endOfMonth(fp.end),
      planned: round(plannedProgress(fp.start, fp.end, asMonth), 1), progress: last.progress, resumeDate: null,
      ratios: { ai: round(0.55 + rand() * 0.4, 2), mi: round(0.55 + rand() * 0.4, 2), ci: round(0.55 + rand() * 0.4, 2) },
    };
    for (const [snaps, id, patch] of PROJECT_DEFECTS) {
      if (id !== fp.id || !snaps.includes(snapshot)) continue;
      const { ratios, codeSuffix, ...rest } = patch;
      Object.assign(record, rest);
      if (ratios) record.ratios = { ...record.ratios, ...ratios };
      if (codeSuffix) record.code += codeSuffix;
    }
    if (!record.manager) record.owner = OWNER_UNASSIGNED;
    return record;
  });
}

const OWNERS = {
  Health: ['Health performance lead', 'قائد أداء قطاع الصحة'], Motor: ['Motor performance lead', 'قائد أداء قطاع المركبات'],
  'Property and Casualty': ['P&C performance lead', 'قائد أداء الممتلكات والحوادث'], 'Strategy and Transformation': ['Strategy performance lead', 'قائد أداء الاستراتيجية'],
  'Corporate Services': ['Corporate performance lead', 'قائد أداء الخدمات المؤسسية'],
};
// [id, English, Arabic, sector, unit, level]
const KPI_SPECS = [
  ['KPI-1001', 'Claims turnaround within SLA', 'إنجاز المطالبات ضمن اتفاقية الخدمة', 'Health', '%', 82],
  ['KPI-1002', 'Complaints resolved within SLA', 'الشكاوى المعالجة ضمن اتفاقية الخدمة', 'Health', '%', 88],
  ['KPI-1003', 'Digital claims submission share', 'حصة تقديم المطالبات رقميًا', 'Health', '%', 56],
  ['KPI-1004', 'Policy renewal rate', 'معدل تجديد الوثائق', 'Motor', '%', 74],
  ['KPI-1005', 'Straight-through processing rate', 'معدل المعالجة الآلية الكاملة', 'Property and Casualty', '%', 61],
  ['KPI-1006', 'Loss ratio', 'نسبة الخسارة', 'Property and Casualty', '%', 64],
  ['KPI-1007', 'Cost-to-income ratio', 'نسبة التكلفة إلى الدخل', 'Corporate Services', '%', 47],
  ['KPI-1008', 'Projects delivered on time', 'المشاريع المسلّمة في موعدها', 'Strategy and Transformation', '%', 69],
  ['KPI-1009', 'Digital adoption rate', 'معدل التحول الرقمي', 'Strategy and Transformation', '%', 58],
  ['KPI-1010', 'Customer satisfaction index', 'مؤشر رضا العملاء', 'Health', 'pts', 78],
  ['KPI-1011', 'Net promoter score', 'صافي نقاط الترويج', 'Motor', 'pts', 41],
  ['KPI-1012', 'Staff training completion', 'اكتمال تدريب الموظفين', 'Corporate Services', '%', 84],
  ['KPI-1013', 'Regulatory findings closed', 'الملاحظات التنظيمية المغلقة', 'Corporate Services', '%', 77],
  ['KPI-1014', 'Digital sales share', 'حصة المبيعات الرقمية', 'Motor', '%', 45],
];
const FIRST_PERIOD = '2025-01', LAST_BASE = '2026-10';

// [snapshots, kpi id, defect]. Defect kinds: set, scale, remove, duplicate, shiftFrom, repeatFrom, late.
const KPI_DEFECTS = [
  [B, 'KPI-1001', { kind: 'set', period: '2026-04', value: 112.5 }], [C, 'KPI-1001', { kind: 'remove', period: '2026-10' }],
  [B, 'KPI-1014', { kind: 'scale', period: '2025-02' }], [B, 'KPI-1013', { kind: 'scale', period: '2026-03' }],
  [B, 'KPI-1012', { kind: 'set', period: '2025-07', value: -0.98 }], [P, 'KPI-1013', { kind: 'set', period: '2026-08', value: 104 }],
  [C, 'KPI-1005', { kind: 'duplicate', period: '2026-06', delta: 1.4 }], [B, 'KPI-1002', { kind: 'remove', period: '2025-05' }], [B, 'KPI-1002', { kind: 'duplicate', period: '2025-09', delta: -0.8 }],
  [B, 'KPI-1006', { kind: 'add', period: '2026-02', delta: 14 }], [B, 'KPI-1003', { kind: 'add', period: '2025-11', delta: -16 }], [C, 'KPI-1008', { kind: 'add', period: '2026-09', delta: 15 }],
  [C, 'KPI-1007', { kind: 'shiftFrom', period: '2026-08', delta: 9 }],
  [C, 'KPI-1009', { kind: 'repeatFrom', period: '2026-07' }], [B, 'KPI-1004', { kind: 'repeatFrom', period: '2025-10', until: '2026-02' }],
  [B, 'KPI-1010', { kind: 'late', period: '2026-05', enteredOn: '2026-08-10' }], [C, 'KPI-1011', { kind: 'late', period: '2026-07', enteredOn: '2026-10-14' }],
  [B, 'KPI-1011', { kind: 'remove', period: '2026-02' }], [P, 'KPI-1009', { kind: 'remove', period: '2025-11' }],
];

function buildKpis(snapshot) {
  const snap = SNAPSHOTS[snapshot];
  return KPI_SPECS.map(([id, en, ar, sector, unit, level]) => {
    const rand = mulberry32(hashSeed(`kpi:${id}`));
    const slope = (rand() - 0.45) * 0.12, noise = unit === '%' ? 1.1 : 1.0;
    let entries = [];
    for (let p = FIRST_PERIOD, i = 0; monthsBetween(p, LAST_BASE) >= 0; p = addMonths(p, 1), i++) {
      if (monthsBetween(p, snap.lastPeriod) < 0) break;
      let v = level + slope * i + normal(rand) * noise;
      if (unit === '%') v = Math.min(97, Math.max(5, v));
      entries.push({ period: p, value: round(v, 2), enteredOn: addDays(endOfMonth(p), 3 + Math.floor(rand() * 6)) });
    }
    const at = period => entries.find(e => e.period === period);
    for (const [snaps, kid, d] of KPI_DEFECTS) {
      if (kid !== id || !snaps.includes(snapshot)) continue;
      const e = at(d.period);
      if (d.kind === 'set' && e) e.value = d.value;
      else if (d.kind === 'scale' && e) e.value = round(e.value / 100, 2);
      else if (d.kind === 'add' && e) e.value = round(e.value + d.delta, 2);
      else if (d.kind === 'remove') entries = entries.filter(x => x.period !== d.period);
      else if (d.kind === 'duplicate' && e) entries.push({ period: d.period, value: round(e.value + d.delta, 2), enteredOn: addDays(e.enteredOn, 21) });
      else if (d.kind === 'shiftFrom') entries.filter(x => monthsBetween(d.period, x.period) >= 0).forEach(x => { x.value = round(x.value + d.delta, 2); });
      else if (d.kind === 'repeatFrom' && e) { const held = e.value; entries.filter(x => monthsBetween(d.period, x.period) >= 0 && (!d.until || monthsBetween(x.period, d.until) >= 0)).forEach(x => { x.value = held; }); }
      else if (d.kind === 'late' && e) e.enteredOn = d.enteredOn;
    }
    entries.sort((a, b) => a.period.localeCompare(b.period) || a.enteredOn.localeCompare(b.enteredOn));
    return { id, name: [en, ar], sector, unit, owner: OWNERS[sector], entries, firstPeriod: FIRST_PERIOD, lastPeriod: snap.lastPeriod };
  });
}

const cache = {};
export function datasetFor(snapshot) {
  if (!cache[snapshot]) cache[snapshot] = { snapshot, scan: SNAPSHOTS[snapshot], projects: buildProjects(snapshot), kpis: buildKpis(snapshot) };
  return cache[snapshot];
}

/** Which projects and KPIs an account may see. KPI findings belong to sector owners, so they are visible to all-scope and sector-scope accounts. */
export function scopeFor(account) {
  const data = datasetFor('current');
  const projects = new Set(FORECAST_PROJECTS.filter(p => inScope(account, p)).map(p => p.id));
  const type = account?.scope?.type, value = account?.scope?.value;
  const kpis = new Set(data.kpis.filter(k => type === 'all' || (type === 'sector' && k.sector === value)).map(k => k.id));
  return { projects, kpis };
}
