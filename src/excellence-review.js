import { can,projectsFor } from './demo-access.js';
import { emptyUpload,resolvedUploadTemplate } from './document-upload.js';
import { createHoldDocument,extractHoldFields,HOLD_FIELDS,HOLD_GROUPS,holdChecks } from './project-hold.js';
import { validDate } from './artifact-review.js';
import { requiredApprovalFields } from './workflow-config.js';

export const REVIEW_SAMPLES=[
 {id:'issues',name:['Missing content & project mismatch','محتوى ناقص واختلاف في بيانات المشروع'],description:['Inspect missing justification, date errors and a different project manager.','راجع المبررات الناقصة وأخطاء التواريخ واختلاف مدير المشروع.']},
 {id:'complete',name:['Complete review fields','حقول المراجعة مكتملة'],description:['All local fields complete.','جميع الحقول المحلية مكتملة.']},
 {id:'visuals',name:['Images & charts to review','صور ومخططات للمراجعة'],description:['Includes visual evidence for manual review.','يتضمن أدلة مرئية للمراجعة اليدوية.']},
];
export const freshExcellence=()=>({phase:'intake',showOptions:false,upload:emptyUpload(),source:null,context:{typeId:'',projectId:'',confirmed:false},detected:null,reports:[],run:null,filter:'all',busy:false,error:null,activeUpload:null,uploadReviews:{},uploads:[],nextUploadId:1,queueFilter:'all',queueQuery:''});
const normalized=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const requireReviewer=account=>{if(!can(account,'reviews'))throw new Error('review-forbidden');};
const reviewKeys=['source','context','detected','reports','run','filter','error'];
export function preserveUploadReview(state) {
 if(state.activeUpload)state.uploadReviews[state.activeUpload]=structuredClone(Object.fromEntries(reviewKeys.map(key=>[key,state[key]])));
}
export function uploadedDocuments(state,account) {
 requireReviewer(account);
 preserveUploadReview(state);
 const projects=projectsFor(account);
 return state.uploads.filter(entry=>entry.uploadedBy===account.id).flatMap(entry=>{
  const saved=state.uploadReviews[entry.id];
  if(!saved)return [];
  const project=projects.find(project=>project.id===saved.context.projectId);
  if(saved.context.projectId&&!project)return [];
  const report=saved.reports.at(-1);
  const current=report&&saved.context.confirmed&&report.project.id===saved.context.projectId&&report.typeId===saved.context.typeId;
  return [{...entry,name:saved.source.name,project,status:!current?'pending':report.counts.failed?'needs-revision':'manual-review',report:current?report:null,lastReviewedAt:report?.at||null}];
 }).reverse();
}
export function openUploadedDocument(state,id,account) {
 const entry=uploadedDocuments(state,account).find(entry=>entry.id===id);
 if(!entry)throw new Error('review-upload-unavailable');
 preserveUploadReview(state);
 Object.assign(state,structuredClone(state.uploadReviews[id]));
 state.phase=entry.report?'report':'confirm';
 state.activeUpload=id;state.showOptions=false;
 state.upload.token++;state.upload.reading=false;state.error=null;
}
export function returnToReviewHistory(state,account) {
 requireReviewer(account);preserveUploadReview(state);state.phase='intake';state.showOptions=false;
}

export function reviewSample(id,project) {
 if(!REVIEW_SAMPLES.some(s=>s.id===id)||!project)throw new Error('invalid-sample');
 const fields=createHoldDocument('review-sample',project).artifact.fields;
 Object.assign(fields,{resumeDate:'2027-03-31',planningName:'Demo planning reviewer',planningDate:'2026-11-30'});
 if(id==='issues')Object.assign(fields,{manager:'Different manager in submitted document',reason:'',resumeDate:'2026-11-01',planningName:'',planningDate:''});
 const manualSections=id==='visuals'?[
  {kind:'image',location:['Hold justification: dependency diagram','مبررات التعليق: رسم التبعيات'],description:['Sample image content is not evaluated automatically. Inspect the original diagram.','لا يُقيّم محتوى الصورة التجريبية آليًا. افحص الرسم الأصلي.']},
  {kind:'chart',location:['Project review: schedule impact chart','مراجعة المشروع: مخطط أثر الجدول'],description:['Inspect chart labels and values manually; remaining text checks continue.','افحص عناوين المخطط وقيمه يدويًا؛ يستمر فحص بقية النص.']}
 ]:[];
 return {name:`Project-Hold-${id}-sample.txt`,extension:'txt',sample:true,size:0,pages:null,text:'EPMO Project Hold\n'+HOLD_FIELDS.map(([key,en])=>`${en}: ${fields[key]}`).join('\n'),manualSections,visualInspection:'sample'};
}

export function detectReviewContext(file,account) {
 requireReviewer(account);
 const template=resolvedUploadTemplate({templateId:'auto',file});
 const fields=extractHoldFields(file.text);
 const matches=projectsFor(account).filter(project=>project.name.some(name=>normalized(name)===normalized(fields.projectName)));
 return {typeId:template?.id||'',projectId:matches.length===1?matches[0].id:'',typeStatus:template?'detected':'uncertain',projectStatus:matches.length===1?'detected':matches.length>1?'ambiguous':'uncertain',documentProject:fields.projectName};
}

