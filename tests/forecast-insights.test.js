import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPatterns, historyUntil, simulate } from '../src/forecast-model.js';
import { AS_OF, PREVIOUS_AS_OF, FORECAST_PROJECTS, baselineFor, previousFor, backtestFor, forecastProjectsFor } from '../src/forecast-data.js';
import { alertsFor, toCsv, DEFAULT_RULES } from '../src/forecast-insights.js';
import { getAccount } from '../src/demo-access.js';

const project = (id, history) => ({ id, start: '2025-01', end: '2027-01', ai: 3, history });
const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

test('pattern detection finds a three-month decline and ignores flat history', () => {
  const falling = project('x', months.map((month, i) => ({ month, progress: 40 + i * 3, mi: 3.6 - (i > 1 ? (i - 1) * 0.2 : 0), ci: 3 })));
  assert.ok(detectPatterns(falling).some(p => p.type === 'decline' && p.key === 'mi' && p.months >= 3));
  const flat = project('y', months.map((month, i) => ({ month, progress: 40 + i * 4, mi: 3.5, ci: 3.1 })));
  assert.equal(detectPatterns(flat).filter(p => p.type === 'decline').length, 0);
});

test('stalled progress is detected when the plan keeps moving', () => {
  const stalled = project('z', months.map((month, i) => ({ month, progress: i < 4 ? 40 + i * 4 : 52.5 + (i - 4) * 0.3, mi: 3.5, ci: 3 })));
  assert.ok(detectPatterns(stalled).some(p => p.type === 'stall'));
});

test('the previous run only uses history up to its as-of month', () => {
  const p = FORECAST_PROJECTS.find(x => x.id === 'alpha');
  assert.equal(historyUntil(p, PREVIOUS_AS_OF).history.at(-1).month, PREVIOUS_AS_OF);
  assert.equal(previousFor('alpha').asOf, PREVIOUS_AS_OF);
  assert.equal(previousFor('alpha').status, 'ok');
  assert.equal(p.history.at(-1).month, AS_OF, 'source project is not modified');
});

test('alerts compare outcomes between runs and respect rules', () => {
  const projects = FORECAST_PROJECTS;
  const all = alertsFor(projects, { baseline: baselineFor, previous: previousFor });
  const rank = { on: 0, risk: 1, below: 2 };
  for (const a of all.filter(x => x.type === 'worsened')) assert.ok(rank[a.to] > rank[a.from]);
  for (const a of all.filter(x => x.type === 'chance-drop')) assert.ok(a.drop >= DEFAULT_RULES.chanceDrop);
  const quiet = alertsFor(projects, { baseline: baselineFor, previous: previousFor, rules: { chanceDrop: 100, improvements: false, patterns: false } });
  assert.ok(quiet.every(a => a.type === 'worsened' || a.type === 'first-forecast'));
  assert.ok(all.findIndex(a => a.severity === 'positive') > all.findIndex(a => a.severity === 'high'), 'most severe first');
  const scoped = forecastProjectsFor(getAccount('health'));
  assert.ok(alertsFor(scoped, { baseline: baselineFor, previous: previousFor }).every(a => scoped.some(p => p.id === a.projectId)));
});

test('backtest compares April forecasts with October actuals', () => {
  const b = backtestFor(FORECAST_PROJECTS);
  assert.ok(b.count > 20);
  assert.ok(b.mae >= 0 && b.coverage >= 0 && b.coverage <= 1);
  assert.ok(b.rows.every((r, i, rows) => i === 0 || Math.abs(rows[i - 1].error) >= Math.abs(r.error)));
});

test('CSV escapes commas, quotes and new lines', () => {
  const csv = toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['line\nbreak', 3]]);
  assert.equal(csv, '﻿a,b\r\n"x,y","say ""hi"""\r\n"line\nbreak",3');
});

test('monthly stats are available for every measure', () => {
  const r = baselineFor('alpha');
  assert.equal(r.monthly.length, r.remaining + 1);
  for (const key of ['ipi', 'ti', 'pi', 'mi', 'ci']) assert.ok(r.monthly.at(-1)[key].chance >= 0);
  assert.equal(simulate(FORECAST_PROJECTS[0], { asOf: AS_OF, runs: 50, monthly: false }).monthly, null);
});
