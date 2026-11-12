import { createHoldDocument } from './project-hold.js';
import { holdEditor } from './project-hold-ui.js';
import { createArtifact, makeReview } from './artifact-review.js';
import { getAccount, can, canReadAlpha, projectsFor, documentIdsFor } from './demo-access.js';
import { foundationUI } from './foundation-views.js';
import { platformShell, PLATFORM_TABS } from './platform-shell.js';
import { assistanceChat, freshAssistance } from './assistance-chat.js';
import { workspaceIcons } from '../public/vendor/hugeicons/workspace-icons.js';
import { freshValidator, validatorDocument, checkDocument, saveDocument, documentValidatorUI, addUploadedDocument } from './document-validator.js';
import { emptyUpload, readUploadSelection, removeUploadFile, uploadSetup, resolvedUploadTemplate } from './document-upload.js';
import { forecastUI, freshForecast, MAX_SCENARIOS } from './forecast-view.js';
import { freshAuthoring, createDraft, pendingField, answerField, skipField, editField, parseTyped, commandOf, fieldOf, templateOf as authoringTemplate, validatorFields, isComplete as authoringComplete } from './document-create.js';
import { authoringUI } from './document-create-view.js';
import { AUTHORING_TEMPLATES as AUTHORING_LIST } from './document-create.js';
import { qualityUI, freshQuality, PAGE_STEP } from './quality-view.js';
import { DEFAULT_CONFIG, normalizeConfig } from './quality-rules.js';

const icons = {
  ...workspaceIcons,
  left: '<path d="M19 12H5m6 6-6-6 6-6"/>',
  download: '<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>',
  'sign-out': '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  'document-check': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6m-12 7 3 3 5-6"/>',
  settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m9 3-.7 2.2-2 .9L4 5.5 2 9l1.7 1.6v2.8L2 15l2 3.5 2.3-.6 2 .9L9 21h4l.7-2.2 2-.9 2.3.6 2-3.5-1.7-1.6v-2.8L20 9l-2-3.5-2.3.6-2-.9L13 3Z"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m6 6 6 6M21 3l-6 6M9 15l-6 6"/>',
  collapse: '<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5M3 3l5 5m8 8 5 5M21 3l-5 5M8 16l-5 5"/>',
  history: '<path d="M3 3v6h6M3 9a9 9 0 1 1 .7 8M12 7v5l3 2"/>',
  edit: '<path d="m16 3 5 5M4 20l4.5-1 12-12a2.1 2.1 0 0 0-5-3l-12 12L3 21z"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  warning: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
  idea: '<path d="M9 18h6m-5 3h4M8.5 14.5a6 6 0 1 1 7 0c-1 .7-1.5 1.5-1.5 3.5h-4c0-2-.5-2.8-1.5-3.5Z"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  right: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
  document: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8m-8 4h5"/>',
  chart: '<path d="M4 4v16h16M8 15l4-5 4 2 4-6"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a24 24 0 0 0 18 0M12 11v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  thumb: '<path d="M7 10v11H3V10zm0 0 5-8c3 0 3 4 1 7h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  book: '<path d="M12 5v16M3 3c4 0 7 0 9 2 2-2 5-2 9-2v16c-4 0-7 0-9 2-2-2-5-2-9-2z"/>',
};
const assistantPath = "m58.84 31.367c2.0664 1.7422 4.0898 3.6016 6.0586 5.5664 17.141 17.145 25.031 37.43 16.5 45.965-5.0078 5.0039-14.035 4.4375-24.438-0.64453-1.2383-0.60547-1.7539-2.1055-1.1484-3.3438 0.60547-1.2422 2.1055-1.7539 3.3438-1.1484 8.6992 4.25 15.621 4.6836 18.707 1.6016 5.7852-5.7891-1.0977-23.492-16.5-38.891-1.8672-1.8672-3.7891-3.6328-5.7461-5.2812-1.0547-0.88672-1.1875-2.4648-0.30078-3.5195 0.89062-1.0586 2.4688-1.1914 3.5234-0.30469zm11.324 25.496c1.0547 0.89453 1.1836 2.4727 0.28906 3.5234-1.6992 2.0039-3.5547 4.0117-5.5547 6.0117-17.145 17.141-37.43 25.031-45.961 16.5-5.0039-5.0039-4.4414-14.023 0.63672-24.422 0.60547-1.2383 2.1016-1.7539 3.3398-1.1484 1.2422 0.60547 1.7578 2.1016 1.1523 3.3438-4.2461 8.6914-4.6758 15.609-1.5938 18.691 5.7852 5.7852 23.488-1.0977 38.891-16.5 1.9062-1.9062 3.668-3.8125 5.2773-5.7109 0.89453-1.0508 2.4688-1.1797 3.5234-0.28906zm-26.809-35.793c1.2383 0.60547 1.7539 2.1055 1.1484 3.3438-0.60547 1.2422-2.1016 1.7578-3.3438 1.1523-8.6914-4.2461-15.605-4.6758-18.688-1.5938-5.7891 5.7852 1.0977 23.488 16.5 38.891 1.8594 1.8633 3.7773 3.6211 5.7305 5.2656 1.0547 0.89062 1.1875 2.4688 0.30078 3.5234-0.89062 1.0547-2.4688 1.1914-3.5234 0.30078-2.0625-1.7344-4.082-3.5938-6.0469-5.5547-17.141-17.145-25.031-37.43-16.496-45.961 5-5.0039 14.02-4.4414 24.418 0.63281zm6.9453 21.918c0.51172 0.13281 0.90234 0.53125 1.0273 1.043l1.0352 4.3203c0.17969 0.74609 0.75 1.3398 1.4922 1.5469l3.8125 1.0703c0.69922 0.19531 1.1055 0.91797 0.91016 1.6172-0.12891 0.45703-0.49609 0.8125-0.95703 0.92187l-3.6133 0.86719c-0.79297 0.19141-1.4023 0.81641-1.5781 1.6133l-1.0742 4.9258c-0.16016 0.75-0.90234 1.2266-1.6523 1.0625-0.53125-0.11719-0.94531-0.53125-1.0586-1.0625l-1.0742-4.918c-0.17187-0.80078-0.79297-1.4258-1.5859-1.6133l-3.7422-0.88281c-0.71094-0.16406-1.1484-0.875-0.98047-1.5859 0.10938-0.46875 0.46484-0.83984 0.92578-0.96875l3.7617-1.0547c0.72656-0.20312 1.293-0.77734 1.4805-1.5078l1.1406-4.3789c0.19531-0.75781 0.97266-1.2148 1.7305-1.0156zm31.098-22.551c5.0078 5.0078 4.4453 14.059-0.64063 24.473-0.60547 1.2422-2.1055 1.7539-3.3438 1.1484-1.2422-0.60547-1.7578-2.1016-1.1484-3.3438 4.2539-8.7109 4.6875-15.652 1.5977-18.742-5.7891-5.7891-23.492 1.0977-38.891 16.5-1.875 1.8711-3.6484 3.8008-5.3008 5.7656-0.89062 1.0586-2.4648 1.1914-3.5234 0.30469-1.0547-0.89062-1.1914-2.4648-0.30078-3.5234 1.7422-2.0742 3.6133-4.1094 5.5859-6.0859 17.145-17.141 37.43-25.031 45.965-16.496z";
const icon = (name, cls = '') => name === 'assistant'
  ? `<svg class="icon ai-icon ${cls}" width="20" height="20" viewBox="12 12 76 76" fill="currentColor" aria-hidden="true"><path d="${assistantPath}"/></svg>`
  : `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.chat}</svg>`;
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lang = 'en';
const t = (en, ar) => lang === 'ar' ? ar : en;
const entryUrl = new URL(location.href);
const embeddedWorkspace = window.parent !== window && entryUrl.searchParams.get('embed') === 'synergy';
const selectedDemoAccount = getAccount(entryUrl.searchParams.get('demoAccount'));
if (entryUrl.searchParams.has('demoAccount')) {
  entryUrl.searchParams.delete('demoAccount');
  history.replaceState(null, '', entryUrl);
}
const state = { hostTab:!embeddedWorkspace&&selectedDemoAccount?'synergy':'overview',panelSurface:'host',assistance:freshAssistance(), accountId:selectedDemoAccount?.id||'epmo',activeView:'assistant',documentMode:'validate',viewScroll:{}, chatView:'closed', chatDraft:'', chatScroll:0, unread:false, conversations: [], active: null, busy: false, drawer: null, source: null, attachment: null, mobile: false, generation: 0, feedback: new Set() };
let returnFocus = null;
const app = document.querySelector('#app');
const frameOrigin = location.origin;
let workspaceFrame;
let pendingFrameView;
let workspaceFrameReady = false;
let receivedHostContext = false;
const active = () => state.conversations.find(c => c.id === state.active);
const mark = () => `<span class="assistant-mark">${icon('assistant')}</span>`;
const account = () => getAccount(state.accountId);
const allowed = capability => can(account(),capability);
const documentsForAccount = () => templates.filter(doc=>documentIdsFor(account()).includes(doc.id));
state.validator=freshValidator();
state.forecast=freshForecast();
state.authoring=freshAuthoring();
const forecast=()=>forecastUI({t,icon,escape,account:account(),fc:state.forecast});
state.quality=freshQuality();
const quality=()=>qualityUI({t,icon,escape,account:account(),q:state.quality});
const validatorDocumentsForAccount=()=>!allowed('validate')?[]:[...state.validator.uploads.map(upload=>({id:upload.id,name:()=>upload.name,meta:()=>t('Uploaded this session','مرفوع في هذه الجلسة')+' · '+upload.extension.toUpperCase(),upload:true})),...projectsFor(account()).slice(0,1).map(project=>({id:'hold-'+project.id,hold:true,project,name:()=>t('Project Hold','تعليق المشروع')+' · '+t(...project.name),meta:()=>t('Sample with findings · EPMO','نموذج مع ملاحظات · إدارة المشاريع')})),...documentsForAccount()];
const validatorPage=()=>documentValidatorUI({t,icon,escape,documents:validatorDocumentsForAccount(),validator:state.validator,definitions:reviewDefinitions,canCreate:allowed('create'),projects:projectsFor(account())});
const foundation = () => foundationUI({t,icon,escape,account:account(),state,validationPicker,documentValidator:validatorPage});
const accountSessions = new Map();
const sessionKeys=['authoring','forecast','quality','validator','assistance','activeView','documentMode','viewScroll','chatDraft','chatScroll','unread','conversations','active','attachment','feedback','editDrafts','editor','openDetails','reviewEvidence'];
function freshSession(){return {authoring:freshAuthoring(),forecast:freshForecast(),quality:freshQuality(),validator:freshValidator(),assistance:freshAssistance(),activeView:'assistant',documentMode:'validate',viewScroll:{},chatDraft:'',chatScroll:0,unread:false,conversations:[],active:null,attachment:null,feedback:new Set(),editDrafts:{},editor:null,openDetails:[],reviewEvidence:null};}
function captureWorkspace(){
  const floatingInput=document.querySelector('#assistance-message');if(floatingInput)state.assistance.draft=floatingInput.value;
  const floatingMain=document.querySelector('#assistance-messages');if(floatingMain)state.assistance.scroll=floatingMain.scrollTop;
  const input=document.querySelector('#message');if(input)state.chatDraft=input.value;
  const main=document.querySelector('#main');
  if(main){const view=main.dataset.view||state.activeView;state.viewScroll[view]=main.scrollTop;if(view==='assistant'){state.chatScroll=main.scrollTop;state.openDetails=[...main.querySelectorAll('details[data-detail-key][open]')].map(el=>el.dataset.detailKey);}}
}
function switchAccount(id){
  if(!getAccount(id))return;
  if(id===state.accountId){closePanel();return;}
  captureWorkspace();
  // Retire the outgoing request so it cannot publish into another identity/session.
  if(state.busy){const messages=active()?.messages;if(messages?.at(-1)?.role==='user'){state.chatDraft ||= messages.at(-1).text;messages.pop();}state.busy=false;}
  if(state.assistance.busy){state.assistance.generation++;state.assistance.busy=false;const pending=state.assistance.messages.at(-1);if(pending?.role==='user'){state.assistance.draft ||= pending.text;state.assistance.messages.pop();}}
  accountSessions.set(state.accountId,Object.fromEntries(sessionKeys.map(key=>[key,state[key]])));
  state.generation++;state.accountId=id;
  Object.assign(state,accountSessions.get(id)||freshSession());
  state.drawer=null;state.source=null;state.panelSurface='host';state.mobile=false;state.pendingReview=false;state.busy=false;
  if(!allowed(state.activeView))state.activeView='assistant';
  render({capture:false});document.querySelector('[data-action="accounts"]')?.focus();
  toast(t('Demo account switched. Activity stays separate for each account.','تم تبديل الحساب التجريبي. يبقى نشاط كل حساب منفصلًا.'));
}
function navigate(view){
  if(!allowed(view))return;
  if(!embeddedWorkspace){
    openWorkspaceInFrame(view);
    return;
  }
  captureWorkspace();state.activeView=view;state.hostTab='synergy';state.drawer=null;state.mobile=false;
  if(view==='assistant')state.unread=false;
  render({capture:false});document.querySelector('#main')?.focus();
}

const templates = [
  {id:'quarterly', name:() => t('Quarterly performance report','تقرير الأداء ربع السنوي'), meta:() => t('Q3 2026 · Corporate Performance','الربع الثالث 2026 · الأداء المؤسسي')},
  {id:'project', name:() => t('Project Alpha status report','تقرير حالة مشروع ألفا'), meta:() => t('September 2026 · EPMO','سبتمبر 2026 · مكتب إدارة المشاريع')}
];

function composer() {
  const attachment = state.attachment && templates.find(x => x.id === state.attachment);
  return `<div class="composer-wrap">
    ${attachment ? `<div class="attachment">${icon('document')}<span>${attachment.name()}</span><button class="icon-button small" data-action="remove-attachment" aria-label="${t('Remove sample document','إزالة المستند التجريبي')}">${icon('close')}</button></div>` : ''}
    <form id="composer" class="composer">
      <label class="sr-only" for="message">${t('Message Synergy Assistant','رسالة إلى مساعد سينرجي')}</label>
      <textarea id="message" dir="auto" rows="2" maxlength="4000" placeholder="${t('Ask about your Synergy information…','اسأل عن معلوماتك في سينرجي…')}" ${state.busy ? 'disabled' : ''}></textarea>
      <div class="composer-toolbar"><div class="composer-tools">
        ${allowed('validate')?`<button type="button" class="icon-button" data-action="documents" aria-label="${t('Choose a sample document','اختيار مستند تجريبي')}" title="${t('Choose a sample document','اختيار مستند تجريبي')}">${icon('plus')}</button>
        <button type="button" class="validation-shortcut" data-action="validation" ${state.busy?'disabled':''}>${icon('shield')}<span>${t('Validate document','التحقق من مستند')}</span></button>`:''}
      </div><div class="composer-send"><button type="submit" class="send-button" aria-label="${t('Send message','إرسال الرسالة')}" disabled>${icon('arrow')}</button></div></div>
    </form>
    <p class="composer-note">${t('AI can make mistakes. Review the supporting sources.','قد يخطئ الذكاء الاصطناعي. راجع المصادر الداعمة.')}</p>
  </div>`;
}

