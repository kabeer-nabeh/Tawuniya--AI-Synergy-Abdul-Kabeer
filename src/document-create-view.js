// Create a document: setup, guided conversation, document outline, ready card and preview.
import { AUTHORING_TEMPLATES, templateOf, askedFields, synergyFields, pendingField, isComplete, progress, checkDraft, fileName } from './document-create.js';

export function authoringUI({ t, icon, escape, mark, a, projects, typing }) {
  const L = pair => t(...pair);
  const ar = t('en', 'ar') === 'ar';
  const date = iso => { if (!iso) return ''; const d = new Date(iso + 'T00:00:00Z'); return Number.isFinite(d.getTime()) ? d.toLocaleDateString(ar ? 'ar-SA-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : escape(iso); };
  const when = ms => new Date(ms).toLocaleString(ar ? 'ar-SA-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const projectOf = id => projects.find(p => p.id === id);
  const active = () => a.drafts.find(d => d.id === a.active && projectOf(d.projectId)) || null;
  const minutes = tpl => Math.max(2, Math.round(askedFields(tpl).length * 0.6));

  // ---------- Values ----------
  const optionLabel = (options, id) => { const o = options.find(x => x.id === id); return o ? L(o.label) : escape(id); };
  function valueHtml(field, value) {
    if (value == null) return '';
    if (field.type === 'date') return date(value);
    if (field.type === 'choice') return optionLabel(field.options, value);
    if (field.type === 'table') return `<div class="ac-table-wrap"><table class="ac-table"><thead><tr>${field.columns.map(c => `<th scope="col">${L(c.label)}</th>`).join('')}</tr></thead><tbody>${value.map(row => `<tr>${field.columns.map(c => `<td>${c.type === 'date' ? date(row[c.id]) : c.type === 'choice' ? (row[c.id] ? optionLabel(c.options, row[c.id]) : '') : escape(row[c.id] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return `<span dir="auto" class="ac-pre">${escape(value)}</span>`;
  }
  const synergyValue = (field, project) => { const v = field.value(project); return Array.isArray(v) ? L(v) : escape(v); };

  // ---------- Setup ----------
  function setupPage() {
    const tplId = templateOf(a.setup.templateId) ? a.setup.templateId : AUTHORING_TEMPLATES[0].id;
    const tpl = templateOf(tplId);
    const projectId = projectOf(a.setup.projectId) ? a.setup.projectId : '';
    const drafts = a.drafts.filter(d => projectOf(d.projectId));
    const card = item => `<button class="ac-template ${item.id === tplId ? 'selected' : ''}" data-action="ac-template" data-id="${item.id}" aria-pressed="${item.id === tplId}">
      <span class="ac-template-top"><strong>${L(item.name)}</strong><span class="ac-format">${icon('document')}${item.format}</span></span>
      <span class="ac-template-purpose">${L(item.purpose)}</span>
      <span class="ac-template-meta">${t('Synergy artifact', 'مستند سينرجي')}: <b>${L(item.artifact)}</b> · ${L(item.artifactMeta)}</span>
      <span class="ac-template-meta">${t(`${askedFields(item).length} questions · about ${minutes(item)} min`, `${askedFields(item).length} أسئلة · نحو ${minutes(item)} دقائق`)}</span></button>`;
    const list = drafts.length ? `<section class="ac-drafts" aria-labelledby="ac-drafts-title"><h2 id="ac-drafts-title" class="ac-section-title">${t('Your documents', 'مستنداتك')}</h2><ul>${drafts.map(d => { const tp = templateOf(d.templateId), pr = progress(d), done = isComplete(d); return `<li><span class="ac-draft-icon">${icon('document')}</span><span class="ac-draft-copy"><strong>${L(tp.name)} · ${L(projectOf(d.projectId).name)}</strong><small>${done ? t('Ready to download', 'جاهز للتنزيل') : t(`In progress · ${pr.done} of ${pr.total} parts`, `قيد الإعداد · ${pr.done} من ${pr.total} أجزاء`)} · ${when(d.updatedAt)}</small></span><span class="ac-status ${done ? 'ready' : 'progress'}">${done ? t('Ready', 'جاهز') : t('Draft', 'مسودة')}</span><button class="secondary-button" data-action="ac-open" data-id="${d.id}">${done ? t('Open', 'فتح') : t('Continue', 'متابعة')}</button><button class="icon-button small" data-action="ac-delete" data-id="${d.id}" aria-label="${t('Delete', 'حذف')} ${L(tp.name)}">${icon('close')}</button></li>`; }).join('')}</ul></section>` : '';
    if (!projects.length) return `<section class="ac-page ac-setup" aria-labelledby="ac-title">${heading()}<div class="scope-empty">${icon('briefcase')}<h3>${t('No projects to create documents for', 'لا توجد مشاريع لإنشاء مستندات لها')}</h3><p>${t('Documents are created for projects assigned to you, and this demo account has none. Switch to Afnan Rayyani to try the flow.', 'تُنشأ المستندات للمشاريع المسندة إليك، ولا يوجد لدى هذا الحساب التجريبي أي مشروع. بدّل إلى أفنان رياني لتجربة الخطوات.')}</p><button class="text-button" data-action="accounts">${t('Switch demo account', 'تبديل الحساب التجريبي')}${icon('right')}</button></div></section>`;
    return `<section class="ac-page ac-setup" aria-labelledby="ac-title">${heading()}
      <div class="ac-step"><h2 class="ac-section-title"><span>1</span>${t('Choose a template', 'اختر نموذجًا')}</h2><div class="ac-templates">${AUTHORING_TEMPLATES.map(card).join('')}</div></div>
      <div class="ac-step"><h2 class="ac-section-title"><span>2</span><label for="ac-project">${t('Choose the project', 'اختر المشروع')}</label></h2>
        <select id="ac-project" class="ac-select"><option value="">${t('Choose a project…', 'اختر مشروعًا…')}</option>${projects.map(p => `<option value="${p.id}" ${p.id === projectId ? 'selected' : ''}>${L(p.name)} · ${L(p.sectorLabel)}</option>`).join('')}</select>
        ${projectId ? `<div class="ac-prefill">${icon('check-circle')}<div><strong>${t('From Synergy I’ll fill in', 'سأملأ من سينرجي')}</strong><span>${synergyFields(tpl).map(f => `${L(f.label)}: ${synergyValue(f, projectOf(projectId))}`).join(' · ')}</span></div></div>` : `<p class="ac-help">${t('Only projects assigned to you are listed.', 'تظهر المشاريع المسندة إليك فقط.')}</p>`}
      </div>
      <div class="ac-start"><p class="ac-help">${t('Draft templates for the proof of concept, to be replaced by the EPMO Excellence Team’s approved templates.', 'نماذج تجريبية لإثبات المفهوم، وستُستبدل بالنماذج المعتمدة من فريق تميز إدارة المشاريع.')}</p><button class="primary-button" data-action="ac-start" ${projectId ? '' : 'disabled'}>${icon('edit')}${t('Start document', 'ابدأ المستند')}</button></div>
      ${list}</section>`;
  }
  const heading = () => `<header class="ac-heading"><p class="page-kicker">${t('AI ASSISTANCE', 'المساعدة الذكية')}</p><h1 id="ac-title">${t('Create a document', 'إنشاء مستند')}</h1><p>${t('Pick an approved template and a project. I’ll fill in what Synergy already knows and ask you for the rest, one part at a time.', 'اختر نموذجًا معتمدًا ومشروعًا. سأملأ ما تعرفه سينرجي وأسألك عن الباقي جزءًا بعد جزء.')}</p></header>`;

  // ---------- Conversation ----------
  const bot = (body, cls = '') => `<article class="ac-msg ${cls}"><div class="ac-who">${mark()}<strong>${t('AI Assistance', 'المساعدة الذكية')}</strong></div><div class="ac-body">${body}</div></article>`;
  const me = body => `<div class="user-turn ac-user" dir="auto">${body}</div>`;
  function intro(draft, tpl, project) {
    const asked = askedFields(tpl), required = asked.filter(f => f.required).length;
    return bot(`<p>${t(`I’ll prepare <strong>${L(tpl.name)}</strong> for <strong>${L(project.name)}</strong> in the approved template (${tpl.format}).`, `سأعدّ <strong>${L(tpl.name)}</strong> لـ <strong>${L(project.name)}</strong> وفق النموذج المعتمد (${tpl.format}).`)}</p><p>${t('From Synergy I filled in:', 'ملأت من سينرجي:')}</p><ul>${synergyFields(tpl).map(f => `<li>${L(f.label)}: <strong>${synergyValue(f, project)}</strong></li>`).join('')}</ul><p>${t(`I need ${asked.length} more items from you (${required} required). You can skip optional ones and change any answer from the outline.`, `أحتاج إلى ${asked.length} عناصر أخرى منك (${required} مطلوبة). يمكنك تخطي الاختيارية وتغيير أي إجابة من المخطط.`)}</p>`);
  }
  const question = field => `<p class="ac-q"><strong>${L(field.label)}</strong>${field.required ? '' : ` <span class="ac-optional">${t('Optional', 'اختياري')}</span>`}</p><p>${L(field.question)}</p>`;
  function transcript(draft, tpl) {
    return draft.log.map(entry => {
      const field = tpl.fields.find(f => f.id === entry.fieldId);
      const lead = entry.kind === 'edit' ? `<p class="ac-note">${t(`Updating ${L(field.label).toLowerCase()}.`, `تحديث ${L(field.label)}.`)}</p>` : '';
      return bot(lead + question(field), 'is-past') + (entry.kind === 'skip' ? me(`<span class="ac-skip">${t('Skipped', 'تم التخطي')}</span>`) : me(valueHtml(field, entry.value))) + (entry.kind === 'edit' ? bot(`<p>${icon('check-circle')} ${t('Updated. The document and its template check now use the new answer.', 'تم التحديث. يستخدم المستند وفحص النموذج الإجابة الجديدة الآن.')}</p>`, 'is-ack') : '');
    }).join('');
  }
  function control(draft, field, project) {
    const error = draft.error ? `<p class="ac-error" role="alert">${icon('warning')}${L(draft.error)}</p>` : '';
    const skip = field.required ? '' : `<button class="text-button" data-action="ac-skip">${t('Skip', 'تخطَّ')}</button>`;
    const current = draft.answers[field.id];
    if (field.type === 'choice') return `<div class="ac-options" role="group" aria-label="${L(field.label)}">${field.options.map((o, i) => `<button class="ac-option ${current === o.id ? 'selected' : ''}" data-action="ac-choose" data-value="${o.id}"><span>${i + 1}</span>${L(o.label)}</button>`).join('')}</div>${error}<div class="ac-actions">${skip}</div>`;
    if (field.type === 'date') return `<div class="ac-date-row"><label class="sr-only" for="ac-date">${L(field.label)}</label><input type="date" id="ac-date" value="${escape(current || '')}"><button class="primary-button" data-action="ac-date">${t('Use this date', 'استخدم هذا التاريخ')}</button></div>${field.dates ? `<div class="ac-chips">${field.dates(project).map(([iso, label]) => `<button class="ac-chip" data-action="ac-date-pick" data-value="${iso}">${L(label)} · ${date(iso)}</button>`).join('')}</div>` : ''}${error}<div class="ac-actions">${skip}</div>`;
    if (field.type === 'table') {
      const rows = draft.table && draft.table.length ? draft.table : [{}];
      const cell = (c, row, r) => { const v = row[c.id] || '', id = `ac-cell-${r}-${c.id}`, lbl = `${L(c.label)} ${t('row', 'الصف')} ${r + 1}`; if (c.type === 'choice') return `<select data-cell="${r}:${c.id}" aria-label="${lbl}"><option value="">—</option>${c.options.map(o => `<option value="${o.id}" ${o.id === v ? 'selected' : ''}>${L(o.label)}</option>`).join('')}</select>`; return `<input id="${id}" data-cell="${r}:${c.id}" type="${c.type === 'date' ? 'date' : 'text'}" value="${escape(v)}" aria-label="${lbl}" dir="auto">`; };
      return `<div class="ac-table-wrap ac-editor"><table class="ac-table"><thead><tr>${field.columns.map(c => `<th scope="col">${L(c.label)}${c.required ? '<span class="ac-req" aria-label="required">*</span>' : ''}</th>`).join('')}<th><span class="sr-only">${t('Remove', 'إزالة')}</span></th></tr></thead><tbody>${rows.map((row, r) => `<tr>${field.columns.map(c => `<td>${cell(c, row, r)}</td>`).join('')}<td><button class="icon-button small" data-action="ac-row-remove" data-index="${r}" aria-label="${t(`Remove row ${r + 1}`, `إزالة الصف ${r + 1}`)}">${icon('close')}</button></td></tr>`).join('')}</tbody></table></div>${error}<div class="ac-actions"><button class="secondary-button" data-action="ac-row-add">${icon('plus')}${t('Add row', 'إضافة صف')}</button><button class="secondary-button" data-action="ac-suggest">${icon('assistant')}${t('Suggest rows from Synergy', 'اقترح صفوفًا من سينرجي')}</button><button class="primary-button" data-action="ac-table-submit">${t('Submit table', 'إرسال الجدول')}</button>${skip}</div>`;
    }
    const chips = field.suggestions ? field.suggestions(project) : [];
    return `${chips.length ? `<div class="ac-chips">${chips.map(s => `<button class="ac-chip" data-action="${field.long ? 'ac-fill' : 'ac-use'}" data-value="${escape(s)}" dir="auto">${escape(s.length > 70 ? s.slice(0, 68) + '…' : s)}</button>`).join('')}</div>` : ''}${error}<p class="ac-hint">${field.long ? t('Type your answer below. Suggestions fill the message box so you can adjust them.', 'اكتب إجابتك أدناه. تملأ الاقتراحات مربع الرسالة لتعديلها.') : t('Type your answer below or pick a suggestion.', 'اكتب إجابتك أدناه أو اختر اقتراحًا.')}</p><div class="ac-actions">${skip}</div>`;
  }
  function readyCard(draft, tpl, project) {
    const check = checkDraft(draft), name = fileName(draft, project.name[0]);
    const label = !check.compliant ? t('Not compliant', 'غير مطابق') : check.issues.length ? t('Compliant with suggestions', 'مطابق مع اقتراحات') : t('Compliant', 'مطابق');
    return bot(`<p class="ac-ready-title">${icon('check-circle')}${t(`Your <strong>${L(tpl.name)}</strong> is ready`, `<strong>${L(tpl.name)}</strong> جاهز`)}</p><p class="ac-file">${icon('document')}<span dir="ltr">${escape(name)}</span></p>
      <div class="ac-check ${check.issues.length ? 'has-issues' : ''}"><span class="ac-score">${label} · ${check.score}/100</span><span>${t('Template check', 'فحص النموذج')}</span></div>
      ${check.issues.length ? `<ul class="ac-issues">${check.issues.map(i => `<li class="${i.level}"><span>${L(i.text)}</span><button class="text-button" data-action="ac-edit" data-id="${i.fieldId}">${i.level === 'suggestion' ? t('Add', 'إضافة') : t('Review', 'مراجعة')}</button></li>`).join('')}</ul>` : ''}
      <p>${t(`It needs validation by the <strong>${L(tpl.validation)}</strong> and approval by the <strong>${L(tpl.approval)}</strong>.`, `يحتاج إلى تحقق من <strong>${L(tpl.validation)}</strong> واعتماد من <strong>${L(tpl.approval)}</strong>.`)}</p>
      <div class="ac-ready-actions"><button class="primary-button" data-action="ac-preview">${icon('eye')}${t('Preview document', 'معاينة المستند')}</button><button class="secondary-button" data-action="ac-download">${icon('download')}${t('Download Word (.doc)', 'تنزيل Word (.doc)')}</button>${tpl.validatorTemplate ? `<button class="secondary-button" data-action="ac-validate">${icon('shield')}${t('Check in validator', 'افحص في المدقق')}</button>` : ''}</div>
      <p class="ac-hint">${t('Want to change something? Use Edit in the outline, or type edit and the part name, for example “edit deliverables”.', 'تريد تغيير شيء؟ استخدم تعديل في المخطط، أو اكتب تعديل واسم الجزء.')}</p>`, 'is-ready');
  }
  function outline(draft, tpl, project) {
    const pending = pendingField(draft), pr = progress(draft);
    const row = f => {
      if (f.type === 'synergy') return `<li class="from-synergy"><span class="ac-dot" aria-hidden="true">${icon('check')}</span><span><strong>${L(f.label)}</strong><small>${t('From Synergy', 'من سينرجي')}</small></span></li>`;
      const answered = f.id in draft.answers, skipped = draft.skipped.includes(f.id), current = pending?.id === f.id;
      const state = current ? t('Now', 'الآن') : answered ? t('Done', 'مكتمل') : skipped ? t('Skipped', 'تم التخطي') : f.required ? t('Required', 'مطلوب') : t('Optional', 'اختياري');
      return `<li class="${current ? 'current' : answered ? 'done' : skipped ? 'skipped' : 'todo'}"><span class="ac-dot" aria-hidden="true">${answered ? icon('check') : ''}</span><span><strong>${L(f.label)}</strong><small>${state}</small></span>${(answered || skipped) && !current ? `<button class="text-button" data-action="ac-edit" data-id="${f.id}" aria-label="${t('Edit', 'تعديل')} ${L(f.label)}">${skipped ? t('Add', 'إضافة') : t('Edit', 'تعديل')}</button>` : ''}</li>`;
    };
    return `<aside class="ac-outline" aria-label="${t('Document outline', 'مخطط المستند')}"><div class="ac-outline-head"><strong>${t('Document outline', 'مخطط المستند')}</strong><span>${pr.done}/${pr.total}</span></div><div class="ac-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${pr.total}" aria-valuenow="${pr.done}" aria-label="${t('Parts completed', 'الأجزاء المكتملة')}"><span style="width:${Math.round(pr.done / pr.total * 100)}%"></span></div><ol>${tpl.fields.map(row).join('')}</ol></aside>`;
  }
  function chatPage(draft) {
    const tpl = templateOf(draft.templateId), project = projectOf(draft.projectId), pending = pendingField(draft), done = !pending;
    const live = pending ? bot((draft.editing ? `<p class="ac-note">${t('Change your answer and send it again.', 'غيّر إجابتك وأرسلها مجددًا.')}</p>` : '') + question(pending) + control(draft, pending, project), 'is-current') : readyCard(draft, tpl, project);
    const notice = draft.notice ? bot(`<p>${L(draft.notice)}</p>`, 'is-ack') : '';
    const placeholder = !pending ? t('Type “edit” and a part name to change it…', 'اكتب “تعديل” واسم الجزء لتغييره…') : pending.type === 'table' ? t('Or type rows here, one per line: name | description | date | owner…', 'أو اكتب الصفوف هنا، صف في كل سطر: الاسم | الوصف | التاريخ | المالك…') : pending.type === 'choice' ? t('Choose above, or type the option…', 'اختر أعلاه أو اكتب الخيار…') : pending.type === 'date' ? t('Pick a date above, or type it as DD/MM/YYYY…', 'اختر تاريخًا أعلاه أو اكتبه يوم/شهر/سنة…') : t('Your answer…', 'إجابتك…');
    return `<section class="ac-page ac-chat" aria-labelledby="ac-chat-title">
      <header class="ac-chat-head"><button class="text-button" data-action="ac-back">${icon('left')}${t('All documents', 'كل المستندات')}</button><div class="ac-chat-title"><h1 id="ac-chat-title">${L(tpl.name)} · ${L(project.name)}</h1><span class="ac-status ${done ? 'ready' : 'progress'}">${done ? t('Ready', 'جاهز') : t('Draft', 'مسودة')}</span></div><span class="ac-format">${icon('document')}${tpl.format}</span><button class="secondary-button" data-action="ac-preview">${icon('eye')}${done ? t('Preview', 'معاينة') : t('Preview draft', 'معاينة المسودة')}</button></header>
      <div class="ac-chat-body"><div class="ac-thread"><div class="ac-messages" aria-live="polite">${intro(draft, tpl, project)}${transcript(draft, tpl)}${notice}${typing ? `<div class="loading ac-typing" role="status">${mark()}<span class="loading-dots"><i></i><i></i><i></i></span><span class="sr-only">${t('Preparing the next question…', 'جارٍ تجهيز السؤال التالي…')}</span></div>` : live}</div>
        <form id="ac-composer" class="ac-composer"><label class="sr-only" for="ac-message">${t('Message', 'رسالة')}</label><textarea id="ac-message" dir="auto" rows="${pending?.long || pending?.type === 'table' ? 3 : 2}" placeholder="${placeholder}" ${typing ? 'disabled' : ''}>${escape(a.composer || '')}</textarea><div class="ac-composer-foot"><span>${pending && !pending.required ? t('skip', 'تخطَّ') + ' · ' : ''}${t('edit &lt;part&gt;', 'تعديل &lt;الجزء&gt;')}</span><button type="submit" class="send-button" aria-label="${t('Send', 'إرسال')}" ${typing || !(a.composer || '').trim() ? 'disabled' : ''}>${icon('arrow')}</button></div></form></div>
        ${outline(draft, tpl, project)}</div></section>`;
  }

  // ---------- Document (preview sheet and download share this markup) ----------
  function sheet(draft) {
    const tpl = templateOf(draft.templateId), project = projectOf(draft.projectId), check = checkDraft(draft), done = isComplete(draft);
    const todo = `<span class="doc-todo">${t('To be completed', 'قيد الإكمال')}</span>`;
    const meta = synergyFields(tpl).map(f => `<tr><th scope="row">${L(f.label)}</th><td>${synergyValue(f, project)}</td></tr>`).join('');
    const sections = askedFields(tpl).map((f, i) => `<section class="doc-section"><h3>${i + 1}. ${L(f.label)}</h3>${f.id in draft.answers ? `<div class="doc-value">${valueHtml(f, draft.answers[f.id])}</div>` : draft.skipped.includes(f.id) ? `<p class="doc-na">${t('Not provided', 'غير مُقدَّم')}</p>` : todo}</section>`).join('');
    return `<article class="doc-sheet" dir="${ar ? 'rtl' : 'ltr'}"><header class="doc-head"><img src="/public/tawuniya-logo.png" alt="Tawuniya" width="120" height="36"><div><p class="doc-kicker">${L(tpl.artifact)} · ${L(tpl.artifactMeta)}</p><h2>${L(tpl.name)}</h2><p class="doc-sub">${L(project.name)}</p></div></header><table class="doc-meta"><tbody>${meta}<tr><th scope="row">${t('Prepared', 'تاريخ الإعداد')}</th><td>${new Date(draft.updatedAt).toLocaleDateString(ar ? 'ar-SA-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr><tr><th scope="row">${t('Template', 'النموذج')}</th><td>${L(tpl.name)} v${tpl.version} (${t('draft for the proof of concept', 'مسودة لإثبات المفهوم')})</td></tr></tbody></table>${sections}<footer class="doc-foot"><p>${t(`Validation: ${L(tpl.validation)} · Approval: ${L(tpl.approval)}`, `التحقق: ${L(tpl.validation)} · الاعتماد: ${L(tpl.approval)}`)}</p><p>${done ? t(`Template check: ${check.score}/100. Prepared with AI Synergy for human review.`, `فحص النموذج: ${check.score}/100. أُعدّ باستخدام AI Synergy للمراجعة البشرية.`) : t('Draft: some parts are still to be completed.', 'مسودة: بعض الأجزاء لم تكتمل بعد.')}</p></footer></article>`;
  }
  function preview() {
    const draft = active();
    if (!draft) return '';
    const done = isComplete(draft);
    return `<div class="ac-preview-bar">${done ? '' : `<p class="ac-preview-note">${icon('warning')}${t('This is a draft. Parts marked “To be completed” are still open.', 'هذه مسودة. الأجزاء المعلّمة "قيد الإكمال" لم تكتمل بعد.')}</p>`}<button class="primary-button" data-action="ac-download" ${done ? '' : 'disabled'}>${icon('download')}${t('Download Word (.doc)', 'تنزيل Word (.doc)')}</button>${done ? '' : `<span class="ac-help">${t('Download unlocks when all required parts are done.', 'يتاح التنزيل عند اكتمال الأجزاء المطلوبة.')}</span>`}</div><div class="ac-preview-canvas">${sheet(draft)}</div>`;
  }
  // Word opens an HTML file saved with a .doc extension; the styles keep the layout of the preview.
  function download() {
    const draft = active();
    if (!draft || !isComplete(draft)) return null;
    const project = projectOf(draft.projectId);
    const css = 'body{font-family:Calibri,Arial,sans-serif;color:#1f1b2e;font-size:11pt}h2{font-size:18pt;margin:4pt 0}h3{font-size:12pt;margin:14pt 0 4pt;color:#3d2a8c}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d9d4e8;padding:5pt 7pt;text-align:start;vertical-align:top}thead th,.doc-meta th{background:#f1eefb}.doc-kicker,.doc-sub,.doc-foot{color:#6b6680;font-size:9pt}.doc-head img{display:none}.doc-na,.doc-todo{color:#8a859c;font-style:italic}';
    const html = `<!doctype html><html lang="${ar ? 'ar' : 'en'}"><head><meta charset="utf-8"><title>${escape(L(templateOf(draft.templateId).name))}</title><style>${css}</style></head><body>${sheet(draft)}</body></html>`;
    return { filename: fileName(draft, project.name[0]), content: '﻿' + html };
  }

  return { page: () => { const d = active(); return d ? chatPage(d) : setupPage(); }, preview, download, active, projectOf };
}
