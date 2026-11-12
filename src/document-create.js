// Guided document creation (UC01 · Create a project document).
// Pure flow logic: approved templates, the question sequence, typed-answer parsing and the template check.
// Values from Synergy are prefilled; everything else is asked one part at a time in the conversation.
import { validDate } from './artifact-review.js';

export const AUTHORING_AS_OF = '2026-10-31';
const P = (en, ar) => [en, ar];

const statusOptions = [
  { id: 'accepted', label: P('Accepted', 'مقبول') },
  { id: 'awaiting', label: P('Delivered, awaiting acceptance', 'مُسلّم بانتظار القبول') },
  { id: 'progress', label: P('In progress', 'قيد التنفيذ') },
];
const milestoneOptions = [
  { id: 'done', label: P('Done', 'مكتمل') },
  { id: 'track', label: P('On track', 'ضمن المسار') },
  { id: 'delayed', label: P('Delayed', 'متأخر') },
];
const manager = project => project.owner;

export const AUTHORING_TEMPLATES = [
  {
    id: 'deliverables', version: '0.9', format: 'Word',
    name: P('Approved Deliverables', 'الإنجازات المعتمدة'),
    artifact: P('Proof of Deliverables', 'إثبات الإنجازات'),
    artifactMeta: P('MI artifact 5 of 10 · Execution', 'مستند MI رقم 5 من 10 · التنفيذ'),
    purpose: P('Record the deliverables the business has accepted, with evidence of completion.', 'سجّل الإنجازات التي قبلها قطاع الأعمال مع دليل الإكمال.'),
    validation: P('EPMO Program Manager', 'مدير البرنامج في إدارة المشاريع'),
    approval: P('Respective EPMO Director (Strategy Execution or Corporate PMO)', 'مدير إدارة المشاريع المختص (تنفيذ الاستراتيجية أو مكتب المشاريع المؤسسي)'),
    fields: [
      { id: 'projectName', type: 'synergy', label: P('Project name', 'اسم المشروع'), value: p => p.name },
      { id: 'sponsor', type: 'synergy', label: P('Project sponsor', 'راعي المشروع'), value: p => p.sectorLabel },
      { id: 'manager', type: 'synergy', label: P('Project manager', 'مدير المشروع'), value: manager },
      { id: 'programManager', type: 'text', required: false, label: P('Program manager', 'مدير البرنامج'), question: P('Who is the EPMO program manager for this project?', 'من مدير البرنامج في إدارة المشاريع لهذا المشروع؟'), suggestions: () => ['Mohammed Said', 'Sara Alqahtani'] },
      {
        id: 'deliverables', type: 'table', required: true, label: P('Deliverables', 'الإنجازات'),
        question: P('List each approved deliverable: name, description, date, owner, date updated and status (where the evidence of completion is).', 'اذكر كل إنجاز معتمد: الاسم والوصف والتاريخ والمالك وتاريخ التحديث والحالة (مكان دليل الإكمال).'),
        columns: [
          { id: 'name', label: P('Deliverable', 'الإنجاز'), required: true },
          { id: 'description', label: P('Description', 'الوصف'), required: true },
          { id: 'date', label: P('Deliverable date', 'تاريخ الإنجاز'), type: 'date', required: true },
          { id: 'owner', label: P('Owner', 'المالك'), required: true },
          { id: 'updated', label: P('Date updated', 'تاريخ التحديث'), type: 'date' },
          { id: 'status', label: P('Status', 'الحالة'), type: 'choice', options: statusOptions, required: true },
        ],
        suggest: p => [
          { name: 'Requirements sign-off', description: 'Business requirements approved by the sponsor', date: '2026-09-15', owner: p.owner[0], updated: '2026-10-13', status: 'accepted' },
          { name: 'Pilot release', description: 'First release to pilot users with training', date: '2026-10-28', owner: p.owner[0], updated: '2026-10-30', status: 'awaiting' },
        ],
      },
      { id: 'acceptance', type: 'choice', required: true, label: P('Business acceptance', 'قبول قطاع الأعمال'), question: P('Has the business owner accepted these deliverables?', 'هل قبل مالك الأعمال هذه الإنجازات؟'), options: [{ id: 'all', label: P('Yes, all accepted', 'نعم، جميعها مقبولة') }, { id: 'partly', label: P('Partly accepted', 'مقبولة جزئيًا') }, { id: 'not-yet', label: P('Not yet', 'ليس بعد') }] },
      { id: 'evidence', type: 'text', required: false, label: P('Evidence location', 'مكان الدليل'), question: P('Where is the evidence of acceptance kept?', 'أين يُحفظ دليل القبول؟'), suggestions: () => ['Synergy › Project documents', 'SharePoint › EPMO › Deliverables'] },
      { id: 'notes', type: 'text', long: true, required: false, label: P('Notes for the reviewer', 'ملاحظات للمراجع'), question: P('Anything else the reviewer should know?', 'هل هناك ما يجب أن يعرفه المراجع؟') },
    ],
  },
  {
    id: 'status', version: '0.9', format: 'Word', validatorTemplate: 'project-status',
    name: P('Project Status Report', 'تقرير حالة المشروع'),
    artifact: P('Monthly Status Report', 'تقرير الحالة الشهري'),
    artifactMeta: P('MI artifact 3 of 10 · Monitoring', 'مستند MI رقم 3 من 10 · المتابعة'),
    purpose: P('Report this month’s progress, milestones, risks and the next action.', 'أبلغ عن تقدم هذا الشهر والمراحل والمخاطر والإجراء التالي.'),
    validation: P('EPMO Program Manager', 'مدير البرنامج في إدارة المشاريع'),
    approval: P('Project sponsor', 'راعي المشروع'),
    fields: [
      { id: 'projectName', type: 'synergy', label: P('Project name', 'اسم المشروع'), value: p => p.name },
      { id: 'manager', type: 'synergy', label: P('Project manager', 'مدير المشروع'), value: manager },
      { id: 'period', type: 'synergy', label: P('Reporting period', 'فترة التقرير'), value: () => P('1–31 October 2026', '1–31 أكتوبر 2026') },
      { id: 'overall', type: 'choice', required: true, label: P('Overall status', 'الحالة العامة'), question: P('How would you rate the project overall this month?', 'كيف تقيّم المشروع بشكل عام هذا الشهر؟'), options: [{ id: 'on', label: P('On track', 'ضمن المسار') }, { id: 'risk', label: P('At risk', 'معرّض للخطر') }, { id: 'off', label: P('Off track', 'خارج المسار') }] },
      { id: 'summary', type: 'text', long: true, required: true, label: P('Progress summary', 'ملخص التقدم'), question: P('Summarize progress this month in two or three sentences.', 'لخّص تقدم هذا الشهر في جملتين أو ثلاث.'), suggestions: p => [`${p.name[0]} completed vendor onboarding and started integration testing. Integration testing slipped because the vendor environment was late.`] },
      {
        id: 'milestones', type: 'table', required: true, label: P('Milestones', 'المراحل'),
        question: P('Which milestones were due or active this month?', 'ما المراحل المستحقة أو النشطة هذا الشهر؟'),
        columns: [
          { id: 'name', label: P('Milestone', 'المرحلة'), required: true },
          { id: 'due', label: P('Due date', 'تاريخ الاستحقاق'), type: 'date', required: true },
          { id: 'status', label: P('Status', 'الحالة'), type: 'choice', options: milestoneOptions, required: true },
          { id: 'comment', label: P('Comment', 'تعليق') },
        ],
        suggest: () => [
          { name: 'Vendor onboarding', due: '2026-10-05', status: 'done', comment: '' },
          { name: 'Integration testing', due: '2026-09-24', status: 'delayed', comment: 'Waiting for vendor environment' },
        ],
      },
      { id: 'risks', type: 'text', long: true, required: false, label: P('Key risks', 'المخاطر الرئيسية'), question: P('Any key risks or issues to raise?', 'هل توجد مخاطر أو مشكلات رئيسية يجب رفعها؟') },
      { id: 'nextAction', type: 'text', required: true, label: P('Next action', 'الإجراء التالي'), question: P('What is the next key action?', 'ما الإجراء الرئيسي التالي؟'), suggestions: () => ['Confirm the vendor environment date', 'Re-plan integration testing'] },
      { id: 'nextDue', type: 'date', required: true, label: P('Next action due', 'موعد الإجراء التالي'), question: P('When is that action due?', 'متى يستحق هذا الإجراء؟'), dates: () => [['2026-11-14', P('In 2 weeks', 'بعد أسبوعين')], ['2026-11-30', P('End of November', 'نهاية نوفمبر')]] },
    ],
  },
  {
    id: 'hold', version: '0.9', format: 'Word',
    name: P('Project Hold Request', 'طلب تعليق مشروع'),
    artifact: P('Project Hold', 'تعليق المشروع'),
    artifactMeta: P('Governance · Change control', 'الحوكمة · ضبط التغيير'),
    purpose: P('Ask EPMO to pause a project, with the reason, dates and impact.', 'اطلب من إدارة المشاريع تعليق مشروع مع السبب والتواريخ والأثر.'),
    validation: P('EPMO Excellence Team', 'فريق تميز إدارة المشاريع'),
    approval: P('Portfolio governance committee', 'لجنة حوكمة المحفظة'),
    fields: [
      { id: 'projectName', type: 'synergy', label: P('Project name', 'اسم المشروع'), value: p => p.name },
      { id: 'portfolio', type: 'synergy', label: P('Portfolio', 'المحفظة'), value: p => p.portfolioLabel },
      { id: 'manager', type: 'synergy', label: P('Requested by', 'مقدم الطلب'), value: manager },
      { id: 'reason', type: 'choice', required: true, label: P('Reason for hold', 'سبب التعليق'), question: P('Why does the project need to be put on hold?', 'لماذا يحتاج المشروع إلى التعليق؟'), options: [{ id: 'budget', label: P('Budget constraints', 'قيود الميزانية') }, { id: 'priority', label: P('Change in business priority', 'تغيّر أولوية الأعمال') }, { id: 'dependency', label: P('Waiting on another project', 'بانتظار مشروع آخر') }, { id: 'vendor', label: P('Vendor or resourcing issue', 'مشكلة في المورد أو الموارد') }] },
      { id: 'details', type: 'text', long: true, required: true, label: P('Details', 'التفاصيل'), question: P('Explain the situation in a few sentences.', 'اشرح الوضع في بضع جمل.') },
      { id: 'holdStart', type: 'date', required: true, label: P('Hold starts', 'بداية التعليق'), question: P('From which date should the hold start?', 'من أي تاريخ يبدأ التعليق؟'), dates: () => [['2026-11-01', P('1 November', '1 نوفمبر')], ['2026-11-15', P('15 November', '15 نوفمبر')]] },
      { id: 'resume', type: 'date', required: false, label: P('Expected resume date', 'تاريخ الاستئناف المتوقع'), question: P('When do you expect to resume?', 'متى تتوقع الاستئناف؟'), after: 'holdStart', dates: () => [['2027-01-03', P('Early January', 'أوائل يناير')], ['2027-03-31', P('End of Q1 2027', 'نهاية الربع الأول 2027')]] },
      { id: 'impact', type: 'text', long: true, required: false, label: P('Impact', 'الأثر'), question: P('What is the impact on cost, scope or schedule?', 'ما الأثر على التكلفة أو النطاق أو الجدول؟') },
    ],
  },
];

