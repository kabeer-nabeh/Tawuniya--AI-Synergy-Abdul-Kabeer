import { validDate } from './artifact-review.js';
import { enabledStages,workflowRole,APPROVAL_FIELDS } from './workflow-config.js';

// Reference-informed demo rules, not an approved Tawuniya acceptance policy.
export const HOLD_TEMPLATE={id:'project-hold',name:['EPMO Project Hold','تعليق مشروع إدارة المشاريع'],version:'2026.1-demo',description:['Hold reason, project details, review tables and sign-off information.','سبب التعليق وبيانات المشروع وجداول المراجعة ومعلومات التوقيع.']};
export const HOLD_FIELDS=[
 ['projectName','Project name','اسم المشروع','metadata'],['manager','Project manager','مدير المشروع','metadata'],['sector','Executor sector','قطاع التنفيذ','metadata'],['holdDate','Project hold date','تاريخ تعليق المشروع','metadata','date'],['resumeDate','Expected resumption date','تاريخ الاستئناف المتوقع','metadata','date'],['preparedBy','Prepared by','أعده','metadata'],['preparedOn','Prepared on','تاريخ الإعداد','metadata','date'],
 ['reason','Project hold reason','سبب تعليق المشروع','reason','textarea'],['impact','Impact of the hold','أثر التعليق','reason','textarea'],
 ...[['budget','Budget','الميزانية'],['schedule','Schedule','الجدول الزمني'],['deliverables','Deliverables','المخرجات'],['risks','Risks','المخاطر'],['issues','Issues','المشكلات']].flatMap(([key,en,ar])=>[[key+'Review',en+' review','مراجعة '+ar,'review','textarea'],[key+'Justification',en+' justification','تبرير '+ar,'review','textarea']]),
 ...[['sponsor','Sponsor','الراعي'],['executor','Executor P&Q','الجودة والأداء لقطاع التنفيذ'],['contributor','Contributor P&Q','الجودة والأداء للقطاع المساهم'],['planning','Strategic Planning','التخطيط الاستراتيجي']].flatMap(([key,en,ar])=>[[key+'Name',en+' approver',ar+'، المعتمد','approvals'],[key+'Date',en+' approval date',ar+'، تاريخ الاعتماد','approvals','date']]),
];
export const HOLD_GROUPS=[['metadata','Project information','معلومات المشروع'],['reason','Hold justification','مبررات التعليق'],['review','Project review','مراجعة المشروع'],['approvals','Approval details','تفاصيل الاعتماد']];
export const blankHoldFields=()=>Object.fromEntries(HOLD_FIELDS.map(([key])=>[key,'']));
const clean=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export function extractHoldFields(text) {
 const fields=blankHoldFields(),lines=text.split(/^Original extracted text \(reference only\)\s*$/m)[0].replace(/\*\*/g,'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean),seen=new Set();
 const aliases={manager:['Project Manager'],sector:['Project Executer Sector','Project Executor Sector'],reason:['Project Hold Reason'],resumeDate:['Expected Resumption Date'],preparedBy:['Prepared By Project Manager']};
 const lookup=new Map(HOLD_FIELDS.flatMap(([key,en,ar])=>[en,ar,...aliases[key]||[]].map(label=>[clean(label),key])));
 const headings=new Set(HOLD_GROUPS.flatMap(([,en,ar])=>[clean(en),clean(ar)]));
 const isLabel=line=>headings.has(clean(line))||lookup.has(clean(line.replace(/[:：]$/,'')))||lookup.has(clean(line.split(/[:：]/)[0]));
 lines.forEach((line,index)=>{
  const split=line.match(/^([^:：]+)[:：]\s*(.*)$/),key=lookup.get(clean(split?split[1]:line));
  if(!key||seen.has(key))return;
  seen.add(key);
  const content=[];
  if(split?.[2])content.push(split[2]);
  const multiline=HOLD_FIELDS.find(f=>f[0]===key)?.[4]==='textarea';
  for(let next=index+1;next<lines.length&&!isLabel(lines[next])&&(multiline||!content.length);next++)content.push(lines[next]);
  fields[key]=content.join('\n').slice(0,2000);
 });
 return fields;
}
export function createHoldDocument(id,project,upload=null) {
 const fields=upload?extractHoldFields(upload.text):blankHoldFields();
 if(!upload)Object.assign(fields,{projectName:project.name[0],manager:project.owner[0],sector:project.sector,holdDate:'2026-11-30',resumeDate:'2026-11-01',preparedBy:project.owner[0],preparedOn:'2026-11-11',reason:'Pause delivery while the external data-sharing agreement is finalized.',impact:'Work on data integration pauses. The project team will review the schedule before work resumes.',budgetReview:'Budget under review',budgetJustification:'Confirm vendor costs during the hold.',scheduleReview:'Delivery paused',scheduleJustification:'Rebaseline after the agreement is signed.',deliverablesReview:'Integration deliverables paused',deliverablesJustification:'Awaiting access to source data.',risksReview:'Dependency risk remains open',risksJustification:'Track the data-sharing agreement weekly.',issuesReview:'External agreement pending',issuesJustification:'Legal review is in progress.',sponsorName:'Demo sponsor',sponsorDate:'2026-11-30',executorName:'Demo executor',executorDate:'2026-11-30',contributorName:'Demo contributor',contributorDate:'2026-11-30'});
 return {artifact:{id,revision:1,fields},kind:'project-hold',project:structuredClone(project),upload,reviews:[],draft:null};
}
export function holdChecks(fields,project,workflow=null) {
 const checks=[];
 const add=(key,group,label,ar,status,evidence,rule,field=null)=>checks.push({key,group,label:[label,ar],status,evidence,rule,field});
 const present=key=>Boolean(fields[key]?.trim());
 for(const [key,en,ar,group,type] of HOLD_FIELDS.filter(f=>f[3]==='metadata')) {
  const pass=type==='date'?validDate(fields[key]):present(key);
  add(key,group,en,ar,pass?'passed':'failed',fields[key]||'',type==='date'?['Provide a valid date in YYYY-MM-DD format.','أدخل تاريخًا صحيحًا بصيغة YYYY-MM-DD.']:['Complete this required project field.','أكمل هذا الحقل المطلوب للمشروع.'],key);
 }
 for(const [key,en,ar] of HOLD_FIELDS.filter(f=>f[3]==='reason'))add(key,'structure',en,ar,present(key)?'passed':key==='reason'?'failed':'warning',fields[key]||'',[key==='reason'?'Include a reason for putting the project on hold. A reviewer assesses its adequacy.':'Describe the impact on delivery, cost or resources. A reviewer assesses its adequacy.',key==='reason'?'أضف سبب تعليق المشروع. يقيّم المراجع مدى كفايته.':'وضّح أثر التعليق على التسليم أو التكلفة أو الموارد. يقيّم المراجع مدى كفايته.'],key);
 const order=validDate(fields.holdDate)&&validDate(fields.resumeDate)&&fields.resumeDate>=fields.holdDate;
 add('date-order','metadata','Resumption follows the hold date','الاستئناف بعد التعليق',order?'passed':'failed',`${fields.holdDate||'—'} → ${fields.resumeDate||'—'}`,['Expected resumption must be on or after the hold date.','يجب أن يكون الاستئناف المتوقع في تاريخ التعليق أو بعده.'],'resumeDate');
 for(const [key,en,ar] of [['budget','Budget','الميزانية'],['schedule','Schedule','الجدول الزمني'],['deliverables','Deliverables','المخرجات'],['risks','Risks','المخاطر'],['issues','Issues','المشكلات']])add(key,'tables',en+' review & justification','مراجعة '+ar+' وتبريرها',present(key+'Review')&&present(key+'Justification')?'passed':'failed',`${fields[key+'Review']||'—'}\n${fields[key+'Justification']||'—'}`,['Include both a review and its supporting justification for this row.','أضف المراجعة والتبرير الداعم لهذا الصف.'],key+'Review');
 for(const [key,value,en,ar] of [['projectName',project?.name?.[0],'Project name matches','تطابق اسم المشروع'],['manager',project?.owner?.[0],'Project manager matches','تطابق مدير المشروع'],['sector',project?.sector,'Executor sector matches','تطابق قطاع التنفيذ']])add('match-'+key,'consistency',en,ar,!value?'skipped':clean(fields[key])===clean(value)?'passed':'failed',`${fields[key]||'—'}\n${value||'—'}`,['Compare the document value with the selected demo project snapshot, shown on the second line. No live Synergy lookup is performed.','قارن قيمة المستند بلقطة المشروع التجريبي المحدد في السطر الثاني. لا يتم الاتصال بسينرجي.'],key);
 for(const [key,en,ar] of [['sponsor','Sponsor','الراعي'],['executor','Executor P&Q','قطاع التنفيذ'],['contributor','Contributor P&Q','القطاع المساهم'],['planning','Strategic Planning','التخطيط الاستراتيجي']])add(key,'approvals',en+' sign-off details','تفاصيل اعتماد '+ar,present(key+'Name')&&validDate(fields[key+'Date'])?'passed':'failed',`${fields[key+'Name']||'—'} · ${fields[key+'Date']||'—'}`,['Demo rule: provide an approver name and valid date. Presence does not authenticate approval. Role applicability must be confirmed against the approved methodology.','قاعدة تجريبية: أضف اسم المعتمد وتاريخًا صحيحًا. وجود البيانات لا يثبت الاعتماد. يجب تأكيد انطباق الدور وفق المنهجية المعتمدة.'],key+'Name');
 for(const [key,group,en,ar,rule,arRule] of [
 ['layout','structure','Original template layout','تخطيط النموذج الأصلي','Extracted text cannot verify original labels, fixed rows or layout against an approved template file.','لا يكفي النص المستخرج للتحقق من التخطيط والصفوف الثابتة مقابل النموذج المعتمد.'],
 ['signature','approvals','Digital signature verification','التحقق من التوقيع الرقمي','Signature verification is not connected. Names and dates are not authenticated signatures.','التحقق من التوقيع غير متصل. الأسماء والتواريخ ليست توقيعات موثقة.'],
 ['ai','advisory','AI content assessment','تقييم المحتوى بالذكاء الاصطناعي','AI review is not connected. A human must assess the hold justification and impact.','مراجعة الذكاء الاصطناعي غير متصلة. يجب أن يقيّم المراجع المبررات والأثر.'],
 ['pii','advisory','Sensitive data screening','فحص البيانات الحساسة','Sensitive data detection is not connected; this document has not been cleared for sharing.','كشف البيانات الحساسة غير متصل، ولم يُتحقق من صلاحية مشاركة المستند.']])add(key,group,en,ar,'skipped','',[rule,arRule]);
 if(!workflow)return checks;
 const configured=checks.filter(c=>!['sponsor','executor','contributor','planning'].includes(c.key)&&!(c.key==='signature'&&!workflow.approval.enabled));
 for(const phase of ['validation','approval'])for(const stage of enabledStages(workflow,phase)){
  const role=workflowRole(stage.roleId),prefix=phase==='approval'&&APPROVAL_FIELDS[stage.roleId];
  const original=prefix&&checks.find(c=>c.key===prefix);
  const labels=role.label.map(label=>clean(stage.name)===clean(role.label[0])?label:`${stage.name} · ${label}`);
  configured.push(original?{...original,key:`workflow-${phase}-${stage.id}`,approvalPrefix:prefix,label:labels}:{key:`workflow-${phase}-${stage.id}`,group:'workflow',label:labels,status:'skipped',evidence:'',rule:['Required by the saved settings. Confirm completion for this role in Synergy; this local check cannot authenticate it.','مطلوب وفق الإعدادات المحفوظة. أكد اكتمال دور المسؤول في سينرجي؛ لا يمكن للفحص المحلي توثيقه.'],field:null});
 }
 return configured;
}
export function makeHoldReview(document,workflow=null) {
 const previous=document.reviews.at(-1),fields={...document.artifact.fields},project=structuredClone(document.project);
 const snapshot=workflow?structuredClone(workflow):null;
 const findings=holdChecks(fields,project,snapshot);
 return {kind:'project-hold',docId:document.artifact.id,revision:document.artifact.revision,run:(previous?.run||0)+1,fields,project,workflow:snapshot,findings,checks:Object.fromEntries(findings.map(c=>[c.key,c.status])),previous:previous?{...previous.checks}:null};
}
export const holdCounts=review=>Object.fromEntries(['failed','warning','passed','skipped'].map(status=>[status,review.findings.filter(c=>c.status===status).length]));

export const holdProjectValue=(project,field)=>({projectName:project?.name?.[0],manager:project?.owner?.[0],sector:project?.sector})[field];

// The same policy protects both the visible action and the export operation.
// Empty source fields are missing information, not contradictory source values.
export function holdDownloadState(document,{run=null,busy=false,workflowVersion=null}={}) {
 const review=document.reviews.at(-1);
 const unsaved=document.draft&&HOLD_FIELDS.some(([key])=>(document.draft[key]||'').trim()!==(document.artifact.fields[key]||''));
 const mismatches=review?.findings.filter(c=>c.group==='consistency'&&c.status==='failed'&&review.fields[c.field]?.trim())||[];
 const invalid=review?.findings.filter(c=>c.status==='failed'&&(
  (c.key==='date-order'&&validDate(review.fields.holdDate)&&validDate(review.fields.resumeDate))||
  (c.group==='approvals'&&Boolean(review.fields[(c.approvalPrefix||c.key)+'Date'])&&!validDate(review.fields[(c.approvalPrefix||c.key)+'Date']))||
  (HOLD_FIELDS.find(f=>f[0]===c.field)?.[4]==='date'&&Boolean(review.fields[c.field]))
 ))||[];
 const missing=review?.findings.filter(c=>c.status==='failed'&&c.group!=='consistency'&&!invalid.includes(c))||[];
 const reason=busy?'busy':!review?'unchecked':unsaved?'unsaved':review.revision!==document.artifact.revision?'stale':run&&run!==review.run?'historical':workflowVersion&&review.workflow?.version!==workflowVersion?'settings':mismatches.length?'mismatch':invalid.length?'invalid':null;
 const warnings=review?.findings.filter(c=>c.status==='warning'||c.status==='skipped')||[];
 return {allowed:!reason,reason,review,mismatches,invalid,missing,warnings,needsAcknowledgement:missing.length>0||warnings.length>0};
}
