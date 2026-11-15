import { can } from './demo-access.js';

export const WORKFLOW_ROLES=[
 ['epmo','EPMO','إدارة المشاريع'],['project-manager','Project Manager','مدير المشروع'],['program-manager','EPMO Program Manager','مدير البرنامج في إدارة المشاريع'],['portfolio-manager','EPMO Portfolio Manager','مدير المحفظة في إدارة المشاريع'],['epmo-director','EPMO Director','مدير إدارة المشاريع'],['planning','Strategic Planning','التخطيط الاستراتيجي'],['sector-pq','Sector P&Q','الجودة والأداء للقطاع'],['executor','Executor P&Q','الجودة والأداء لقطاع التنفيذ'],['contributor','Contributor P&Q','الجودة والأداء للقطاع المساهم'],['sponsor','Sponsor / Owner','الراعي / المالك'],['sponsor-chief','Sponsor Sector Chief','رئيس قطاع الراعي'],['finance','Financial Planning & Budgeting','التخطيط المالي والميزانية'],['procurement','Procurement','المشتريات'],['program-lead','Program Lead','قائد البرنامج'],
].map(([id,en,ar])=>({id,label:[en,ar]}));
export const DOCUMENT_TYPES=[
 ['project-hold','Project Hold','تعليق المشروع',true,['epmo'],['sponsor','executor','contributor','planning']],
 ['business-case','Business Case','دراسة الجدوى',false,[],[]],
 ['project-charter','Project Charter','ميثاق المشروع',false,[],[]],
 ['project-schedule','Project Schedule','الجدول الزمني للمشروع',false,[],[]],
 ['certificate-deliverables','Certificate of Deliverables','شهادة تسليم المخرجات',false,[],[]],
 ['approved-deliverables','Proof of Deliverables','إثبات المخرجات',false,[],[]],
 ['project-closure','Project Closure','إغلاق المشروع',false,[],[]],
 ['financial-closure','Financial Closure','الإغلاق المالي',false,[],[]],
 ['project-cancellation','Project Cancellation','إلغاء المشروع',false,[],[]],
 ['risk-register','Risk Register','سجل المخاطر',false,[],[]],
 ['change-request','Change Request','طلب التغيير',false,[],[]],
 ['quarterly-report','Quarterly Performance Report','تقرير الأداء ربع السنوي',true,[],[]],
 ['project-status','Project Status Report','تقرير حالة المشروع',true,[],[]],
].map(([id,en,ar,connected,validation,approval])=>({id,label:[en,ar],connected,validation,approval}));
export const workflowRole=id=>WORKFLOW_ROLES.find(role=>role.id===id);
export const workflowType=id=>DOCUMENT_TYPES.find(type=>type.id===id);
export const APPROVAL_FIELDS={sponsor:'sponsor',executor:'executor',contributor:'contributor',planning:'planning'};
const stage=(phase,roleId,index)=>({id:`${phase}-${index+1}`,name:workflowRole(roleId).label[0],roleId});
export function createWorkflowStore(){return {configs:Object.fromEntries(DOCUMENT_TYPES.map(type=>[type.id,{typeId:type.id,version:1,configured:type.id==='project-hold',validation:{enabled:Boolean(type.validation.length),stages:type.validation.map((id,i)=>stage('validation',id,i))},approval:{enabled:Boolean(type.approval.length),stages:type.approval.map((id,i)=>stage('approval',id,i))}}])),history:[]};}
export function workflowSnapshot(store,typeId){if(!workflowType(typeId))throw new Error('unknown-document-type');return structuredClone(store.configs[typeId]);}
export const enabledStages=(config,phase)=>config?.[phase]?.enabled?config[phase].stages:[];
export function requiredApprovalFields(config){return new Set(enabledStages(config,'approval').map(s=>APPROVAL_FIELDS[s.roleId]).filter(Boolean).flatMap(prefix=>[prefix+'Name',prefix+'Date']));}
export const freshWorkflowAdmin=()=>({selected:'project-hold',draft:null,baseVersion:null,errors:{},notice:null,pendingType:null,nextId:1});
export function loadWorkflowDraft(ui,store,typeId=ui.selected){ui.selected=typeId;ui.draft=workflowSnapshot(store,typeId);ui.baseVersion=ui.draft.version;ui.errors={};ui.notice=null;ui.pendingType=null;}
export const workflowDirty=(ui,store)=>Boolean(ui.draft&&JSON.stringify(ui.draft)!==JSON.stringify(store.configs[ui.selected]));
export function requestWorkflowType(ui,store,typeId){if(!workflowType(typeId))throw new Error('unknown-document-type');if(typeId===ui.selected)return;if(workflowDirty(ui,store)){ui.pendingType=typeId;return;}loadWorkflowDraft(ui,store,typeId);}
const requireAdmin=account=>{if(!can(account,'admin'))throw new Error('admin-forbidden');};
export function addWorkflowStage(ui,phase,account){requireAdmin(account);if(!['validation','approval'].includes(phase))throw new Error('unknown-phase');if(ui.draft[phase].stages.length>=12)return false;ui.draft[phase].stages.push({id:`new-${ui.nextId++}`,name:'',roleId:''});ui.errors={};ui.notice=null;return true;}
export function updateWorkflowStage(ui,phase,id,values,account){requireAdmin(account);const row=ui.draft?.[phase]?.stages.find(s=>s.id===id);if(!row)return false;if(values.name!==undefined)row.name=String(values.name).slice(0,80);if(values.roleId!==undefined)row.roleId=values.roleId;delete ui.errors[`${phase}-${id}-${values.name!==undefined?'name':'role'}`];ui.notice=null;return true;}
export function setWorkflowEnabled(ui,phase,enabled,account){requireAdmin(account);if(!['validation','approval'].includes(phase))throw new Error('unknown-phase');ui.draft[phase].enabled=Boolean(enabled);if(enabled&&!ui.draft[phase].stages.length)addWorkflowStage(ui,phase,account);ui.errors={};ui.notice=null;}
export function removeWorkflowStage(ui,phase,id,account){requireAdmin(account);ui.draft[phase].stages=ui.draft[phase].stages.filter(s=>s.id!==id);ui.errors={};ui.notice=null;}
export function moveWorkflowStage(ui,phase,id,direction,account){requireAdmin(account);const rows=ui.draft[phase].stages,index=rows.findIndex(s=>s.id===id),target=index+direction;if(index<0||target<0||target>=rows.length||![-1,1].includes(direction))return;[rows[index],rows[target]]=[rows[target],rows[index]];ui.notice=null;}
export function validateWorkflow(config){
 const errors={};
 for(const phase of ['validation','approval']){
  if(!config[phase].enabled)continue;
  if(!config[phase].stages.length)errors[phase]='empty';
  const seen=new Set();
  for(const row of config[phase].stages){
   if(!row.name.trim())errors[`${phase}-${row.id}-name`]='name';
   if(!workflowRole(row.roleId))errors[`${phase}-${row.id}-role`]='role';
   const key=row.name.trim().toLowerCase()+':'+row.roleId;if(seen.has(key))errors[`${phase}-${row.id}-name`]='duplicate';seen.add(key);
  }
 }
 return errors;
}
export function saveWorkflow(ui,store,account,{now=()=>new Date().toISOString()}={}){
 requireAdmin(account);if(!ui.draft||ui.selected!==ui.draft.typeId||!workflowType(ui.selected))throw new Error('unknown-document-type');
 if(ui.baseVersion!==store.configs[ui.selected].version){ui.errors={form:'conflict'};return false;}
 ui.errors=validateWorkflow(ui.draft);if(Object.keys(ui.errors).length)return false;
 const before=workflowSnapshot(store,ui.selected),after=structuredClone(ui.draft);
 for(const phase of ['validation','approval'])for(const row of after[phase].stages)row.name=row.name.trim();
 if(before.configured&&JSON.stringify(after)===JSON.stringify(before)){ui.notice='unchanged';return true;}
 after.version=before.version+1;after.configured=true;after.updatedAt=now();
 const record={id:store.history.length+1,typeId:ui.selected,at:after.updatedAt,actor:{id:account.id,name:[...account.name]},before:structuredClone(before),after:structuredClone(after)};
 store.configs[ui.selected]=after;store.history.push(record);ui.draft=structuredClone(after);ui.baseVersion=after.version;ui.errors={};ui.notice='saved';return true;
}
