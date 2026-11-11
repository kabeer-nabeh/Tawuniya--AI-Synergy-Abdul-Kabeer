import { HOLD_TEMPLATE } from './project-hold.js';
import { validDate } from './artifact-review.js';

export const MAX_UPLOAD_BYTES=10*1024*1024;
export const VALIDATION_TEMPLATES=[
  HOLD_TEMPLATE,
  {id:'quarterly-report',name:['Quarterly performance report','تقرير الأداء ربع السنوي'],version:'1.0',description:['Reporting dates, accountable owner and next steps.','تواريخ التقرير والمالك المسؤول والخطوات التالية.']},
  {id:'project-status',name:['Project status report','تقرير حالة المشروع'],version:'1.0',description:['Reporting dates, project owner and next steps.','تواريخ التقرير ومالك المشروع والخطوات التالية.']},
];
export const uploadTemplate=id=>VALIDATION_TEMPLATES.find(template=>template.id===id);
export const emptyUpload=()=>({file:null,reading:false,error:null,templateId:'auto',projectId:'',token:0});
export function resolvedUploadTemplate(upload) {
  if(upload.templateId!=='auto')return uploadTemplate(upload.templateId);
  if(!upload.file?.text)return;
  const headings=upload.file.text.split(/\r?\n/,10);
  const patterns=[
    ['project-hold',/^(?:(?:epmo )?project hold(?: 2026| demo fixture)?|تعليق مشروع إدارة المشاريع)$/iu],
    ['quarterly-report',/^(?:quarterly performance report|تقرير الأداء ربع السنوي)$/iu],
    ['project-status',/^(?:project(?: [\p{L}\p{N}-]+){0,4} status report|تقرير حالة المشروع)$/iu]
  ];
  const matches=patterns.filter(([,pattern])=>headings.some(heading=>pattern.test(heading.trim().replace(/^#+\s*/,'').replace(/\*\*/g,''))));
  if(matches.length===1)return uploadTemplate(matches[0][0]);
}
// One readiness decision drives both the UI and the submit action.
export function uploadSetup(upload,projects=[],busy=false) {
  if(busy)return 'busy';
  if(upload.reading)return 'reading';
  if(!upload.file?.text)return 'file';
  const template=resolvedUploadTemplate(upload);
  if(!template)return 'template';
  if(template.id==='project-hold'&&!projects.some(project=>project.id===upload.projectId))return 'project';
  return 'ready';
}
export function removeUploadFile(upload) {
  upload.token++;upload.file=null;upload.error=null;upload.reading=false;
}
export async function readUploadSelection(upload,files,reader=readUploadedFile) {
  // Cancelling the picker must not discard an already selected file.
  if(!files.length)return false;
  const token=++upload.token;
  upload.file=null;upload.error=null;
  if(files.length!==1){upload.error='multiple-files';upload.reading=false;return true;}
  upload.reading=true;
  try {const file=await reader(files[0]);if(upload.token===token)upload.file=file;}
  catch(error){if(upload.token===token)upload.error=error.message;}
  finally {if(upload.token===token)upload.reading=false;}
  return upload.token===token;
}
export function checkUploadFile(file) {
  if(!file||!file.size)throw new Error('empty-file');
  if(file.size>MAX_UPLOAD_BYTES)throw new Error('file-too-large');
  const extension=file.name.toLowerCase().split('.').at(-1);
  if(!['pdf','docx','txt','md'].includes(extension))throw new Error('unsupported-file');
  return extension;
}
const labels={
  start:['reporting period start','start date','period start','report from','تاريخ البداية','بداية الفترة'],
  end:['reporting period end','end date','period end','report to','تاريخ النهاية','نهاية الفترة'],
  period:['reporting period','report period','فترة التقرير'],
  owner:['accountable owner','report owner','project owner','owner','المالك المسؤول','مالك التقرير','مالك المشروع'],
  nextAction:['next action','next step','الإجراء التالي','الخطوة التالية'],
  nextDue:['due date','next due date','next step due date','الموعد النهائي','تاريخ الاستحقاق'],
};
const labelPattern=new RegExp(`^(?:\\d+[.)]\\s*)?(${Object.values(labels).flat().join('|')})\\s*(?::|：|\\||\\t|$)\\s*(.*)$`,'iu');
export function fieldsFromText(text) {
  const normalized=text.normalize('NFKC').replace(/[٠-٩]/g,digit=>String(digit.charCodeAt(0)-1632)).replace(/[۰-۹]/g,digit=>String(digit.charCodeAt(0)-1776));
  const lines=normalized.split(/\r?\n/).map(line=>line.replace(/^\s*#{1,6}\s*/,'').replace(/\*\*/g,'').trim()).filter(Boolean);
  const values={};
  for(let index=0;index<lines.length;index++) {
    const match=lines[index].match(labelPattern);
    if(!match)continue;
    const key=Object.keys(labels).find(key=>labels[key].some(label=>label.toLowerCase()===match[1].toLowerCase()));
    const next=lines[index+1];
    // Never borrow the next field's heading as a missing value.
    const value=match[2].trim()||((next&&!labelPattern.test(next))?next:'');
    if(key&&!values[key])values[key]=value;
  }
  const periodDates=values.period?.match(/\d{4}-\d{2}-\d{2}/g)||[];
  const date=value=>validDate(value||'')?value:'';
  return {start:date(values.start||periodDates[0]),end:date(values.end||periodDates[1]),owner:(values.owner||'').slice(0,120),nextAction:(values.nextAction||'').slice(0,300),nextDue:date(values.nextDue)};
}
export function uploadError(code,t) {
  const messages={
    'empty-file':['This file is empty. Choose a document with readable content.','هذا الملف فارغ. اختر مستندًا يحتوي على محتوى قابل للقراءة.'],
    'file-too-large':['This file exceeds 10 MB. Choose a smaller document.','يتجاوز الملف 10 ميغابايت. اختر مستندًا أصغر.'],
    'unsupported-file':['Choose a PDF, Word (.docx), TXT or Markdown (.md) document.','اختر ملف PDF أو Word (.docx) أو TXT أو Markdown (.md).'],
    'multiple-files':['Choose one document at a time.','اختر مستندًا واحدًا في كل مرة.'],
    'too-many-pages':['This PDF exceeds 100 pages. Choose a shorter document.','يتجاوز ملف PDF مئة صفحة. اختر مستندًا أقصر.'],
    'text-too-long':['This document contains too much text for this local review. Choose a shorter document.','يحتوي هذا المستند على نص يتجاوز حد المراجعة المحلية. اختر مستندًا أقصر.'],
    'no-text':['No readable text was found. Scanned PDFs need OCR; try a text-based PDF, DOCX or TXT file.','لم يُعثر على نص قابل للقراءة. تحتاج الملفات الممسوحة ضوئيًا إلى التعرف على النص؛ جرّب PDF نصيًا أو DOCX أو TXT.'],
    'password':['This PDF is password protected. Choose an unlocked copy.','ملف PDF محمي بكلمة مرور. اختر نسخة غير مقفلة.'],
    'read-failed':['We could not read this document. It may be damaged or use an unsupported format. Try another file.','تعذرت قراءة المستند. قد يكون تالفًا أو بتنسيق غير مدعوم. جرّب ملفًا آخر.'],
  };
  return t(...(messages[code]||messages['read-failed']));
}

export async function readUploadedFile(file) {
  const extension=checkUploadFile(file),buffer=await file.arrayBuffer();
  let text='',pages=null;
  if(extension==='pdf') {
    if(new TextDecoder().decode(buffer.slice(0,5))!=='%PDF-')throw new Error('read-failed');
    const pdf=await import('../public/vendor/pdfjs/pdf.min.mjs');
    pdf.GlobalWorkerOptions.workerSrc='/public/vendor/pdfjs/pdf.worker.min.mjs';
    const task=pdf.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,useWasm:false,useSystemFonts:true,disableFontFace:true});
    let passwordRequired=false;
    task.onPassword=()=>{passwordRequired=true;task.destroy().catch(()=>{});};
    let document;
    try {
      document=await task.promise;pages=document.numPages;
      if(pages>100)throw new Error('too-many-pages');
      const content=[];
      for(let index=1;index<=pages;index++) {
        const page=await document.getPage(index),items=await page.getTextContent();
        content.push(items.items.map(item=>typeof item.str==='string'?item.str+(item.hasEOL?'\n':' '):'').join(''));
      }
      text=content.join('\n\n');
    } catch(error) {
      if(passwordRequired||error.name==='PasswordException')throw new Error('password');
      throw error;
    } finally {await task.destroy();}
  } else if(extension==='docx') {
    const signature=new Uint8Array(buffer,0,Math.min(2,buffer.byteLength));
    if(signature[0]!==80||signature[1]!==75)throw new Error('read-failed');
    await import('../public/vendor/mammoth/mammoth.browser.min.js');
    const result=await globalThis.mammoth.extractRawText({arrayBuffer:buffer});
    text=result.value;
  } else {
    text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);
    if(text.includes('\0'))throw new Error('read-failed');
  }
  text=text.replace(/\u0000/g,'').trim();
  if(!text)throw new Error('no-text');
  if(text.length>250000)throw new Error('text-too-long');
  return {name:file.name,size:file.size,extension,text,pages,fields:fieldsFromText(text)};
}