function welcome() {
  return `<section class="welcome" aria-labelledby="welcome-title">
    <div class="welcome-heading"><div class="welcome-symbol">${icon('assistant')}</div><h1 id="welcome-title">${t('How can I help you today?','كيف أستطيع مساعدتك اليوم؟')}</h1></div>
    <p class="welcome-description">${t('Ask about the projects and KPIs in your scope.','اسأل عن المشاريع ومؤشرات الأداء ضمن نطاقك.')}</p>
    ${composer()}
    <div class="suggested-prompts"><p class="prompts-label" id="prompts-label">${t('Try asking','جرّب أن تسأل')}</p>
    <div class="starters" aria-labelledby="prompts-label">
      ${(canReadAlpha(account())?[['project','briefcase'],['kpi','chart'],...(allowed('validate')?[['artifact','document']]:[])]:[['scope','briefcase']]).map(([kind,symbol])=>`<button class="starter" data-action="starter" data-kind="${kind}"><span class="starter-icon">${icon(symbol)}</span><span class="prompt-text">${starterText(kind)}</span></button>`).join('')}
    </div>
    </div>
  </section>`;
}

function sourceButton(source, label) {
  return `<button class="source-link" data-action="source" data-source="${source}">${icon('document')}<span>${label}</span>${icon('chevron')}</button>`;
}

function artifactFor(id) {
  const conversation=active();
  conversation.artifacts ||= {};
  return conversation.artifacts[id] ||= createArtifact(id);
}
function latestReview(id) {
  return active().messages.filter(m=>m.review?.docId===id).at(-1)?.review;
}
function runValidation(id, text) {
  if(state.busy||!documentsForAccount().some(doc=>doc.id===id))return;
  captureWorkspace();state.chatView='closed';state.hostTab='synergy';state.panelSurface='host';
  const doc=templates.find(d=>d.id===id);
  const firstPrompt=t(`Check ${doc.name()} against its template.`,`تحقّق من ${doc.name()} مقابل نموذجه.`);
  ensureConversation(text||firstPrompt);
  const review=makeReview(artifactFor(id),latestReview(id));
  state.attachment=id;
  send(text||(review.run===1?firstPrompt:t(`Recheck the document, revision ${review.revision}.`,`أعد فحص المستند، النسخة ${review.revision}.`)),'validation:'+id,review);
}
function runStandaloneValidation(id) {
  if(!validatorDocumentsForAccount().some(doc=>doc.id===id)||state.validator.busy)return;
  const validator=state.validator,descriptor=validatorDocumentsForAccount().find(doc=>doc.id===id);
  if(descriptor.hold&&!validator.documents[id]?.kind)validator.documents[id]=createHoldDocument(id,descriptor.project);
  const document=validatorDocument(validator,id),identity=state.accountId;
  validator.selected=id;validator.run=null;validator.filter='all';validator.busy=id;
  state.drawer=null;state.activeView='documents';state.documentMode='validate';state.hostTab='synergy';state.viewScroll.documents=0;
  render({capture:false});
  // The short progress state represents local field checks, not file extraction or AI inference.
  setTimeout(()=>{
    const review=checkDocument(document);validator.run=review.run;validator.busy=null;
    if(state.accountId!==identity||state.validator!==validator)return;
    render();
    if(state.activeView==='documents'&&validator.selected===id&&!state.drawer)documentFocus();
  },450);
}
function documentFocus(){document.querySelector('#validator-heading')?.setAttribute('tabindex','-1');document.querySelector('#validator-heading')?.focus({preventScroll:true});}
function openStandaloneEditor(id,field) {
  if(!validatorDocumentsForAccount().some(doc=>doc.id===id)||state.validator.busy)return;
  const entry=validatorDocument(state.validator,id);
  entry.draft ||= {...entry.artifact.fields};
  state.editor={surface:'validator',docId:id,fields:entry.draft};
  openPanel('editor');document.querySelector('#'+(field||(entry.kind==='project-hold'?'hold-projectName':'period-start')))?.focus();
}
const editorArtifact=()=>state.editor?.surface==='validator'?validatorDocument(state.validator,state.editor.docId).artifact:artifactFor(state.editor.docId);
async function chooseUploadedFiles(files) {
  if(!allowed('validate')||!files.length)return;
  const validator=state.validator,upload=validator.upload;
  const pending=readUploadSelection(upload,files);render();
  const current=await pending;
  if(!current||state.validator!==validator||validator.upload!==upload)return;
  render();
  const step=uploadSetup(upload,projectsFor(account()));
  const target={file:'#validator-file',template:'#validator-template',project:'#validator-project',ready:'#validator-submit'}[step];
  document.querySelector(target)?.focus({preventScroll:true});
}
function focusUploadRequirement(step) {
  const target=document.querySelector({file:'#validator-file',template:'#validator-template',project:'#validator-project'}[step]);
  target?.focus();
  if(step==='file')target?.click();
  else {try{target?.showPicker?.();}catch{/* Focus still lets keyboard users choose an option. */}}
}

function reviewDefinitions(fields) {
  return [
    {key:'period',type:'required',field:'period-start',location:t('Section 1 · Document information','القسم 1 · معلومات المستند'),missing:t('Add the reporting period','أضف فترة التقرير'),passed:t('Reporting period is complete','فترة التقرير مكتملة'),rule:t('Include a start and end date. The end date must be on or after the start date.','أضف تاريخي البداية والنهاية، على أن تكون النهاية بعد البداية أو في اليوم نفسه.'),value:fields.start&&fields.end?`${fields.start} → ${fields.end}`:t('Reporting period is incomplete.','فترة التقرير غير مكتملة.')},
    {key:'owner',type:'required',field:'artifact-owner',location:t('Section 3 · Ownership','القسم 3 · المسؤولية'),missing:t('Identify the accountable owner','حدّد المالك المسؤول'),passed:t('Accountable owner is identified','تم تحديد المالك المسؤول'),rule:t('Name the person or role accountable for this report.','حدّد الشخص أو الدور المسؤول عن هذا التقرير.'),value:fields.owner.trim()||t('No accountable owner has been entered.','لم يتم إدخال مالك مسؤول.')},
    {key:'next',type:'suggested',field:'next-action',location:t('Section 5 · Next steps','القسم 5 · الخطوات التالية'),missing:t('Give the next step a due date','أضف موعدًا للخطوة التالية'),passed:t('Next step has an action and due date','الخطوة التالية تتضمن إجراءً وموعدًا'),rule:t('Recommended: include an action and a due date so the reviewer can follow up.','يوصى بإضافة إجراء وموعد لمساعدة المراجع على المتابعة.'),value:[fields.nextAction,fields.nextDue||t('No due date','لا يوجد موعد')].filter(Boolean).join(' · ')}
  ];
}
function reviewResponse(review) {
  const doc=templates.find(d=>d.id===review.docId);
  const required=Number(!review.checks.period)+Number(!review.checks.owner);
  const suggestions=Number(!review.checks.next);
  const resolved=Object.keys(review.checks).filter(key=>review.previous?.[key]===false&&review.checks[key]).length;
  const newer=artifactFor(review.docId).revision>review.revision;
  const index=active().messages.findIndex(m=>m.review===review);
  const title=required?t('A few things need your attention','بعض العناصر تحتاج إلى انتباهك'):t('Ready for human review','جاهز للمراجعة البشرية');
  return `<div class="response-meta">${t('ARTIFACT REVIEW','مراجعة المستند')}<span>${t('Check','الفحص')} ${review.run} · ${t('Revision','النسخة')} ${review.revision}</span></div>
    <h2>${title}</h2><p class="review-document">${icon('document')}${doc.name()} <span>· ${t('Template v1.0','النموذج 1.0')}</span></p>
    <p>${required?t('Complete the required items below, then run the checks again.','أكمل العناصر المطلوبة أدناه، ثم أعد الفحص.'):suggestions?t('The required sample checks passed. One optional improvement remains for you to consider.','اجتازت النسخة الفحوصات التجريبية المطلوبة. لا يزال هناك تحسين اختياري يمكنك مراجعته.'):t('All three sample checks passed. The revised document is ready for a reviewer to assess.','اجتاز المستند الفحوصات التجريبية الثلاثة، وهو جاهز لتقييم المراجع.')}</p>
    <div class="review-counts" aria-label="${t('Check results','نتائج الفحص')}"><span class="${required?'has-issues':'is-clear'}">${icon(required?'help':'check')}<strong>${required}</strong> ${t('required remaining','مطلوب متبقٍ')}</span><span><strong>${suggestions}</strong> ${t(suggestions===1?'suggestion':'suggestions','اقتراحات')}</span>${review.previous?`<span class="is-clear"><strong>${resolved}</strong> ${t('resolved this run','تمت معالجته في هذا الفحص')}</span>`:''}</div>
    <div class="findings" role="group" aria-label="${t('Validation findings','نتائج التحقق')}">${reviewDefinitions(review.fields).map(item=>{
      const passed=review.checks[item.key];
      const status=passed?(review.previous?.[item.key]===false?t('Resolved','تمت المعالجة'):t('Passed','اجتاز')):item.type==='required'?t('Required','مطلوب'):t('Suggestion','اقتراح');
      return `<details class="finding" data-detail-key="${review.docId}-${review.run}-${item.key}"><summary><span class="finding-copy"><strong>${passed?item.passed:item.missing}</strong><small>${item.location}</small></span><span class="finding-status ${passed?'passed':item.type}">${icon(passed?'check-circle':item.type==='required'?'warning':'idea')}${status}</span>${icon('chevron')}</summary><div class="finding-body"><p>${item.rule}</p><div class="finding-value"><span>${t('Checked content','المحتوى المفحوص')}</span><p dir="auto">${escape(item.value)}</p></div><button class="text-button" data-action="edit-artifact" data-id="${review.docId}" data-field="${item.field}" ${state.busy?'disabled':''}>${t('Edit this section','تعديل هذا القسم')}${icon('right')}</button></div></details>`;
    }).join('')}</div>
    ${newer?`<p class="review-stale">${icon('document')}${t('Your saved draft is newer than this result. Recheck it to update the findings.','المسودة المحفوظة أحدث من هذه النتيجة. أعد فحصها لتحديث النتائج.')}</p>`:''}
    <div class="review-actions"><button class="${required?'primary-button':'secondary-button'}" data-action="edit-artifact" data-id="${review.docId}" ${state.busy?'disabled':''}>${icon('edit')}${t('Edit sample document','تعديل المستند التجريبي')}</button><button class="${required?'secondary-button':'primary-button'}" data-action="run-validation" data-id="${review.docId}" ${state.busy?'disabled':''}>${icon('refresh')}${t('Recheck document','إعادة فحص المستند')}</button><button class="text-button" data-action="review-evidence" data-index="${index}">${icon('eye')}${t('View checked version','عرض النسخة المفحوصة')}</button></div>
    ${!required?`<details class="review-handoff" data-detail-key="${review.docId}-${review.run}-summary"><summary>${icon('document')}${t('Reviewer summary','ملخص للمراجع')}${icon('chevron')}</summary><p>${doc.name()} · ${t('Revision','النسخة')} ${review.revision}</p><p>${t('The reporting period and accountable owner are present.','فترة التقرير والمالك المسؤول محددان.')} ${suggestions?t('The next-step action or due date still needs improvement.','لا يزال إجراء الخطوة التالية أو موعدها بحاجة إلى تحسين.'):t('The next step includes an action and due date.','تتضمن الخطوة التالية إجراءً وموعدًا.')}</p><p>${t('Review the content for accuracy and follow the normal approval process.','راجع دقة المحتوى واتبع إجراءات الموافقة المعتادة.')}</p></details>`:''}
    <p class="small-copy review-boundary">${t('These are local checks on three sample fields. Human review is still required; no approval or Synergy update is performed.','هذه فحوصات محلية لثلاثة حقول تجريبية. تظل المراجعة البشرية مطلوبة، ولا يتم اعتماد المستند أو تحديث سينرجي.')}</p>`;
}
function openEditor(id,field) {
  if(state.busy||!documentsForAccount().some(doc=>doc.id===id)||!active())return;
  const artifact=artifactFor(id);
  state.editDrafts ||= {};
  const key=active().id+':'+id;
  state.editor=state.editDrafts[key] ||= {docId:id,conversationId:active().id,fields:{...artifact.fields}};
  openPanel('editor');
  document.querySelector('#'+(field||'period-start'))?.focus();
}
function artifactEditor() {
  const {docId,fields}=state.editor;
  const artifact=editorArtifact();
  const standalone=state.editor.surface==='validator'&&validatorDocument(state.validator,docId);
  if(standalone?.kind==='project-hold')return holdEditor({document:standalone,fields,t,escape,icon});
  const uploaded=state.editor.surface==='validator'&&validatorDocument(state.validator,docId).upload;
  const editorDocument=(state.editor.surface==='validator'?validatorDocumentsForAccount():templates).find(doc=>doc.id===docId);
  const dirty=JSON.stringify(fields)!==JSON.stringify(artifact.fields);
  const field=(name,label,type='text',extra='')=>`<label class="editor-field" for="${{start:'period-start',end:'period-end',owner:'artifact-owner',nextAction:'next-action',nextDue:'next-due'}[name]}"><span>${label}</span><input id="${{start:'period-start',end:'period-end',owner:'artifact-owner',nextAction:'next-action',nextDue:'next-due'}[name]}" name="${name}" type="${type}" value="${escape(fields[name])}" ${extra} ${type==='date'?'dir="ltr"':'dir="auto"'}></label>`;
  return `<p class="sample-label">${uploaded?t('UPLOADED DOCUMENT','مستند مرفوع'):t('SAMPLE DOCUMENT','مستند تجريبي')}</p><h3>${escape(editorDocument.name())}</h3>${uploaded?`<p class="inspector-intro">${t('Changes update the extracted fields for this review. Your original file is unchanged.','تُحدّث التغييرات الحقول المستخرجة لهذه المراجعة. لا يتغير الملف الأصلي.')}</p>`:''}<div class="editor-meta"><span>${t('Revision','النسخة')} ${artifact.revision}</span><span id="editor-state" role="status">${dirty?t('Unsaved changes','تغييرات غير محفوظة'):t('Saved for this session','محفوظ لهذه الجلسة')}</span></div>
    <p class="inspector-intro">${t('Complete the fields below. Save a draft at any stage, or save and recheck to see the updated results.','أكمل الحقول أدناه. احفظ المسودة في أي مرحلة، أو احفظ وأعد الفحص لعرض النتائج المحدثة.')}</p>
    <form id="artifact-editor"><fieldset><legend>${t('1. Reporting period','1. فترة التقرير')}<span>${t('Required','مطلوب')}</span></legend><p class="field-help">${t('Use the dates covered by this report.','استخدم الفترة التي يغطيها التقرير.')}</p><div class="editor-dates">${field('start',t('Start date','تاريخ البداية'),'date')}${field('end',t('End date','تاريخ النهاية'),'date')}</div></fieldset>
    <fieldset><legend>${t('3. Accountable owner','3. المالك المسؤول')}<span>${t('Required','مطلوب')}</span></legend>${field('owner',t('Person or accountable role','الشخص أو الدور المسؤول'),'text','maxlength="120" autocomplete="off" placeholder="'+t('e.g. Corporate Performance Manager','مثال: مدير الأداء المؤسسي')+'"')}</fieldset>
    <fieldset><legend>${t('5. Next steps','5. الخطوات التالية')}<span class="optional">${t('Optional improvement','تحسين اختياري')}</span></legend>${field('nextAction',t('Next action','الإجراء التالي'),'text','maxlength="300"')}${field('nextDue',t('Due date','الموعد النهائي'),'date')}</fieldset>
    <p class="field-help">${t('Closing keeps your unsaved edits. Discard changes restores the saved draft. This session clears on reload.','يحتفظ الإغلاق بالتعديلات غير المحفوظة. يعيد تجاهل التغييرات المسودة المحفوظة. تُمسح الجلسة عند إعادة التحميل.')}</p>
    <div class="editor-footer"><button type="submit" value="rerun" class="primary-button">${icon('refresh')}${t('Save & recheck','حفظ وإعادة الفحص')}</button><button type="submit" value="save" class="secondary-button">${t('Save draft','حفظ المسودة')}</button><button type="button" class="text-button" data-action="discard-edits">${t('Discard changes','تجاهل التغييرات')}</button></div></form>`;
}
function saveArtifact(rerun) {
  const {docId,fields}=state.editor;
  if(fields.start&&fields.end&&fields.end<fields.start){const end=document.querySelector('#period-end');end.setCustomValidity(t('End date must be on or after the start date.','يجب أن يكون تاريخ النهاية بعد تاريخ البداية أو في اليوم نفسه.'));end.reportValidity();return;}
  if(state.editor.surface==='validator') {
    saveDocument(validatorDocument(state.validator,docId),fields);state.editor=null;
    if(rerun)runStandaloneValidation(docId);
    else{closePanel();toast(t('Draft saved. Recheck to update the findings.','تم حفظ المسودة. أعد الفحص لتحديث النتائج.'));}
    return;
  }
  const artifact=artifactFor(docId);
  const clean=Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,value.trim()]));
  if(JSON.stringify(clean)!==JSON.stringify(artifact.fields)){artifact.fields=clean;artifact.revision++;}
  delete state.editDrafts[active().id+':'+docId];
  state.editor=null;
  if(rerun)runValidation(docId);
  else{closePanel();toast(t('Draft saved. Recheck it to update the findings.','تم حفظ المسودة. أعد فحصها لتحديث النتائج.'));}
}
function reviewEvidence(review) {
  return `<span class="sample-label">${t('CHECKED SNAPSHOT','النسخة المفحوصة')}</span><h3>${templates.find(d=>d.id===review.docId).name()}</h3><p class="inspector-intro">${t('Check','الفحص')} ${review.run} · ${t('Revision','النسخة')} ${review.revision} · ${t('Template v1.0','النموذج 1.0')}</p>${reviewDefinitions(review.fields).map(item=>`<h4>${item.location}</h4><p>${item.rule}</p><div class="evidence"><p dir="auto">${escape(item.value)}</p><strong class="${review.checks[item.key]?'is-clear':'has-issues'}">${review.checks[item.key]?t('Passed','اجتاز'):t('Needs attention','يحتاج إلى متابعة')}</strong></div>`).join('')}<p class="small-copy">${t('This snapshot preserves the values checked in this run. Later edits do not change it.','تحفظ هذه النسخة القيم التي فُحصت في هذه الجولة، ولا تتغير بالتعديلات اللاحقة.')}</p>`;
}

