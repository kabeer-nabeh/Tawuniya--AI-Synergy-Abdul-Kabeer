import test from 'node:test';
import assert from 'node:assert/strict';
import { runScan, compareScans, priorityObjects } from '../src/quality-engine.js';
import { RULES, RULE_BY_ID, CATEGORIES, DEFAULT_CONFIG, normalizeConfig, SEVERITIES } from '../src/quality-rules.js';
import { datasetFor, scopeFor, SNAPSHOTS, endOfMonth, daysBetween } from '../src/quality-data.js';
import { getAccount, can } from '../src/demo-access.js';

const current = runScan('current'), previous = runScan('previous');
const find = (scan, key) => scan.byKey.get(key);

test('every rule belongs to a category and has bilingual text', () => {
  for (const r of RULES) {
    assert.ok(CATEGORIES[r.category], r.id);
    assert.ok(SEVERITIES.includes(r.severity));
    for (const pair of [r.title, r.what, r.fix]) assert.ok(pair[0] && pair[1], `${r.id} needs English and Arabic text`);
  }
  assert.equal(new Set(RULES.map(r => r.id)).size, RULES.length);
});

test('scans are deterministic and findings have unique keys, reasons and evidence', () => {
  const again = runScan('current', normalizeConfig(DEFAULT_CONFIG));
  assert.equal(again, current, 'same snapshot and configuration is served from cache');
  assert.equal(new Set(current.findings.map(f => f.key)).size, current.findings.length);
  for (const f of current.findings) {
    assert.ok(f.reason[0] && f.reason[1], f.key);
    assert.ok(f.evidence.length >= 1, f.key);
    assert.ok(SEVERITIES.includes(f.severity));
    assert.ok(RULE_BY_ID[f.ruleId]);
  }
});

test('known defects are detected with reasons computed from the data', () => {
  assert.match(find(current, 'v-percent-range|KPI-1001|2026-04').reason[0], /112\.5% is outside 0–100%/);
  assert.match(find(current, 'v-scale-100|KPI-1014|2025-02').reason[0], /percentage entered as a fraction/);
  assert.equal(find(current, 'c-missing-budget|billing|').severity, 'high');
  assert.match(find(current, 'v-ratio-cap|data-platform|ai').reason[0], /1\.12; the cap is 1\.0/);
  assert.match(find(current, 'v-stray-chars|e-sourcing|').reason[0], /#/);
  assert.match(find(current, 'u-dup-period|KPI-1005|2026-06').reason[0], /Two entries for 2026-06/);
  assert.equal(find(current, 'c-missing-period|KPI-1001|2026-10').severity, 'high', 'a missing latest period is high severity');
  assert.equal(find(current, 'c-missing-period|KPI-1002|2025-05').severity, 'medium');
  assert.equal(find(current, 't-past-end|workshops|').severity, 'high', 'more than 60 days late is high');
  assert.equal(find(current, 't-past-end|engineering-pricing|').severity, 'medium');
  assert.ok(find(current, 'x-shift|KPI-1007|2026-08'));
  assert.ok(find(current, 'x-spike|KPI-1006|2026-02'));
  assert.ok(find(current, 'x-repeat|KPI-1004|2026-02'));
});

test('invalid values are excluded from statistics so they cannot hide other problems', () => {
  assert.equal(find(current, 'x-spike|KPI-1001|2026-04'), undefined, 'an impossible value is reported once, as a validity finding');
  assert.equal(find(current, 'x-spike|KPI-1014|2025-02'), undefined);
});

test('rule configuration changes what is found', () => {
  const off = runScan('current', { enabled: { 'x-repeat': false } });
  assert.ok(off.findings.every(f => f.ruleId !== 'x-repeat'));
  assert.equal(off.findings.length, current.findings.filter(f => f.ruleId !== 'x-repeat').length);
  assert.equal(off.coverage.rules, RULES.length - 1);
  const lenient = runScan('current', { params: { lateDays: 90 } });
  assert.ok(lenient.findings.filter(f => f.ruleId === 't-late-entry').length < current.findings.filter(f => f.ruleId === 't-late-entry').length);
  const sensitive = runScan('current', { params: { spikeZ: 3 } }), strict = runScan('current', { params: { spikeZ: 5 } });
  assert.ok(sensitive.findings.filter(f => f.ruleId === 'x-spike').length >= strict.findings.filter(f => f.ruleId === 'x-spike').length);
  assert.equal(runScan('current', { params: { repeatMin: 6 } }).findings.filter(f => f.ruleId === 'x-repeat').length, 0);
});

test('comparing scans finds new, resolved and persisting findings', () => {
  const cmp = compareScans(current.findings, previous.findings);
  assert.ok(cmp.added.some(f => f.key === 'c-missing-budget|ubi-pricing|'), 'introduced after the previous scan');
  assert.ok(cmp.resolved.some(f => f.key === 'c-missing-budget|agile-model|'), 'fixed since the previous scan');
  assert.ok(cmp.persisting.some(f => f.key === 'c-missing-budget|billing|'));
  assert.equal(cmp.added.length + cmp.persisting.length, current.findings.length);
  assert.equal(cmp.resolved.length + cmp.persisting.length, previous.findings.length);
  const none = compareScans(current.findings, current.findings);
  assert.equal(none.added.length + none.resolved.length, 0);
});

test('priority objects are ranked by weighted severity', () => {
  const top = priorityObjects(current.findings, 3);
  assert.ok(top[0].score >= top[1].score && top[1].score >= top[2].score);
  const w = { high: 5, medium: 2, low: 1 };
  const manual = current.findings.filter(f => f.objectId === top[0].objectId).reduce((s, f) => s + w[f.severity], 0);
  assert.equal(top[0].score, manual);
});

test('scope follows the account: managers see projects only, sector heads see their KPIs', () => {
  const epmo = scopeFor(getAccount('epmo')), health = scopeFor(getAccount('health')), afnan = scopeFor(getAccount('afnan')), renad = scopeFor(getAccount('renad'));
  assert.equal(epmo.projects.size, datasetFor('current').projects.length);
  assert.equal(epmo.kpis.size, datasetFor('current').kpis.length);
  assert.ok([...health.kpis].every(id => datasetFor('current').kpis.find(k => k.id === id).sector === 'Health') && health.kpis.size > 0);
  assert.equal(afnan.kpis.size, 0);
  assert.deepEqual([...afnan.projects].sort(), ['alpha', 'member-app', 'provider-network']);
  assert.equal(renad.projects.size + renad.kpis.size, 0);
});

test('only EPMO and project managers can scan and review; only EPMO can configure', () => {
  for (const id of ['executive', 'health', 'technology']) assert.equal(can(getAccount(id), 'scan'), false);
  for (const id of ['epmo', 'renad', 'afnan']) assert.equal(can(getAccount(id), 'scan'), true);
  assert.equal(can(getAccount('epmo'), 'admin'), true);
  assert.equal(can(getAccount('afnan'), 'admin'), false);
});

test('date helpers and snapshots', () => {
  assert.equal(endOfMonth('2026-02'), '2026-02-28');
  assert.equal(daysBetween('2026-08-31', '2026-11-01'), 62);
  assert.equal(SNAPSHOTS.current.lastPeriod, '2026-10');
  assert.ok(datasetFor('previous').kpis[0].entries.every(e => e.period <= '2026-09'));
});
