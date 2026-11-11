import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkUploadFile,fieldsFromText,MAX_UPLOAD_BYTES,readUploadedFile,emptyUpload,uploadSetup,readUploadSelection,removeUploadFile} from '../src/document-upload.js';
import {freshValidator,addUploadedDocument,checkDocument,documentValidatorUI} from '../src/document-validator.js';

test('upload gate rejects empty, unsupported and oversized files',()=>{
  assert.throws(()=>checkUploadFile({name:'file.txt',size:0}),/empty-file/);
  assert.throws(()=>checkUploadFile({name:'file.exe',size:10}),/unsupported-file/);
  assert.throws(()=>checkUploadFile({name:'file.pdf',size:MAX_UPLOAD_BYTES+1}),/file-too-large/);
  assert.equal(checkUploadFile({name:'STATUS.DOCX',size:100}),'docx');
});
test('actual text file content populates the validation fields',async()=>{
  const bytes=await readFile(new URL('./fixtures/project-status.txt',import.meta.url));
  const file=await readUploadedFile(new File([bytes],'project-status.txt'));
  assert.equal(file.fields.owner,'Afnan Rayyani');
  assert.equal(file.fields.start,'2026-09-01');
  assert.equal(file.fields.nextDue,'2026-10-05');
  const validator=freshValidator();
  addUploadedDocument(validator,file,'project-status','upload-test');
  const review=checkDocument(validator.documents['upload-test']);
  assert.deepEqual(review.checks,{period:true,owner:true,next:true});
  assert.equal(validator.uploads[0].templateId,'project-status');
});
test('missing labeled content stays empty, without sample defaults or borrowed headings',()=>{
  const fields=fieldsFromText('Accountable owner:\nNext action:\nDue date: 2026-10-05');
  assert.equal(fields.owner,'');
  assert.equal(fields.nextAction,'');
  assert.equal(fields.nextDue,'2026-10-05');
  assert.equal(fields.start,'');
});
test('Arabic labels and numerals, Markdown and Word-style table line breaks are supported',()=>{
  const fields=fieldsFromText('## فترة التقرير: ٢٠٢٦-٠٩-٠١ إلى ٢٠٢٦-٠٩-٣٠\n**المالك المسؤول**\n\nفريق المشروع\nالإجراء التالي: مراجعة النتائج\nتاريخ الاستحقاق: ٢٠٢٦-١٠-٠٥');
  assert.deepEqual(fields,{start:'2026-09-01',end:'2026-09-30',owner:'فريق المشروع',nextAction:'مراجعة النتائج',nextDue:'2026-10-05'});
});
test('ambiguous and invalid dates remain unresolved',()=>{
  const fields=fieldsFromText('Start date: 09/01/26\nEnd date: 2026-02-30\nAccountable owner: Owner');
  assert.equal(fields.start,'');assert.equal(fields.end,'');
});
test('upload records require an explicit supported template and stay account-isolated',()=>{
  const a=freshValidator(),b=freshValidator(),file={name:'report.txt',text:'Owner: One',fields:fieldsFromText('Owner: One')};
  assert.throws(()=>addUploadedDocument(a,file,'unknown','bad'),/invalid-upload/);
  addUploadedDocument(a,file,'quarterly-report','upload-one');
  assert.equal(a.documents['upload-one'].artifact.fields.owner,'One');
  assert.equal(b.uploads.length,0);assert.equal(b.documents['upload-one'],undefined);
});
test('empty or binary plain text cannot produce a passing review',async()=>{
  await assert.rejects(()=>readUploadedFile(new File([' \n '],'empty.md')),/no-text/);
  await assert.rejects(()=>readUploadedFile(new File(['abc\0def'],'binary.txt')),/read-failed/);
});