export const templateOf = id => AUTHORING_TEMPLATES.find(tpl => tpl.id === id);
export const askedFields = tpl => tpl.fields.filter(f => f.type !== 'synergy');
export const synergyFields = tpl => tpl.fields.filter(f => f.type === 'synergy');
export const fieldOf = (draft, id) => templateOf(draft.templateId).fields.find(f => f.id === id);

export const freshAuthoring = () => ({ drafts: [], active: null, setup: { templateId: 'deliverables', projectId: '' }, composer: '', seq: 0 });

export function createDraft(authoring, templateId, projectId, now = Date.now()) {
  const draft = { id: `doc-${++authoring.seq}`, templateId, projectId, answers: {}, skipped: [], log: [], editing: null, error: null, notice: null, table: null, createdAt: now, updatedAt: now };
  authoring.drafts.unshift(draft);
  authoring.active = draft.id;
  return draft;
}

/** The part the conversation is waiting for: the one being edited, else the first unanswered part. */
export function pendingField(draft) {
  if (draft.editing) return fieldOf(draft, draft.editing);
  return askedFields(templateOf(draft.templateId)).find(f => !(f.id in draft.answers) && !draft.skipped.includes(f.id)) || null;
}
export const isComplete = draft => !pendingField(draft);
export function progress(draft) {
  const asked = askedFields(templateOf(draft.templateId));
  return { done: asked.filter(f => f.id in draft.answers || draft.skipped.includes(f.id)).length, total: asked.length };
}

