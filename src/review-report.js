// Advisory review report: a Word-readable file listing the findings of one check.
// The reviewed document is never changed; the report is what the user shares with the document owner.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * @param {{title:string, subtitle?:string, meta:[string,string][], findings:{status:string,label:string,rule?:string,evidence?:string}[], labels:Record<string,string>, notes:{heading:string, advisory:string, generated:string}, dir?:string, lang?:string, fileStem:string}} input
 */
export function reviewReportFile({ title, subtitle = '', meta, findings, labels, notes, dir = 'ltr', lang = 'en', fileStem }) {
  const order = Object.keys(labels);
  const sorted = findings.slice().sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const counts = order.map(k => `${findings.filter(f => f.status === k).length} ${labels[k]}`).join(' · ');
  const css = 'body{font-family:Calibri,Arial,sans-serif;color:#1f1b2e;font-size:11pt}h1{font-size:18pt;margin:0 0 4pt}h2{font-size:13pt;margin:16pt 0 6pt;color:#3d2a8c}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d9d4e8;padding:5pt 7pt;text-align:start;vertical-align:top}th{background:#f1eefb}.muted{color:#6b6680;font-size:9.5pt}';
  const rows = sorted.map(f => `<tr><td>${esc(labels[f.status] || f.status)}</td><td><strong>${esc(f.label)}</strong>${f.rule ? `<br><span class="muted">${esc(f.rule)}</span>` : ''}</td><td>${esc(f.evidence || '—')}</td></tr>`).join('');
  const html = `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>
<h1>${esc(title)}</h1>${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ''}
<table>${meta.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
<h2>${esc(notes.heading)}</h2><p>${esc(counts)}</p>
<table><thead><tr><th>${esc(notes.status || 'Status')}</th><th>${esc(notes.check || 'Check')}</th><th>${esc(notes.evidence || 'Evidence')}</th></tr></thead><tbody>${rows}</tbody></table>
<p class="muted">${esc(notes.advisory)}</p><p class="muted">${esc(notes.generated)}</p></body></html>`;
  const stem = String(fileStem).replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '') || 'Review';
  return { filename: `${stem}_review_report.doc`, content: '﻿' + html };
}
