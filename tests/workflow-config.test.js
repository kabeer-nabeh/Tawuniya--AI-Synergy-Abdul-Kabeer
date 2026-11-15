import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflowStore,freshWorkflowAdmin,loadWorkflowDraft,workflowSnapshot,workflowDirty,requestWorkflowType,saveWorkflow,addWorkflowStage,removeWorkflowStage,moveWorkflowStage,setWorkflowEnabled,updateWorkflowStage,enabledStages,DOCUMENT_TYPES } from '../src/workflow-config.js';
import { workflowAdminUI } from '../src/workflow-config-ui.js';
import { getAccount,PROJECTS } from '../src/demo-access.js';
import { createHoldDocument } from '../src/project-hold.js';
import { holdDownloadState } from '../src/project-hold.js';
import { exportHoldDocument } from '../src/project-hold-export.js';
import { checkDocument } from '../src/document-validator.js';
import { freshExcellence,selectReviewSource,reviewSample,runExcellenceReview } from '../src/excellence-review.js';
const admin=getAccount('epmo');
const setup=()=>{const store=createWorkflowStore(),ui=freshWorkflowAdmin();loadWorkflowDraft(ui,store);return {store,ui};};

test('configuration covers every catalog type without claiming unsupported validators are available',()=>{
 const {store}=setup();assert.equal(Object.keys(store.configs).length,DOCUMENT_TYPES.length);
 assert.equal(workflowSnapshot(store,'project-hold').configured,true);
 assert.equal(workflowSnapshot(store,'project-charter').configured,false);
 assert.throws(()=>workflowSnapshot(store,'unknown'),/unknown-document-type/);
});
test('only administrators can change and save stage requirements',()=>{
 const {store,ui}=setup();
 for(const id of ['renad','afnan','executive','health','technology']){
  assert.throws(()=>saveWorkflow(ui,store,getAccount(id)),/admin-forbidden/);
  assert.throws(()=>addWorkflowStage(ui,'validation',getAccount(id)),/admin-forbidden/);
  assert.throws(()=>setWorkflowEnabled(ui,'approval',false,getAccount(id)),/admin-forbidden/);
 }
 assert.equal(store.history.length,0);
});
test('all four combinations of validation and approval can be saved independently',()=>{
 for(const [validation,approval] of [[true,true],[true,false],[false,true],[false,false]]){
  const {store,ui}=setup();setWorkflowEnabled(ui,'validation',validation,admin);setWorkflowEnabled(ui,'approval',approval,admin);
  assert.equal(saveWorkflow(ui,store,admin),true);
  const config=workflowSnapshot(store,'project-hold');assert.equal(Boolean(enabledStages(config,'validation').length),validation);assert.equal(Boolean(enabledStages(config,'approval').length),approval);
 }
});
test('missing names, missing roles and empty enabled phases cannot change active settings',()=>{
 const {store,ui}=setup();addWorkflowStage(ui,'validation',admin);
 const row=ui.draft.validation.stages.at(-1);
 assert.equal(saveWorkflow(ui,store,admin),false);assert.equal(ui.errors[`validation-${row.id}-name`],'name');assert.equal(ui.errors[`validation-${row.id}-role`],'role');
 assert.equal(store.history.length,0);assert.equal(store.configs['project-hold'].version,1);
 updateWorkflowStage(ui,'validation',row.id,{name:'Review',roleId:'unknown'},admin);assert.equal(saveWorkflow(ui,store,admin),false);
 for(const stage of [...ui.draft.validation.stages])removeWorkflowStage(ui,'validation',stage.id,admin);
 assert.equal(saveWorkflow(ui,store,admin),false);assert.equal(ui.errors.validation,'empty');
});
test('add, remove and reorder stages preserve a stable ordered saved configuration',()=>{
 const {store,ui}=setup();addWorkflowStage(ui,'approval',admin);const added=ui.draft.approval.stages.at(-1);
 updateWorkflowStage(ui,'approval',added.id,{name:'Finance review',roleId:'finance'},admin);
 moveWorkflowStage(ui,'approval',added.id,-1,admin);
 assert.equal(ui.draft.approval.stages.at(-2).id,added.id);
 removeWorkflowStage(ui,'approval','approval-1',admin);
 assert.equal(saveWorkflow(ui,store,admin),true);
 assert.deepEqual(store.configs['project-hold'].approval.stages.map(s=>s.roleId),['executor','contributor','finance','planning']);
});
test('discard and switching types protect drafts without silently saving them',()=>{
 const {store,ui}=setup();setWorkflowEnabled(ui,'approval',false,admin);assert.equal(workflowDirty(ui,store),true);
 requestWorkflowType(ui,store,'project-charter');assert.equal(ui.selected,'project-hold');assert.equal(ui.pendingType,'project-charter');
 loadWorkflowDraft(ui,store);assert.equal(workflowDirty(ui,store),false);assert.equal(ui.draft.approval.enabled,true);assert.equal(store.history.length,0);
 requestWorkflowType(ui,store,'project-charter');assert.equal(ui.selected,'project-charter');
 assert.equal(saveWorkflow(ui,store,admin),true,'explicitly save neither stage for an unconfigured type');
 assert.equal(store.configs['project-charter'].configured,true);
});
test('saves record administrator, time, old and new values, and do not rewrite older records',()=>{
 const {store,ui}=setup();setWorkflowEnabled(ui,'approval',false,admin);
 saveWorkflow(ui,store,admin,{now:()=> '2026-11-15T08:00:00.000Z'});
 const record=store.history[0];assert.equal(record.actor.id,'epmo');assert.equal(record.at,'2026-11-15T08:00:00.000Z');assert.equal(record.before.approval.enabled,true);assert.equal(record.after.approval.enabled,false);
 setWorkflowEnabled(ui,'validation',false,admin);saveWorkflow(ui,store,admin);
 assert.equal(record.after.validation.enabled,true);assert.equal(record.after.version,2);assert.equal(store.configs['project-hold'].version,3);
 const snapshot=workflowSnapshot(store,'project-hold');snapshot.version=999;assert.equal(store.configs['project-hold'].version,3);
});
test('stale drafts fail instead of overwriting a newer saved version',()=>{
 const {store,ui}=setup(),other=freshWorkflowAdmin();loadWorkflowDraft(other,store);
 setWorkflowEnabled(ui,'approval',false,admin);saveWorkflow(ui,store,admin);
 setWorkflowEnabled(other,'validation',false,admin);assert.equal(saveWorkflow(other,store,admin),false);assert.equal(other.errors.form,'conflict');assert.equal(store.history.length,1);
});
test('new Project Hold checks use saved stages while earlier evidence keeps its configuration',()=>{
 const {store,ui}=setup(),document=createHoldDocument('hold-settings',PROJECTS[0]);
 const first=checkDocument(document,workflowSnapshot(store,'project-hold'));
 assert.ok(first.findings.some(f=>f.approvalPrefix==='planning'&&f.status==='failed'));
 setWorkflowEnabled(ui,'approval',false,admin);saveWorkflow(ui,store,admin);
 assert.equal(holdDownloadState(document,{workflowVersion:2}).reason,'settings');
 assert.throws(()=>exportHoldDocument(document,{workflowVersion:2,acknowledged:true}),/download-settings/);
 const second=checkDocument(document,workflowSnapshot(store,'project-hold'));
 assert.equal(second.workflow.version,2);assert.equal(second.findings.some(f=>f.approvalPrefix),false);
 assert.equal(first.workflow.approval.enabled,true);assert.equal(first.workflow.version,1);
 assert.ok(second.findings.some(f=>f.group==='workflow'&&f.status==='skipped'));
});
test('Excellence review follows the same saved settings and marks inactive sign-off fields optional',()=>{
 const {store,ui}=setup(),review=freshExcellence();selectReviewSource(review,reviewSample('issues',PROJECTS[0]),admin);review.context.confirmed=true;
 const first=runExcellenceReview(review,admin,{workflow:workflowSnapshot(store,'project-hold')});
 setWorkflowEnabled(ui,'validation',false,admin);setWorkflowEnabled(ui,'approval',false,admin);saveWorkflow(ui,store,admin);
 const second=runExcellenceReview(review,admin,{workflow:workflowSnapshot(store,'project-hold')});
 assert.equal(second.workflow.approval.enabled,false);assert.equal(second.findings.some(f=>f.approvalPrefix),false);assert.ok(second.sections.find(s=>s.id==='approvals').fields.every(f=>!f.required));
 assert.equal(first.workflow.approval.enabled,true);
});
test('stage names render as text in the editor and audit history',()=>{
 const {store,ui}=setup();ui.draft.validation.stages[0].name='<img onerror=alert(1)>';
 saveWorkflow(ui,store,admin);
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const html=workflowAdminUI({ui,store,account:admin,t:en=>en,icon:()=>'',escape});assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img onerror'));
 assert.match(html,/Change history/);assert.match(html,/Before/);assert.match(html,/After/);
});