function response(kind, message = {}) {
  if(kind==='access-unavailable')return `<h2>${t('Document tools are not available for this role','أدوات المستندات غير متاحة لهذا الدور')}</h2><p>${t('You can ask about your projects, explore forecasts or review data quality. Switch the demo account to preview document tools.','يمكنك السؤال عن مشاريعك أو استكشاف التوقعات أو مراجعة جودة البيانات. بدّل الحساب التجريبي لمعاينة أدوات المستندات.')}</p>`;
  if(kind==='scope')return `<h2>${t('Your project scope','نطاق مشاريعك')}</h2><p>${t(...account().scopeLabel)}</p>${projectsFor(account()).length?`<div class="scope-response-list">${projectsFor(account()).map(project=>`<button class="source-link" data-action="project-context" data-id="${project.id}">${icon('briefcase')}${t(...project.name)}${icon('chevron')}</button>`).join('')}</div>`:`<p>${t('This account has no assigned sample projects. No project records are available to answer from.','لا توجد مشاريع تجريبية مسندة لهذا الحساب، لذلك لا تتوفر سجلات مشاريع للإجابة منها.')}</p>`}`;
  if(kind==='forecasts'||kind==='quality')return `<h2>${kind==='forecasts'?t('Explore project forecasts','استكشف توقعات المشاريع'):t('Review data quality','راجع جودة البيانات')}</h2><p>${t('Open the workspace to see your project scope and the next steps for this capability. Results are not connected in this foundation milestone.','افتح مساحة العمل لعرض نطاق مشاريعك والخطوات التالية لهذه الإمكانية. النتائج غير متصلة في هذه المرحلة التأسيسية.')}</p><button class="secondary-button" data-action="navigate" data-view="${kind}">${icon(kind==='forecasts'?'chart':'shield')}${t('Open workspace','فتح مساحة العمل')}</button>`;

  if (kind === 'project') return `<div class="response-meta">${t('PROJECT SUMMARY','ملخص المشروع')}<span>${t('As of 30 Sep 2026 · Sample data','حتى 30 سبتمبر 2026 · بيانات تجريبية')}</span></div>
    <h2>${t('Project Alpha, at a glance','نظرة سريعة على مشروع ألفا')}</h2>
    <p>${t('Project Alpha is progressing, with one milestone requiring attention. Overall progress is <strong>68%</strong> against a planned <strong>75%</strong>.','يتقدم مشروع ألفا، مع وجود مرحلة رئيسية تحتاج إلى المتابعة. يبلغ الإنجاز الفعلي <strong>68%</strong> مقابل <strong>75%</strong> مخطط له.')}</p>
    <div class="data-table"><table><caption class="sr-only">${t('Project performance summary','ملخص أداء المشروع')}</caption><thead><tr><th>${t('Measure','المقياس')}</th><th>${t('Actual','الفعلي')}</th><th>${t('Planned','المخطط')}</th></tr></thead><tbody><tr><td>${t('Overall progress','التقدم الإجمالي')}</td><td>68%</td><td>75%</td></tr><tr><td>${t('Milestones completed','المراحل المكتملة')}</td><td>7 / 10</td><td>8 / 10</td></tr><tr><td>${t('Budget utilization','استخدام الميزانية')}</td><td>62%</td><td>65%</td></tr></tbody></table></div>
    <div class="inline-note">${icon('help')}<p><strong>${t('What needs attention','ما يحتاج إلى متابعة')}</strong><br>${t('The integration testing milestone is delayed. Review the dependency noted in the project status report with the project owner.','تأخرت مرحلة اختبار التكامل. راجع الاعتمادية المذكورة في تقرير حالة المشروع مع مالك المشروع.')}</p></div>
    ${sourceButton('project',t('Project Alpha · September status report','مشروع ألفا · تقرير حالة سبتمبر'))}
    <div class="followups"><button data-action="ask" data-kind="milestone">${t('Which milestone is delayed?','ما المرحلة المتأخرة؟')}${icon('right')}</button><button data-action="ask" data-kind="kpi">${t('Explain the related KPI','اشرح مؤشر الأداء المرتبط')}${icon('right')}</button></div>`;
  if (kind === 'kpi') return `<div class="response-meta">${t('KPI EXPLANATION','شرح مؤشر الأداء')}<span>${t('Q3 2026 · Sample data','الربع الثالث 2026 · بيانات تجريبية')}</span></div><h2>${t('On-time milestone delivery','تسليم المراحل في موعدها')}</h2><p>${t('This KPI measures the percentage of project milestones completed by their agreed due date. A higher value indicates more consistent delivery.','يقيس هذا المؤشر نسبة مراحل المشروع المكتملة ضمن مواعيدها المتفق عليها. وتشير القيمة الأعلى إلى انتظام أكبر في التسليم.')}</p><div class="kpi-reading"><div><span>${t('Actual','الفعلي')}</span><strong>70<span>%</span></strong></div><div><span>${t('Target','المستهدف')}</span><strong>80<span>%</span></strong></div><div><span>${t('Gap to target','الفجوة عن المستهدف')}</span><strong>−10 <span>${t('pp','نقطة')}</span></strong></div></div><p>${t('In this sample, 7 of 10 milestones were delivered on time. The result is 10 percentage points below target. This is a historical result, not a forecast.','في هذا المثال، سُلّمت 7 من أصل 10 مراحل في موعدها. تقل النتيجة عن المستهدف بمقدار 10 نقاط مئوية. هذه نتيجة تاريخية وليست توقعًا.')}</p>${sourceButton('kpi',t('KPI definition & Q3 performance record','تعريف المؤشر وسجل أداء الربع الثالث'))}<div class="followups"><button data-action="ask" data-kind="project">${t('Show the project summary','اعرض ملخص المشروع')}${icon('right')}</button></div>`;
  if (kind === 'milestone') return `<h2>${t('Integration testing needs attention','اختبار التكامل يحتاج إلى متابعة')}</h2><p>${t('The sample status report lists <strong>integration testing</strong> as delayed. Its planned completion was 24 September 2026; it remained open at the 30 September reporting date.','يذكر التقرير التجريبي أن <strong>اختبار التكامل</strong> متأخر. كان موعد إكماله المخطط 24 سبتمبر 2026، وظل مفتوحًا حتى تاريخ التقرير في 30 سبتمبر.')}</p><p>${t('The recorded dependency is vendor environment availability. The report does not provide a confirmed revised completion date.','الاعتمادية المسجلة هي جاهزية بيئة المورد. لا يتضمن التقرير موعد إكمال جديدًا مؤكدًا.')}</p>${sourceButton('project',t('Project Alpha · Milestone notes','مشروع ألفا · ملاحظات المراحل'))}`;
  if (kind === 'artifact') return `<h2>${t('Let’s check your artifact','لنتحقّق من مستندك')}</h2><p>${t('Choose a sample document. I’ll check it against its template automatically and show what needs attention.','اختر مستندًا تجريبيًا، وسأفحصه تلقائيًا مقابل نموذجه وأعرض ما يحتاج إلى متابعة.')}</p><div class="document-options">${documentsForAccount().length?'':`<p class="scope-empty-copy">${t('No sample documents are available in your assigned project scope.','لا توجد مستندات تجريبية ضمن نطاق المشاريع المسندة إليك.')}</p>`}${documentsForAccount().map(doc=>`<button data-action="select-artifact" data-id="${doc.id}">${icon('document')}<span><strong>${doc.name()}</strong><span>${doc.meta()}</span></span>${icon('chevron')}</button>`).join('')}</div><p class="small-copy">${t('Prototype: predefined samples only. Files are not uploaded or processed.','نموذج تجريبي: أمثلة محددة مسبقًا فقط. لا يتم رفع الملفات أو معالجتها.')}</p>`;
  if (kind.startsWith('validation:')) return reviewResponse(message.review);
  return `<h2>${t('Let’s explore the sample workspace','لنستكشف مساحة العمل التجريبية')}</h2><p>${t('This prototype can demonstrate a project summary, explain a KPI, or check a sample artifact. It isn’t connected to live Synergy data or an AI model, so I can’t answer that question from real records.','يتيح هذا النموذج التجريبي عرض ملخص مشروع، أو شرح مؤشر أداء، أو التحقّق من مستند تجريبي. وهو غير متصل ببيانات سينرجي الفعلية أو بنموذج ذكاء اصطناعي، لذا لا يمكنني الإجابة من سجلات حقيقية.')}</p><div class="followups"><button data-action="ask" data-kind="project">${t('Try a project summary','جرّب ملخص مشروع')}${icon('right')}</button>${allowed('validate')?`<button data-action="ask" data-kind="artifact">${t('Check a sample artifact','تحقّق من مستند تجريبي')}${icon('right')}</button>`:''}</div>`;
}

function messages() {
  return `<div class="conversation" aria-label="${t('Conversation','المحادثة')}">${active().messages.map((m,index)=>m.role==='user' ? `<div class="user-turn" dir="auto">${escape(m.text)}</div>` : `<article class="assistant-turn" aria-label="${t('Assistant response','إجابة المساعد')}"><div class="assistant-label">${mark()}<strong>${t('Synergy Assistant','مساعد سينرجي')}</strong><span>${t('Sample response','إجابة تجريبية')}</span></div><div class="response-content">${response(m.kind,m)}</div><div class="response-actions"><button class="icon-button small" data-action="copy" data-index="${index}" aria-label="${t('Copy response','نسخ الإجابة')}">${icon('copy')}</button><button class="icon-button small ${state.feedback.has(active().id+':'+index)?'selected':''}" data-action="feedback" data-index="${index}" aria-label="${t('Mark response helpful','تقييم الإجابة كمفيدة')}" aria-pressed="${state.feedback.has(active().id+':'+index)}">${icon('thumb')}</button><span>${t('Grounded in sample records','استنادًا إلى سجلات تجريبية')}</span></div></article>`).join('')}${state.busy?`<div class="loading" role="status">${mark()}<span class="loading-dots"><i></i><i></i><i></i></span><span>${state.pendingReview?t('Checking the document against its template…','جارٍ فحص المستند مقابل نموذجه…'):t('Reviewing the sample information…','جارٍ مراجعة المعلومات التجريبية…')}</span></div>`:''}</div>`;
}

function sidebar() {
  return `<aside class="sidebar ${state.mobile?'is-open':''}" aria-label="${t('Workspace navigation','التنقل في مساحة العمل')}"><div class="brand"><img src="/public/tawuniya-logo.png" alt="Tawuniya التعاونية" width="145" height="44"><button class="icon-button mobile-only" data-action="close-nav" aria-label="${t('Close navigation','إغلاق التنقل')}">${icon('close')}</button></div>
    <button class="new-chat" data-action="new" aria-label="${t('New conversation','محادثة جديدة')}">${icon('plus')}<span>${t('New conversation','محادثة جديدة')}</span></button>
    <div class="history"><div class="nav-caption">${t('THIS SESSION','هذه الجلسة')}</div>${state.conversations.length?state.conversations.slice().reverse().map(c=>`<button class="history-item ${c.id===state.active&&state.activeView==='assistant'?'current':''}" data-action="history" data-id="${c.id}">${icon('chat')}<span dir="auto">${escape(c.title)}</span></button>`).join(''):`<div class="empty-history">${t('Your conversations will appear here.','ستظهر محادثاتك هنا.')}</div>`}</div>
    <div class="sidebar-bottom"><button class="help-button" data-action="help" aria-label="${t('About this assistant','حول هذا المساعد')}">${icon('help')}<span>${t('About this assistant','حول هذا المساعد')}</span></button></div></aside>`;
}