const err = (en, ar) => ({ error: [en, ar] });
const cleanRows = (field, rows) => (rows || []).map(row => Object.fromEntries(field.columns.map(c => [c.id, String(row[c.id] ?? '').trim()]))).filter(row => Object.values(row).some(Boolean));

/** Validate a value for a part. Returns { value } or { error: [en, ar] }. */
export function validateValue(draft, field, value) {
  if (field.type === 'text') {
    const text = String(value ?? '').trim();
    if (!text) return err('Type an answer, or skip if it is optional.', 'اكتب إجابة، أو تخطَّ إذا كانت اختيارية.');
    return { value: text.slice(0, 2000) };
  }
  if (field.type === 'date') {
    if (!validDate(value)) return err('I couldn’t read that date. Use DD/MM/YYYY or pick it from the calendar.', 'لم أتمكن من قراءة التاريخ. استخدم يوم/شهر/سنة أو اختره من التقويم.');
    const before = field.after && draft.answers[field.after];
    if (before && value < before) return err(`This date must be on or after ${before}.`, `يجب أن يكون هذا التاريخ في ${before} أو بعده.`);
    return { value };
  }
  if (field.type === 'choice') {
    if (!field.options.some(o => o.id === value)) return err('Choose one of the options.', 'اختر أحد الخيارات.');
    return { value };
  }
  if (field.type === 'table') {
    const rows = cleanRows(field, value);
    if (!rows.length) return err('Add at least one row.', 'أضف صفًا واحدًا على الأقل.');
    for (const [i, row] of rows.entries()) {
      for (const c of field.columns) {
        if (c.required && !row[c.id]) return err(`Row ${i + 1}: ${c.label[0]} is required.`, `الصف ${i + 1}: ${c.label[1]} مطلوب.`);
        if (row[c.id] && c.type === 'date' && !validDate(row[c.id])) return err(`Row ${i + 1}: ${c.label[0]} is not a valid date.`, `الصف ${i + 1}: ${c.label[1]} ليس تاريخًا صحيحًا.`);
        if (row[c.id] && c.type === 'choice' && !c.options.some(o => o.id === row[c.id])) return err(`Row ${i + 1}: choose a ${c.label[0].toLowerCase()}.`, `الصف ${i + 1}: اختر ${c.label[1]}.`);
      }
    }
    return { value: rows };
  }
  return err('This part cannot be changed.', 'لا يمكن تغيير هذا الجزء.');
}