test('uploaded names, extracted source and field values render as text, not document HTML',()=>{
  const validator=freshValidator(),name='<img src=x onerror=alert(1)>.txt',text='Owner: <script>alert(1)</script>';
  const file={name,text,extension:'txt',size:50,fields:fieldsFromText(text)};
  addUploadedDocument(validator,file,'project-status','upload-html');
  checkDocument(validator.documents['upload-html']);validator.selected='upload-html';
  const escape=value=>String(value).replace(/[&<>"']/g,letter=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[letter]));
  const html=documentValidatorUI({t:en=>en,icon:()=>'',escape,documents:[{id:'upload-html',name:()=>name,meta:()=>''}],validator,definitions:fields=>[{key:'owner',type:'required',value:fields.owner,passed:'Owner present',missing:'Owner missing',location:'Owner',rule:'Name an owner',field:'artifact-owner'}]});
  assert.equal(html.includes('<script>'),false);
  assert.equal(html.includes('<img src=x'),false);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x'));
});

test('upload readiness supports either selection order and rejects unavailable project IDs',()=>{
 const upload=emptyUpload(),projects=[{id:'alpha'}];
 upload.templateId='project-hold';upload.projectId='alpha';
 assert.equal(uploadSetup(upload,projects),'file');
 upload.file={text:'Project name: Project Alpha'};
 assert.equal(uploadSetup(upload,projects),'ready');
 assert.equal(uploadSetup(upload,[]),'project');
 upload.templateId='invalid';assert.equal(uploadSetup(upload,projects),'template');
 upload.templateId='project-status';assert.equal(uploadSetup(upload,[]),'ready');
 upload.reading=true;assert.equal(uploadSetup(upload,projects),'reading');
 assert.equal(uploadSetup(upload,projects,true),'busy');
});
test('cancel, replace, remove and read errors preserve template and project choices',async()=>{
 const upload={...emptyUpload(),templateId:'project-hold',projectId:'alpha'};
 const file=new File(['Project name: Project Alpha'],'hold.txt');
 await readUploadSelection(upload,[file]);
 const first=upload.file;
 await readUploadSelection(upload,[]);assert.equal(upload.file,first);
 removeUploadFile(upload);
 assert.equal(upload.file,null);assert.equal(upload.templateId,'project-hold');assert.equal(upload.projectId,'alpha');
 await readUploadSelection(upload,[new File(['x'],'bad.exe')]);
 assert.equal(upload.error,'unsupported-file');assert.equal(uploadSetup(upload,[{id:'alpha'}]),'file');
 await readUploadSelection(upload,[file]);
 assert.equal(upload.error,null);assert.equal(uploadSetup(upload,[{id:'alpha'}]),'ready');
});
test('an obsolete read cannot replace a newer file or resurrect a removed file',async()=>{
 const upload=emptyUpload();let finishOld;
 const old=readUploadSelection(upload,[{}],()=>new Promise(resolve=>{finishOld=resolve;}));
 await readUploadSelection(upload,[{}],async()=>({name:'new.txt',text:'new'}));
 finishOld({name:'old.txt',text:'old'});assert.equal(await old,false);
 assert.equal(upload.file.name,'new.txt');
 let finishRemoved;
 const pending=readUploadSelection(upload,[{}],()=>new Promise(resolve=>{finishRemoved=resolve;}));
 removeUploadFile(upload);finishRemoved({text:'removed'});
 assert.equal(await pending,false);assert.equal(upload.file,null);assert.equal(upload.reading,false);
});
test('real Project Hold upload completes setup and reaches its own template checks',async()=>{
 const bytes=await readFile(new URL('./fixtures/project-hold.txt',import.meta.url));
 const validator=freshValidator();validator.upload.templateId='project-hold';validator.upload.projectId='alpha';
 await readUploadSelection(validator.upload,[new File([bytes],'project-hold.txt')]);
 const project={id:'alpha',name:['Project Alpha','مشروع ألفا'],owner:['Afnan Rayyani','أفنان رياني'],sector:'Health',sectorLabel:['Health','الصحة']};
 assert.equal(uploadSetup(validator.upload,[project]),'ready');
 addUploadedDocument(validator,validator.upload.file,validator.upload.templateId,'uploaded-hold',project);
 const result=checkDocument(validator.documents['uploaded-hold']);
 assert.equal(result.kind,'project-hold');assert.equal(result.checks['date-order'],'failed');
 assert.equal(result.checks['match-projectName'],'passed');assert.equal(result.checks.planning,'failed');
 assert.equal(result.findings.length,26);
});
test('setup explains the next action instead of leaving the user at a disabled button',()=>{
 const validator=freshValidator();validator.upload.templateId='project-hold';validator.upload.projectId='alpha';
 const ctx={t:en=>en,icon:()=>'',escape:String,documents:[],validator,definitions:()=>[],projects:[{id:'alpha',name:['Project Alpha','مشروع ألفا']}]};
 const html=documentValidatorUI(ctx);
 assert.match(html,/Upload a document to start validation/);
 assert.match(html,/Upload document<\/button>/);
 assert.doesNotMatch(html,/id="validator-submit"[^>]*disabled/);
 validator.upload.reading=true;
 assert.match(documentValidatorUI(ctx),/id="validator-submit"[^>]*disabled/);
});

test('auto-detect matches a single supported heading and allows manual selection',()=>{
 const upload=emptyUpload();
 const projects=[{id:'alpha'}];
 upload.file={text:'## EPMO Project Hold\nProject name: Project Alpha'};
 assert.equal(uploadSetup(upload,projects),'project');
 upload.projectId='alpha';
 assert.equal(uploadSetup(upload,projects),'ready');
 upload.file={text:'Project Hold\nQuarterly performance report\nProject name: Project Alpha'};
 assert.equal(uploadSetup(upload,projects),'template');
 upload.templateId='quarterly-report';
 assert.equal(uploadSetup(upload,projects),'ready');
});