function validationPicker() {
  if(!documentsForAccount().length)return `<div class="scope-empty">${icon('document')}<h3>${t('No documents in your project scope','لا توجد مستندات ضمن نطاق مشاريعك')}</h3><p>${t('This demo account has no assigned sample projects or documents. Switch accounts to explore validation.','لا توجد مشاريع أو مستندات تجريبية مسندة لهذا الحساب. بدّل الحساب لاستكشاف التحقق.')}</p><button class="text-button" data-action="accounts">${t('Switch demo account','تبديل الحساب التجريبي')}${icon('right')}</button></div>`;
  return `<div class="validation-intro"><span class="validation-emblem">${icon('shield')}</span><p class="sample-label">${t('GOVERNANCE & PERFORMANCE','الحوكمة والأداء')}</p><h3>${t('Check before you submit','تحقّق قبل الإرسال')}</h3><p>${t('Find missing details, review suggestions, and prepare your document for human review.','اكتشف التفاصيل الناقصة، وراجع الاقتراحات، وجهّز مستندك للمراجعة البشرية.')}</p></div>
    <dl class="validation-scope"><div><dt>${t('Required checks','الفحوصات المطلوبة')}</dt><dd>${t('Reporting period and accountable owner','فترة التقرير والمالك المسؤول')}</dd></div><div><dt>${t('Suggested improvement','التحسين المقترح')}</dt><dd>${t('Next action and due date','الإجراء التالي والموعد النهائي')}</dd></div></dl>
    <p class="prompts-label">${t('Choose a sample document','اختر مستندًا تجريبيًا')}</p><div class="validation-documents">${documentsForAccount().map(doc=>`<button class="validation-document" data-action="attach" data-id="${doc.id}"><span class="validation-document-icon">${icon('document')}</span><span class="validation-document-copy"><strong>${doc.name()}</strong><small>${doc.meta()}</small><span>${t('Governance & Performance · Template v1.0','الحوكمة والأداء · النموذج 1.0')}</span></span>${icon('right')}</button>`).join('')||`<p class="scope-empty-copy">${t('No sample documents are available in your assigned project scope. Switch demo accounts to explore validation.','لا توجد مستندات تجريبية ضمن نطاق المشاريع المسندة إليك. بدّل الحساب التجريبي لاستكشاف التحقق.')}</p>`}</div>
    <div class="validation-start-note">${icon('check-circle')}<p>${t('Select a document to start checking automatically. You can correct findings and recheck in the same conversation.','اختر مستندًا لبدء الفحص تلقائيًا. يمكنك معالجة الملاحظات وإعادة الفحص في المحادثة نفسها.')}</p></div><p class="small-copy">${t('This demo checks editable sample fields. Real document access and template validation will use Synergy integration.','يفحص هذا العرض حقولًا تجريبية قابلة للتعديل. سيعتمد الوصول إلى المستندات الفعلية والتحقق من النماذج على التكامل مع سينرجي.')}</p>`;
}

function overlay() {
  if (!state.drawer) return '';
  let content='';
  if(state.drawer==='platform-menu')content=`<p class="inspector-intro">${t('Mobility workspace','مساحة عمل التنقل')}</p><div class="platform-menu-links">${PLATFORM_TABS.map(tab=>`<button class="history-entry" data-action="platform-tab" data-tab="${tab.id}">${icon(tab.id==='synergy'?'assistant':'briefcase')}<span>${t(...tab.label)}</span>${icon('chevron')}</button>`).join('')}</div>`;
  else if(state.drawer==='accounts') content=foundation().accountPicker();
  else if(state.drawer==='forecast-project') content=forecast().panel(state.source);
  else if(state.drawer==='forecast-alerts') content=forecast().alertSettings();
  else if(state.drawer==='quality-finding') content=quality().findingPanel(state.source);
  else if(state.drawer==='quality-rules') content=quality().rulesPanel();
  else if(state.drawer==='project-context') {const project=projectsFor(account()).find(project=>project.id===state.source);content=project?foundation().projectContext(project):'';}
  else if(state.drawer==='documents') content=`<p class="inspector-intro">${t('Select a sample document to start its template checks automatically. No files are uploaded in this prototype.','اختر مستندًا تجريبيًا لبدء فحص النموذج تلقائيًا. لا يتم رفع أي ملفات في هذا النموذج.')}</p><div class="document-options">${documentsForAccount().length?'':`<p class="scope-empty-copy">${t('No sample documents are available in your assigned project scope.','لا توجد مستندات تجريبية ضمن نطاق المشاريع المسندة إليك.')}</p>`}${documentsForAccount().map(d=>`<button data-action="attach" data-id="${d.id}">${icon('document')}<span><strong>${d.name()}</strong><span>${d.meta()}</span></span>${icon('plus')}</button>`).join('')}</div><div class="inspector-note">${icon('shield')}<p>${t('Production document access will follow your Synergy permissions.','سيخضع الوصول إلى المستندات في النسخة الفعلية لصلاحياتك في سينرجي.')}</p></div>`;
  else if(state.drawer==='validation') content=validationPicker();
  else if(state.drawer==='history') content=`<p class="inspector-intro">${t('Pick up where you left off. Conversations stay available during this session.','تابع من حيث توقفت. تبقى المحادثات متاحة خلال هذه الجلسة.')}</p><button class="secondary-button" data-action="new">${icon('plus')}${t('New conversation','محادثة جديدة')}</button><div class="chat-history-list">${state.conversations.length?state.conversations.slice().reverse().map(c=>`<button class="history-entry ${c.id===state.active&&state.activeView==='assistant'?'current':''}" data-action="history" data-id="${c.id}">${icon('chat')}<span>${escape(c.title)}</span>${icon('chevron')}</button>`).join(''):`<div class="history-empty">${icon('history')}<h3>${t('A fresh start','بداية جديدة')}</h3><p>${t('Your conversations will appear here after you send a message.','ستظهر محادثاتك هنا بعد إرسال رسالة.')}</p></div>`}</div>`;
  else if(state.drawer==='editor') content=artifactEditor();
  else if(state.drawer==='review-evidence') content=reviewEvidence(state.reviewEvidence);
  else if(state.drawer==='create-preview') content=authoring().preview();
  else if(state.drawer==='help') content=`<div class="about-symbol">${mark()}</div><h3>${t('A clearer view of your work','رؤية أوضح لعملك')}</h3><p>${t('Ask about projects and KPIs, summarize documents, or review an artifact against its template.','اسأل عن المشاريع ومؤشرات الأداء، أو لخّص المستندات، أو راجع مستندًا مقابل نموذجه.')}</p><div class="inspector-note"><p><strong>${t('Interactive design prototype','نموذج تصميم تفاعلي')}</strong><br>${t('Chat answers use sample records. Artifact checks use the fields you edit in this session. There is no live Synergy connection, AI inference, authentication, or persistent storage. Reloading clears the session.','تعتمد إجابات المحادثة على سجلات تجريبية، وتفحص مراجعة المستند الحقول التي تعدّلها في هذه الجلسة. لا يوجد اتصال فعلي بسينرجي أو نموذج ذكاء اصطناعي أو مصادقة أو تخزين دائم. تُمسح الجلسة عند إعادة التحميل.')}</p></div><p>${t('Automated checks support human decisions. They do not approve documents or change source records.','تدعم الفحوصات الآلية القرارات البشرية، ولا تعتمد المستندات أو تغيّر السجلات الأصلية.')}</p>`;
  else {
    const source=state.source;
    content=`<span class="sample-label">${t('SAMPLE EVIDENCE','دليل تجريبي')}</span><h3>${source==='kpi'?t('On-time milestone delivery','تسليم المراحل في موعدها'):source==='artifact'?t('Governance & Performance','الحوكمة والأداء'):t('Project Alpha','مشروع ألفا')}</h3><dl class="source-metadata"><div><dt>${t('Source','المصدر')}</dt><dd>${t('Illustrative Synergy record','سجل سينرجي توضيحي')}</dd></div><div><dt>${t('Reporting period','فترة التقرير')}</dt><dd>${t('Q3 · July–September 2026','الربع الثالث · يوليو–سبتمبر 2026')}</dd></div><div><dt>${t('Snapshot','النسخة المرجعية')}</dt><dd dir="ltr">DEMO-UC01-001</dd></div><div><dt>${t('Record type','نوع السجل')}</dt><dd>${source==='artifact'?t('Template v1.0','النموذج 1.0'):t('Performance record','سجل أداء')}</dd></div></dl><h4>${t('Supporting information','المعلومات الداعمة')}</h4><div class="evidence">${source==='kpi'?`<p>${t('Definition: milestones delivered on time ÷ total milestones due × 100.','التعريف: المراحل المسلّمة في موعدها ÷ إجمالي المراحل المستحقة × 100.')}</p><p>${t('Sample actual: 7 ÷ 10 × 100 = 70%. Target: 80%. Gap: −10 percentage points.','القيمة التجريبية: 7 ÷ 10 × 100 = 70%. المستهدف: 80%. الفجوة: −10 نقاط مئوية.')}</p>`:source==='artifact'?`<p>${t('§1: reporting period must include start and end dates. In the sample document, this field is blank.','§1: يجب أن تتضمن فترة التقرير تاريخي البداية والنهاية. هذا الحقل فارغ في المستند التجريبي.')}</p><p>${t('§3: an accountable owner is required. The sample document contains no owner.','§3: يلزم تحديد مالك مسؤول. لا يتضمن المستند التجريبي اسم مالك.')}</p><p>${t('§5: next-step due dates are recommended, not required.','§5: يوصى بإضافة مواعيد للخطوات التالية، لكنها ليست مطلوبة.')}</p>`:`<p>${t('Actual progress: 68%. Planned progress: 75%. Completed milestones: 7 of 10; planned: 8 of 10. Budget utilization: 62%; planned: 65%.','الإنجاز الفعلي: 68%. المخطط: 75%. المراحل المكتملة: 7 من 10؛ المخطط: 8 من 10. استخدام الميزانية: 62%؛ المخطط: 65%.')}</p><p>${t('Integration testing: planned completion 24 Sep 2026. Still open on 30 Sep. Dependency: vendor environment availability. Revised date: not recorded.','اختبار التكامل: تاريخ الإكمال المخطط 24 سبتمبر 2026. ظل مفتوحًا في 30 سبتمبر. الاعتمادية: جاهزية بيئة المورد. لم يُسجل تاريخ معدّل.')}</p>`}</div><p class="small-copy">${t('This is an inspectable sample snapshot, not a live Corporater record.','هذه نسخة تجريبية قابلة للفحص وليست سجلًا فعليًا في كوربورايتر.')}</p>`;
  }
  if(state.drawer==='help') content += `<p class="icon-credit"><a href="https://thenounproject.com/icon/ai-7087218/" target="_blank" rel="noopener noreferrer">${t('AI icon by Slash from Noun Project','أيقونة الذكاء الاصطناعي من تصميم Slash على Noun Project')}</a></p>`;
  return `<div class="overlay-backdrop" data-action="close-panel"></div><aside class="inspector ${state.drawer==='create-preview'?'create-preview-inspector':state.drawer==='editor'?'artifact-inspector':state.drawer==='validation'?'validation-inspector':state.drawer==='accounts'?'account-inspector':state.drawer==='forecast-project'?'forecast-inspector':state.drawer==='forecast-alerts'?'forecast-alerts-inspector':state.drawer==='quality-finding'||state.drawer==='quality-rules'?'quality-inspector':''}" data-panel="${state.drawer}" role="dialog" aria-modal="true" aria-labelledby="panel-title"><div class="inspector-header"><h2 id="panel-title">${state.drawer==='create-preview'?t('Document preview','معاينة المستند'):state.drawer==='platform-menu'?t('Platform navigation','تنقل المنصة'):state.drawer==='accounts'?t('Switch demo account','تبديل الحساب التجريبي'):state.drawer==='project-context'?t('Project context','سياق المشروع'):state.drawer==='forecast-project'?t('Project forecast','توقع المشروع'):state.drawer==='forecast-alerts'?t('Early-warning rules','قواعد الإنذار المبكر'):state.drawer==='quality-finding'?t('Finding','ملاحظة'):state.drawer==='quality-rules'?t('Data-quality rules','قواعد جودة البيانات'):state.drawer==='validation'?t('Validate a document','التحقق من مستند'):state.drawer==='documents'?t('Sample documents','مستندات تجريبية'):state.drawer==='help'?t('About this assistant','حول هذا المساعد'):state.drawer==='history'?t('Conversations','المحادثات'):state.drawer==='editor'?t('Edit sample document','تعديل المستند التجريبي'):t('Source details','تفاصيل المصدر')}</h2><button class="icon-button" data-action="close-panel" aria-label="${t('Close panel','إغلاق اللوحة')}">${icon('close')}</button></div><div class="inspector-content">${content}</div></aside>`;
}

function languageControl() {
  return `<button class="language-button" data-action="language" aria-label="${t('Switch to Arabic','Switch to English')}">${icon('globe')}<span lang="${lang==='en'?'ar':'en'}">${t('العربية','English')}</span></button>`;
}
function aiWorkspace() {
  const assistant=state.activeView==='assistant';
  const assistanceOpen=state.chatView!=='closed';
  const assistantPage=assistanceOpen?`<div class="assistant-elsewhere">${mark()}<h2>${t('AI Assistance is open','المساعدة الذكية مفتوحة')}</h2><p>${t('Your chat is available in the assistance panel. Close it to continue working here.','محادثتك متاحة في لوحة المساعدة. أغلقها لمتابعة العمل هنا.')}</p><button class="secondary-button" data-action="chat-close">${icon('chat')}${t('Return to workspace assistant','العودة إلى مساعد مساحة العمل')}</button></div>`:active()?messages():welcome();
  const page=assistant?assistantPage:state.activeView==='documents'?(state.documentMode==='create'&&allowed('create')?authoring().page():foundation().documentsPage()):state.activeView==='forecasts'?forecast().page():state.activeView==='quality'?quality().page():state.activeView==='admin'?foundation().adminPage():foundation().overviewPage(state.activeView);
  const shell=assistant||state.activeView==='documents';
  return `<section class="embedded-ai-workspace" aria-label="${t('AI Synergy workspace','مساحة عمل AI Synergy')}"><header class="embedded-ai-heading">${foundation().navigation()}<span class="scope-tag">${icon('briefcase')}${foundation().scope}</span>${embeddedWorkspace?`<button class="sign-out-button" data-action="sign-out" title="${t('Sign out of AI Synergy','تسجيل الخروج من AI Synergy')}">${icon('sign-out')}<span>${t('Sign out','تسجيل الخروج')}</span></button>`:''}</header><div class="embedded-ai-body">${shell?sidebar():''}<div id="workspace-panel" role="tabpanel" aria-labelledby="workspace-tab-${shell?'assistant':state.activeView}" class="workspace ${assistant&&active()?'has-conversation':''} ${assistant?'assistant-workspace':'task-workspace'}">${shell?foundation().taskSwitch():''}<main id="main" tabindex="-1" data-view="${state.activeView}">${page}</main>${assistant&&active()&&!assistanceOpen?`<div class="conversation-composer">${composer()}</div>`:''}</div></div></section>`;
}
// ---------- Create a document (guided conversation) ----------
const authoring=()=>authoringUI({t,icon,escape,mark,a:state.authoring,projects:allowed('create')?projectsFor(account()):[],typing:state.authoringTyping});
function acScroll(){const main=document.querySelector('#main');if(main)main.scrollTop=main.scrollHeight;}
function acFocus(){const current=document.querySelector('.ac-msg.is-current');const field=current&&pendingField(authoring().active()||{});const target=field&&['text'].includes(field.type)?document.querySelector('#ac-message'):current?.querySelector('input,select,button.ac-option,button.primary-button')||document.querySelector('.ac-msg.is-ready .primary-button')||document.querySelector('#ac-message');target?.focus({preventScroll:true});}
function acAfter(ok,typing=true){
  if(!ok||!typing){render();acScroll();acFocus();return;}
  const id=state.authoring.active,account=state.accountId;state.authoringTyping=true;render();acScroll();
  setTimeout(()=>{state.authoringTyping=false;if(state.accountId!==account||state.authoring.active!==id)return;render();acScroll();acFocus();},450);
}
function acAnswer(value){const draft=authoring().active(),field=draft&&pendingField(draft);if(!field||state.authoringTyping)return;acAfter(answerField(draft,field.id,value));}
function acSend(){
  const a=state.authoring,draft=authoring().active(),text=(a.composer||'').trim();
  if(!draft||!text||state.authoringTyping)return;
  a.composer='';
  const cmd=commandOf(draft,text),pending=pendingField(draft);
  if(cmd?.type==='skip'){if(pending)acAfter(skipField(draft,pending.id));else acAfter(false);return;}
  if(cmd?.type==='edit'){editField(draft,cmd.fieldId);acAfter(true,false);return;}
  if(cmd?.type==='edit-unknown'){draft.notice=['I couldn’t find that part. Use a name from the outline, for example “edit deliverables”.','لم أجد هذا الجزء. استخدم اسمًا من المخطط.'];acAfter(false);return;}
  if(!pending){draft.notice=['Your document is ready. To change a part, use Edit in the outline or type “edit” and the part name.','مستندك جاهز. لتغيير جزء استخدم تعديل في المخطط أو اكتب “تعديل” واسم الجزء.'];acAfter(false);return;}
  const value=parseTyped(pending,text);
  const ok=answerField(draft,pending.id,value);
  if(!ok&&pending.type==='table')draft.table=value;
  if(!ok&&pending.type!=='table')a.composer=text;
  acAfter(ok);
}
function acDownload(){
  const file=authoring().download();if(!file)return;
  const url=URL.createObjectURL(new Blob([file.content],{type:'application/msword'}));
  const link=Object.assign(document.createElement('a'),{href:url,download:file.filename});document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast(t('Document downloaded.','تم تنزيل المستند.'));
}
function acValidate(){
  const ui=authoring(),draft=ui.active();if(!draft||!authoringComplete(draft)||!allowed('validate'))return;
  const tpl=authoringTemplate(draft.templateId),project=ui.projectOf(draft.projectId);if(!tpl.validatorTemplate)return;
  const file=ui.download(),fields=validatorFields(draft,project);
  const text=`${tpl.name[0]}\n${project.name[0]}\nReporting period: ${fields.start} to ${fields.end}\nOwner: ${fields.owner}\nNext action: ${fields.nextAction}\nDue: ${fields.nextDue}`;
  const id='upload-'+crypto.randomUUID();
  addUploadedDocument(state.validator,{name:file.filename,size:file.content.length,extension:'doc',text,pages:1,fields},tpl.validatorTemplate,id,project);
  state.drawer=null;state.documentMode='validate';runStandaloneValidation(id);
}

