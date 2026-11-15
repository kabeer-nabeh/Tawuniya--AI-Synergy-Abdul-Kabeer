import test from 'node:test';
import assert from 'node:assert/strict';
import { createHoldDocument,holdDownloadState,extractHoldFields } from '../src/project-hold.js';
import { exportHoldDocument } from '../src/project-hold-export.js';
import { checkDocument,saveDocument,addUploadedDocument,freshValidator,documentValidatorUI } from '../src/document-validator.js';
import { PROJECTS,projectsFor,getAccount } from '../src/demo-access.js';
import { holdEditor } from '../src/project-hold-ui.js';

const project=PROJECTS[0];
const ready=()=>{const d=createHoldDocument('hold-flow',project);d.artifact.fields.resumeDate='2027-03-31';checkDocument(d);return d;};
// Read independent ZIP local headers, not the exporter's internal entry builder.
function entries(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out={};let offset=0;
 while(view.getUint32(offset,true)===0x04034b50){
  assert.equal(view.getUint16(offset+8,true),0,'stored archive');
  const length=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true);
  const name=new TextDecoder().decode(bytes.slice(offset+30,offset+30+nameLength));
  const start=offset+30+nameLength+extra;out[name]=new TextDecoder().decode(bytes.slice(start,start+length));offset=start+length;
 }
 assert.equal(view.getUint32(offset,true),0x02014b50,'central directory follows the content');return out;
}
test('download requires checked, saved current content and cannot export an old check',()=>{
 const d=createHoldDocument('hold-flow',project);
 assert.equal(holdDownloadState(d).reason,'unchecked');
 checkDocument(d);assert.equal(holdDownloadState(d).reason,'invalid');
 d.draft={...d.artifact.fields,resumeDate:'2027-03-31'};
 assert.equal(holdDownloadState(d).reason,'unsaved');
 assert.throws(()=>exportHoldDocument(d,{acknowledged:true}),/download-unsaved/);
 saveDocument(d,d.draft);assert.equal(holdDownloadState(d).reason,'stale');
 checkDocument(d);assert.equal(holdDownloadState(d,{run:1}).reason,'historical');
 assert.throws(()=>exportHoldDocument(d,{run:1,acknowledged:true}),/download-historical/);
 assert.equal(holdDownloadState(d,{busy:true}).reason,'busy');
 assert.equal(holdDownloadState(d).allowed,true);
});
test('missing content may be acknowledged, but non-empty project contradictions block download',()=>{
 const d=ready();
 assert.ok(holdDownloadState(d).missing.some(c=>c.key==='planning'));
 assert.throws(()=>exportHoldDocument(d),/download-acknowledgement/);
 assert.ok(exportHoldDocument(d,{acknowledged:true}).bytes.length);
 saveDocument(d,{...d.artifact.fields,manager:'Another manager'});checkDocument(d);
 assert.equal(holdDownloadState(d).reason,'mismatch');
 assert.throws(()=>exportHoldDocument(d,{acknowledged:true}),/download-mismatch/);
 saveDocument(d,{...d.artifact.fields,manager:''});checkDocument(d);
 assert.equal(holdDownloadState(d).allowed,true,'blank manager is missing content rather than a contradiction');
});
test('native DOCX export contains the checked revision and escapes all user content',()=>{
 const d=ready(),first=d.reviews[0];
 saveDocument(d,{...d.artifact.fields,reason:'Awaiting <agreement> & approval\nLegal review continues.'});checkDocument(d);
 const file=exportHoldDocument(d,{acknowledged:true}),parts=entries(file.bytes),xml=parts['word/document.xml'];
 assert.match(file.filename,/revision-2\.docx$/);
 assert.match(parts['[Content_Types].xml'],/wordprocessingml.document.main\+xml/);
 assert.match(parts['_rels/.rels'],/Target="word\/document.xml"/);
 assert.match(xml,/Revision 2 \| Check 2/);
 assert.match(xml,/Awaiting &lt;agreement&gt; &amp; approval/);
 assert.ok(!xml.includes('<agreement>'));
 assert.ok(!first.fields.reason.includes('<agreement>'),'prior review remains immutable');
});
test('upload corrections preserve original text and re-extraction retains corrected values and multiline reasons',()=>{
 const v=freshValidator(),source='EPMO Project Hold\nProject name: Wrong name\nProject manager: Wrong manager\nExecutor sector: Health\nProject hold reason: Awaiting access\nLegal approval pending\nImpact of the hold: Delivery pauses';
 addUploadedDocument(v,{text:source,name:'hold.txt',extension:'txt',size:source.length},'project-hold','upload',project);
 const d=v.documents.upload;checkDocument(d);
 assert.match(d.artifact.fields.reason,/Legal approval pending/);
 saveDocument(d,{...d.artifact.fields,projectName:project.name[0],manager:project.owner[0]});checkDocument(d);
 const xml=entries(exportHoldDocument(d,{acknowledged:true}).bytes)['word/document.xml'];
 // Mimic extraction paragraph boundaries from the generated file.
 const text=xml.replaceAll('</w:p>','\n').replaceAll('<w:br/>','\n').replace(/<[^>]+>/g,'').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>');
 const fields=extractHoldFields(text);
 assert.equal(fields.projectName,project.name[0]);assert.equal(fields.manager,project.owner[0]);
 assert.equal(fields.reason,d.artifact.fields.reason);
 assert.equal(d.upload.text,source);
 assert.match(text,/Original extracted text \(reference only\)/);
 assert.match(text,/Project name: Wrong name/);
});
test('rechecking resets acknowledgement and a regression blocks the new download',()=>{
 const d=ready();d.downloadAcknowledged=d.reviews.at(-1).run;
 checkDocument(d);assert.equal(d.downloadAcknowledged,null);
 saveDocument(d,{...d.artifact.fields,resumeDate:'2026-10-01'});checkDocument(d);
 assert.equal(holdDownloadState(d).reason,'invalid');
 assert.throws(()=>exportHoldDocument(d,{acknowledged:true}),/download-invalid/);
 saveDocument(d,{...d.artifact.fields,resumeDate:'2027-03-31',planningDate:'2026-02-30'});checkDocument(d);
 assert.equal(holdDownloadState(d).reason,'invalid','a supplied but invalid sign-off date also needs correction');
});
test('Renad has an assigned Project Hold sample without gaining access to Afnan projects',()=>{
 const projects=projectsFor(getAccount('renad'));
 const documents=projects.map(project=>({id:'hold-'+project.id,hold:true,project,name:()=>project.name[0],meta:()=> 'Demo'}));
 const ctx={validator:freshValidator(),documents,projects,t:en=>en,icon:()=>'',escape:String,definitions:()=>[]};
 const html=documentValidatorUI(ctx);
 assert.match(html,/option value="claims"/);assert.match(html,/data-id="hold-claims"/);
 assert.doesNotMatch(html,/option value="alpha"/);
 const empty=documentValidatorUI({...ctx,projects:[],documents:[]});
 assert.match(empty,/No projects assigned/);assert.match(empty,/data-action="accounts"/);
});
test('an invalid uploaded date remains visible and editable rather than vanishing in a native date input',()=>{
 const d=ready();d.artifact.fields.holdDate='2026-02-30';
 const html=holdEditor({document:d,fields:d.artifact.fields,t:en=>en,escape:String,icon:()=>''});
 assert.match(html,/id="hold-holdDate" name="holdDate" type="text"[^>]+value="2026-02-30"/);
});
