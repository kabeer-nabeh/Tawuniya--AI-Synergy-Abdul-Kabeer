import test from 'node:test';
import assert from 'node:assert/strict';
import { ipi, ti, classify, simulate, aggregate, piScore, addMonths, monthsBetween, PLAN } from '../src/forecast-model.js';
import { AS_OF, FORECAST_PROJECTS, forecastProjectsFor, baselineFor, scenarioFor, summaryFor } from '../src/forecast-data.js';
import { getAccount } from '../src/demo-access.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const project = id => FORECAST_PROJECTS.find(p => p.id === id);

test('index formulas follow the reference weights, including the no-cost rule', () => {
  close(ti(3, 2), 2.8);
  close(ipi({ pi: 3, ai: 2, mi: 4, ci: 2 }), 0.5 * 2.8 + 0.25 * 4 + 0.25 * 2);
  close(ipi({ pi: 3, ai: 2, mi: 4, ci: null }), 0.75 * 2.8 + 0.25 * 4);
  close(piScore(50, 50), PLAN);
  assert.equal(piScore(100, 10), 5, 'progress vs plan is capped at 5');
});

test('month helpers handle year boundaries', () => {
  assert.equal(addMonths('2026-11', 3), '2027-02');
  assert.equal(monthsBetween('2026-10', '2027-06'), 8);
});

test('outcome bands use the chance of finishing on plan', () => {
  assert.equal(classify(0.6), 'on');
  assert.equal(classify(0.59), 'risk');
  assert.equal(classify(0.3), 'risk');
  assert.equal(classify(0.29), 'below');
});

test('simulation is deterministic and returns ordered ranges', () => {
  const a = simulate(project('alpha'), { asOf: AS_OF }), b = simulate(project('alpha'), { asOf: AS_OF });
  assert.equal(a.status, 'ok');
  assert.equal(a.chance, b.chance);
  assert.equal(a.forecast.ipi.p50, b.forecast.ipi.p50);
  const r = a.forecast.ipi;
  assert.ok(r.p10 <= r.p25 && r.p25 <= r.p50 && r.p50 <= r.p75 && r.p75 <= r.p90);
  assert.ok(r.p10 >= 0 && r.p90 <= 5);
  assert.equal(a.path.length, a.remaining + 1);
  assert.equal(a.path.at(-1).month, project('alpha').end);
});

test('projects with under three months of history are not forecast', () => {
  const result = baselineFor('telemedicine');
  assert.equal(result.status, 'insufficient');
  const summary = summaryFor([project('telemedicine'), project('alpha')]);
  assert.equal(summary.insufficient, 1);
  assert.equal(summary.forecast, 1);
});

test('an index scenario never mutates the project and cannot exceed the scale', () => {
  const before = JSON.stringify(project('billing'));
  const baseline = baselineFor('billing');
  const improved = scenarioFor('billing', { type: 'index', index: 'mi', delta: 1 });
  assert.equal(JSON.stringify(project('billing')), before);
  assert.ok(improved.forecast.ipi.p50 > baseline.forecast.ipi.p50);
  assert.ok(improved.chance >= baseline.chance);
  const capped = scenarioFor('najm', { type: 'index', index: 'mi', delta: 5 });
  assert.ok(capped.forecast.mi <= 5);
});

test('a cost scenario is unsupported when a project has no cost data', () => {
  assert.equal(scenarioFor('provider-network', { type: 'index', index: 'ci', delta: 0.5 }).status, 'unsupported');
});

test('moving the end date lowers the required pace and keeps the baseline unchanged', () => {
  const baseline = baselineFor('preauth');
  const later = scenarioFor('preauth', { type: 'end', months: 3 });
  assert.equal(later.end, addMonths(project('preauth').end, 3));
  assert.ok(later.pace.required < baseline.pace.required);
  assert.equal(baselineFor('preauth'), baseline, 'baseline is cached and reused');
  assert.equal(baseline.end, project('preauth').end);
});

test('forecast scope follows the demo account scope', () => {
  assert.equal(forecastProjectsFor(getAccount('epmo')).length, FORECAST_PROJECTS.length);
  assert.ok(forecastProjectsFor(getAccount('health')).every(p => p.sector === 'Health'));
  assert.ok(forecastProjectsFor(getAccount('technology')).every(p => p.portfolio === 'Technology'));
  assert.deepEqual(forecastProjectsFor(getAccount('afnan')).map(p => p.id).sort(), ['alpha', 'member-app', 'provider-network']);
  assert.equal(forecastProjectsFor(getAccount('renad')).length, 0);
});

test('summary counts add up to the forecast projects', () => {
  const summary = summaryFor(FORECAST_PROJECTS);
  const { on, risk, below } = summary.counts;
  assert.equal(on + risk + below, summary.forecast);
  assert.equal(summary.forecast + summary.insufficient, FORECAST_PROJECTS.length);
  assert.ok(summary.end.p10 <= summary.end.p50 && summary.end.p50 <= summary.end.p90);
  assert.equal(aggregate([]).total, 0);
});

test('what-if values are held from now and the baseline is untouched', async () => {
  const { whatIfFor } = await import('../src/forecast-data.js');
  const before = baselineFor('billing');
  const raised = scenarioFor('billing', { type: 'set', values: { pi: 3.5 } });
  assert.ok(raised.forecast.ipi.p50 > before.forecast.ipi.p50);
  close(raised.forecast.pi, 3.5);
  assert.equal(baselineFor('billing'), before);
  const tiHeld = scenarioFor('billing', { type: 'set', values: { ti: 3 } });
  close(tiHeld.forecast.ti, 3);
  const w = whatIfFor(FORECAST_PROJECTS, ['billing'], { mi: 4 });
  assert.equal(w.results.filter((r, i) => r !== baselineFor(FORECAST_PROJECTS[i].id)).length, 1, 'only the target project changes');
  assert.equal(whatIfFor(FORECAST_PROJECTS, ['billing'], {}), null);
  assert.equal(w.summary.path[0].month, AS_OF);
});
