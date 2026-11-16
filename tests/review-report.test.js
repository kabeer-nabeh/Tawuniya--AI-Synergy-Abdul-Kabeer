import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewReportFile } from '../src/review-report.js';

test('review report lists findings by status, escapes text and states it is advisory', () => {
  const file = reviewReportFile({
    title: 'Review report · Project Hold', meta: [['Check', '1']],
    findings: [{ status: 'passed', label: 'Project name', evidence: 'Alpha' }, { status: 'failed', label: '<b>Reason</b>', rule: 'Include a reason', evidence: '' }],
    labels: { failed: 'Required', passed: 'Passed' },
    notes: { heading: 'Findings', advisory: 'Advisory only.', generated: 'Generated.' }, fileStem: 'Project Hold · Project Alpha',
  });
  assert.equal(file.filename, 'Project_Hold_Project_Alpha_review_report.doc');
  assert.match(file.content, /1 Required · 1 Passed/);
  assert.ok(file.content.indexOf('&lt;b&gt;Reason') < file.content.indexOf('Project name'), 'required findings come first');
  assert.doesNotMatch(file.content, /<b>Reason/);
  assert.match(file.content, /Advisory only\./);
});
