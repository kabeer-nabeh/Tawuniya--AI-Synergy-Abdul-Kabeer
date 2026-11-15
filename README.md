# Tawuniya AI Synergy

An internal frontend prototype embedded in a mock Mobility application. Business records, identities, AI responses, and workflow settings are illustrative.

## Run locally

Requires Node.js 20 or later.

```sh
npm run dev
```

Open http://localhost:5173. For port 5174, use `PORT=5174 npm run dev`.

```sh
npm run check
npm test
npm run build
```

## Explore

Open **AI Synergy**, continue through the demo SSO account picker, and choose an identity.

| Account | Main capabilities | Project Hold scope |
| --- | --- | --- |
| Executive, Health Head, Technology Owner | Assistance, Forecasts, Data quality | No document actions |
| Afnan Rayyani | Assistance, document creation/validation, Forecasts, Data quality | Project Alpha |
| Renad Alotaibi | Assistance, document creation/validation, Forecasts, Data quality | Claims service improvement |
| EPMO Excellence Team | Assistance, validation, Excellence review, Forecasts, Data quality, Administration | All sample projects |

- **AI Assistance:** sample questions and source inspection, plus Create a document and Validate a document tasks. The floating AI Assistance chat is separate.
- **Project Hold validation:** choose a sample or upload a document, inspect findings, correct fields, recheck, and download an editable DOCX. Source mismatches, invalid dates, and outdated checks must be resolved before download. Missing information requires acknowledgement.
- **Excellence review:** browse submitted documents, confirm project/type, inspect findings and every document section, and copy the reviewer summary. Upload and samples open from the top-right primary button. This is a read-only assessment; final decisions remain in Synergy.
- **Administration:** configure validation/approval stages and responsible roles for each catalog type. Save/discard, stage ordering, version history, and old/new values are supported. New owner/Excellence checks use the saved version.
- **Forecasts and Data quality:** interactive simulations, scenario comparisons, rule-based findings, filters, and local review actions over sample records.

## Data and integration boundaries

PDF, DOCX, TXT, and Markdown uploads are read locally, up to 10 MB. PDF.js and Mammoth are vendored with licenses. Scanned PDFs need OCR; Excel and PowerPoint imports are pending. Corrections create a new structured document and do not overwrite the source file or reconstruct its original layout.

Drafts, conversations, reviews, submissions, and workflow settings are kept in page memory. Account activity is isolated; workflow settings are shared within the workspace page session. Reload restores defaults. Real SSO, server permissions, Synergy/Corporater APIs, approved templates, AI services, durable storage, and organization-wide audit are not connected. Local checks do not authenticate approvals or establish formal compliance.

## Vercel deployment

The repository contains the build configuration: `npm ci`, `npm run build`, output `dist`.

The public overview is `/demo.html`. Set the production/preview secret `AI_SYNERGY_DEMO_PASSCODE` to exactly six digits to enable protected demo access. A valid passcode grants an eight-hour browser session. Missing or invalid configuration leaves the workspace locked. Changing the value and redeploying invalidates earlier sessions on the new deployment.

Local development does not require a passcode when the variable is unset. Do not commit environment files or passcodes. Share the production URL and passcode separately.

The AI Synergy workspace and demo sign-in run inside the Mobility tab's iframe. The host exchanges account, language, and destination context using origin/source checks. The SSO-start endpoint is a future integration hook; the current sign-in uses demo identities.

## Implementation notes

- [Project Hold flow](PROJECT-HOLD-FLOW.md)
- [Excellence review](EXCELLENCE-REVIEW-FLOW.md)
- [Admin configuration](ADMIN-CONFIGURATION.md)
- [Product context](PRODUCT.md)
- [Interface conventions](design.md)

Design Prototype by Abdul Kabeer. This prototype is for internal demo purposes.
