import { createHoldDocument, makeHoldReview, holdCounts } from './project-hold.js';
import { holdReport } from './project-hold-ui.js';
import { createArtifact, makeReview } from './artifact-review.js';
import { emptyUpload, VALIDATION_TEMPLATES, uploadTemplate, uploadError, uploadSetup, resolvedUploadTemplate } from './document-upload.js';

// The standalone validator is independent of assistant conversations and account sessions.
export const freshValidator = () => ({ selected:null, documents:{}, filter:'all', run:null, busy:null, uploads:[], upload:emptyUpload() });
export function addUploadedDocument(validator,file,templateId,id,project=null) {
  const template=uploadTemplate(templateId);
  if(!template||!file?.text)throw new Error('invalid-upload');
  if(templateId==='project-hold'&&!project)throw new Error('project-required');
  const artifact=createArtifact(id);artifact.fields={...file.fields};
  const upload={id,...file,templateId};
  validator.uploads.push(upload);
  validator.documents[id]=templateId==='project-hold'?createHoldDocument(id,project,upload):{artifact,reviews:[],draft:null,upload};
  return upload;
}

function documentUploadUI({t,icon,escape,validator,projects}) {
  const upload=validator.upload,file=upload.file,template=resolvedUploadTemplate(upload);
  const step=uploadSetup(upload,projects,validator.busy);
  const instructions={
    file:t(upload.error?'Choose a readable document to continue.':'Upload a document to start validation.',upload.error?'اختر مستندًا قابلًا للقراءة للمتابعة.':'ارفع مستندًا لبدء التحقق.'),
    template:t('Select a template for this document.','اختر نموذجًا لهذا المستند.'),
    project:t(projects.length?'Select the project to compare with this document.':'This account has no assigned project for Project Hold validation.',projects.length?'اختر المشروع للمقارنة مع هذا المستند.':'لا يوجد مشروع مسند لهذا الحساب للتحقق من تعليق المشروع.'),
    ready:t('Ready to validate with your selected template.','جاهز للتحقق باستخدام النموذج المحدد.'),
    reading:t('Reading the document. Your selections are preserved.','جارٍ قراءة المستند. تم الاحتفاظ باختياراتك.'),
    busy:t('Validation is in progress.','التحقق قيد التنفيذ.')
  };
  const actions={file:t('Upload document','رفع مستند'),template:t('Select template','اختيار النموذج'),project:t(projects.length?'Select project':'Switch demo account',projects.length?'اختيار المشروع':'تبديل الحساب التجريبي'),ready:t('Validate document','التحقق من المستند'),reading:t('Reading document…','جارٍ قراءة المستند…'),busy:t('Validating…','جارٍ التحقق…')};
  return `<section class="dv-upload-section" aria-labelledby="dv-upload-title"><div class="dv-section-heading"><h2 id="dv-upload-title">${t('Upload a document','رفع مستند')}</h2><span>${icon('shield')}${t('Processed in your browser','يُعالج في متصفحك')}</span></div><div class="dv-upload-layout"><div>
    <div class="dv-upload-zone ${upload.reading?'is-reading':''}" data-upload-zone><input id="validator-file" class="dv-file-input" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" ${upload.reading?'disabled':''} aria-label="${t('Choose a document to upload','اختر مستندًا لرفعه')}"><div aria-hidden="true">${icon('document')}<strong>${upload.reading?t('Reading your document…','جارٍ قراءة المستند…'):t('Drop your document here','أفلت مستندك هنا')}</strong><span>${t('PDF, Word (.docx), TXT or Markdown · Up to 10 MB','PDF أو Word (.docx) أو TXT أو Markdown · حتى 10 ميغابايت')}</span><span class="dv-choose-file">${t('Choose file','اختيار ملف')}</span></div></div>
    ${file?`<div class="dv-upload-file"><span class="dv-document-glyph">${icon('document')}</span><span><strong dir="auto">${escape(file.name)}</strong><small>${file.extension.toUpperCase()} · ${Math.max(1,Math.round(file.size/1024))} KB${file.pages?' · '+file.pages+' '+t(file.pages===1?'page':'pages','صفحات'):''} · ${t('Text extracted','تم استخراج النص')}</small></span><button class="icon-button small" data-action="validator-remove-upload" aria-label="${t('Remove selected file','إزالة الملف المحدد')}">${icon('close')}</button></div>`:''}
    ${upload.error?`<p id="dv-upload-error" class="dv-upload-error" role="alert">${icon('warning')}<span>${uploadError(upload.error,t)}</span></p>`:''}</div>
    <div class="dv-upload-settings">
      <div class="dv-upload-field">
        <label for="validator-template">${t('Template','النموذج')}</label>
        <select id="validator-template" ${upload.reading?'disabled':''}>
          <option value="auto" ${upload.templateId==='auto'?'selected':''}>${t('Auto-detect','اكتشاف تلقائي')}</option>
          ${VALIDATION_TEMPLATES.map(option=>`<option value="${option.id}" ${option.id===upload.templateId?'selected':''}>${t(...option.name)} · v${option.version}</option>`).join('')}
        </select>
      </div>
      ${template?.id==='project-hold'?`<div class="dv-upload-field">
        <label for="validator-project">${t('Related project','المشروع المرتبط')}</label>
        <select id="validator-project" aria-required="true" ${upload.reading?'disabled':''}>
          <option value="">${t('Select a project in your scope','اختر مشروعًا ضمن نطاقك')}</option>
          ${projects.map(project=>`<option value="${project.id}" ${project.id===upload.projectId?'selected':''}>${escape(t(...project.name))}</option>`).join('')}
        </select>
      </div>`:''}
      <div class="dv-upload-next">
        <button id="validator-submit" class="primary-button" data-action="${step==='project'&&!projects.length?'accounts':'validator-check-upload'}" aria-describedby="validator-setup-status" ${['reading','busy'].includes(step)?'disabled':''}>${icon(step==='file'?'plus':'huge-ai-scan-text')}${actions[step]}</button>
      </div>
    </div>
    <p id="validator-setup-status" class="dv-setup-status ${step==='ready'?'is-ready':''}" role="status">
      ${icon(step==='ready'?'check-circle':'help')}
      <span>${upload.templateId==='auto'&&file
        ? (template ? t('Detected template: ','النموذج المكتشف: ')+t(...template.name)+'. ' : t('Could not detect a supported template. ','تعذّر اكتشاف نموذج مدعوم. ')) : ''}${instructions[step]}</span>
    </p>
    </div></section>`;
}
export function validatorDocument(validator,id) {
  return validator.documents[id] ||= { artifact:createArtifact(id), reviews:[], draft:null };
}
export function checkDocument(document) {
  const review=document.kind==='project-hold'?makeHoldReview(document):makeReview(document.artifact,document.reviews.at(-1));
  document.reviews.push(review);
  return review;
}
export function saveDocument(document,fields) {
  const clean=Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,value.trim()]));
  if(JSON.stringify(clean)!==JSON.stringify(document.artifact.fields)) {
    document.artifact.fields=clean;
    document.artifact.revision++;
  }
  document.draft=null;
}