// AI Assistance follows the AI Synergy page the user is on: its welcome offers questions about that page.
const DOC_TOPICS={
  checks:[['What does the validator check?','ماذا يفحص المدقق؟'],'shield'],
  formats:[['Which files can I upload?','ما الملفات التي يمكنني رفعها؟'],'upload'],
  resolve:[['How do I resolve a finding?','كيف أعالج ملاحظة؟'],'check-circle'],
  types:[['Which documents can I create?','ما المستندات التي يمكنني إنشاؤها؟'],'document'],
  steps:[['How does guided authoring work?','كيف يعمل التأليف الموجّه؟'],'edit'],
};
const docTopics=keys=>keys.map(key=>['doc-topic:'+key,DOC_TOPICS[key][1],t(...DOC_TOPICS[key][0])]);
function assistContext(){
  const view=state.activeView;
  if(view==='forecasts'&&allowed('forecasts')){
    const fc=forecast(),selected=state.drawer==='forecast-project'&&state.forecast.selected&&fc.inScope(state.forecast.selected)?state.forecast.selected:null;
    return {label:selected?t(`Forecasts · ${fc.projectName(selected)}`,`التوقعات · ${fc.projectName(selected)}`):t('Forecasts','التوقعات'),icon:'chart',intro:t('Ask about the forecast you are looking at: which projects need attention, what changed and what is driving it.','اسأل عن التوقعات المعروضة: المشاريع التي تحتاج إلى متابعة وما الذي تغيّر وما الذي يؤثر فيها.'),starters:[...(selected?[['forecast-why:'+selected,'chart',fc.whyQuestion(selected)]]:[]),...fc.topics()]};
  }
  if(view==='quality'&&allowed('quality')){
    const dq=quality(),key=state.drawer==='quality-finding'?state.quality.selected:null,finding=key&&dq.ctx.all.find(f=>f.key===key);
    return {label:t('Data quality','جودة البيانات'),icon:'shield',intro:t('Ask about the latest scan: what to fix first, what changed and which checks fail most.','اسأل عن آخر فحص: ما الذي يجب معالجته أولًا وما الذي تغيّر وما الفحوصات الأكثر فشلًا.'),starters:[...(finding?[['quality-why:'+key,'help',dq.whyQuestion(key)]]:[]),...dq.topics()]};
  }
  if(view==='documents'&&state.documentMode==='create'&&allowed('create'))return {label:t('Create a document','إنشاء مستند'),icon:'edit',intro:t('Ask how to prepare a project document for review.','اسأل عن كيفية إعداد مستند مشروع للمراجعة.'),starters:docTopics(['types','steps'])};
  if(view==='documents'&&allowed('validate'))return {label:t('Validate a document','التحقق من مستند'),icon:'shield',intro:t('Ask about checking a document against its template.','اسأل عن فحص مستند مقابل نموذجه.'),starters:docTopics(['checks','formats','resolve'])};
  return null;
}
function docTopicResponse(key){
  const meta=`<div class="response-meta">${t('DOCUMENTS','المستندات')}<span>${t('Prototype guidance','إرشاد النموذج التجريبي')}</span></div>`;
  const go=(mode,label)=>`<button class="secondary-button" data-action="assistant-task" data-task="${mode}">${icon(mode==='create'?'edit':'shield')}${label}</button>`;
  if(key==='checks')return `${meta}<h2>${t('What the validator checks','ما يفحصه المدقق')}</h2><p>${t('Each document is compared with its template. In this demo it checks:','تتم مقارنة كل مستند بنموذجه. في هذا العرض يفحص:')}</p><ul><li>${t('<strong>Required:</strong> the reporting period and the accountable owner.','<strong>مطلوب:</strong> فترة التقرير والمالك المسؤول.')}</li><li>${t('<strong>Suggested:</strong> a next action with a due date.','<strong>مقترح:</strong> إجراء تالٍ مع موعد نهائي.')}</li><li>${t('<strong>Project Hold:</strong> the hold reason, dates and approvals in the template.','<strong>تعليق المشروع:</strong> سبب التعليق والتواريخ والموافقات الواردة في النموذج.')}</li></ul><p>${t('Results support a human reviewer. They do not approve the document.','تدعم النتائج المراجع البشري ولا تعتمد المستند.')}</p>${go('validate',t('Validate a document','التحقق من مستند'))}`;
  if(key==='formats')return `${meta}<h2>${t('Files you can upload','الملفات التي يمكنك رفعها')}</h2><p>${t('PDF, Word (.docx), TXT or Markdown, up to 10 MB. Files are read in your browser and are not sent to Synergy in this demo. Choose a template, or let it be detected automatically.','PDF أو Word (.docx) أو TXT أو Markdown بحجم يصل إلى 10 ميغابايت. تُقرأ الملفات في متصفحك ولا تُرسل إلى سينرجي في هذا العرض. اختر نموذجًا أو اتركه يُكتشف تلقائيًا.')}</p>${go('validate',t('Upload a document','رفع مستند'))}`;
  if(key==='resolve')return `${meta}<h2>${t('Resolving a finding','معالجة ملاحظة')}</h2><ol><li>${t('Open the report and expand the finding to see what is missing.','افتح التقرير ووسّع الملاحظة لمعرفة الناقص.')}</li><li>${t('Select <strong>Edit document</strong> and correct the field.','اختر <strong>تعديل المستند</strong> وصحّح الحقل.')}</li><li>${t('Select <strong>Recheck</strong>. Resolved findings move to passed.','اختر <strong>إعادة الفحص</strong>. تنتقل الملاحظات المعالجة إلى المجتازة.')}</li></ol>`;
  if(key==='types')return `${meta}<h2>${t('Documents you can create','المستندات التي يمكنك إنشاؤها')}</h2><ul>${AUTHORING_LIST.map(tpl=>`<li><strong>${t(...tpl.name)}</strong> (${tpl.format}): ${t(...tpl.purpose)}</li>`).join('')}</ul><p>${t('Each one is created for a project assigned to you, using the approved template.','يُنشأ كل منها لمشروع مسند إليك باستخدام النموذج المعتمد.')}</p>${go('create',t('Create a document','إنشاء مستند'))}`;
  return `${meta}<h2>${t('How creating a document works','كيف يعمل إنشاء المستند')}</h2><ol><li>${t('Pick a template and one of your projects.','اختر نموذجًا وأحد مشاريعك.')}</li><li>${t('I fill in what Synergy knows, then ask for the rest one part at a time. Skip optional parts, and change any answer from the outline.','أملأ ما تعرفه سينرجي ثم أسألك عن الباقي جزءًا بعد جزء. تخطَّ الأجزاء الاختيارية وغيّر أي إجابة من المخطط.')}</li><li>${t('Review the template check, preview the document, then download it as a Word file for validation and approval.','راجع فحص النموذج وعاين المستند ثم نزّله كملف Word للتحقق والاعتماد.')}</li></ol>`;
}
function openFromAssistant(view,target){
  if(!allowed(view))return;
  if(state.activeView!==view){captureWorkspace();state.activeView=view;state.hostTab='synergy';}
  returnFocus=null;state.panelSurface='host';
  if(view==='forecasts'&&forecast().inScope(target)){state.forecast.selected=target;state.drawer='forecast-project';state.source=target;}
  else if(view==='quality'&&quality().ctx.all.some(f=>f.key===target)){state.quality.selected=target;state.drawer='quality-finding';state.source=target;}
  render({capture:false});document.querySelector('.inspector [data-action="close-panel"]')?.focus();
}
function assistanceResponse(kind) {
  if(kind.startsWith('forecast-why:'))return forecast().whyResponse(kind.slice(13));
  if(kind.startsWith('forecast-whatif:'))return forecast().whatIfResponse(kind.slice(16));
  if(kind.startsWith('quality-why:'))return quality().whyResponse(kind.slice(12));
  if(kind.startsWith('forecast-topic:'))return forecast().topicResponse(kind.slice(15));
  if(kind.startsWith('quality-topic:'))return quality().topicResponse(kind.slice(14));
  if(kind.startsWith('doc-topic:'))return docTopicResponse(kind.slice(10));
  if(['forecasts','quality','artifact','access-unavailable'].includes(kind)){
    const view=kind==='forecasts'?'forecasts':kind==='quality'?'quality':allowed('documents')?'documents':'assistant';
    return `<h2>${t('Continue in AI Synergy','تابع في AI Synergy')}</h2><p>${t('Document tools, forecasts and data quality are available in the AI Synergy tab, with the actions allowed for your role.','تتوفر أدوات المستندات والتوقعات وجودة البيانات في تبويب AI Synergy حسب صلاحيات دورك.')}</p><button class="secondary-button" data-action="workspace-handoff" data-view="${view}">${icon('assistant')}${t('Open AI Synergy','فتح AI Synergy')}</button>`;
  }
  return response(kind);
}
function sendAssistance(text,kind=intent(text)) {
  if(state.assistance.busy||!text.trim())return;
  if(kind.startsWith('validation:'))kind='artifact';
  // Inside AI Synergy the workspace is already open, so answer from the page instead of pointing to it.
  if(embeddedWorkspace)kind={forecasts:allowed('forecasts')?'forecast-topic:summary':kind,quality:allowed('quality')?'quality-topic:summary':kind,artifact:allowed('validate')?'doc-topic:checks':kind}[kind]||kind;
  if(['project','kpi','milestone'].includes(kind)&&!canReadAlpha(account()))kind='scope';
  captureWorkspace();const thread=state.assistance;
  if(state.panelSurface==='floating')state.drawer=null;
  thread.messages.push({role:'user',text});thread.draft='';thread.busy=true;
  const generation=++thread.generation,identity=state.accountId;
  render({capture:false,assistScroll:true});document.querySelector('#assistance-messages')?.focus();
  setTimeout(()=>{
    if(thread.generation!==generation||state.accountId!==identity)return;
    thread.messages.push({role:'assistant',kind});thread.busy=false;
    if(state.chatView==='closed')thread.unread=true;
    render({assistScroll:true,focus:document.activeElement?.id==='assistance-messages'});
  },650);
}
function syncWorkspaceFrame(){
  if(!workspaceFrameReady)return;
  workspaceFrame.contentWindow.postMessage({
    type:'synergy-host-context',accountId:state.accountId,language:lang,
    destination:pendingFrameView
  },frameOrigin);
  pendingFrameView=undefined;
}

function openWorkspaceInFrame(view, detail){
  captureWorkspace();
  state.hostTab='synergy';
  state.drawer=null;
  state.chatView='closed';
  pendingFrameView={view,detail};
  render({capture:false});
  workspaceFrame?.focus();
}

// Keep the frame attached while the host updates tabs, account context or chat.
function renderHost(markup, extras){
  const template=document.createElement('template');
  template.innerHTML=markup;
  const next=template.content.firstElementChild;
  const nextRegion=next.querySelector('#platform-content');
  let host=app.querySelector('.platform-application');
  if(!host){
    host=next;
    app.append(host);
  }else{
    const region=host.querySelector('#platform-content');
    for(const node of Array.from(host.children)){
      if(node!==region)node.remove();
    }
    for(const node of Array.from(next.children)){
      if(node!==nextRegion)region.before(node);
    }
    region.className=nextRegion.className;
    for(const node of Array.from(region.childNodes)){
      if(node!==workspaceFrame)node.remove();
    }
    region.append(...nextRegion.childNodes);
  }

  const region=host.querySelector('#platform-content');
  if(state.hostTab==='synergy'&&!workspaceFrame){
    workspaceFrame=document.createElement('iframe');
    workspaceFrame.className='synergy-workspace-frame';
    workspaceFrame.src=selectedDemoAccount?'/?embed=synergy':'/sign-in.html';
    region.append(workspaceFrame);
  }
  if(workspaceFrame){
    workspaceFrame.title=t('AI Synergy workspace','مساحة عمل AI Synergy');
    workspaceFrame.hidden=state.hostTab!=='synergy';
  }
  for(const node of Array.from(app.children)){
    if(node!==host)node.remove();
  }
  app.insertAdjacentHTML('beforeend',extras);
  syncWorkspaceFrame();
}

