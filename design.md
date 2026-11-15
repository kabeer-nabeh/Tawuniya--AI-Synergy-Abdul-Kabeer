# Tawuniya Synergy: basic design system

Status: role-aware prototype. Platform-tab placement updated 2026-11-11. Earlier launcher-first sections below are historical where superseded by the latest placement change. This is a product-specific adaptation, not an official Tawuniya brand manual.

## Brand evidence
- Reference: https://www.tawuniya.com/ inspected in a browser on 2026-11-01.
- Official website primary action observed: RGB 107, 71, 245 (#6B47F5); Tawuniya font; 8px button radius.
- Supplied transparent bilingual logo is preserved at `public/tawuniya-logo.png`.
- Supplied local WOFF2 fonts: Tawuniya Light (300), Regular (400), Medium (500), Bold (700). No external font service.
- Reference source selected by the user: Mobbin. Refero is unavailable and is not used as the design reference.
- Mobbin web Chat Bot collection reviewed: https://mobbin.com/search/apps/web?content_type=screens&sort=trending&filter=screenPatterns.Chat+Bot
- Unify conversation entry screen inspected in detail: https://mobbin.com/screens/6aab53aa-99c5-4386-9083-7189efec8725. Observed: a prominent composer, left-side recent chats, three starter prompts and a context/integration row. Adaptation: retain a clear composer and task starters, use Synergy context rather than unrelated integrations, and preserve Tawuniya branding.
- Replit and hilos previews in the collection show a creation composer and a conversation with an attached document, respectively. These are secondary composition references; their workflows are not replicated.
- User feedback: remove the bottom workspace branding/tagline footer. The workspace now extends to the bottom without that footer.

## Visual direction
An employee reviewing Synergy information on a desktop in a lit office needs a light, quiet surface with clear text and traceable answers. Use lightly violet-tinted neutrals, restrained brand violet and a compact application density with clear separation between tasks. The brand and composer provide the anchors.

## Color tokens
CSS tokens use OKLCH. Hex equivalents below are reference values, not additional tokens.

| Token | Reference | Usage |
| --- | --- | --- |
| `--brand` | #6B47F5 | Primary action, selected navigation, focused controls |
| `--brand-hover` | #5934DA | Hover/pressed primary action |
| `--brand-soft` | #F0ECFF | Selected surface, user message background |
| `--canvas` | #FEFDFE | Main workspace |
| `--surround` | Light violet gray | Outer canvas around the application frame |
| `--sidebar` | #F7F7FA | Navigation surface |
| `--text` | #24212D | Primary text |
| `--muted` | #716C7F | Secondary text |
| `--line` | #E8E5EF | Dividers and boundaries |
| `--success` | #28755C | Informational positive status, always with text |
| `--warning` | #966518 | Required findings, paired with explicit labels |

Never use status color alone. No decorative gradients or solid black/white surfaces. Logo artwork retains original colors.

## Typography
Family: `Tawuniya, Arial, sans-serif` for English and Arabic.
- Welcome title: 25px/1.3, medium, -0.02em English tracking; 21px on narrow screens. An inline 34px assistant mark anchors the heading.
- Response title: 20px/1.35, medium; 19px on narrow screens.
- Base UI: 14px; response prose: 13px/1.7, light (300) with regular (400) emphasis; composer: 13px regular.
- Navigation and buttons: 12px/1.5, medium.
- Supporting copy: 13px/1.6, regular.
- Metadata: 10–11px; secondary decorative labels: 9px. Important response and action content remains 12–14px.
- Arabic uses normal letter spacing and relaxed line height; prose uses automatic bidi direction.
- Prose width: about 65 characters; conversation outer column 720px (680px content).

## Layout and spacing
4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
The host application is represented by the supplied EPMO screenshot, displayed as a static image with its original aspect ratio preserved. Contain sizing aligns the complete screenshot to the top centre, keeping the full navigation and rightmost dashboard column visible without cropping or distortion. The canvas colour fills any remaining space. Its controls are part of the image, not functional dashboard controls.

The assistant has three states:
- Closed: bottom-right violet AI Synergy launcher, 24px from the viewport edges (16px on mobile).
- Compact: 432px wide, up to 700px tall, 24px from the bottom/right with 16px corners. Height is capped to the viewport with a 24px margin above and below. The header contains identity, new conversation, history, expand and close controls; a context row contains EPMO and the language switch. Suggestions stack vertically, the composer stays below the scrolling content, and there is no sidebar.
- Expanded: 16px viewport inset, full-height workspace, 64px header, 232px sidebar, a shared 720px conversation column and 640px welcome column. The screenshot remains visible behind a subtle backdrop. The control in the header returns to compact chat.

Tablet between 641px and 900px: the expanded sidebar reduces to a 64px rail. Mobile below 640px: compact chat fits within 10px of the viewport edges; expanded chat fills the viewport, the sidebar is hidden, and history remains accessible through the header. Source and editor panels remain contained inside the assistant in both sizes.

Open/close/resize operations preserve the session conversation, unsent message, scroll position, open findings and editor drafts. A response completed while closed marks the launcher with an unread indicator. No state is persisted across a full page reload.

## Components
- Primary button: violet, contrasting label, 6px radius, 34px desktop height.
- Icon button: outline icon, visible hover/focus, accessible label, 32px desktop target; secondary response actions 28px. Coarse-pointer devices use 44px targets.
- Composer: compact multiline input, 11px radius, 36px initial text area, subtle border/shadow, attachment context row and 32px desktop send button. Enter sends; Shift+Enter adds a line; composition events preserve Arabic input.
- Suggested prompts: compact question rows in the small chat; three portrait cards under “Try asking” in expanded desktop view, stacked on narrow screens. Each has a contextual icon above an actual question. Clicking sends exactly the question shown. Desktop: 116px minimum height, 8px gap and radius. Mobile: 92px minimum height.
- Assistant identity: the supplied SVG artwork, with its two embedded attribution text elements removed and its viewBox cropped to the icon. The cleaned source is `public/ai-icon.svg`; its exact path is rendered inline in `src/app.js` so it inherits the brand color. Use the same glyph in the workspace label, welcome heading, assistant responses, and help panel. Credit: [AI by Slash from Noun Project](https://thenounproject.com/icon/ai-7087218/).
- Sidebar: 116px-wide Tawuniya brand, Synergy AI workspace identity, a plain 36px new conversation action, Workspace navigation with AI Assistant and Sample documents, This session history or an empty-state explanation, and help plus Design workspace context at the bottom.
- Assistant response: prose and structured evidence. User turns have a restrained tint. Responses use 12px label spacing, 16px evidence spacing and 22px between turns. Tables use 8–9px vertical cell padding.
- Source button: 32px desktop height, source name and type; opens a labeled 320px inspector with snapshot details and sample evidence.
- Validation finding: one bordered review list with divided, expandable rows. Each row leads with its title and section location, followed by a required, suggestion, passed or resolved status badge and a disclosure chevron. Review actions use a pencil for editing, circular arrows for rechecking and an eye for inspecting the checked version. The badge sits immediately before the disclosure chevron at desktop and mobile sizes. Required items use a warning icon, suggestions a lightbulb, and passed or resolved items a circled check. Expanded content includes the checked values and a section editing action. No unsupported percentage score. A passed check never implies human approval.
- Feedback: explicit toggle state and local confirmation. Copy acts on the selected response.

## Interaction and states
Default, hover, focus-visible, active, disabled and loading states are implemented. Request progress is announced politely. Empty input disables send. Unsupported questions explain the demo limitation instead of inventing answers. Language switching re-renders the workspace in RTL/LTR. Escape closes transient panels and returns focus. Transitions are limited to 160–200ms state changes; the loading indicator repeats while processing. Honor reduced motion.

## Basic flow
1. Bottom-right AI Synergy launcher → compact chat → optionally expand → type or select a question under “Try asking”.
2. Sample query → short loading state → answer with reporting period and source.
3. Inspect source → read supporting sample snapshot → close and follow up.
4. Check artifact → select sample → validation starts automatically → inspect required findings and suggestions. Selecting from the document panel also starts the check, without a confirmation step. The result retains document and template context.
5. Expand finding → inspect checked content → edit the relevant section in a side panel. Reporting start/end dates and accountable owner are required checks; next-step action/due date is an optional improvement.
6. Save draft → mark prior results as older than the saved draft; or Save & recheck → append a new revision snapshot with required items remaining, suggestions and newly resolved checks. Each run retains its original values and evidence.
7. Required checks pass → Ready for human review → expandable reviewer summary. Optional improvements may remain. This state never approves the artifact.
8. New conversation → start again; prior conversations, saved artifacts and unsaved edits remain isolated by conversation and sample document for the current session.

## Content and trust
UI labels are concise and task-based. Clearly label this as sample data. Never imply a live connection or that uploads have been parsed. The prototype is advisory, performs no write-back and makes no approval decisions. Production must add authentication, server-enforced authorization, approved API retrieval, real validation, audit logging, retention policies and reviewed translations.

## Deliberate scope
This is a local, dependency-free UI prototype. It does not implement a production chatbot, security controls, live Synergy integration, durable history, actual document processing or model inference.

## Application density
The compact scale applies to the complete application: navigation, header, composer, prompts, conversation, tables, KPI readings, document selection, validation findings and source/help drawers. Sizes are actual component dimensions, not browser zoom or a CSS transform. Focus rings remain visible and touch targets expand for coarse pointers.

## Embedded chat header
The 64px assistant header contains the supplied AI icon, AI Synergy identity, new conversation, conversation history, expand/collapse and close controls. Compact chat adds a 34px EPMO context and language row. Expanded chat places the language control in the header. Keep the workspace border very faint, mixing the divider token at 40% with the canvas. Closing hides the assistant and returns focus to the launcher; it preserves session content. Expanded view uses a viewport backdrop; compact chat leaves the host screen fully visible.

## Sidebar hierarchy
Retain workspace identity and session context so employees know where they are and where previous chats appear. Keep New conversation as a plain navigation action. Use a subtle selected state for AI Assistant and the current conversation. At tablet width, retain accessible labels on icon-only actions; mobile uses the same content in a drawer.

## Artifact correction flow
The editor is a 440px side panel, capped to the mobile viewport. Fieldsets follow the sample template section numbers, with explicit required and optional labels. Closing preserves unsaved changes; Discard changes restores the last saved fields. Saving increases the revision only when values change. Date order errors appear at the end-date field. Rechecking runs against the saved version, preserves previous evidence and distinguishes Passed from newly Resolved. Cleared values can reopen issues. These are three local field checks; real Synergy documents and approved validation services remain integration work.

## Placement decision
On 5 November 2026, the owner confirmed that this assistant belongs inside the existing Synergy EPMO application. This supersedes the earlier standalone-first presentation. The shared UC01 flows remain the same; only the entry point, container, compact composition and nested panels change. The screenshot is the supplied reference, not a reconstruction of the platform.

## Dedicated validation entry
A labelled Validate document control with a shield/check icon appears in the composer toolbar in compact and expanded views. Expanded navigation also includes the same entry. It opens a dedicated validation panel explaining required checks and optional improvements, with two sample document choices and their template version. Selecting a sample starts validation automatically in the current conversation. Users continue through findings, section editing, save/recheck and preserved checked versions. The original conversational starter remains available. This entry makes the validator discoverable without requiring a typed question.

## Role-aware navigation foundation, 9 November 2026

Expanded navigation now uses Assistant, Documents, Forecasts and Data quality, with Administration for EPMO. Validation remains directly available from the authorized composer's toolbar and is also presented inside Documents. Role policy controls available actions; project/document scope is applied independently. The initial EPMO account sees both sample documents, Afnan sees the Project Alpha report, and Renad has an explicit no-assignment state. Leadership has no document actions.

A 56px session row below the 64px header contains the demo account switcher and scope. Compact chat adds a 44px destination strip; expanded mobile restores that strip when the sidebar is hidden. Touch navigation has a 44px target minimum. The account panel is 420px wide, capped to the shell, with six identity choices and their role/scope. Administration is also reachable from that panel for EPMO. A subtle floating Demo account control is available at the host screen's bottom left while chat is closed.

Detailed destinations use the wider main surface rather than the conversation's narrow prose column. Forecasts and Data quality currently show honest unconnected states and scoped sample project lists. Project rows open an evidence/context panel. Create document is exposed only to Project Managers and explicitly marks guided authoring as the next milestone. No numerical results or scan outcomes are invented.

Account changes isolate conversation, draft, artifact edit and view state. In-flight responses are retired and their prompt restored to the outgoing identity's draft. Task navigation and compact/expanded transitions retain the same identity, conversation and unsaved content. All session data clears on reload. Child panels make underlying workspace/header controls inert and contain focus until closed.


## Current placement: Mobility platform tab, 11 November 2026

The latest owner instruction supersedes the screenshot background and launcher-first workspace. Render a coded Mobility host with purple top bar, Tawuniya wordmark, responsibilities, demo account, breadcrumbs, Mobility title, horizontal platform tabs, summary gauges and comparison chart. Use the supplied reference's structure and illustrative values; do not embed the screenshot. Projects Overview is followed immediately by AI Synergy. Other host sections are lightweight placement mockups.

AI Synergy is a normal inline tab, with a 65px workspace header, desktop sidebar and independently scrolling main area. Assistant/Documents (UC01), Forecasts (UC02), Data quality (UC03) and authorized Administration stay in this tab. On mobile, replace the workspace sidebar with a task strip. Preserve workspace selection, conversation, draft and artifact state across platform-tab changes.

The bottom-right FAB is labeled AI Assistance. Its compact 432px chat and optional expanded chat provide questions/answers only, with independent account-scoped messages and draft. No workspace navigation, document picker or editor is placed inside this FAB. Advanced task requests provide an explicit handoff into the appropriate AI Synergy destination. Opening/closing assistance does not change the selected workspace task. If the workspace's Assistant destination is selected while floating assistance is open, show a Return to workspace assistant action to avoid duplicate composers.

Demo account selection moves to the platform header. Scoped detail panels remain accessible from workspace or assistance sources, and preserve the originating surface. No automated check changes or real backend integration are introduced by the placement change.


## Workspace navigation tabs, 11 November 2026

Move Assistant, Documents, Forecasts, Data quality and authorized Administration into the inline workspace's top bar, opposite the scope badge and history control. Remove task navigation and the Workspace caption from the conversation sidebar. Keep New conversation, session history and help there. Use an underline and violet text for the selected tab, with semantic tablist/tab/tabpanel relationships and Arrow/Home/End keyboard navigation. Mobile uses the same horizontally scrollable tabs above the scope controls; no separate duplicate mobile navigation is rendered.


## Assistance-only conversation sidebar

The first workspace tab is labeled AI Assistance (المساعدة الذكية) and uses the supplied AI orbit glyph. Render the conversation sidebar and workspace-history control only for this destination. Documents, Forecasts, Data quality and Administration have no conversation sidebar and use the full available workspace width. Conversation state remains intact when switching destinations.


## Validator tab label

The Documents destination is displayed as AI Document Validator (التحقق الذكي من المستندات), with a document-and-check glyph. Its internal documents identifier and role permissions remain stable. The workspace heading uses the same label.

## Dedicated document validator, 11 November 2026

### Upload and template selection

The later upload milestone supersedes the sample-only input restriction below. Put Upload a document above the recent/sample list. Support native file selection and drag/drop for text-based PDF, DOCX, UTF-8 TXT and Markdown, up to 10 MB. Read files locally using vendored PDF.js and Mammoth browser bundles. Show file identity, type, size and reading/ready/error states. Reject unsupported, empty, corrupt, password-protected and unreadable documents with actionable feedback; PDFs without a text layer need OCR and cannot be checked. PDFs are capped at 100 pages and extracted text at 250,000 characters.

Require an explicit template selection before enabling Validate document. The two demo profiles are Quarterly performance report v1.0 and Project status report v1.0; both currently use the three existing field rules. These are not presented as an EPMO-approved full template library. Labeled English/Arabic fields are detected conservatively, with ISO dates. Missing or ambiguous content remains unresolved. Each report identifies its selected template and includes original extracted text for inspection.

Uploads, template choice and review revisions remain account-isolated in memory. No document is sent to the server, Synergy or an AI service. Editing changes the extracted fields used in subsequent local checks, not the original PDF/DOCX/TXT file. Source text is retained unchanged. Reloading clears the upload session. AI semantic review, arbitrary-layout field recognition, live-record comparisons, OCR and source-file rewriting remain future integration work.

The validator owns a dedicated review workspace. Its document list respects the selected account's scope. Selecting an unchecked sample starts checks automatically; reopening a checked sample shows its latest report. A compact three-step journey and template rule explanation replace the former chat handoff.

The report pairs structured sample content with findings, with findings first on mobile. Required, suggested and passed filters expose open and resolved checks. Each finding explains the rule, shows the checked value, locates its section in the preview and opens the relevant editor field. Badges remain after the title, before the chevron. Saving a draft marks earlier results stale; rechecking creates an immutable snapshot in checked-version history. Closing the editor preserves unsaved fields, while Discard restores saved content.

Standalone drafts and check history are account-isolated and independent of assistant conversations. The existing conversational validation route remains available. Reloading clears session data.

The milestone checks the two existing sample documents and three deterministic fields: reporting dates, accountable owner and next action/due date. File parsing, template detection, AI content review, live Synergy comparison, signatures and compliance scoring remain unconnected. A successful check is readiness for human review, never automatic approval.

## Workspace tab icons: Hugeicons Stroke Rounded

Use official free Hugeicons assets at 18px, with their original 1.5px rounded strokes and current text color. AI Assistance uses AiChat02Icon; AI Document Validator uses AiScanTextIcon; Forecasts uses AnalyticsUpIcon; Data quality uses DatabaseSearchIcon; Administration uses AiSettingIcon. This replaces the earlier tab glyph choices. The supplied orbit brand mark remains in the welcome heading and floating assistance. Selected assets are vendored from @hugeicons/core-free-icons 4.4.0 under public/vendor/hugeicons, with the MIT license and source record included.

## Project Hold review, 11 November 2026

The dedicated validator now includes Project Hold as a template-specific flow while preserving the existing compact Tawuniya UI. Upload settings reveal a required project selector only for this profile. The report retains the two-column evidence/findings composition, responsive stacking and the status-before-chevron pattern. Findings are grouped by Structure & content, Project information, Project review table, Project consistency, Approval details and Additional review.

Status filters are All, Required, Warning, Passed and Skipped. Resolved is shown only for previously failed/warning checks that pass on a later run. Skipped checks display why they were not performed and never imply approval. There is no compliance percentage. The source panel displays extracted review fields, with unchanged original text available for uploads. Evidence links focus the relevant section; correction actions focus the matching field in the shared editor drawer. Save preserves history; recheck uses the latest saved fields. An older revision always keeps its checked values and project snapshot. Editing an older result opens the latest draft and says so.

The Project Hold profile is labeled `2026.1-demo`; it is not an approved methodology. AI review, signatures, original layout verification and sensitive-data screening remain unconnected. Local project comparisons and reviewer summaries are explicitly identified. Production must confirm field requirements, conditional sign-offs, original templates, model services and live Synergy context.


## Excellence submitted-document review, 15 November 2026

Add an Excellence review tab only for the reviews capability. Use the full workspace width, without the conversation sidebar. Present a three-step flow: choose document, confirm context, review findings. Samples are divided rows with descriptions; uploads use the existing local drop-zone pattern. Require an explicit context confirmation checkbox even when identification succeeds. Context changes clear confirmation. Results pair all required-section summaries with expandable findings, evidence comparisons and manual-review items. Mobile stacks findings before section summaries and supports RTL. Copy the English reviewer summary; do not expose author editors, Word export, approval/rejection or Synergy status controls. Passing local fields retains a manual-review outcome. See EXCELLENCE-REVIEW-FLOW.md.


## Administration and content simplification, 15 November 2026

Use one page title and the relevant action controls. Remove repeated eyebrows and introductory paragraphs from task pages. Supporting technical/demo detail belongs in expandable help. Preserve action warnings, evidence, required-field feedback, and confirmation semantics.

Administration uses a document selector, separate validation/approval fieldsets, ordered stage rows, role selectors, save/discard controls, and expandable change history. Saved settings are versioned; old review snapshots remain unchanged. The submitted-document page uses a top-right primary Upload or try samples button and a native dialog with keyboard handling. Confirm document details through a single Review document action. Results show issues/evidence before document sections; audit details and settings are secondary.