export function answerField(draft, fieldId, value, now = Date.now()) {
  const field = fieldOf(draft, fieldId);
  const result = validateValue(draft, field, value);
  if (result.error) { draft.error = result.error; return false; }
  const edited = draft.editing === fieldId && (fieldId in draft.answers || draft.skipped.includes(fieldId));
  draft.answers[fieldId] = result.value;
  draft.skipped = draft.skipped.filter(id => id !== fieldId);
  draft.log.push({ fieldId, kind: edited ? 'edit' : 'answer', value: structuredClone(result.value) });
  draft.editing = null; draft.error = null; draft.notice = null; draft.table = null; draft.updatedAt = now;
  return true;
}
export function skipField(draft, fieldId, now = Date.now()) {
  const field = fieldOf(draft, fieldId);
  if (field.required) { draft.error = P('This part is required by the template, so it can’t be skipped.', 'هذا الجزء مطلوب في النموذج ولا يمكن تخطيه.'); return false; }
  delete draft.answers[fieldId];
  if (!draft.skipped.includes(fieldId)) draft.skipped.push(fieldId);
  draft.log.push({ fieldId, kind: 'skip' });
  draft.editing = null; draft.error = null; draft.notice = null; draft.table = null; draft.updatedAt = now;
  return true;
}
export function editField(draft, fieldId) {
  const field = fieldOf(draft, fieldId);
  if (!field || field.type === 'synergy') return false;
  draft.editing = fieldId; draft.error = null; draft.notice = null;
  draft.table = field.type === 'table' ? structuredClone(draft.answers[fieldId] || []) : null;
  return true;
}

