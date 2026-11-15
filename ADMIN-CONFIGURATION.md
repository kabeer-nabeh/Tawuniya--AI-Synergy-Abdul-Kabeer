# Validation and approval configuration

Implemented 15 November 2026.

## Access

Select the EPMO Excellence Team demo account and open AI Synergy → Administration. The existing `admin` capability controls editing; manager and leadership accounts cannot change the settings.

## Configuration

- Select one of the 13 document types in the catalog.
- Enable validation and approval independently. Both, either, or neither can be required.
- Add, name, reorder, and remove stages. Every enabled stage requires a name and a responsible role from the demo role catalog.
- Save activates a new version for that document type. Discard restores the saved configuration.
- Switching document type with unsaved changes offers Save & switch, Discard & switch, or Stay here.
- Change history records the document type, administrator, timestamp, old version, and new version, including the stage order and role assignments.
- Stale drafts cannot overwrite a newer saved version.

Only Project Hold starts with the previously demonstrated stage requirements. The other types are marked unconfigured until explicitly saved. Unsupported document types can have settings prepared, but the UI identifies that their document checks are not available yet. These configurations do not imply that the complete approved template library has been implemented.

## Effect on checks

The app holds one shared configuration store for the workspace page session. Account-specific conversations, documents, drafts, and reviews remain separate. Switching demo accounts does not reset the shared settings.

New standalone validation runs capture the saved configuration at the start of the check. Project Hold owner and Excellence reviews use the same configuration. Old review records retain their original workflow snapshot and version.

For Project Hold, enabled approval roles with existing sign-off fields (Sponsor, Executor P&Q, Contributor P&Q, Strategic Planning) use those field-presence/date checks. Disabled roles no longer produce mandatory sign-off findings. Additional roles and validation stages remain explicit manual/connected checks; a local field check never authenticates a role's completion or a signature. Inactive sign-off fields remain visible as optional source content in Excellence review.

An owner download is blocked if its checked settings version is older than the active configuration. Rechecking captures the new settings. This prevents exporting a draft as current after requirements have changed.

The settings describe review requirements. They do not execute an approval, reject a document, or modify the Synergy workflow/status.

## Current limits

Settings and change history are in page memory. Reload restores demo defaults. Durable storage, organization-wide synchronization, server authorization, authoritative Synergy roles, conditional applicability, and approved acceptance policies require backend integration. This milestone does not implement new-role creation or user-permission administration.

## Interface updates in the same milestone

- Page-level introductions and repeated captions were shortened or removed across Assistance, creation, validation, Excellence review, Forecasts, Data quality, and sign-in.
- Supporting demo information remains available in expandable help. Field errors and action-specific warnings remain visible.
- The submitted-document list has a top-right primary Upload or try samples button. It opens a native modal with file upload and samples, keyboard containment, Escape-to-close, and focus restoration.
- Document context confirmation uses one Review document action, rather than a checkbox plus a second confirmation action.
- Review results prioritize issues and evidence. Review history and workflow settings are under Review details & history. Earlier results and all section data remain available.

## Verification

The complete test suite covers the four requirement combinations, access control, mandatory roles, ordering, cancellation, version conflicts, audit records, old/new check snapshots, inactive approval fields, and stale-download blocking. Browser checks cover save/error feedback, unsaved switching, account switching, updated checks, the upload modal, reduced page headers, desktop/mobile layout, and Arabic direction.

## Editor refinement

The configuration editor uses compact stage rows with shared column labels, separate Validation and Approval sections, and accessible Required switches. Save and Discard stay beside the page title while scrolling; saved/unsaved state is visible below the title. Change history is collapsed until requested. Mobile restores per-field labels and stacks inputs; Arabic mirrors the layout. Reordering and removal preserve focus near the edited stage.
