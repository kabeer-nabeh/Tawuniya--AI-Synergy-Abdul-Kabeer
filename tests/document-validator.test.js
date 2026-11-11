import test from 'node:test';
import assert from 'node:assert/strict';
import {freshValidator,validatorDocument,checkDocument,saveDocument} from '../src/document-validator.js';

test('standalone document drafts and checks stay isolated by identity and document',()=>{
  const epmo=freshValidator(),manager=freshValidator();
  const quarterly=validatorDocument(epmo,'quarterly');
  saveDocument(quarterly,{...quarterly.artifact.fields,owner:'Performance Manager'});
  checkDocument(quarterly);
  assert.equal(validatorDocument(manager,'quarterly').artifact.fields.owner,'');
  assert.equal(validatorDocument(epmo,'project').reviews.length,0);
  assert.equal(quarterly.reviews.length,1);
});
test('saving a newer draft preserves checked evidence until an explicit recheck',()=>{
  const document=validatorDocument(freshValidator(),'project');
  const first=checkDocument(document);
  saveDocument(document,{...document.artifact.fields,start:'2026-09-01',end:'2026-09-30',owner:'  Project Manager  '});
  assert.equal(document.reviews.length,1);
  assert.equal(first.fields.owner,'');
  assert.equal(first.checks.owner,false);
  assert.equal(document.artifact.revision,2);
  const second=checkDocument(document);
  assert.equal(second.fields.owner,'Project Manager');
  assert.deepEqual(second.checks,{period:true,owner:true,next:false});
  assert.deepEqual(second.previous,first.checks);
});
test('rechecking uses the latest saved document and retains regressions in history',()=>{
  const document=validatorDocument(freshValidator(),'project');
  checkDocument(document);
  saveDocument(document,{...document.artifact.fields,owner:'Project Manager'});
  const second=checkDocument(document);
  saveDocument(document,{...document.artifact.fields,owner:''});
  const third=checkDocument(document);
  assert.equal(second.checks.owner,true);
  assert.equal(third.checks.owner,false);
  assert.equal(third.previous.owner,true);
  assert.equal(third.run,3);
});
test('saving unchanged fields does not create a false revision',()=>{
  const document=validatorDocument(freshValidator(),'project');
  document.draft={...document.artifact.fields};
  saveDocument(document,document.draft);
  assert.equal(document.artifact.revision,1);
  assert.equal(document.draft,null);
});