window.addEventListener('message',event=>{
  if(event.origin!==frameOrigin||!event.data||typeof event.data!=='object')return;
  const message=event.data;
  if(!embeddedWorkspace){
    if(!workspaceFrame||event.source!==workspaceFrame.contentWindow)return;
    if(message.type==='synergy-workspace-ready'){
      const demoAccount=getAccount(message.demoAccountId);
      if(demoAccount&&demoAccount.id!==state.accountId){
        workspaceFrameReady=false;
        switchAccount(demoAccount.id);
      }
      workspaceFrameReady=true;
      syncWorkspaceFrame();
    }else if(message.type==='synergy-sign-in-ready'){
      workspaceFrameReady=false;
    }else if(message.type==='synergy-demo-account'){
      switchAccount(message.id);
    }
    return;
  }
  if(event.source!==window.parent||message.type!=='synergy-host-context')return;
  const previousLanguage=lang;
  const firstContext=!receivedHostContext;
  receivedHostContext=true;
  if(message.language==='en'||message.language==='ar')lang=message.language;
  if(message.accountId!==state.accountId&&getAccount(message.accountId))switchAccount(message.accountId);
  const destination=message.destination;
  if(destination&&allowed(destination.view)){
    navigate(destination.view);
    if(destination.view==='forecasts'&&forecast().inScope(destination.detail)){
      state.forecast.selected=destination.detail;
      openPanel('forecast-project',destination.detail);
    }
    if(destination.view==='quality'&&quality().ctx.all.some(finding=>finding.key===destination.detail)){
      state.quality.selected=destination.detail;
      openPanel('quality-finding',destination.detail);
    }
  }else if(firstContext||lang!==previousLanguage)render();
});

function render({focus=false,scroll=false,responseStart=false,resetScroll=false,capture=true,assistScroll=false}={}) {
  document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  if(capture)captureWorkspace();
  if(resetScroll){state.chatScroll=0;state.viewScroll.assistant=0;}
  const panelScroll=document.querySelector('.inspector')?.dataset.panel===state.drawer?document.querySelector('.inspector-content')?.scrollTop||0:0;
  const open=state.chatView!=='closed';
  const expanded=state.chatView==='expanded';
  document.querySelector('.skip-link').hidden=false;
  document.querySelector('.skip-link').href=embeddedWorkspace?'#main':'#platform-content';
  app.className=embeddedWorkspace?`platform-app synergy-embed${state.chatView==='compact'?' chat-docked':''}`:`platform-app chat-${state.chatView}`;
  const launcher=`<button id="chat-launcher" class="chat-launcher assistance-launcher" data-action="chat-open" aria-label="${t('Open AI Assistance','فتح المساعدة الذكية')}" aria-expanded="${open}" aria-controls="synergy-chat">${icon('assistant')}<span>${t('AI Assistance','المساعدة الذكية')}</span>${state.assistance.unread?'<span class="launcher-unread" aria-hidden="true"></span>':''}</button>`;
  const floating=open?assistanceChat({t,icon,mark,state,scope:foundation().scope,response:assistanceResponse,escape,languageControl,hasAlpha:canReadAlpha(account()),context:embeddedWorkspace?assistContext():null,embedded:embeddedWorkspace}):'';
  // The AI Assistance launcher belongs to the AI Synergy iframe, so it only appears on that tab.
  if(embeddedWorkspace){
    app.innerHTML=aiWorkspace()+(!open?launcher:'')+floating+(state.drawer?overlay():'');
  }else{
    const host=platformShell({t,icon,state,account:account(),accountButton:foundation().accountButton,languageControl,content:''});
    renderHost(host,state.drawer?overlay():'');
  }
  const drawer=document.querySelector('.inspector'),backdrop=document.querySelector('.overlay-backdrop');
  if(drawer){drawer.classList.add(state.panelSurface==='floating'?'floating-inspector':'platform-inspector');backdrop.classList.add(state.panelSurface==='floating'?'floating-panel-backdrop':'platform-panel-backdrop');}
  for(const detail of document.querySelectorAll('details[data-detail-key]'))detail.open=state.openDetails?.includes(detail.dataset.detailKey)||false;
  const inspectorContent=document.querySelector('.inspector-content');if(inspectorContent)inspectorContent.scrollTop=panelScroll;
  const input=document.querySelector('#message');if(input){input.value=state.chatDraft;syncSend();if(focus&&!state.drawer&&!input.disabled)input.focus();}
  const floatingInput=document.querySelector('#assistance-message');if(floatingInput&&focus&&!state.drawer&&!floatingInput.disabled)floatingInput.focus();
  document.querySelector(embeddedWorkspace?'.embedded-ai-workspace':'.platform-application').inert=Boolean(state.drawer)||expanded;
  if(open){const shell=document.querySelector('.assistance-shell');if(state.drawer&&state.panelSurface==='host')shell.inert=true;else for(const el of shell.querySelectorAll('.chat-chrome,.assistance-scope,.assistance-messages,.assistance-composer'))el.inert=Boolean(state.drawer);}
  if(state.drawer)drawer.querySelector('.icon-button')?.focus();
  const main=document.querySelector('#main');
  if(!scroll&&!responseStart)main?.scrollTo({top:state.viewScroll[state.activeView]||0,behavior:'instant'});
  if(scroll&&state.activeView==='assistant')main?.scrollTo({top:1e6,behavior:'instant'});
  if(responseStart&&state.activeView==='assistant'){const last=main?.querySelector('.assistant-turn:last-of-type');if(last)main.scrollTo({top:main.scrollTop+last.getBoundingClientRect().top-main.getBoundingClientRect().top-16,behavior:'instant'});}
  const floatingMain=document.querySelector('#assistance-messages');floatingMain?.scrollTo({top:assistScroll?1e6:state.assistance.scroll,behavior:'instant'});
}
function closeChat() {
  captureWorkspace();state.chatView='closed';if(state.panelSurface==='floating')state.drawer=null;
  render({capture:false});document.querySelector('#chat-launcher')?.focus();
}

function syncSend(){const el=document.querySelector('#message'); const button=document.querySelector('.send-button');if(button)button.disabled=state.busy||!el?.value.trim();}
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),2500);}
function ensureConversation(text){if(!active()){const c={id:crypto.randomUUID(),title:text.slice(0,50),messages:[]};state.conversations.push(c);state.active=c.id;}}
function send(text,kind,review){
  if(state.busy||!text.trim())return;
  if((kind==='artifact'||kind.startsWith('validation:'))&&!allowed('validate'))kind='access-unavailable';
  if(['project','kpi','milestone'].includes(kind)&&!canReadAlpha(account()))kind='scope';
  captureWorkspace();state.activeView='assistant';ensureConversation(text);
  active().messages.push({role:'user',text});state.busy=true;state.pendingReview=Boolean(review);state.drawer=null;state.mobile=false;
  const id=state.active,identity=state.accountId,generation=++state.generation;
  state.chatDraft='';render({scroll:true,capture:false});
  setTimeout(()=>{
    if(state.generation!==generation||state.accountId!==identity||state.active!==id)return;
    active().messages.push({role:'assistant',kind,review});state.busy=false;
    if(state.chatView==='closed'||state.activeView!=='assistant')state.unread=true;
    render({focus:state.activeView==='assistant',responseStart:state.activeView==='assistant'});
  },650);
}
function intent(text){if(/forecast|what.if|توقع|تنبؤ|ماذا لو/i.test(text))return 'forecasts';if(/quality|anomal|جودة|شذوذ/i.test(text))return 'quality';if(/my projects|scope|مشاريعي|نطاقي/i.test(text))return 'scope';if(/تحقق|تحقّق|مستند|artifact|validat|template|document|report check/i.test(text))return state.attachment?'validation:'+state.attachment:'artifact';if(/مؤشر|kpi|performance|target/i.test(text))return 'kpi';if(/milestone|مرحلة|المراحل/i.test(text))return 'milestone';if(/alpha|ألفا|project|مشروع/i.test(text))return 'project';return 'unknown';}
function starterText(kind){if(kind==='scope')return t('Which projects are in my scope?','ما المشاريع ضمن نطاقي؟');return kind==='project'?t('What’s the latest status of Project Alpha?','ما آخر مستجدات مشروع ألفا؟'):kind==='kpi'?t('How is the milestone delivery KPI performing?','كيف هو أداء مؤشر تسليم المراحل؟'):kind==='milestone'?t('Which milestone is delayed?','ما المرحلة المتأخرة؟'):t('Can you check my report against its template?','هل يمكنك مراجعة تقريري مقابل نموذجه؟');}
function starter(kind){send(starterText(kind),kind);}
function openPanel(type,source){if(['validation','documents','editor','review-evidence'].includes(type)&&!allowed('validate'))return;if(type==='source'&&!canReadAlpha(account()))return;returnFocus=document.activeElement;state.panelSurface=document.activeElement?.closest('.assistance-shell')?'floating':'host';state.drawer=type;state.source=source||null;render();}
function closePanel(){state.drawer=null;render();const action=returnFocus?.dataset.action;const source=returnFocus?.dataset.source;const returnId=returnFocus?.dataset.id;const returnKey=returnFocus?.dataset.key;const target=action==='dq-open'&&returnKey?(document.querySelector(`#main [data-action="dq-open"][data-key="${CSS.escape(returnKey)}"]`)||document.querySelector('#main')):action==='dq-rules'?document.querySelector('#main [data-action="dq-rules"]'):action==='forecast-open'&&returnId?document.querySelector(`#main [data-action="forecast-open"][data-id="${returnId}"]`)||document.querySelector('#main'):source?document.querySelector(`[data-action="source"][data-source="${source}"]`):action?document.querySelector(`[data-action="${action}"]`):document.querySelector('#message');target?.focus();}

app.addEventListener('input',event=>{if(event.target.id==='assistance-message'){state.assistance.draft=event.target.value;document.querySelector('#assistance-composer .send-button').disabled=state.assistance.busy||!event.target.value.trim();}if(event.target.closest('#artifact-editor')){state.editor.fields[event.target.name]=event.target.value;document.querySelector('#period-end')?.setCustomValidity('');document.querySelector('#editor-state').textContent=t('Unsaved changes','تغييرات غير محفوظة');}if(event.target.id==='message'){syncSend();event.target.style.height='auto';event.target.style.height=Math.min(event.target.scrollHeight,180)+'px';}});
app.addEventListener('submit',event=>{if(event.target.id==='ac-composer'){event.preventDefault();acSend();return;}if(event.target.id==='assistance-composer'){event.preventDefault();sendAssistance(state.assistance.draft);return;}if(event.target.id==='artifact-editor'){event.preventDefault();saveArtifact(event.submitter?.value==='rerun');return;}if(event.target.id==='composer'){event.preventDefault();const text=document.querySelector('#message').value.trim();const kind=intent(text);if(kind.startsWith('validation:'))runValidation(kind.split(':')[1],text);else send(text,kind);}});
// Create a document: composer text, table cells and the project picker.
app.addEventListener('input',event=>{
  const el=event.target,a=state.authoring;
  if(el.id==='ac-message'){a.composer=el.value;const send=document.querySelector('#ac-composer .send-button');if(send)send.disabled=state.authoringTyping||!el.value.trim();return;}
  if(el.dataset?.cell){const draft=authoring().active();if(!draft)return;const [r,col]=el.dataset.cell.split(':');draft.table=draft.table?.length?draft.table:[{}];while(draft.table.length<=Number(r))draft.table.push({});draft.table[Number(r)][col]=el.value;}
});
app.addEventListener('keydown',event=>{if(event.target.id==='ac-message'&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();acSend();}});
app.addEventListener('change',event=>{if(event.target.id==='ac-project'&&allowed('create')){state.authoring.setup.projectId=event.target.value;render();document.querySelector('#ac-project')?.focus();}});
app.addEventListener('change',event=>{
  if(event.target.id==='validator-run'&&allowed('validate')){state.validator.run=Number(event.target.value);state.validator.filter='all';render();document.querySelector('#validator-run')?.focus();}
  if(event.target.id==='validator-project'&&allowed('validate')){state.validator.upload.projectId=event.target.value;render();document.querySelector('#validator-project')?.focus();}
  if(event.target.id==='validator-file')chooseUploadedFiles([...event.target.files]);
  if(event.target.id==='validator-template'&&allowed('validate')){state.validator.upload.templateId=event.target.value;render();document.querySelector('#validator-template')?.focus();}
  // Forecasts: Projects menu, what-if target and sliders (sliders recalculate on release).
  if(event.target.id==='fc-view'&&allowed('forecasts')){const fc=state.forecast;fc.view=event.target.value;fc.outcome=null;fc.driver=null;fc.group=null;fc.showAll=false;fc.whatIf={target:'all',values:{}};render();document.querySelector('#fc-view')?.focus();}
  if((event.target.id==='fc-measure'||event.target.id==='fc-horizon')&&allowed('forecasts')){const fc=state.forecast;fc[event.target.id==='fc-measure'?'measure':'horizon']=event.target.value;fc.outcome=null;fc.showAll=false;render();document.querySelector('#'+event.target.id)?.focus();}
  const dqFilters={'dq-severity-select':'severity','dq-category-select':'category','dq-type-select':'objectType','dq-rule-select':'rule','dq-status-select':'status'};
  if(dqFilters[event.target.id]&&allowed('quality')){const q=state.quality;q[dqFilters[event.target.id]]=event.target.value;q.shown=PAGE_STEP;render();document.querySelector('#'+event.target.id)?.focus();}
  if(event.target.id==='fc-whatif-target'&&allowed('forecasts')){state.forecast.whatIf={target:event.target.value,values:{}};render();document.querySelector('#fc-whatif-target')?.focus();}
  if(event.target.dataset?.whatif&&allowed('forecasts')){const key=event.target.dataset.whatif;state.forecast.whatIf.values={...state.forecast.whatIf.values,[key]:Number(event.target.value)};render();document.querySelector('#fc-wi-'+key)?.focus();}
});
// Data quality: live search that keeps the cursor in place.
app.addEventListener('input',event=>{
  if(event.target.id!=='dq-search'||!allowed('quality'))return;
  const q=state.quality,pos=event.target.selectionStart;q.search=event.target.value;q.shown=PAGE_STEP;render();
  const el=document.querySelector('#dq-search');if(el){el.focus();try{el.setSelectionRange(pos,pos);}catch{}}
});
// Live slider readout while dragging; TI follows PI and AI until it is moved itself.
app.addEventListener('input',event=>{
  const key=event.target.dataset?.whatif;if(!key)return;
  const out=document.querySelector(`#fc-wi-${key}-out`);if(out)out.textContent=Number(event.target.value).toFixed(2);
  if((key==='pi'||key==='ai')&&state.forecast.whatIf.values.ti==null){const pi=Number(document.querySelector('#fc-wi-pi')?.value),ai=Number(document.querySelector('#fc-wi-ai')?.value);const tiOut=document.querySelector('#fc-wi-ti-out'),tiInput=document.querySelector('#fc-wi-ti');if(tiOut)tiOut.textContent=(0.8*pi+0.2*ai).toFixed(2);if(tiInput)tiInput.value=(0.8*pi+0.2*ai).toFixed(2);}
});
// Chart hover: show the values of the month under the pointer.
app.addEventListener('pointerover',event=>{
  const hit=event.target.closest?.('.fc-hit');if(!hit)return;
  const wrap=hit.closest('[data-chart]'),tip=wrap?.querySelector('.fc-tooltip'),line=wrap?.querySelector('.fc-hover-line');if(!tip)return;
  const [title,...rows]=hit.dataset.tip.split('|');
  tip.replaceChildren(Object.assign(document.createElement('strong'),{textContent:title}),...rows.map(text=>Object.assign(document.createElement('span'),{textContent:text})));
  tip.hidden=false;line?.setAttribute('x1',hit.dataset.x);line?.setAttribute('x2',hit.dataset.x);line?.setAttribute('visibility','visible');
  const box=wrap.getBoundingClientRect(),svg=wrap.querySelector('svg'),scale=svg.getBoundingClientRect().width/svg.viewBox.baseVal.width;
  const x=Number(hit.dataset.x)*scale,left=x+tip.offsetWidth+16>box.width?x-tip.offsetWidth-12:x+12;
  tip.style.left=`${Math.max(0,left)}px`;tip.style.top='8px';
});
app.addEventListener('pointerout',event=>{
  const wrap=event.target.closest?.('[data-chart]');if(!wrap||wrap.contains(event.relatedTarget))return;
  wrap.querySelector('.fc-tooltip')?.setAttribute('hidden','');wrap.querySelector('.fc-hover-line')?.setAttribute('visibility','hidden');
});
app.addEventListener('dragover',event=>{const zone=event.target.closest('[data-upload-zone]');if(zone){event.preventDefault();zone.classList.add('drag-over');}});
app.addEventListener('dragleave',event=>event.target.closest('[data-upload-zone]')?.classList.remove('drag-over'));
app.addEventListener('drop',event=>{const zone=event.target.closest('[data-upload-zone]');if(zone){event.preventDefault();zone.classList.remove('drag-over');chooseUploadedFiles([...event.dataTransfer.files]);}});
app.addEventListener('keydown',event=>{
  const tab=event.target.closest('.workspace-tab');
  if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();const tabs=[...document.querySelectorAll('.workspace-tab')];const current=tabs.indexOf(tab);
    const delta=(event.key==='ArrowRight'?1:-1)*(lang==='ar'?-1:1);
    const next=event.key==='Home'?tabs[0]:event.key==='End'?tabs.at(-1):tabs[(current+delta+tabs.length)%tabs.length];
    navigate(next.dataset.view);document.querySelector('#'+next.id)?.focus();return;
  }
  if(['message','assistance-message'].includes(event.target.id)&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();document.querySelector(event.target.id==='assistance-message'?'#assistance-composer':'#composer').requestSubmit();}});
