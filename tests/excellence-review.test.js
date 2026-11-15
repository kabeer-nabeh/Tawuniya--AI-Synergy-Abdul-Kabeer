import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { freshExcellence,reviewSample,selectReviewSource,reviewReadiness,runExcellenceReview,changeReviewContext,reviewerSummaryText,submittedDocuments,openSubmittedDocument,returnToReviewInbox } from '../src/excellence-review.js';
import { excellenceReviewUI } from '../src/excellence-review-ui.js';
import { can,getAccount,PROJECTS,viewsFor } from '../src/demo-access.js';
import { wordVisualSections,textVisualSections } from '../src/document-visuals.js';

const reviewer=getAccount('epmo'),project=PROJECTS[0];
const setup=(id='complete')=>{const state=freshExcellence();selectReviewSource(state,reviewSample(id,project),reviewer);return state;};
const run=state=>{state.context.confirmed=true;return runExcellenceReview(state,reviewer,{now:()=> '2026-11-15T08:00:00.000Z'});};
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui=state=>excellenceReviewUI({state,account:reviewer,t:en=>en,escape,icon:()=>''});

test('only Excellence accounts can select or run submitted-document reviews',()=>{
 assert.equal(can(reviewer,'reviews'),true);
 assert.ok(viewsFor(reviewer).some(view=>view.id==='reviews'));
 for(const id of ['afnan','renad','executive','health','technology']){
  const account=getAccount(id);assert.equal(can(account,'reviews'),false);
  assert.throws(()=>selectReviewSource(freshExcellence(),reviewSample('complete',project),account),/review-forbidden/);
  assert.throws(()=>runExcellenceReview(setup(),account),/review-forbidden/);
  assert.equal(reviewReadiness(setup(),account),'forbidden');
 }
});
test('identified context always needs explicit confirmation before results',()=>{
 const state=setup();assert.equal(state.phase,'confirm');assert.equal(state.detected.projectId,'alpha');
 assert.equal(state.detected.typeId,'project-hold');assert.equal(reviewReadiness(state,reviewer),'confirmation');
 assert.throws(()=>runExcellenceReview(state,reviewer),/review-confirmation/);assert.equal(state.reports.length,0);
 const result=run(state);assert.equal(result.project.id,'alpha');assert.equal(result.reviewer.id,'epmo');
 assert.equal(result.at,'2026-11-15T08:00:00.000Z');
});
test('uncertain type and project require a selection and cannot be silently guessed',()=>{
 const state=freshExcellence();selectReviewSource(state,{name:'unknown.txt',text:'Project hold reason: Awaiting agreement\nProject manager: Afnan Rayyani'},reviewer);
 assert.equal(state.context.typeId,'');assert.equal(state.context.projectId,'');
 assert.equal(reviewReadiness(state,reviewer),'type');state.context.typeId='project-hold';
 assert.equal(reviewReadiness(state,reviewer),'project');state.context.projectId='alpha';
 assert.equal(reviewReadiness(state,reviewer),'confirmation');
});
test('out-of-scope, unrelated and unsupported-type files cannot produce results',()=>{
 const state=setup();state.context.projectId='claims';state.context.confirmed=true;
 const scoped={...reviewer,scope:{type:'manager',value:'afnan'}};
 assert.throws(()=>runExcellenceReview(state,scoped),/review-project/);
 selectReviewSource(state,{name:'memo.txt',text:'Meeting notes unrelated to a hold document'},reviewer);
 state.context={typeId:'project-hold',projectId:'alpha',confirmed:true};
 assert.throws(()=>runExcellenceReview(state,reviewer),/review-unrecognized/);
 selectReviewSource(state,{name:'quarterly.txt',text:'Quarterly performance report\nProject name: Project Alpha\nProject manager: Afnan Rayyani'},reviewer);
 state.context={typeId:'project-hold',projectId:'alpha',confirmed:true};
 assert.throws(()=>runExcellenceReview(state,reviewer),/review-unsupported-type/);
});
test('missing content and source contradictions are named and every required section is summarized',()=>{
 const state=setup('issues'),result=run(state);
 assert.equal(result.verdict,'needs-revision');
 assert.equal(result.findings.find(c=>c.key==='reason').status,'failed');
 assert.equal(result.findings.find(c=>c.key==='match-manager').status,'failed');
 assert.equal(result.sections.length,4);
 assert.equal(result.sections.flatMap(s=>s.fields).length,27);
 assert.equal(result.sections.flatMap(s=>s.fields).find(f=>f.key==='reason').status,'missing');
 assert.equal(result.sections.flatMap(s=>s.fields).find(f=>f.key==='manager').status,'mismatch');
 assert.equal(result.sections.flatMap(s=>s.fields).find(f=>f.key==='resumeDate').status,'invalid');
 const summary=reviewerSummaryText(result);
 for(const section of result.sections)assert.ok(summary.includes(section.label[0]));
 assert.match(summary,/Different manager in submitted document/);assert.match(summary,/Afnan Rayyani/);
});
test('complete local fields never become formal approval when manual checks remain',()=>{
 const result=run(setup());assert.equal(result.counts.failed,0);assert.equal(result.counts.manual,4);
 assert.equal(result.counts.passed,22);assert.equal(result.verdict,'manual-review');
 assert.equal(result.sections.flatMap(s=>s.fields).every(f=>f.status==='present'),true);
 assert.match(reviewerSummaryText(result),/No formal compliance decision/);
});
test('image and chart flags do not stop text checks or become passes',()=>{
 const state=setup('visuals'),result=run(state);
 assert.equal(result.counts.failed,0);assert.equal(result.counts.manual,6);assert.equal(result.counts.passed,22);
 assert.deepEqual(result.findings.filter(c=>c.group==='visuals').map(c=>c.visualKind),['image','chart']);
 assert.ok(result.findings.filter(c=>c.group==='visuals').every(c=>c.status==='manual'));
});
test('unavailable visual inspection remains explicit while text review continues',()=>{
 const state=setup();state.source.visualInspection='unavailable';
 const result=run(state);assert.equal(result.findings.find(c=>c.key==='visual-inspection').status,'manual');
 assert.equal(result.counts.passed,22);
});
test('changing context and rerunning retains original evidence and previous project snapshots',()=>{
 const state=setup(),first=run(state),original=state.source.text;
 changeReviewContext(state,reviewer);assert.equal(state.phase,'confirm');assert.equal(state.context.confirmed,false);
 state.context.projectId='claims';const second=run(state);
 assert.equal(first.project.id,'alpha');assert.equal(first.counts.failed,0);
 assert.equal(second.project.id,'claims');assert.ok(second.counts.failed>0);assert.equal(second.run,2);
 assert.equal(first.fields.projectName,'Project Alpha');assert.equal(state.source.text,original);
 state.context.projectId='platform';assert.equal(first.project.id,'alpha');
});
test('review UI escapes source and evidence and has no owner correction or approval controls',()=>{
 const state=setup();state.source.name='<img src=x onerror=alert(1)>.txt';
 state.source.text=state.source.text.replace('Pause delivery','<script>alert(1)</script>');run(state);
 const html=ui(state);assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;script&gt;'));
 assert.doesNotMatch(html,/<script>|<img src=x/);
 for(const action of ['validator-edit','validator-download','hold-use-project','approve-document','reject-document'])assert.ok(!html.includes(`data-action="${action}"`));
 assert.match(html,/data-action="review-context"/);assert.match(html,/Document sections/);
 assert.match(excellenceReviewUI({state,account:reviewer,t:(_en,ar)=>ar,escape,icon:()=>''}),/أقسام المستند/);
});
test('new review state and owner fields remain isolated',()=>{
 const a=setup();run(a);const b=freshExcellence();
 assert.equal(b.source,null);assert.equal(b.reports.length,0);
 const file=reviewSample('complete',project),state=freshExcellence();selectReviewSource(state,file,reviewer);
 file.text='Changed externally';assert.notEqual(state.source.text,file.text);
});
test('Word visual detection reads actual directory entries and fails closed on malformed ZIPs',async()=>{
 const real=await readFile(new URL('./fixtures/project-status.docx',import.meta.url));
 assert.deepEqual(wordVisualSections(real.buffer.slice(real.byteOffset,real.byteOffset+real.byteLength)),[]);
 assert.throws(()=>wordVisualSections(new ArrayBuffer(30)),/visual-directory-unavailable/);
 // A ZIP directory can be inspected without decompressing or loading its contents.
 const names=['word/media/image1.png','word/charts/chart1.xml','word/document.xml'];
 const headers=names.map(name=>{const bytes=Buffer.from(name),header=Buffer.alloc(46+bytes.length);header.writeUInt32LE(0x02014b50,0);header.writeUInt16LE(bytes.length,28);bytes.copy(header,46);return header;});
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(names.length,10);
 const file=Buffer.concat([...headers,end]);const result=wordVisualSections(file.buffer.slice(file.byteOffset,file.byteOffset+file.length));
 assert.deepEqual(result.map(c=>c.kind),['image','chart']);
 assert.match(result[0].description[0],/exact section/);
});
test('plain text flags explicit visual placeholders, not casual mentions of charts',()=>{
 const sections=textVisualSections('[Image: Hold dependency diagram]\nA chart is discussed in the prose.\n[Chart: Schedule impact]');
 assert.deepEqual(sections.map(s=>s.kind),['image','chart']);assert.equal(sections.length,2);
});
test('submission inbox scopes records and starts with genuine unreviewed local states',()=>{
 const state=freshExcellence(),entries=submittedDocuments(state,reviewer);
 assert.equal(entries.length,3);assert.ok(entries.every(entry=>entry.status==='pending'));
 assert.ok(entries.every(entry=>entry.submittedAt&&entry.submitter.length&&entry.revision));
 const scoped={...reviewer,scope:{type:'manager',value:'renad'}};
 assert.deepEqual(submittedDocuments(state,scoped).map(entry=>entry.project.id),['claims']);
 assert.throws(()=>openSubmittedDocument(state,'SUB-2026-014',scoped),/submission-unavailable/);
 assert.throws(()=>submittedDocuments(state,getAccount('renad')),/review-forbidden/);
});
test('queue documents retain independent results and history when reopened',()=>{
 const state=freshExcellence();openSubmittedDocument(state,'SUB-2026-014',reviewer);
 assert.equal(state.phase,'confirm');assert.equal(state.context.confirmed,false);run(state);
 returnToReviewInbox(state,reviewer);
 assert.equal(submittedDocuments(state,reviewer)[0].status,'needs-revision');
 openSubmittedDocument(state,'SUB-2026-015',reviewer);const second=run(state);
 assert.equal(second.project.id,'claims');assert.equal(second.counts.failed,0);
 returnToReviewInbox(state,reviewer);
 assert.equal(submittedDocuments(state,reviewer)[1].status,'manual-review');
 openSubmittedDocument(state,'SUB-2026-014',reviewer);
 assert.equal(state.phase,'report');assert.equal(state.reports.length,1);assert.equal(state.reports[0].project.id,'alpha');
 run(state);assert.equal(state.reports.length,2);
 openSubmittedDocument(state,'SUB-2026-015',reviewer);assert.equal(state.reports.length,1);
 assert.equal(state.reports[0].project.id,'claims');
});
test('a queue document with unconfirmed changed context returns to confirmation',()=>{
 const state=freshExcellence();openSubmittedDocument(state,'SUB-2026-014',reviewer);run(state);
 changeReviewContext(state,reviewer);state.context.projectId='claims';returnToReviewInbox(state,reviewer);
 openSubmittedDocument(state,'SUB-2026-014',reviewer);assert.equal(state.phase,'confirm');
 assert.equal(state.context.confirmed,false);assert.equal(state.reports[0].project.id,'alpha');
});
test('inbox search, filters and empty states keep samples as an additional option',()=>{
 const state=freshExcellence();let html=ui(state);
 assert.match(html,/Submitted for review/);assert.match(html,/Submitted by/);
 assert.match(html,/data-action="review-options"/);
 assert.match(html,/<dialog id="er-submission-options" class="er-upload-modal"/);
 assert.match(html,/class="primary-button" data-action="review-options"/);
 state.queueQuery='Renad';html=ui(state);assert.match(html,/data-submission-id="SUB-2026-015"/);
 assert.doesNotMatch(html,/data-submission-id="SUB-2026-014"/);
 state.queueQuery='not found';assert.match(ui(state),/No submissions match/);
 state.queueQuery='';state.queueFilter='manual-review';assert.match(ui(state),/No submissions match/);
 openSubmittedDocument(state,'SUB-2026-015',reviewer);run(state);returnToReviewInbox(state,reviewer);
 assert.match(ui(state),/View findings/);
});