/** Turn a dd/mm/yyyy, d/m/yyyy or yyyy-mm-dd string into yyyy-mm-dd. */
export function parseDate(text) {
  const s = String(text).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return s;
}
const matchOption = (options, text) => {
  const s = String(text).trim().toLowerCase();
  if (/^\d+$/.test(s)) return options[Number(s) - 1]?.id;
  return options.find(o => o.label.some(l => l.toLowerCase() === s))?.id || options.find(o => o.label.some(l => l.toLowerCase().startsWith(s)) && s.length >= 2)?.id || s;
};
/** Interpret a typed message as an answer to the pending part. */
export function parseTyped(field, text) {
  if (field.type === 'date') return parseDate(text);
  if (field.type === 'choice') return matchOption(field.options, text);
  if (field.type === 'table') {
    return String(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
      const cells = line.split('|').map(c => c.trim());
      return Object.fromEntries(field.columns.map((c, i) => [c.id, c.type === 'date' ? parseDate(cells[i] || '') : c.type === 'choice' ? (cells[i] ? matchOption(c.options, cells[i]) : '') : cells[i] || '']));
    });
  }
  return text;
}
/** "skip", or "edit <part>" (matched against part labels in either language). */
export function commandOf(draft, text) {
  const s = String(text).trim();
  if (/^(skip|تخط[ىي]?)$/i.test(s)) return { type: 'skip' };
  const m = s.match(/^(?:edit|change|تعديل|عدّل|عدل)\s+(.+)$/i);
  if (m) {
    const needle = m[1].trim().toLowerCase();
    const field = askedFields(templateOf(draft.templateId)).find(f => f.label.some(l => l.toLowerCase() === needle)) || askedFields(templateOf(draft.templateId)).find(f => f.label.some(l => l.toLowerCase().includes(needle)));
    return field ? { type: 'edit', fieldId: field.id } : { type: 'edit-unknown' };
  }
  return null;
}

/** Template check: required parts, recommended parts and consistency between answers. */
export function checkDraft(draft) {
  const tpl = templateOf(draft.templateId), a = draft.answers, issues = [];
  for (const f of askedFields(tpl)) {
    if (f.required && !(f.id in a)) issues.push({ level: 'required', fieldId: f.id, text: P(`${f.label[0]} is missing.`, `${f.label[1]} غير موجود.`) });
    else if (!f.required && !(f.id in a)) issues.push({ level: 'suggestion', fieldId: f.id, text: P(`Add ${f.label[0].toLowerCase()} to make the document complete.`, `أضف ${f.label[1]} لاكتمال المستند.`) });
  }
  if (tpl.id === 'deliverables' && a.acceptance === 'all' && (a.deliverables || []).some(r => r.status !== 'accepted')) issues.push({ level: 'warning', fieldId: 'acceptance', text: P('Business acceptance says all are accepted, but some deliverables are not marked Accepted.', 'يشير قبول الأعمال إلى قبول الجميع، لكن بعض الإنجازات غير معلّمة كمقبولة.') });
  if (tpl.id === 'status' && a.overall === 'on' && (a.milestones || []).some(r => r.status === 'delayed')) issues.push({ level: 'warning', fieldId: 'overall', text: P('Overall status is On track, but a milestone is delayed.', 'الحالة العامة ضمن المسار، لكن هناك مرحلة متأخرة.') });
  if (tpl.id === 'status' && a.nextDue && a.nextDue < AUTHORING_AS_OF) issues.push({ level: 'warning', fieldId: 'nextDue', text: P('The next action is due before the end of the reporting period.', 'موعد الإجراء التالي قبل نهاية فترة التقرير.') });
  const penalty = { required: 20, warning: 10, suggestion: 5 };
  const score = Math.max(0, 100 - issues.reduce((sum, i) => sum + penalty[i.level], 0));
  const compliant = !issues.some(i => i.level === 'required');
  return { score, compliant, issues };
}

export function fileName(draft, projectName) {
  const tpl = templateOf(draft.templateId);
  const slug = s => s.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  return `${slug(tpl.name[0])}_${slug(projectName)}.doc`;
}

/** Fields the standalone validator reads from a generated status report. */
export function validatorFields(draft, project) {
  const a = draft.answers;
  return { start: '2026-10-01', end: AUTHORING_AS_OF, owner: project.owner[0], nextAction: a.nextAction || '', nextDue: a.nextDue || '' };
}