app.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const {action,kind,id,source,index}=button.dataset;
  if(action==='platform-tab'){
    if(!PLATFORM_TABS.some(tab=>tab.id===button.dataset.tab))return;
    captureWorkspace();state.hostTab=button.dataset.tab;state.drawer=null;render({capture:false});document.querySelector(`[data-action="platform-tab"][data-tab="${state.hostTab}"]`)?.focus();
  }
  else if(action==='platform-menu')openPanel('platform-menu');
  else if(action==='workspace-handoff'){captureWorkspace();state.chatView='closed';state.drawer=null;navigate(allowed(button.dataset.view)?button.dataset.view:'assistant');}
  else if(action==='assistance-new'){state.assistance.generation++;state.assistance=freshAssistance();render({capture:false,focus:true});}
  else if(action==='assistance-ask')sendAssistance(button.textContent.trim(),kind);
  else if((action==='ask'||action==='starter')&&(button.closest('.assistance-shell')||(state.drawer&&state.panelSurface==='floating')))sendAssistance(starterText(kind),kind);
  else if(action==='accounts')openPanel('accounts');
  else if(action==='switch-account'){
    const changed=id!==state.accountId;
    switchAccount(id);
    if(embeddedWorkspace&&changed&&getAccount(id))window.parent.postMessage({type:'synergy-demo-account',id},frameOrigin);
  }
  else if(action==='workspace-sign-in'){
    if(embeddedWorkspace){
      location.assign('/sign-in.html');
      return;
    }
    if(workspaceFrameReady){
      workspaceFrameReady=false;
      workspaceFrame.src='/sign-in.html';
    }
    openWorkspaceInFrame('assistant');
  }
  else if(action==='navigate'){if(button.closest('.assistance-shell'))state.chatView='closed';navigate(button.dataset.view);if(button.getAttribute('role')==='tab')document.querySelector('#workspace-tab-'+button.dataset.view)?.focus();}
  else if(action==='assistant-task'){const task=button.dataset.task;if(task==='ask'){navigate('assistant');}else if(allowed(task==='create'?'create':'validate')&&allowed('documents')){state.documentMode=task;navigate('documents');}document.querySelector(`[data-action="assistant-task"][data-task="${task}"]`)?.focus();}
  else if(action==='document-mode'){if(!allowed('documents'))return;state.documentMode=button.dataset.mode==='create'&&allowed('create')?'create':'validate';render();document.querySelector(`[data-action="document-mode"][data-mode="${state.documentMode}"]`)?.focus();}
  else if(action==='validator-open'){
    if(!validatorDocumentsForAccount().some(doc=>doc.id===id))return;
    const document=validatorDocument(state.validator,id);
    if(document.reviews.length){state.validator.selected=id;state.validator.run=null;state.validator.filter='all';state.viewScroll.documents=0;render({capture:false});documentFocus();}
    else runStandaloneValidation(id);
  }
  else if(action==='validator-remove-upload'){removeUploadFile(state.validator.upload);render();document.querySelector('#validator-file')?.focus();}
  else if(action==='validator-check-upload'){
    if(!allowed('validate'))return;
    const upload=state.validator.upload;
    const step=uploadSetup(upload,projectsFor(account()),state.validator.busy);
    if(step!=='ready'){if(!['reading','busy'].includes(step))focusUploadRequirement(step);return;}
    const id='upload-'+crypto.randomUUID();
    const project=projectsFor(account()).find(p=>p.id===upload.projectId);
    addUploadedDocument(state.validator,upload.file,resolvedUploadTemplate(upload).id,id,project);
    state.validator.upload=emptyUpload();runStandaloneValidation(id);
  }
  else if(action==='validator-recheck')runStandaloneValidation(id);
  else if(action==='validator-back'){state.validator.selected=null;state.viewScroll.documents=0;render({capture:false});documentFocus();}
  else if(action==='validator-edit')openStandaloneEditor(id,button.dataset.field);
  else if(action==='validator-filter'){if(!allowed('validate'))return;state.validator.filter=button.dataset.filter;render();document.querySelector(`[data-action="validator-filter"][data-filter="${state.validator.filter}"]`)?.focus();}
  else if(action==='validator-latest'){state.validator.run=null;render();document.querySelector('#validator-run')?.focus();}
  else if(action==='validator-locate'){
    const section=document.querySelector('#dv-preview-'+button.dataset.key);
    document.querySelector('.dv-preview-section.located')?.classList.remove('located');
    section?.classList.add('located');section?.scrollIntoView({block:'nearest',behavior:'instant'});section?.focus({preventScroll:true});
  }
  else if(['fc-lens-reset','fc-preview','fc-accuracy','fc-alert-filter','fc-alerts-all','fc-alerts-reviewed','fc-alert-review','fc-rule-drop','fc-rule-toggle','fc-follow','fc-load-saved','fc-delete-saved','fc-save-scenario'].includes(action)){
    if(!allowed('forecasts'))return;const fc=state.forecast,value=button.dataset.value;let focus=null;
    if(action==='fc-lens-reset'){fc.measure='ipi';fc.horizon='end';focus='#fc-measure';}
    else if(action==='fc-preview'){fc.preview=value;if(value==='normal'&&button.closest('.fc-banner,.fc-error'))toast(t('Forecast recalculated with the latest synced data (demo).','أُعيد حساب التوقع بأحدث البيانات (تجريبي).'));focus=button.closest('.fc-method')?`[data-action="fc-preview"][data-value="${value}"]`:'#workspace-heading';}
    else if(action==='fc-accuracy'){fc.accuracy=!fc.accuracy;focus='[data-action="fc-accuracy"]';}
    else if(action==='fc-alert-filter'){fc.alertFilter=value;fc.alertsAll=false;focus=`[data-action="fc-alert-filter"][data-value="${value}"]`;}
    else if(action==='fc-alerts-all'){fc.alertsAll=!fc.alertsAll;focus='[data-action="fc-alerts-all"]';}
    else if(action==='fc-alerts-reviewed'){fc.showReviewed=!fc.showReviewed;focus='[data-action="fc-alerts-reviewed"]';}
    else if(action==='fc-alert-review'){fc.reviewed=[...new Set([...(fc.reviewed||[]),value])];focus='.fc-alert-list [data-action="fc-alert-review"], [data-action="fc-alert-filter"][aria-pressed="true"]';toast(t('Marked as reviewed for this session.','تم التحديد كمراجَع لهذه الجلسة.'));}
    else if(action==='fc-rule-drop')fc.rules={...fc.rules,chanceDrop:Number(value)};
    else if(action==='fc-rule-toggle')fc.rules={...fc.rules,[value]:!fc.rules?.[value]};
    else if(action==='fc-follow'){if(!forecast().inScope(id))return;const set=new Set(fc.following||[]);set.has(id)?set.delete(id):set.add(id);fc.following=[...set];toast(set.has(id)?t('Following. Its warnings appear under Following.','تمت المتابعة. تظهر إنذاراته ضمن المتابَعة.'):t('No longer following.','تم إلغاء المتابعة.'));}
    else if(action==='fc-save-scenario'){const name=(document.querySelector('#fc-save-name')?.value||'').trim().slice(0,40)||t('Scenario','سيناريو');if(!Object.keys(fc.whatIf.values).length||(fc.saved||[]).length>=4)return;fc.saved=[...(fc.saved||[]),{name,view:fc.view,target:fc.whatIf.target,values:{...fc.whatIf.values}}];focus='.fc-saved h3';toast(t('Scenario saved for this session.','تم حفظ السيناريو لهذه الجلسة.'));}
    else if(action==='fc-load-saved'){const s=fc.saved?.[Number(index)];if(!s)return;fc.view=s.view;fc.whatIf={target:s.target,values:{...s.values}};fc.outcome=null;fc.driver=null;fc.group=null;focus='#fc-whatif-title';}
    else if(action==='fc-delete-saved'){fc.saved=(fc.saved||[]).filter((_,i)=>i!==Number(index));focus='#fc-whatif-title';}
    render();
    if(state.drawer==='forecast-alerts'&&['fc-rule-drop','fc-rule-toggle','fc-follow'].includes(action)&&button.closest('.inspector')){document.querySelector(`.inspector [data-action="${action}"]${value!=null?`[data-value="${value}"]`:''}`)?.focus();return;}
    if(action==='fc-follow'&&state.drawer==='forecast-project'){document.querySelector('.inspector [data-action="fc-follow"]')?.focus();return;}
    const target=focus&&document.querySelector(focus);if(target){if(!target.matches('button,input,select'))target.setAttribute('tabindex','-1');target.focus();}
  }
  else if(action.startsWith('dq-')||action==='quality-open'){
    if(!allowed('quality'))return;const q=state.quality;const key=button.dataset.key,value=button.dataset.value;
    const focusInPanel=sel=>document.querySelector('.inspector '+sel)?.focus();
    const reset=()=>{q.shown=PAGE_STEP;};
    if(action==='dq-severity'){q.severity=q.severity===value?'all':value;reset();render();document.querySelector(`#main [data-action="dq-severity"][data-value="${value}"]`)?.focus();}
    else if(action==='dq-category'){q.category=q.category===value?'all':value;reset();render();document.querySelector(`#main [data-action="dq-category"][data-value="${value}"]`)?.focus();}
    else if(action==='dq-object'){q.object=q.object===value?null:value;reset();render();document.querySelector(`#main [data-action="dq-object"][data-value="${CSS.escape(value)}"]`)?.focus();}
    else if(action==='dq-show-new'){q.newOnly=true;q.status='attention';reset();render();document.querySelector('#dq-findings-title')?.scrollIntoView({block:'start'});}
    else if(action==='dq-clear-new'){q.newOnly=false;reset();render();}
    else if(action==='dq-clear-object'){q.object=null;reset();render();}
    else if(action==='dq-clear-status'){q.status='attention';reset();render();}
    else if(action==='dq-clear'){Object.assign(q,{severity:'all',category:'all',objectType:'all',rule:'all',status:'attention',search:'',object:null,newOnly:false,shown:PAGE_STEP});render();document.querySelector('#dq-findings-title')?.closest('section')?.querySelector('select')?.focus();}
    else if(action==='dq-more'){q.shown+=PAGE_STEP;render();}
    else if(action==='dq-method'){q.method=!q.method;render();document.querySelector('[data-action="dq-method"]')?.focus();}
    else if(action==='dq-trace'){q.trace=!q.trace;render();document.querySelector('[data-action="dq-trace"]')?.focus();}
    else if(action==='dq-open'){
      if(!key)return;
      if(state.drawer==='quality-finding'){state.source=key;q.selected=key;render();const h=document.querySelector('.inspector-content h3');if(h){h.setAttribute('tabindex','-1');h.focus();}}
      else{q.selected=key;openPanel('quality-finding',key);document.querySelector('.inspector [data-action="close-panel"]')?.focus();}
    }
    else if(action==='quality-open'){
      if(!quality().ctx.all.some(f=>f.key===key))return;
      openWorkspaceInFrame('quality',key);
    }
    else if(action==='dq-status'){
      if(!can(account(),'scan'))return;
      const note=(document.querySelector('#dq-note')?.value||'').trim();
      if((value==='explained'||value==='false-positive')&&!note){toast(t('Add a short reason first.','أضف سببًا مختصرًا أولًا.'));document.querySelector('#dq-note')?.focus();return;}
      if(!quality().ctx.all.some(f=>f.key===key))return;
      const prev=q.statuses[key],entry={status:value,note:value==='open'?'':note,at:Date.now(),by:t(...account().name)};
      q.statuses={...q.statuses,[key]:{status:value,note:entry.note,history:[...(prev?.history||[]),entry]}};
      render();const h=document.querySelector('.inspector-content h3');if(h){h.setAttribute('tabindex','-1');h.focus();}
      toast(value==='open'?t('Finding reopened.','أُعيد فتح الملاحظة.'):t('Review saved to the audit trail.','حُفظت المراجعة في سجل التدقيق.'));
    }
    else if(action==='dq-ask-why'){
      if(!quality().ctx.all.some(f=>f.key===key))return;
      const question=quality().whyQuestion(key);captureWorkspace();state.drawer=null;state.chatView='compact';state.assistance.unread=false;
      sendAssistance(question,'quality-why:'+key);
    }
    else if(action==='dq-rules'){if(!q.draft)q.draft=normalizeConfig(q.config);openPanel('quality-rules');document.querySelector('.inspector [data-action="close-panel"]')?.focus();}
    else if(action==='dq-rule-toggle'||action==='dq-param'||action==='dq-rules-reset'){
      if(!can(account(),'admin'))return;const d=normalizeConfig(q.draft||q.config);
      if(action==='dq-rule-toggle')d.enabled[value]=d.enabled[value]===false;
      else if(action==='dq-param')d.params[button.dataset.param]=Number(value);
      else{d.enabled={};d.params={...DEFAULT_CONFIG.params};}
      q.draft=d;render();focusInPanel(action==='dq-rules-reset'?'[data-action="dq-rule-toggle"]':action==='dq-param'?`[data-action="dq-param"][data-param="${button.dataset.param}"][data-value="${value}"]`:`[data-action="dq-rule-toggle"][data-value="${value}"]`);
    }
    else if(action==='dq-rescan'){
      if(q.scanning||!can(account(),'scan'))return;
      const before=quality().ctx.scan,previousId=quality().ctx.scanId,nextConfig=normalizeConfig(q.draft||q.config);
      state.drawer=null;q.scanning=true;render();document.querySelector('.fc-loading')?.setAttribute('tabindex','-1');
      setTimeout(()=>{
        const baseline=before.findings,n=(q.scanCount||0)+1,now=new Date();
        q.scanCount=n;q.baseline=baseline;q.config=nextConfig;q.draft=null;q.scanning=false;q.summary={state:'idle',scope:'all',keys:[],label:''};q.shown=PAGE_STEP;
        q.scanMeta={id:`QS-${now.toISOString().slice(0,10)}-R${n}`,at:now.getTime(),previousId};
        if(state.quality===q){render();toast(t(`Scan ${q.scanMeta.id} finished.`,`اكتمل الفحص ${q.scanMeta.id}.`));const h=document.querySelector('#workspace-heading');if(h){h.setAttribute('tabindex','-1');h.focus();}}
      },1100);
    }
    else if(action==='dq-summary-scope'){q.summary={...q.summary,scope:value==='filtered'?'filtered':'all'};render();document.querySelector(`[data-action="dq-summary-scope"][data-value="${value}"]`)?.focus();}
    else if(action==='dq-summarize'){
      const ctx=quality().ctx,filteredScope=q.summary.scope==='filtered'&&ctx.hasFilters;
      const keys=ctx.summaryKeys(filteredScope?'filtered':'all');if(!keys.length)return;
      const label=filteredScope?t(`the ${keys.length} findings in the current view`,`الملاحظات الـ ${keys.length} في العرض الحالي`):t(`all ${keys.length} findings needing attention`,`جميع الملاحظات الـ ${keys.length} التي تحتاج إلى متابعة`);
      const token=(q.summary.token||0)+1;q.summary={state:'writing',scope:q.summary.scope,keys,label,whole:!filteredScope,token};render();
      setTimeout(()=>{if(q.summary.token!==token)return;q.summary={...q.summary,state:'done'};if(state.quality===q){render();const el=document.querySelector('.dq-summary-body');if(el){el.setAttribute('tabindex','-1');el.focus();}}},1100);
    }
    else if(action==='dq-copy-summary'){try{await navigator.clipboard.writeText(quality().summaryText());toast(t('Summary copied.','تم نسخ الملخص.'));}catch{toast(t('Clipboard unavailable. Select the summary text to copy.','الحافظة غير متاحة. حدّد نص الملخص لنسخه.'));}}
    else if(action==='dq-export'){const {filename,content}=quality().csv();const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const link=Object.assign(document.createElement('a'),{href:url,download:filename});document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(t('CSV downloaded.','تم تنزيل ملف CSV.'));}
  }
  else if(action==='fc-alert-settings'){if(allowed('forecasts'))openPanel('forecast-alerts');}
  else if(action==='fc-copy-summary'){try{await navigator.clipboard.writeText(forecast().summaryText());toast(t('Summary copied.','تم نسخ الملخص.'));}catch{toast(t('Clipboard unavailable. Select the summary text to copy.','الحافظة غير متاحة. حدّد نص الملخص لنسخه.'));}}
  else if(action==='fc-export-csv'){const {filename,content}=forecast().csv();const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const link=Object.assign(document.createElement('a'),{href:url,download:filename});document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(t('CSV downloaded.','تم تنزيل ملف CSV.'));}
  else if(action==='fc-print'){document.documentElement.classList.add('print-forecast');window.print();setTimeout(()=>document.documentElement.classList.remove('print-forecast'),500);}
  else if(action==='fc-series'){
    if(!allowed('forecasts'))return;const hidden=new Set(state.forecast.hidden||[]);const key=button.dataset.value;
    hidden.has(key)?hidden.delete(key):hidden.add(key);
    const keys=[...document.querySelectorAll('.fc-series-toggle')].map(el=>el.dataset.value);
    if(keys.every(k=>hidden.has(k)))hidden.delete(key); // keep at least one line visible
    state.forecast.hidden=[...hidden];render();document.querySelector(`[data-action="fc-series"][data-value="${key}"]`)?.focus();
  }
  else if(action==='fc-whatif-reset'){state.forecast.whatIf={...state.forecast.whatIf,values:{}};render();document.querySelector('#fc-wi-pi')?.focus();}
  else if(action==='fc-whatif-ask'){
    if(!allowed('forecasts')||!Object.keys(state.forecast.whatIf.values).length)return;
    const question=forecast().whatIfQuestion(),payload=forecast().whatIfPayload();
    captureWorkspace();state.drawer=null;state.chatView='compact';state.assistance.unread=false;
    sendAssistance(question,'forecast-whatif:'+payload);
  }
  else if(['fc-outcome','fc-driver','fc-group','fc-groupby','fc-sort','fc-clear','fc-show-all','fc-method','fc-trend'].includes(action)){
    if(!allowed('forecasts'))return;const fc=state.forecast,value=button.dataset.value;
    if(action==='fc-outcome')fc.outcome=fc.outcome===value?null:value;
    else if(action==='fc-driver')fc.driver=fc.driver===value?null:value;
    else if(action==='fc-group')fc.group=fc.group===value?null:value;
    else if(action==='fc-groupby'){if(fc.groupBy!==value){fc.groupBy=value;fc.group=null;}}
    else if(action==='fc-sort')fc.sort=value;
    else if(action==='fc-clear'){fc.outcome=null;fc.driver=null;fc.group=null;}
    else if(action==='fc-show-all')fc.showAll=!fc.showAll;
    else if(action==='fc-method')fc.method=!fc.method;
    else if(action==='fc-trend')fc.trend=!fc.trend;
    if(['fc-outcome','fc-driver','fc-group','fc-clear'].includes(action))fc.showAll=false;
    render();
    const again=value!=null?document.querySelector(`#main [data-action="${action}"][data-value="${CSS.escape(value)}"]`):document.querySelector(`#main [data-action="${action}"]`);
    (again||document.querySelector('#fc-projects-title')?.closest('section')?.querySelector('button')||document.querySelector('#main'))?.focus();
  }
  // Sign-in lives in the AI Synergy frame's URL, so signing out returns the frame to the sign-in page.
  else if(action==='sign-out'){if(embeddedWorkspace)location.replace('/sign-in.html');}
  else if(action?.startsWith('ac-')&&allowed('create')){
    const a=state.authoring,draft=authoring().active(),field=draft&&pendingField(draft);
    if(action==='ac-template'){a.setup.templateId=id;render();document.querySelector(`[data-action="ac-template"][data-id="${id}"]`)?.focus();}
    else if(action==='ac-start'){const project=projectsFor(account()).find(p=>p.id===a.setup.projectId);if(!project)return;createDraft(a,a.setup.templateId,project.id);a.composer='';state.drawer=null;render();acScroll();acFocus();}
    else if(action==='ac-open'){a.active=id;a.composer='';render();acScroll();acFocus();}
    else if(action==='ac-back'){a.active=null;a.composer='';state.drawer=null;render();document.querySelector('#main')?.scrollTo({top:0});document.querySelector('#ac-title')?.focus();}
    else if(action==='ac-delete'){a.drafts=a.drafts.filter(d=>d.id!==id);if(a.active===id)a.active=null;render();toast(t('Document deleted.','تم حذف المستند.'));document.querySelector('[data-action="ac-start"]')?.focus();}
    else if(!draft)return;
    else if(action==='ac-choose')acAnswer(button.dataset.value);
    else if(action==='ac-date')acAnswer(document.querySelector('#ac-date')?.value||'');
    else if(action==='ac-date-pick')acAnswer(button.dataset.value);
    else if(action==='ac-use')acAnswer(button.dataset.value);
    else if(action==='ac-fill'){a.composer=button.dataset.value;render();acScroll();const box=document.querySelector('#ac-message');box?.focus();box?.setSelectionRange(box.value.length,box.value.length);}
    else if(action==='ac-skip'){if(field&&!state.authoringTyping)acAfter(skipField(draft,field.id));}
    else if(action==='ac-edit'){state.drawer=null;if(editField(draft,id))acAfter(true,false);}
    else if(action==='ac-row-add'){draft.table=draft.table?.length?draft.table:[{}];draft.table.push({});render();acScroll();document.querySelectorAll('.ac-editor tbody tr')[draft.table.length-1]?.querySelector('input,select')?.focus();}
    else if(action==='ac-row-remove'){draft.table=(draft.table||[]).filter((_,i)=>i!==Number(index));render();document.querySelector('[data-action="ac-row-add"]')?.focus();}
    else if(action==='ac-suggest'){if(field?.type!=='table')return;const rows=field.suggest(projectsFor(account()).find(p=>p.id===draft.projectId));const kept=(draft.table||[]).filter(r=>Object.values(r).some(v=>String(v).trim()));draft.table=[...kept,...rows];draft.error=null;render();document.querySelector('[data-action="ac-table-submit"]')?.focus();toast(t('Suggested rows added from Synergy. Check them before you submit.','أُضيفت صفوف مقترحة من سينرجي. راجعها قبل الإرسال.'));}
    else if(action==='ac-table-submit'){if(field?.type==='table')acAnswer(draft.table||[]);}
    else if(action==='ac-preview')openPanel('create-preview');
    else if(action==='ac-download')acDownload();
    else if(action==='ac-validate')acValidate();
  }
  else if(action==='assist-open'){openFromAssistant(button.dataset.view,button.dataset.view==='quality'?button.dataset.key:id);}
  else if(action==='forecast-open'){
    if(!allowed('forecasts')||!forecast().inScope(id))return;
    if(button.closest('.assistance-shell')){
      if(embeddedWorkspace){openFromAssistant('forecasts',id);return;}
      openWorkspaceInFrame('forecasts',id);
      return;
    }
    state.forecast.selected=id;openPanel('forecast-project',id);document.querySelector('.inspector [data-action="close-panel"]')?.focus();
  }
  else if(['fc-draft-type','fc-draft-index','fc-draft-delta','fc-draft-months'].includes(action)){
    const d=state.forecast.draft,value=button.dataset.value;
    if(action==='fc-draft-type')d.type=value==='end'?'end':'index';
    else if(action==='fc-draft-index')d.index=value;
    else if(action==='fc-draft-delta')d.delta=Number(value);
    else d.months=Number(value);
    render();document.querySelector(`.inspector [data-action="${action}"][data-value="${value}"]`)?.focus();
  }
  else if(action==='fc-run-scenario'){
    if(!forecast().inScope(id))return;const d=state.forecast.draft;const list=state.forecast.scenarios[id]||=[];
    const scenario=d.type==='end'?{type:'end',months:d.months}:{type:'index',index:d.index,delta:d.delta};
    const same=list.findIndex(s=>JSON.stringify(s)===JSON.stringify(scenario));
    if(same<0&&list.length>=MAX_SCENARIOS)return;
    if(same<0)list.push(scenario);
    render();const target=document.querySelector(`#fc-scenario-${same<0?list.length-1:same}`);target?.scrollIntoView({block:'nearest'});target?.focus();
  }
  else if(action==='fc-remove-scenario'){const list=state.forecast.scenarios[id]||[];list.splice(Number(index),1);render();document.querySelector('.inspector [data-action="fc-run-scenario"]')?.focus();}
  else if(action==='fc-ask-why'){
    if(!forecast().inScope(id))return;const question=forecast().whyQuestion(id);
    captureWorkspace();state.drawer=null;state.chatView='compact';state.assistance.unread=false;
    sendAssistance(question,'forecast-why:'+id);
  }
  else if(action==='project-context'){if(projectsFor(account()).some(project=>project.id===id))openPanel('project-context',id);}
  else if(action==='chat-open'){state.chatView='compact';state.assistance.unread=false;render({focus:true});}
  else if(action==='chat-close')closeChat();
  else if(action==='chat-expand'){state.chatView='expanded';render();document.querySelector('[data-action="chat-collapse"]')?.focus();}
  else if(action==='chat-collapse'){state.chatView='compact';render();document.querySelector('[data-action="chat-expand"]')?.focus();}
  else if(action==='chat-history')openPanel('history');
  else if(action==='new'){state.hostTab='synergy';state.activeView='assistant';state.generation++;state.active=null;state.busy=false;state.attachment=null;state.drawer=null;state.chatDraft='';state.chatScroll=0;const input=document.querySelector('#message');if(input)input.value='';state.unread=false;render({focus:true,resetScroll:true,capture:false});}
  else if(action==='home')navigate('assistant');
  else if(action==='starter'||action==='ask')starter(kind);
  else if(action==='language'){const floating=Boolean(button.closest('.assistance-shell'));lang=lang==='en'?'ar':'en';render();document.querySelector(floating?'.assistance-scope [data-action="language"]':'.platform-header [data-action="language"]')?.focus();}
  else if(action==='validation')openPanel('validation');
  else if(action==='documents')openPanel('documents');
  else if(action==='help')openPanel('help');
  else if(action==='source')openPanel('source',source);
  else if(action==='close-panel')closePanel();
  else if(action==='attach')runValidation(id);
  else if(action==='remove-attachment'){state.attachment=null;render({focus:true});}
  else if(action==='select-artifact')runValidation(id);
  else if(action==='run-validation')runValidation(id);
  else if(action==='edit-artifact')openEditor(id,button.dataset.field);
  else if(action==='discard-edits'){if(state.editor.surface==='validator')validatorDocument(state.validator,state.editor.docId).draft=null;else delete state.editDrafts[active().id+':'+state.editor.docId];state.editor=null;closePanel();}
  else if(action==='review-evidence'){state.reviewEvidence=active().messages[Number(index)].review;openPanel('review-evidence');}
  else if(action==='history'){state.hostTab='synergy';if(!state.conversations.some(c=>c.id===id))return;captureWorkspace();state.activeView='assistant';state.generation++;state.busy=false;state.active=id;state.attachment=null;state.mobile=false;state.drawer=null;render({scroll:true,capture:false});}
  else if(action==='open-nav'){state.mobile=true;render();}
  else if(action==='close-nav'){state.mobile=false;render();document.querySelector('[data-action="open-nav"]')?.focus();}
  else if(action==='feedback'){const key=active().id+':'+index;state.feedback.has(key)?state.feedback.delete(key):state.feedback.add(key);button.classList.toggle('selected',state.feedback.has(key));button.setAttribute('aria-pressed',String(state.feedback.has(key)));toast(t('Feedback updated for this session.','تم تحديث التقييم لهذه الجلسة.'));}
  else if(action==='copy'){try{await navigator.clipboard.writeText(button.closest('.assistant-turn').querySelector('.response-content').innerText);toast(t('Response copied.','تم نسخ الإجابة.'));}catch{toast(t('Clipboard unavailable. Select the response text to copy.','الحافظة غير متاحة. حدّد نص الإجابة لنسخه.'));}}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    if(state.drawer)closePanel();
    else if(state.chatView==='expanded'){state.chatView='compact';render();document.querySelector('[data-action="chat-expand"]')?.focus();}
    else if(state.chatView==='compact')closeChat();
  }
  if(event.key==='Tab'&&(state.drawer||state.chatView==='expanded')){
    const container=document.querySelector(state.drawer?'.inspector':'.assistance-shell');if(!container)return;
    const nodes=[...container.querySelectorAll('button:not([disabled]),a,input,textarea:not([disabled]),select,[tabindex="0"]')].filter(el=>el.getClientRects().length&&!el.closest('[inert]'));
    const first=nodes[0],last=nodes.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});
render();
if(embeddedWorkspace)window.parent.postMessage({type:'synergy-workspace-ready',demoAccountId:selectedDemoAccount?.id},frameOrigin);
