// UI demonstration policy. Production authorization must be enforced by the host/server.
export const ACCOUNTS = [
  {id:'executive',name:['Executive','القيادة التنفيذية'],initials:'E',role:'leadership',scope:{type:'all'},scopeLabel:['All EPMO projects','جميع مشاريع إدارة المشاريع']},
  {id:'epmo',name:['EPMO Excellence Team','فريق تميز إدارة المشاريع'],initials:'EE',role:'epmo',scope:{type:'all'},scopeLabel:['All EPMO projects','جميع مشاريع إدارة المشاريع']},
  {id:'health',name:['Health Sector Head','رئيس قطاع الصحة'],initials:'HS',role:'leadership',scope:{type:'sector',value:'Health'},scopeLabel:['Health sector','قطاع الصحة']},
  {id:'technology',name:['Technology Portfolio Owner','مالك محفظة التقنية'],initials:'TP',role:'leadership',scope:{type:'portfolio',value:'Technology'},scopeLabel:['Technology portfolio','محفظة التقنية']},
  {id:'renad',name:['Renad Alotaibi','رناد العتيبي'],initials:'RA',role:'manager',scope:{type:'manager',value:'renad'},scopeLabel:['My assigned projects','مشاريعي المسندة']},
  {id:'afnan',name:['Afnan Rayyani','أفنان رياني'],initials:'AR',role:'manager',scope:{type:'manager',value:'afnan'},scopeLabel:['My assigned projects','مشاريعي المسندة']},
];
export const ROLES = {
  leadership:{label:['Leadership','القيادة'],capabilities:['assistant','forecasts','quality']},
  epmo:{label:['EPMO Excellence','تميز إدارة المشاريع'],capabilities:['assistant','documents','validate','forecasts','quality','scan','admin']},
  manager:{label:['Project Manager','مدير مشروع'],capabilities:['assistant','documents','create','validate','forecasts','quality','scan']},
};
export const VIEWS = [
  {id:'assistant',label:['AI Assistance','المساعدة الذكية'],icon:'huge-ai-chat'},
  {id:'documents',label:['AI Document Validator','التحقق الذكي من المستندات'],icon:'huge-ai-scan-text'},
  {id:'forecasts',label:['Forecasts','التوقعات'],icon:'huge-forecast'},
  {id:'quality',label:['Data quality','جودة البيانات'],icon:'huge-data-inspection'},
  {id:'admin',label:['Administration','الإدارة'],icon:'huge-ai-settings'},
];
export const PROJECTS = [
  {id:'alpha',name:['Project Alpha','مشروع ألفا'],sector:'Health',sectorLabel:['Health','الصحة'],portfolio:'Technology',portfolioLabel:['Technology','التقنية'],manager:'afnan',owner:['Afnan Rayyani','أفنان رياني']},
  {id:'claims',name:['Claims service improvement','تحسين خدمة المطالبات'],sector:'Health',sectorLabel:['Health','الصحة'],portfolio:'Operational Excellence',portfolioLabel:['Operational Excellence','التميز التشغيلي'],manager:'demo-other',owner:['Sample project owner','مالك مشروع تجريبي']},
  {id:'platform',name:['Platform modernization','تحديث المنصة'],sector:'Strategy and Transformation',sectorLabel:['Strategy & Transformation','الاستراتيجية والتحول'],portfolio:'Technology',portfolioLabel:['Technology','التقنية'],manager:'demo-other',owner:['Sample project owner','مالك مشروع تجريبي']},
];
export const getAccount = id => ACCOUNTS.find(account=>account.id===id);
export function can(account,capability) {
  return Boolean(account && ROLES[account.role]?.capabilities.includes(capability));
}
export const viewsFor = account => VIEWS.filter(view=>can(account,view.id));
export function inScope(account,project) {
  if(!account || !ROLES[account.role] || !project)return false;
  const {type,value}=account.scope||{};
  if(type==='all')return true;
  if(type==='sector')return project.sector===value;
  if(type==='portfolio')return project.portfolio===value;
  if(type==='manager')return project.manager===value;
  return false;
}
export const projectsFor = account => PROJECTS.filter(project=>inScope(account,project));
export function documentIdsFor(account) {
  if(!can(account,'validate'))return [];
  if(account.role==='epmo')return ['quarterly','project'];
  return projectsFor(account).some(project=>project.id==='alpha')?['project']:[];
}
export const canReadAlpha = account => projectsFor(account).some(project=>project.id==='alpha');
