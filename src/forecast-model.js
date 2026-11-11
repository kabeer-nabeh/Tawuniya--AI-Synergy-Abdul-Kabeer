// Illustrative forecasting model for the design prototype. It is deterministic (seeded) and has no DOM access.
// Index weights follow the reference proof of concept. Outcome thresholds are working assumptions pending EPMO confirmation.

export const PLAN = 3;
export const SCALE_MAX = 5;
export const RUNS = 1000;
export const OUTCOME_THRESHOLDS = { on: 0.6, risk: 0.3 };
export const MIN_HISTORY = 3;
export const INDEX_KEYS = ['pi', 'ai', 'mi', 'ci'];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(text) {
  let h = 2166136261;
  for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function normal(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export const clamp = (n, min = 0, max = SCALE_MAX) => Math.min(max, Math.max(min, n));
export const round = (n, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

// Index formulas
export const ti = (pi, ai) => 0.8 * pi + 0.2 * ai;
export function ipi({ pi, ai, mi, ci, ti: time = ti(pi, ai) }) {
  return ci == null ? 0.75 * time + 0.25 * mi : 0.5 * time + 0.25 * mi + 0.25 * ci;
}
/** Effective weight of each base index in IPI. */
export const weights = hasCost => hasCost ? { pi: 0.4, ai: 0.1, mi: 0.25, ci: 0.25 } : { pi: 0.6, ai: 0.15, mi: 0.25, ci: 0 };

// Months are 'YYYY-MM' strings.
export const monthIndex = ym => { const [y, m] = ym.split('-').map(Number); return y * 12 + m - 1; };
export const fromIndex = n => `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`;
export const addMonths = (ym, n) => fromIndex(monthIndex(ym) + n);
export const monthsBetween = (a, b) => monthIndex(b) - monthIndex(a);

export function plannedProgress(start, end, month) {
  const total = monthsBetween(start, end);
  if (total <= 0) return 100;
  return 100 * clamp(monthsBetween(start, month) / total, 0, 1);
}
/** Progress vs plan: actual equal to planned scores 3 (on plan). */
export function piScore(actual, planned) {
  if (planned <= 0) return PLAN;
  return clamp(PLAN * actual / planned);
}

export function indexHistory(project) {
  return project.history.map(h => {
    const pi = piScore(h.progress, plannedProgress(project.start, project.end, h.month));
    const row = { month: h.month, pi, ai: project.ai, mi: h.mi, ci: h.ci ?? null, progress: h.progress };
    return { ...row, ti: ti(pi, project.ai), ipi: ipi(row) };
  });
}

export function quantiles(values) {
  const sorted = Float64Array.from(values).sort();
  const q = p => { const pos = (sorted.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos); return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo); };
  return { p10: q(0.1), p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9) };
}
const median = values => quantiles(values).p50;
export function stat(values) {
  const q = quantiles(values);
  let above = 0; for (const v of values) if (v >= PLAN - 1e-9) above++;
  return { p10: q.p10, p50: q.p50, p90: q.p90, chance: above / values.length };
}

export function classify(chance) {
  if (chance >= OUTCOME_THRESHOLDS.on) return 'on';
  if (chance >= OUTCOME_THRESHOLDS.risk) return 'risk';
  return 'below';
}

function trendOf(values) {
  const xs = values.slice(-6);
  return xs.length < 2 ? 0 : (xs.at(-1) - xs[0]) / (xs.length - 1);
}
function volatilityOf(values) {
  const xs = values.slice(-7);
  const diffs = xs.slice(1).map((x, i) => x - xs[i]);
  if (diffs.length < 2) return 0.08;
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.max(0.05, Math.sqrt(diffs.reduce((a, d) => a + (d - mean) ** 2, 0) / (diffs.length - 1)));
}

/** Apply what-if values (absolute index values, held from now to the end date). A set TI replaces the PI/AI combination. */
export function applySet(values, set) {
  if (!set) return values;
  const out = { ...values };
  for (const key of ['pi', 'ai', 'mi', 'ci']) if (set[key] != null && (key !== 'ci' || out.ci != null)) out[key] = clamp(set[key]);
  out.ti = set.ti != null ? clamp(set.ti) : ti(out.pi, out.ai);
  return out;
}

/**
 * Simulate a project's indices from the as-of month to its end date.
 * scenario: null
 *   | {type:'index', index:'pi'|'ai'|'mi'|'ci', delta:number}   raise one index by delta from now
 *   | {type:'end', months:number}                              move the end date
 *   | {type:'set', values:{pi?,ai?,ti?,mi?,ci?}}               what-if: hold index values from now
 * Baseline and scenarios share the same random seed so differences come from the change only.
 */
export function simulate(project, { asOf, runs = RUNS, scenario = null, monthly = true } = {}) {
  const history = indexHistory(project);
  if (history.length < MIN_HISTORY) return { status: 'insufficient', months: history.length };
  const hasCost = project.history.at(-1).ci != null;
  if (scenario?.type === 'index' && scenario.index === 'ci' && !hasCost) return { status: 'unsupported', reason: 'no-cost' };
  const end = scenario?.type === 'end' ? addMonths(project.end, scenario.months) : project.end;
  const remaining = Math.max(0, monthsBetween(asOf, end));
  const last = project.history.at(-1);
  const recent = project.history.slice(-4);
  const pace = Math.max(0, (recent.at(-1).progress - recent[0].progress) / Math.max(1, recent.length - 1));
  const paceSd = Math.max(0.6, pace * 0.3);
  const mis = history.map(h => h.mi), cis = hasCost ? history.map(h => h.ci) : [];
  const miTrend = trendOf(mis) * 0.6, ciTrend = hasCost ? trendOf(cis) * 0.6 : 0;
  const miVol = volatilityOf(mis), ciVol = hasCost ? volatilityOf(cis) : 0;
  const boost = key => scenario?.type === 'index' && scenario.index === key ? scenario.delta : 0;
  const set = scenario?.type === 'set' ? scenario.values : null;
  const rand = mulberry32(hashSeed(`${project.id}:${asOf}`));
  // A shared factor per run (same for every project) represents portfolio-wide conditions.
  const common = mulberry32(hashSeed(`common:${asOf}`));

  const actualNow = { ...history.at(-1) };
  const now = applySet({ pi: actualNow.pi, ai: actualNow.ai, mi: actualNow.mi, ci: actualNow.ci }, set);
  const nowIpi = ipi(now);
  const months = remaining + 1;
  const paths = Array.from({ length: months }, () => new Float64Array(runs));
  const tiPaths = Array.from({ length: months }, () => new Float64Array(runs));
  const miPaths = Array.from({ length: months }, () => new Float64Array(runs));
  const piPaths = Array.from({ length: months }, () => new Float64Array(runs));
  const ciPaths = hasCost ? Array.from({ length: months }, () => new Float64Array(runs)) : null;
  const endValues = { pi: new Float64Array(runs), ai: new Float64Array(runs), mi: new Float64Array(runs), ci: new Float64Array(runs), ipi: new Float64Array(runs), progress: new Float64Array(runs) };

  for (let r = 0; r < runs; r++) {
    let progress = last.progress, mi = last.mi, ci = hasCost ? last.ci : null;
    const shared = normal(common);
    const runPace = pace * Math.max(0.2, 1 + 0.2 * shared + 0.35 * normal(rand));
    const runMiTrend = miTrend + 0.05 * normal(rand), runCiTrend = ciTrend + 0.05 * normal(rand) + 0.015 * shared;
    let values = applySet({ pi: clamp(now.pi + boost('pi')), ai: clamp(now.ai + boost('ai')), mi: clamp(now.mi + boost('mi')), ci: hasCost ? clamp(now.ci + boost('ci')) : null }, set);
    paths[0][r] = remaining && !set ? nowIpi : ipi(values);
    tiPaths[0][r] = values.ti ?? ti(values.pi, values.ai); miPaths[0][r] = values.mi; piPaths[0][r] = values.pi; if (ciPaths) ciPaths[0][r] = values.ci;
    for (let m = 1; m <= remaining; m++) {
      progress = Math.min(100, progress + Math.max(0, runPace + normal(rand) * paceSd));
      mi = clamp(mi + runMiTrend + normal(rand) * miVol);
      if (hasCost) ci = clamp(ci + runCiTrend + normal(rand) * ciVol);
      const planned = plannedProgress(project.start, end, addMonths(asOf, m));
      values = applySet({
        pi: clamp(piScore(progress, planned) + boost('pi')),
        ai: clamp(project.ai + boost('ai')),
        mi: clamp(mi + boost('mi')),
        ci: hasCost ? clamp(ci + boost('ci')) : null,
      }, set);
      paths[m][r] = ipi(values);
      tiPaths[m][r] = values.ti ?? ti(values.pi, values.ai); miPaths[m][r] = values.mi; piPaths[m][r] = values.pi; if (ciPaths) ciPaths[m][r] = values.ci;
    }
    endValues.pi[r] = values.pi; endValues.ai[r] = values.ai; endValues.mi[r] = values.mi;
    endValues.ci[r] = values.ci ?? 0; endValues.ipi[r] = ipi(values); endValues.progress[r] = progress;
  }

  const ipiRange = quantiles(endValues.ipi);
  const chance = endValues.ipi.reduce((n, v) => n + (v >= PLAN ? 1 : 0), 0) / runs;
  const w = weights(hasCost);
  const forecast = { ipi: ipiRange, pi: median(endValues.pi), ai: median(endValues.ai), mi: median(endValues.mi), ci: hasCost ? median(endValues.ci) : null, progress: median(endValues.progress), ti: median(tiPaths.at(-1)) };
  const drivers = INDEX_KEYS.filter(key => key !== 'ci' || hasCost).map(key => ({ key, now: actualNow[key], end: forecast[key], weight: w[key], gap: w[key] * Math.min(0, forecast[key] - PLAN) }));
  const worst = drivers.filter(d => d.gap < -0.005).sort((a, b) => a.gap - b.gap)[0];
  const plannedNow = plannedProgress(project.start, end, asOf);
  return {
    status: 'ok', id: project.id, asOf, end, remaining, hasCost, runs,
    now: { ...actualNow, ipi: ipi(actualNow) }, whatIfNow: set ? { ...now, ipi: nowIpi } : null,
    forecast, chance, outcome: classify(chance), drivers, mainDriver: worst?.key ?? null,
    pace: { current: pace, required: remaining ? Math.max(0, (100 - last.progress) / remaining) : 0, progress: last.progress, planned: plannedNow },
    path: paths.map((values, m) => ({ month: addMonths(asOf, m), ...quantiles(values), ti: median(tiPaths[m]), mi: median(miPaths[m]), ci: ciPaths ? median(ciPaths[m]) : null })),
    runsIpi: endValues.ipi, runPaths: paths,
    // Per month and measure: middle value, 80% range and the chance of being at or above plan (3).
    monthly: monthly ? paths.map((values, m) => ({ month: addMonths(asOf, m), ipi: stat(values), ti: stat(tiPaths[m]), pi: stat(piPaths[m]), mi: stat(miPaths[m]), ci: ciPaths ? stat(ciPaths[m]) : null })) : null,
  };
}

/** Portfolio or group summary. Runs are aligned by index, so the mean per run gives the range of the average. */
export function aggregate(results) {
  const ok = results.filter(r => r.status === 'ok');
  const counts = { on: 0, risk: 0, below: 0 };
  ok.forEach(r => counts[r.outcome]++);
  const drivers = { pi: 0, ai: 0, mi: 0, ci: 0 };
  ok.forEach(r => { if (r.mainDriver && r.outcome !== 'on') drivers[r.mainDriver]++; });
  if (!ok.length) return { total: results.length, forecast: 0, insufficient: results.length, counts, drivers, chance: 0, path: [] };
  const runs = ok[0].runsIpi.length;
  const means = new Float64Array(runs);
  for (let i = 0; i < runs; i++) means[i] = ok.reduce((sum, r) => sum + r.runsIpi[i], 0) / ok.length;
  const avg = fn => ok.reduce((sum, r) => sum + fn(r), 0) / ok.length;
  const withCost = ok.filter(r => r.hasCost);
  const avgOf = (list, fn) => list.length ? list.reduce((s, r) => s + fn(r), 0) / list.length : null;
  // Monthly path of the average: a project that has ended keeps its end-date value.
  const horizon = Math.max(...ok.map(r => r.remaining));
  const at = (r, m) => r.path[Math.min(m, r.path.length - 1)];
  const path = [];
  for (let m = 0; m <= horizon; m++) {
    const perRun = new Float64Array(runs);
    for (let i = 0; i < runs; i++) perRun[i] = ok.reduce((sum, r) => sum + r.runPaths[Math.min(m, r.runPaths.length - 1)][i], 0) / ok.length;
    path.push({ month: addMonths(ok[0].asOf, m), ...quantiles(perRun), ti: avg(r => at(r, m).ti), mi: avg(r => at(r, m).mi), ci: avgOf(withCost, r => at(r, m).ci) });
  }
  return {
    total: results.length, forecast: ok.length, insufficient: results.length - ok.length, counts, drivers,
    chance: avg(r => r.chance),
    now: avg(r => r.now.ipi), whatIfNow: ok.some(r => r.whatIfNow) ? avg(r => (r.whatIfNow || r.now).ipi) : null, end: quantiles(means), path,
    indices: {
      ti: { now: avg(r => r.now.ti), end: avg(r => r.forecast.ti) },
      pi: { now: avg(r => r.now.pi), end: avg(r => r.forecast.pi) },
      ai: { now: avg(r => r.now.ai), end: avg(r => r.forecast.ai) },
      mi: { now: avg(r => r.now.mi), end: avg(r => r.forecast.mi) },
      ci: { now: avgOf(withCost, r => r.now.ci), end: avgOf(withCost, r => r.forecast.ci), coverage: withCost.length },
    },
  };
}

/** Copy of a project with history up to and including the given month (for previous runs and backtests). */
export const historyUntil = (project, month) => ({ ...project, history: project.history.filter(h => monthsBetween(h.month, month) >= 0) });

/**
 * Deterministic pattern findings in a project's monthly history.
 * decline: an index fell for 3+ months in a row; rise: progress vs plan rose 3+ months in a row;
 * stall: progress moved under 1 point a month for the last 2 months while the plan kept moving;
 * below: deliverables or cost stayed under plan for 6+ months and is now clearly below it (under 2.75).
 */
export function detectPatterns(project) {
  const h = indexHistory(project);
  const found = [];
  if (h.length < 4) return found;
  const streak = (key, dir) => { let n = 0; for (let i = h.length - 1; i > 0; i--) { const d = h[i][key] - h[i - 1][key]; if (h[i][key] == null || h[i - 1][key] == null || (dir < 0 ? d >= -0.01 : d <= 0.01)) break; n++; } return n; };
  for (const key of ['pi', 'mi', 'ci']) {
    if (key === 'ci' && h.at(-1).ci == null) continue;
    const n = streak(key, -1);
    if (n >= 3) found.push({ type: 'decline', key, months: n, from: h.at(-1 - n)[key], to: h.at(-1)[key] });
  }
  const up = streak('pi', 1);
  if (up >= 3) found.push({ type: 'rise', key: 'pi', months: up, from: h.at(-1 - up).pi, to: h.at(-1).pi });
  const p = project.history;
  const gain = p.at(-1).progress - p.at(-3).progress;
  const planGain = plannedProgress(project.start, project.end, p.at(-1).month) - plannedProgress(project.start, project.end, p.at(-3).month);
  if (gain < 2 && planGain > 4) found.push({ type: 'stall', key: 'pi', months: 2, gain, planGain });
  for (const key of ['mi', 'ci']) {
    if (key === 'ci' && h.at(-1).ci == null) continue;
    let n = 0; for (let i = h.length - 1; i >= 0 && h[i][key] < PLAN; i--) n++;
    if (n >= 6 && h.at(-1)[key] < PLAN - 0.25) found.push({ type: 'below', key, months: n, to: h.at(-1)[key] });
  }
  return found;
}
