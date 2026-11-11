import test from 'node:test';
import assert from 'node:assert/strict';
import { createArtifact, evaluateArtifact, makeReview, validDate } from '../src/artifact-review.js';

test('an untouched sample needs two required corrections and one suggestion', () => {
  assert.deepEqual(makeReview(createArtifact('quarterly')).checks, {period:false, owner:false, next:false});
});
test('partial edits resolve only the affected check', () => {
  const artifact=createArtifact('quarterly');
  artifact.fields.start='2026-07-01'; artifact.fields.end='2026-09-30';
  assert.deepEqual(evaluateArtifact(artifact.fields), {period:true,owner:false,next:false});
  artifact.fields.owner='  Corporate Performance Manager  ';
  assert.deepEqual(evaluateArtifact(artifact.fields), {period:true,owner:true,next:false});
});
test('required checks can pass while the suggestion remains open', () => {
  const artifact=createArtifact('project');
  Object.assign(artifact.fields,{start:'2026-09-01',end:'2026-09-30',owner:'Project owner'});
  assert.deepEqual(evaluateArtifact(artifact.fields),{period:true,owner:true,next:false});
  artifact.fields.nextDue='2026-10-05';
  assert.deepEqual(evaluateArtifact(artifact.fields),{period:true,owner:true,next:true});
});
test('invalid calendar dates, reversed periods and whitespace are rejected', () => {
  assert.equal(validDate('2026-02-30'),false);
  assert.equal(validDate('2028-02-29'),true);
  const artifact=createArtifact('quarterly');
  Object.assign(artifact.fields,{start:'2026-10-01',end:'2026-09-30',owner:' ',nextAction:' ',nextDue:'2026-10-10'});
  assert.deepEqual(evaluateArtifact(artifact.fields),{period:false,owner:false,next:false});
});
test('reruns preserve earlier evidence and track fixes and regressions independently', () => {
  const artifact=createArtifact('quarterly');
  const first=makeReview(artifact);
  artifact.fields.owner='Performance Manager'; artifact.revision++;
  const second=makeReview(artifact,first);
  artifact.fields.owner=''; artifact.revision++;
  const third=makeReview(artifact,second);
  assert.equal(first.fields.owner,'');
  assert.equal(second.fields.owner,'Performance Manager');
  assert.equal(second.previous.owner,false);
  assert.equal(second.checks.owner,true);
  assert.equal(third.previous.owner,true);
  assert.equal(third.checks.owner,false);
  assert.equal(third.run,3);
  assert.equal(createArtifact('project').fields.owner,'');
});
