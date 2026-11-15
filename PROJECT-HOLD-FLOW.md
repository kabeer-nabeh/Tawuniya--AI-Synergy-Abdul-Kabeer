# Project Hold validation demo

Implemented 15 November 2026. This describes the local frontend journey, not production BRD compliance.

## Open the flow

1. Run `npm run dev` (or `PORT=5174 npm run dev`).
2. Open AI Synergy and select a demo account through the sign-in page.
3. Choose AI Assistance, then Validate a document.
4. Select an assigned project and use its Project Hold sample, or upload a readable PDF, DOCX, TXT, or Markdown file and select the Project Hold template. Choosing the named sample starts checking immediately and sets its project context.

Both manager accounts have an assigned demo: Afnan has Project Alpha; Renad has Claims service improvement. The EPMO account can select all three fixture projects. Accounts without assignments see an explicit empty state and account-switch action; other projects are never added to their scope as a fallback.

## Review and correct

- Required findings are shown first. Filters expose all checks, warnings, passes, and skipped checks.
- Expand a finding to inspect its rule and evidence, locate its preview section, and open the relevant correction field.
- Project consistency findings show document and demo project values separately. Explicit Use demo project value actions update the editable draft; saving and rechecking are still required.
- The sample starts with a resumption date before the hold date and missing Strategic Planning sign-off details. Correct the date to explore a resolved finding. Do not invent real approvers or dates: unknown details may remain blank.
- Save draft retains changes and marks the previous results stale. Save & recheck produces a new check snapshot. Closing the editor preserves unsaved edits; Discard changes restores saved fields.
- Earlier checks retain their fields and project snapshot. Editing opens the current draft, and only the latest saved and checked revision can be downloaded.

## Download rules

Download options are available from the report header and at the end of the report.

| State | Behavior |
| --- | --- |
| No check, running check, unsaved changes, or saved changes not rechecked | Download blocked. |
| Viewing an earlier check | Open the latest check before downloading. |
| Non-empty project name, manager, or sector differs from the selected fixture | Correct the mismatch before downloading. |
| Invalid dates or an inverted hold/resumption interval | Correct the dates before downloading. |
| Missing fields, warning findings, or unavailable checks | Download allowed after explicit acknowledgement. Missing content remains blank. |

The export operation enforces the same rules as the visible button. Acknowledgement is reset on save/recheck and cannot carry over to a new check.

The download is a native editable `.docx` containing the checked field values, project context, revision, and check number. Template labels are English; entered text is preserved without automatic translation. It is a structured demo layout, not the official approved template. Uploaded documents include unchanged extracted source text in a clearly separated reference appendix. Corrections do not overwrite the original upload or update Synergy.

## Scope and limitations

- The base local field checks are combined with the saved workflow requirements. The number of checks depends on the configured stages; unavailable checks remain explicit. Passing does not authenticate approval or establish full document compliance.
- Comparisons use the selected demo project snapshot. Live Synergy, approved templates, AI assessment, OCR, original layout reconstruction, signatures, and server-enforced authorization remain integration work.
- Extraction supports labeled fields and multiline narrative values. Arbitrary original layouts, tables, graphics, and nontext content are not reconstructed in the Word draft.
- Drafts, uploads, and history remain isolated by demo account in page memory and clear on reload.
- This is the owner-style correction journey. A dedicated Excellence Team submitted-document journey and admin configuration remain separate work.

## Verification

- Syntax checks, the complete existing test suite, and static build.
- Regression tests cover missing-content acknowledgement, source mismatch/date blocks, unsaved/stale/history states, immutable revisions, native DOCX packaging, escaped content, original-source preservation, re-extraction, and manager scope.
- Browser checks cover sample correction/download, uploading the exported DOCX, source mismatch correction from an upload, mobile layout, and Arabic direction.
- The downloaded sample DOCX was rendered and both pages inspected for readability.

The BRD gap report remains a dated assessment of the pre-implementation baseline. This document records the new milestone without implying the remaining BRD gaps are resolved.


## Workflow configuration update

New checks capture the saved validation/approval configuration. Previous checks keep their original settings. A settings change requires rechecking before owner download. Disabled approval stages no longer create mandatory sign-off findings; roles without mapped document fields remain manual checks. Settings are shared across demo accounts for the page session. See ADMIN-CONFIGURATION.md.