export function selectReviewSource(state,file,account,{now=()=>new Date().toISOString()}={}) {
 requireReviewer(account);
 if(!file?.text?.trim())throw new Error('review-no-file');
 preserveUploadReview(state);state.activeUpload=null;
 state.source=structuredClone(file);state.detected=detectReviewContext(file,account);
 state.context={typeId:state.detected.typeId==='project-hold'?'project-hold':'',projectId:state.detected.projectId,confirmed:false};
 state.phase='confirm';state.showOptions=false;state.reports=[];state.run=null;state.filter='all';state.error=null;
 state.activeUpload=`upload-${state.nextUploadId++}`;
 state.uploads.push({id:state.activeUpload,uploadedBy:account.id,uploadedAt:now()});
 preserveUploadReview(state);
}

export function reviewReadiness(state,account) {
 if(!can(account,'reviews'))return 'forbidden';
 if(state.busy)return 'busy';
 if(state.upload.reading)return 'reading';
 if(!state.source?.text)return 'file';
 if(state.detected?.typeId&&state.detected.typeId!=='project-hold')return 'unsupported-type';
 if(state.context.typeId!=='project-hold')return 'type';
 const fields=extractHoldFields(state.source.text);
 if(Object.values(fields).filter(value=>value.trim()).length<2)return 'unrecognized';
 if(!projectsFor(account).some(project=>project.id===state.context.projectId))return 'project';
 if(!state.context.confirmed)return 'confirmation';
 return 'ready';
}

export function reviewSectionSummary(fields,findings,workflow=null) {
 return HOLD_GROUPS.map(([id,en,ar])=>({id,label:[en,ar],fields:HOLD_FIELDS.filter(f=>f[3]===id).map(([key,en,ar,,type])=>{
  const value=fields[key]||'';
  const mismatch=findings.some(c=>c.group==='consistency'&&c.field===key&&c.status==='failed');
  const dateOrder=key==='resumeDate'&&validDate(fields.holdDate)&&validDate(value)&&value<fields.holdDate;
  const status=!value.trim()?'missing':(type==='date'&&!validDate(value))||dateOrder?'invalid':mismatch?'mismatch':'present';
  return {key,label:[en,ar],value,status,required:key!=='impact'&&(id!=='approvals'||!workflow||requiredApprovalFields(workflow).has(key))};
 })}));
}

export function runExcellenceReview(state,account,{now=()=>new Date().toISOString(),workflow=null}={}) {
 requireReviewer(account);
 const readiness=reviewReadiness(state,account);
 if(readiness!=='ready')throw new Error('review-'+readiness);
 const project=structuredClone(projectsFor(account).find(project=>project.id===state.context.projectId));
 const source=structuredClone(state.source),fields=extractHoldFields(source.text);
 const snapshot=workflow?structuredClone(workflow):null;
 const findings=holdChecks(fields,project,snapshot).map(c=>({...c,status:c.status==='skipped'?'manual':c.status}));
 for(const [index,visual] of (source.manualSections||[]).entries())findings.push({key:`visual-${index}`,group:'visuals',label:visual.location,rule:visual.description,status:'manual',evidence:'',field:null,visualKind:visual.kind});
 if(source.visualInspection==='unavailable')findings.push({key:'visual-inspection',group:'visuals',label:['Visual content could not be inspected','تعذّر فحص المحتوى المرئي'],rule:['Text checks continued. Inspect the original file for images, charts and diagrams.','استمر فحص النص. افحص الملف الأصلي بحثًا عن الصور والمخططات والرسوم.'],status:'manual',evidence:'',field:null});
 const counts=Object.fromEntries(['failed','warning','passed','manual'].map(status=>[status,findings.filter(c=>c.status===status).length]));
 const report={run:state.reports.length+1,at:now(),reviewer:{id:account.id,name:[...account.name]},typeId:'project-hold',project,source,fields,workflow:snapshot,findings,counts,sections:reviewSectionSummary(fields,findings,snapshot),verdict:counts.failed?'needs-revision':'manual-review'};
 state.reports.push(report);state.run=report.run;state.phase='report';state.filter=counts.failed?'failed':'manual';state.error=null;
 preserveUploadReview(state);
 return report;
}

export function changeReviewContext(state,account) {
 requireReviewer(account);
 if(!state.source)throw new Error('review-no-file');
 state.context.confirmed=false;state.phase='confirm';state.error=null;
}

export function reviewerSummaryText(report) {
 const rows=[`Project Hold submitted-document review`, `File: ${report.source.name}`,`Project: ${report.project.name[0]}`,`Reviewer: ${report.reviewer.name[0]}`,`Check: ${report.run}`,`Time (UTC): ${report.at}`,`Outcome: ${report.counts.failed?'Needs revision':'Local checks passed; manual review required'}`,`Checks: ${report.counts.failed} required findings, ${report.counts.warning} warnings, ${report.counts.passed} passed, ${report.counts.manual} manual review items.`];
 for(const section of report.sections){rows.push('',section.label[0]);for(const field of section.fields)rows.push(`${field.label[0]}: ${field.value||'[Missing]'} (${field.status})`);}
 rows.push('','Findings');for(const finding of report.findings)if(finding.status!=='passed')rows.push(`${finding.label[0]} (${finding.status}): ${finding.evidence||finding.rule[0]}`);
 rows.push('','Local demo checks and project snapshot only. No formal compliance decision. No approval, rejection or Synergy status change was performed. Original submitted file is unchanged.');
 return rows.join('\n');
}
