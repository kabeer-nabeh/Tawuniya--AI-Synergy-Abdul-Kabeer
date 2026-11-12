import test from 'node:test';
import assert from 'node:assert/strict';
import { freshAuthoring, createDraft, pendingField, answerField, skipField, editField, parseTyped, parseDate, commandOf, checkDraft, isComplete, progress, fileName, templateOf, askedFields, validatorFields } from '../src/document-create.js';
import { authoringUI } from '../src/document-create-view.js';

const project = { id: 'alpha', name: ['Project Alpha', 'مشروع ألفا'], sectorLabel: ['Health', 'الصحة'], portfolioLabel: ['Technology', 'التقنية'], owner: ['Afnan Rayyani', 'أفنان رياني'] };
const start = id => { const a = freshAuthoring(); return { a, d: createDraft(a, id, 'alpha', 0) }; };

test('a new draft asks the first part that is not prefilled from Synergy', () => {
  const { a, d } = start('deliverables');
  assert.equal(a.active, d.id);
  assert.equal(pendingField(d).id, 'programManager');
  assert.deepEqual(progress(d), { done: 0, total: askedFields(templateOf('deliverables')).length });
});

test('required parts cannot be skipped, optional parts can', () => {
  const { d } = start('deliverables');
  assert.equal(skipField(d, 'programManager'), true);
  assert.equal(pendingField(d).id, 'deliverables');
  assert.equal(skipField(d, 'deliverables'), false);
  assert.match(d.error[0], /required/);
});

test('table answers are validated row by row', () => {
  const { d } = start('deliverables');
  skipField(d, 'programManager');
  assert.equal(answerField(d, 'deliverables', [{ name: 'Pilot', description: 'x', date: '2026-02-30', owner: 'A', status: 'accepted' }]), false);
  assert.match(d.error[0], /Row 1: Deliverable date is not a valid date/);
  assert.equal(answerField(d, 'deliverables', [{}, { name: 'Pilot', description: 'x', date: '2026-10-28', owner: 'A', status: 'accepted' }]), true);
  assert.equal(d.answers.deliverables.length, 1, 'empty rows are dropped');
});

test('typed messages are parsed for dates, options and table rows', () => {
  assert.equal(parseDate('5/11/2026'), '2026-11-05');
  assert.equal(parseDate('2026-1-9'), '2026-01-09');
  const { d } = start('status');
  const overall = templateOf('status').fields.find(f => f.id === 'overall');
  assert.equal(parseTyped(overall, '2'), 'risk');
  assert.equal(parseTyped(overall, 'off track'), 'off');
  const milestones = templateOf('status').fields.find(f => f.id === 'milestones');
  assert.deepEqual(parseTyped(milestones, 'Testing | 24/09/2026 | delayed | vendor'), [{ name: 'Testing', due: '2026-09-24', status: 'delayed', comment: 'vendor' }]);
  assert.deepEqual(commandOf(d, 'skip'), { type: 'skip' });
  assert.deepEqual(commandOf(d, 'edit milestones'), { type: 'edit', fieldId: 'milestones' });
  assert.deepEqual(commandOf(d, 'edit budget'), { type: 'edit-unknown' });
});

test('a resume date before the hold start is rejected', () => {
  const { d } = start('hold');
  answerField(d, 'reason', 'budget'); answerField(d, 'details', 'Budget frozen for Q4.'); answerField(d, 'holdStart', '2026-11-15');
  assert.equal(answerField(d, 'resume', '2026-11-01'), false);
  assert.equal(answerField(d, 'resume', '2027-01-03'), true);
});

test('editing an answer reopens only that part and keeps the document complete afterwards', () => {
  const { d } = start('hold');
  answerField(d, 'reason', 'budget'); answerField(d, 'details', 'x'); answerField(d, 'holdStart', '2026-11-15'); skipField(d, 'resume'); skipField(d, 'impact');
  assert.equal(isComplete(d), true);
  editField(d, 'reason');
  assert.equal(pendingField(d).id, 'reason');
  answerField(d, 'reason', 'vendor');
  assert.equal(isComplete(d), true);
  assert.equal(d.log.at(-1).kind, 'edit');
});

test('the template check scores missing optional parts and inconsistent answers', () => {
  const { d } = start('status');
  answerField(d, 'overall', 'on'); answerField(d, 'summary', 'ok');
  answerField(d, 'milestones', [{ name: 'Testing', due: '2026-09-24', status: 'delayed' }]);
  skipField(d, 'risks'); answerField(d, 'nextAction', 'Re-plan'); answerField(d, 'nextDue', '2026-11-14');
  const check = checkDraft(d);
  assert.equal(check.compliant, true);
  assert.equal(check.score, 85);
  assert.deepEqual(check.issues.map(i => i.level).sort(), ['suggestion', 'warning']);
  assert.deepEqual(validatorFields(d, project), { start: '2026-10-01', end: '2026-10-31', owner: 'Afnan Rayyani', nextAction: 'Re-plan', nextDue: '2026-11-14' });
});

test('the download is a Word-readable document with the answers and escapes user text', () => {
  const { a, d } = start('hold');
  answerField(d, 'reason', 'budget'); answerField(d, 'details', '<script>alert(1)</script> Budget frozen'); answerField(d, 'holdStart', '2026-11-15'); skipField(d, 'resume'); skipField(d, 'impact');
  const t = (en) => en, icon = () => '', mark = () => '';
  const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ui = authoringUI({ t, icon, escape, mark, a, projects: [project], typing: false });
  const file = ui.download();
  assert.equal(file.filename, fileName(d, 'Project Alpha'));
  assert.equal(file.filename, 'Project_Hold_Request_Project_Alpha.doc');
  assert.match(file.content, /Budget constraints/);
  assert.match(file.content, /&lt;script&gt;/);
  assert.doesNotMatch(file.content, /<script>/);
  assert.match(ui.page(), /is ready/);
});
