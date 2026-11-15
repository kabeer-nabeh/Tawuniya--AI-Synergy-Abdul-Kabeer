# Excellence Team upload and review history

Implemented 15 November 2026 as the next frontend milestone after the Project Hold owner correction flow.

## Access and placement

Choose the **EPMO Excellence Team** demo identity, open **AI Synergy**, and select the **Excellence review** workspace tab. This tab uses the full content area and does not show the assistant conversation sidebar.

The new `reviews` capability is granted only to the Excellence demo role. Managers and leadership do not see the tab, and the review model checks the capability and project scope before selecting a source or generating findings. This is frontend demo policy, not production authorization or completed SSO.

## Journey

1. Start from Review history, initially empty. Select the top-right Upload document button and choose or drop a file in the modal. Alternatively, choose one of the three labeled demo samples in the modal. History has no preloaded entries.
2. Inspect the identified document type and project. Uncertain identification leaves the relevant selection empty. Only Project Hold is supported in this milestone.
3. Select Review document to confirm the displayed type/project and start checking. No results are generated before this action.
4. Review missing information, invalid dates, project mismatches, warnings, passed checks, and items for manual assessment.
5. Inspect the summary of every review section, including every field in the current demo requirements. Optional impact content is identified as recommended.
6. Change project/type, confirm again, and rerun when the selected context was wrong. Earlier runs retain their original evidence, project snapshot, reviewer identity, and timestamp.
7. Copy the English reviewer summary and follow up manually in Synergy.

Changing either context selection resets confirmation. Every successfully parsed upload creates a unique history entry, even when filenames match. Files awaiting confirmation can be resumed with Continue review. Reviewed files reopen through View findings. Rechecks update the same entry and preserve earlier runs. Current source, context, and run history persist across workspace navigation, language changes, and demo-account switching during the page session. A reload clears this state.

## Upload history

History contains files uploaded and samples selected by the active reviewer, filtered by current project access. Samples are labeled Demo sample. Unknown-project uploads remain available for context selection. Each row shows filename, project, upload time, latest review time, local review status, and the appropriate action. Search by filename/project and filter by Not reviewed, Needs follow-up, or Manual assessment. Changing context without rechecking returns the entry to Not reviewed while preserving previous results.

History is page-session memory and is explicitly labeled This session. Refreshing clears it. Failed or cancelled file reads do not create entries. The modal offers missing-content, complete-field, and visual-evidence demo samples. Selecting a sample uses the same context confirmation and review flow as an upload.

## Review content

The flow reuses the Project Hold field rules without exposing the author's correction editor or Word download action. It includes:

- A read-only submitted source and a separately confirmed comparison context.
- Document/source values shown side by side for consistency findings.
- All four section summaries: project information, hold justification, project review, and approval details. The current demo displays 27 fields in total.
- Filters for required findings, warnings, passed checks, manual review, and all findings.
- Evidence-location actions that open the corresponding section summary.
- Per-file context/run history and a copyable summary covering all sections and unresolved findings.
- Manual next steps for original-template/evidence assessment and final action in Synergy.

There are no file-edit, source-replacement, approval, rejection, or Synergy-status-change actions in this workspace. These results are separate from the manager's Project Hold drafts and correction history.

## Visual content handling

The review upload reader adds visual-resource inspection to the existing local parser:

- **PDF:** raster image operators and vector graphics are flagged by page. Vector paths may be charts, diagrams, or decoration; the app does not infer their meaning.
- **DOCX:** embedded media and chart resources are identified from ZIP directory entries without rendering them. Exact section location and whether a resource is actively used cannot be established by this inspection. A resource may be a logo.
- **TXT/Markdown:** only explicit standalone `[Image: description]` or `[Chart: description]` placeholders create visual flags. Casual mentions of charts are not treated as detected media.
- If visual inspection fails, an explicit manual-review item is added and available text checks continue.

No image/chart values are evaluated or marked as passed. Reviewers must inspect the original file for visual content, layout, and supporting evidence. A page without detected graphics is not a guarantee that every visual concern was resolved.

## Verdicts and limits

An unmet local required check produces **Needs revision**. When the local required checks pass, the outcome is **Local checks passed; manual review required**. The prototype does not issue a formal compliant verdict because the approved template, current acceptance policy, authenticated approvals, live Synergy data, and AI assessment are not connected.

The current upload formats remain text-based PDF, DOCX, TXT, and Markdown, up to 10 MB. Scanned PDFs require OCR. Excel, PowerPoint, and other approved artifact types remain future work. Unreadable, insufficiently recognizable, and recognized unsupported document types cannot proceed to a Project Hold result.

Uploads are processed in the browser and are not sent to Synergy or a model service. Run records are session memory, not durable audit logging. Production identity, authorization, retention, and audit services remain separate integration work.

## Verification

- Syntax checks, static build, and the complete 101-test suite passed at this milestone.
- New tests cover reviewer permissions, project scope, confirmation, uncertainty, unsupported/unrecognized documents, findings and full section summaries, immutable context history, visual flags, source preservation, output escaping, and separation from author actions.
- Browser checks cover all three samples, source comparisons, context changes and earlier runs, summary copying, unknown type/project selection, real DOCX/PDF uploads containing images/graphics, account isolation, role navigation, desktop/mobile layout, and Arabic direction.
- No browser console errors were reported during the checks.

The BRD gap review remains a dated baseline. This milestone does not resolve the other artifact, administration, integration, or production-readiness gaps recorded there.


## Configuration and simplified review update

Saved workflow settings now apply to new checks. Each report retains its original configuration snapshot. The confirmation page uses one Review document action. Findings lead the results layout, and review history/settings are available under Review details & history. The upload entry opens a native modal with Escape-to-close and restored focus. See ADMIN-CONFIGURATION.md for shared configuration behavior and current limits.


## Upload history verification

113 tests pass, including empty history, same-name uploads, independent review runs, unfinished context, current reviewer and project scope, search, filters, and unsupported files. Browser verification covers upload, returning before review, resuming, reviewing, and reopening findings.

The restored sample picker is covered by 19 review tests and a browser walkthrough from sample selection to results and reopening history.