export function documentValidatorUI({t,icon,escape,documents,validator,definitions,canCreate=false,projects=[]}) {
  const badge=(label,type='neutral',symbol)=>`<span class="dv-badge ${type}">${symbol?icon(symbol):''}${label}</span>`;
  const counts=review=>review.kind==='project-hold'?{required:holdCounts(review).failed}:({required:Number(!review.checks.period)+Number(!review.checks.owner),suggested:Number(!review.checks.next),passed:Object.values(review.checks).filter(Boolean).length});
  const status=review=>!review?badge(t('Not checked','لم يُفحص')):validator.documents[review.docId]?.artifact.revision>review.revision?badge(t('Recheck needed','يلزم إعادة الفحص'),'required','refresh'):counts(review).required?badge(t('Needs revision','يحتاج إلى تعديل'),'required','warning'):badge(t('Required checks passed','اجتاز الفحوصات المطلوبة'),'passed','check-circle');
  const boundary=`<p class="dv-boundary">${icon('help')}${t('Local template field checks only. AI content review and live Synergy comparisons are not connected. Automated checks do not approve a document.','فحوصات محلية لحقول النموذج فقط. مراجعة المحتوى بالذكاء الاصطناعي والمقارنة المباشرة مع سينرجي غير متصلة. الفحوصات الآلية لا تعتمد المستند.')}</p>`;
  const descriptor=documents.find(document=>document.id===validator.selected);
  if(!descriptor) {
    const samples=documents.filter(item=>!item.upload);
    const uploads=documents.filter(item=>item.upload);
    const documentButton=item=>{
      const review=validator.documents[item.id]?.reviews.at(-1);
      const label=validator.busy===item.id
        ? badge(t('Checking…','جارٍ الفحص…'))
        : review ? status(review) : badge(t('Check sample','فحص النموذج'));
      return `<button class="dv-sample-button" data-action="validator-open" data-id="${escape(item.id)}">
        ${icon('document')}<strong dir="auto">${escape(item.name())}</strong>${label}${icon('chevron')}
      </button>`;
    };
    return `<section class="dv-page" aria-labelledby="validator-heading">
      <header class="dv-page-heading">
        <div><h1 id="validator-heading">${t('Validate a document','التحقق من مستند')}</h1><p>${t('Check a document against a demo template and review the findings.','افحص مستندًا مقابل نموذج تجريبي وراجع النتائج.')}</p></div>
      </header>
      <div class="dv-intake">
        ${documentUploadUI({t,icon,escape,validator,projects})}
        <section class="dv-samples" aria-labelledby="dv-library-title">
          <h2 id="dv-library-title">${t('Try a sample','جرّب نموذجًا')}</h2>
          ${samples.length
            ? `<div class="dv-sample-list">${samples.map(documentButton).join('')}</div>`
            : `<p class="dv-helper">${t('No sample documents are assigned to this account.','لا توجد مستندات تجريبية مسندة لهذا الحساب.')}</p><button class="secondary-button" data-action="accounts">${t('Switch demo account','تبديل الحساب التجريبي')}</button>`}
        </section>
      </div>
      ${uploads.length?`<section class="dv-samples dv-recent-uploads"><h2>${t('Recent uploads','الملفات المرفوعة مؤخرًا')}</h2><div class="dv-sample-list">${uploads.map(documentButton).join('')}</div></section>`:''}
      ${boundary}
    </section>`;
  }

  const document=validatorDocument(validator,descriptor.id);
  if(document.kind==='project-hold')return holdReport({document,descriptor,validator,t,icon,escape});
  const review=document.reviews.find(item=>item.run===validator.run)||document.reviews.at(-1);
  const busy=validator.busy===descriptor.id;
  const uploaded=document.upload;
  const selectedTemplate=uploaded&&uploadTemplate(uploaded.templateId);
  const templateLabel=selectedTemplate?escape(t(...selectedTemplate.name))+' · v'+selectedTemplate.version:t('Governance & Performance · v1.0','الحوكمة والأداء · 1.0');
  const extractedContent=uploaded?`<details class="dv-extracted-content"><summary>${icon('eye')}${t('View extracted text','عرض النص المستخرج')}${icon('chevron')}</summary><p>${t('Original uploaded text. Field corrections above do not change this source.','النص الأصلي المرفوع. لا تغيّر تعديلات الحقول أعلاه هذا المصدر.')}${uploaded.text.length>12000?' '+t('Showing the first 12,000 characters.','عرض أول 12,000 حرف.'):''}</p><pre dir="auto">${escape(uploaded.text.slice(0,12000))}</pre></details>`:'';
  const back=`<button class="text-button dv-back" data-action="validator-back">${icon('chevron')}${t('All documents','جميع المستندات')}</button>`;
  if(busy||!review)return `<section class="dv-page" aria-labelledby="validator-heading">${back}<header class="dv-page-heading"><div><h1 id="validator-heading">${escape(descriptor.name())}</h1><p>${templateLabel}</p></div></header><div class="dv-checking" role="status" aria-live="polite">${icon('huge-ai-scan-text')}<h2>${t('Checking the document','جارٍ فحص المستند')}</h2><p>${t('Reviewing the reporting period, owner and next step.','جارٍ مراجعة فترة التقرير والمالك والخطوة التالية.')}</p><div class="dv-loading-lines" aria-hidden="true"><span></span><span></span><span></span></div></div>${boundary}</section>`;
  const totals=counts(review),items=definitions(review.fields);
  const stale=document.artifact.revision>review.revision;
  const historical=review!==document.reviews.at(-1);
  const filter=validator.filter;
  const filtered=items.filter(item=>filter==='all'||(filter==='required'&&!review.checks[item.key]&&item.type==='required')||(filter==='suggested'&&!review.checks[item.key]&&item.type==='suggested')||(filter==='passed'&&review.checks[item.key]));
  const resolved=Object.keys(review.checks).filter(key=>review.previous?.[key]===false&&review.checks[key]).length;
  const previewNames=[t('Reporting period','فترة التقرير'),t('Accountable owner','المالك المسؤول'),t('Next steps','الخطوات التالية')];
  return `<section class="dv-page dv-report" aria-labelledby="validator-heading">${back}<header class="dv-page-heading"><div><h1 id="validator-heading">${escape(descriptor.name())}</h1><p>${escape(descriptor.meta())} <span class="dv-meta-divider">·</span> ${templateLabel}</p></div><div class="dv-report-actions"><button class="secondary-button" data-action="validator-edit" data-id="${descriptor.id}">${icon('edit')}${t('Edit document','تعديل المستند')}</button><button class="primary-button" data-action="validator-recheck" data-id="${descriptor.id}">${icon('refresh')}${t('Recheck','إعادة الفحص')}</button></div></header>
    <div class="dv-review-layout"><section class="dv-preview" aria-labelledby="dv-preview-title"><header><div>${icon('document')}<h2 id="dv-preview-title">${t('Document preview','معاينة المستند')}</h2></div><span>${t('Revision','النسخة')} ${review.revision}</span></header><p class="dv-preview-caption">${uploaded?t('Detected fields from uploaded text. Edits apply to this review, not your original file.','حقول مكتشفة من النص المرفوع. تُطبّق التعديلات على هذه المراجعة، ولا تغير الملف الأصلي.'):t('Structured sample content, not original file layout.','محتوى تجريبي منظم، وليس تخطيط الملف الأصلي.')}</p><div class="dv-paper"><p class="dv-eyebrow">${t('GOVERNANCE & PERFORMANCE','الحوكمة والأداء')}</p><h3>${escape(descriptor.name())}</h3>${items.map((item,index)=>`<section id="dv-preview-${item.key}" class="dv-preview-section ${review.checks[item.key]?'':'incomplete'}" tabindex="-1"><h4>${index===2?'5':index===1?'3':'1'}. ${previewNames[index]}</h4><p dir="auto">${escape(item.value)}</p>${!review.checks[item.key]?`<small>${icon(item.type==='required'?'warning':'idea')}${item.type==='required'?t('Required information is incomplete','المعلومات المطلوبة غير مكتملة'):t('A due date would help with follow-up','إضافة موعد تساعد على المتابعة')}</small>`:''}</section>`).join('')}</div>${extractedContent}</section>
    <section class="dv-findings-panel" aria-labelledby="dv-findings-title"><div class="dv-verdict ${totals.required?'needs-revision':'ready-review'}" role="status"><span class="dv-verdict-symbol">${icon(totals.required?'warning':'check-circle')}</span><div><h2>${totals.required?t('Changes needed before review','تعديلات مطلوبة قبل المراجعة'):t('Ready for human review','جاهز للمراجعة البشرية')}</h2><p>${totals.required?t('Complete the required fields, then recheck the saved document.','أكمل الحقول المطلوبة، ثم أعد فحص المستند المحفوظ.'):totals.suggested?t('Required checks passed. An optional improvement is still available.','اجتاز الفحوصات المطلوبة. لا يزال هناك تحسين اختياري.'):t('All three field checks passed. Continue with your normal review process.','اجتاز فحوصات الحقول الثلاثة. تابع إجراءات المراجعة المعتادة.')}</p></div>${review.previous?`<span class="dv-resolved">${resolved} ${t('resolved this run','تمت معالجته في هذا الفحص')}</span>`:''}</div>
    <div class="dv-report-toolbar"><div class="dv-results-counts"><span class="has-issues">${totals.required} ${t('required','مطلوب')}</span><span>${totals.suggested} ${t('suggested','مقترح')}</span><span class="is-clear">${totals.passed} ${t('passed','اجتاز')}</span></div><label class="dv-run-select">${icon('history')}<span class="sr-only">${t('Checked version','النسخة المفحوصة')}</span><select id="validator-run">${document.reviews.slice().reverse().map(item=>`<option value="${item.run}" ${item.run===review.run?'selected':''}>${t('Check','الفحص')} ${item.run} · ${t('Revision','النسخة')} ${item.revision}${item===document.reviews.at(-1)?t(' (latest)',' (الأحدث)'):''}</option>`).join('')}</select></label></div>
    ${stale?`<div class="dv-state-note">${icon('history')}<span>${historical?t('You are viewing an earlier check. The preview shows the values checked at that time.','تعرض فحصًا سابقًا. تعرض المعاينة القيم التي فُحصت آنذاك.'):t('Your draft has newer changes. Recheck to update these findings.','تحتوي المسودة على تغييرات أحدث. أعد الفحص لتحديث الملاحظات.')}</span>${historical?`<button class="text-button" data-action="validator-latest">${t('View latest check','عرض أحدث فحص')}</button>`:''}</div>`:historical?`<div class="dv-state-note">${icon('history')}${t('Earlier check. Rechecking always uses your latest saved draft.','فحص سابق. تستخدم إعادة الفحص أحدث مسودة محفوظة.')}</div>`:''}
    <details class="dv-review-summary" open><summary>${icon('document')}${t('Reviewer summary','ملخص للمراجع')}${icon('chevron')}</summary><p>${totals.required?t('This revision needs required information before review. Address the open findings and check the document again.','تحتاج هذه النسخة إلى استكمال معلومات مطلوبة قبل المراجعة. عالج الملاحظات المفتوحة وأعد فحص المستند.'):t('The reporting period and accountable owner are present. Review the content for accuracy and follow the normal approval process.','فترة التقرير والمالك المسؤول محددان. راجع دقة المحتوى واتبع إجراءات الموافقة المعتادة.')}</p><p>${t('These checks verify three labeled fields only. They do not verify the document against live Synergy records.','تتحقق هذه الفحوصات من ثلاثة حقول ذات عناوين محددة فقط، ولا تقارن المستند بسجلات سينرجي الفعلية.')}</p></details><div class="dv-section-heading"><h2 id="dv-findings-title">${t('Validation findings','نتائج التحقق')}</h2><span>${t('3 checks','3 فحوصات')}</span></div><div class="dv-filters" role="group" aria-label="${t('Filter findings','تصفية الملاحظات')}">${[['all',t('All','الكل'),3],['required',t('Required','مطلوب'),totals.required],['suggested',t('Suggestions','اقتراحات'),totals.suggested],['passed',t('Passed','اجتاز'),totals.passed]].map(([key,label,count])=>`<button data-action="validator-filter" data-filter="${key}" aria-pressed="${filter===key}">${label}<span>${count}</span></button>`).join('')}</div>
    <div class="dv-findings">${filtered.length?filtered.map(item=>{const passed=review.checks[item.key],newlyResolved=passed&&review.previous?.[item.key]===false;return `<details class="dv-finding" data-validator-detail="${item.key}"><summary><span class="dv-finding-glyph ${passed?'passed':item.type}">${icon(passed?'check-circle':item.type==='required'?'warning':'idea')}</span><span class="dv-finding-copy"><strong>${passed?item.passed:item.missing}</strong><small>${item.location}</small></span>${badge(passed?(newlyResolved?t('Resolved','تمت المعالجة'):t('Passed','اجتاز')):item.type==='required'?t('Required','مطلوب'):t('Suggestion','اقتراح'),passed?'passed':item.type)}${icon('chevron')}</summary><div class="dv-finding-detail"><p>${item.rule}</p><div class="dv-checked-value"><span>${t('Checked content','المحتوى المفحوص')}</span><p dir="auto">${escape(item.value)}</p></div><div><button class="text-button" data-action="validator-locate" data-key="${item.key}">${icon('eye')}${t('Locate in preview','تحديد في المعاينة')}</button><button class="text-button" data-action="validator-edit" data-id="${descriptor.id}" data-field="${item.field}">${icon('edit')}${t('Edit section','تعديل القسم')}</button></div></div></details>`;}).join(''):`<div class="dv-filter-empty">${icon('check-circle')}<h3>${t('No findings in this filter','لا توجد نتائج ضمن هذا التصنيف')}</h3><p>${t('Select All to see the complete check results.','اختر الكل لعرض جميع نتائج الفحص.')}</p></div>`}</div>
    </section></div>${boundary}</section>`;
}
