# Product

## Register
product

## Users
Tawuniya employees working in Synergy, including performance analysts, project owners, artifact authors and governance reviewers. Desktop is the initial working context; mobile remains usable.

## Product Purpose
UC01 adds an embedded AI chat experience to Synergy: conversational retrieval over authorized KPIs, projects and documents, plus guided artifact validation against approved templates. This local prototype explores new conversation, source-backed answers and sample artifact validation. All business data and responses are illustrative. No live Corporater, authentication or LLM connection exists.

## Brand Personality
Clear, composed, helpful. Use the user-supplied Tawuniya logo and typeface. Reference: https://www.tawuniya.com/ inspected 2026-11-01. Official website button color observed as rgb(107,71,245), font Tawuniya, radius 8px.

## Anti-references
Avoid consumer insurance purchase flows, marketing heroes, ornamental AI gradients, dashboard mosaics, unsupported compliance scores, fabricated confidence percentages, and approval language for automated checks.

## Design Principles
1. Conversation is the primary workspace.
2. Make sources and reporting context inspectable.
3. Separate required template checks from suggested improvements.
4. Keep human review distinct from automated validation.
5. Use progressive disclosure and support English/Arabic from the beginning.

## Accessibility & Inclusion
Target WCAG 2.2 AA in production. Provide semantic landmarks, explicit control labels, visible focus, readable contrast, keyboard operation, reduced motion, responsive layout, RTL direction and Arabic UI copy. Arabic translations and final assistive-technology behavior require stakeholder validation.

## Working Assumptions
The confirmed placement, updated 11 November 2026, is an **AI Synergy platform tab immediately after Projects Overview** in a coded mock of the existing Mobility application. All three use cases and role-aware navigation live in this tab. The bottom-right **AI Assistance** FAB is query-only and may expand without becoming the full workspace. It keeps an independent conversation and draft per demo identity. Requests requiring document tools, forecasting or data-quality work hand off to the platform tab. The previous screenshot background is no longer rendered.

Workspace conversations, drafts and artifact revisions persist across platform-tab changes during the page session. Assistance activity is separate and persists across opening/closing/resizing. No real login, live APIs or durable storage exists. The validator now reads PDF, DOCX, TXT and Markdown uploads locally, with explicit demo-template selection and conservative labeled-field checks. Uploads are isolated by account and are not transmitted to a server or AI service. Numerical overview data is illustrative. Real host context passing and integration remain discovery decisions.

## Role-aware foundation, 9 November 2026

The prototype now supports six demo identities across Leadership, Project Manager and EPMO roles. Identity selection previews UI capabilities and sample data scope; it is not real authentication or server authorization. Leadership has Assistant, Forecasts and Data quality. Project Managers also have Documents with Create and Validate; EPMO has Validate and Administration, without Create. Account activity and drafts are isolated in memory. The shared shell retains compact and expanded task navigation.

Forecasts and Data quality currently expose scoped project context and unconnected service states. Guided creation and Administration also remain entry surfaces for later milestones. Existing sample inquiry and validation/correction are interactive. The next implementation phase is a complete document-creation journey; numerical forecasting, quality detection, real identity and data services remain separate work.


## Placement change, 11 November 2026

This supersedes the 5/9 November launcher-first workspace design. The inline AI Synergy workspace retains role-aware navigation and sample validation. AI Assistance is a separate query-only FAB, without Documents/Forecasts/Data quality navigation. The code-built Mobility host follows the latest supplied reference; its other platform sections are placement mockups.

## Project Hold milestone, 11 November 2026

AI Document Validator now supports a Project Hold demo with upload/template/project selection, 26 categorized checks, evidence, field correction, immutable check history and reviewer next steps. It compares three extracted fields against an explicitly selected, authorized demo project snapshot. Four unavailable checks remain Skipped. This extends the basic three-field validator without changing the existing assistant journey. Approved templates, conditional business rules, live comparisons, AI assessment, authenticated sign-offs and source-file writeback remain outside this local milestone.


## Excellence Team review milestone, 15 November 2026

The EPMO Excellence Team demo role has a separate Excellence review workspace tab. Its submitted-document journey confirms project/type before checking, preserves the original source, displays all Project Hold section summaries and source mismatches, and flags visual evidence for manual assessment. It supports three direct samples and local uploads. This read-only workspace has no owner correction, approval/rejection or status-writeback actions. Local checks do not establish formal compliance. Run history and context are isolated in session memory. See EXCELLENCE-REVIEW-FLOW.md for the current behavior and limits.


## Admin configuration and simpler pages, 15 November 2026

Administration now manages validation/approval stages and responsible roles by document type. Its shared page-session store versions saved changes and records before/after audit entries. New owner and Excellence checks capture those settings; earlier checks keep their snapshots. Stale workflow settings require a new owner check before download. Production persistence and server authorization remain pending.

Use concise page headings and action-led content. Avoid repeated introductory paragraphs and generic section explanations. Keep errors and meaningful action warnings visible; put supporting demo/technical detail in expandable help. Excellence review uses a primary upload/sample modal, a one-action context confirmation, and an issue-first report with optional history/details. See ADMIN-CONFIGURATION.md.

## Excellence upload history, 15 November 2026

Excellence review now starts with an empty Review history and an Upload document action. The upload modal accepts files only. The former seeded submission list and selectable samples are removed from this workspace. Successfully read files create account-isolated session entries with upload date, latest review date, project, and local status. Resume unfinished reviews or reopen findings from history; repeated reviews remain under the same file entry. Reload clears history.

## Sample choices restored, 15 November 2026

The Excellence upload modal includes three labeled demo samples below the file drop zone. History stays empty until the user uploads or selects a sample. Selected samples appear with a Demo sample label and retain their review history. This supersedes the file-only modal instruction above.
