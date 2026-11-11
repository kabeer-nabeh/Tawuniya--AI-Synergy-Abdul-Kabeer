// Early warnings derived from the current run, the previous run and history patterns. Pure functions.
import { detectPatterns } from './forecast-model.js';

export const DEFAULT_RULES = { chanceDrop: 15, improvements: true, patterns: true };
const RANK = { on: 0, risk: 1, below: 2 };
const SEVERITY = { high: 0, medium: 1, low: 2, positive: 3, info: 4 };

/**
 * One list of alerts for the given projects.
 * Types: worsened (outcome moved down), improved, chance-drop, first-forecast, pattern.
 */
export function alertsFor(projects, { baseline, previous, rules = DEFAULT_RULES }) {
  const alerts = [];
  for (const project of projects) {
    const now = baseline(project.id), prev = previous(project.id);
    if (!now || now.status !== 'ok') continue;
    const base = { projectId: project.id };
    if (prev?.status === 'ok') {
      const drop = Math.round((prev.chance - now.chance) * 100);
      if (RANK[now.outcome] > RANK[prev.outcome]) alerts.push({ ...base, id: `${project.id}:worsened`, type: 'worsened', severity: now.outcome === 'below' ? 'high' : 'medium', from: prev.outcome, to: now.outcome, prevChance: prev.chance, chance: now.chance });
      else if (RANK[now.outcome] < RANK[prev.outcome]) { if (rules.improvements) alerts.push({ ...base, id: `${project.id}:improved`, type: 'improved', severity: 'positive', from: prev.outcome, to: now.outcome, prevChance: prev.chance, chance: now.chance }); }
      else if (drop >= rules.chanceDrop) alerts.push({ ...base, id: `${project.id}:drop`, type: 'chance-drop', severity: 'medium', drop, prevChance: prev.chance, chance: now.chance, to: now.outcome });
    } else if (prev?.status === 'insufficient') {
      alerts.push({ ...base, id: `${project.id}:first`, type: 'first-forecast', severity: 'info', to: now.outcome, chance: now.chance });
    }
    if (rules.patterns) {
      for (const p of detectPatterns(project)) {
        if (p.type === 'rise') { if (rules.improvements) alerts.push({ ...base, id: `${project.id}:rise:${p.key}`, type: 'pattern', pattern: p, severity: 'positive' }); continue; }
        alerts.push({ ...base, id: `${project.id}:${p.type}:${p.key}`, type: 'pattern', pattern: p, severity: p.type === 'stall' || p.months >= 5 ? 'medium' : 'low' });
      }
    }
  }
  return alerts.sort((a, b) => SEVERITY[a.severity] - SEVERITY[b.severity] || (a.chance ?? 1) - (b.chance ?? 1));
}

/** RFC 4180 CSV with a byte-order mark so Excel opens Arabic text correctly. */
export function toCsv(header, rows) {
  const cell = v => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
}
