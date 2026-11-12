# Tawuniya Synergy Assistant

### Dedicated document validator

**Upload support:** Use the upload area to choose/drop a text PDF, DOCX, TXT or Markdown file (10 MB maximum), select a demo template, then Validate document. PDF.js 6.5.438 and Mammoth 1.13.0 are vendored locally with their licenses. Files are read in the browser and are never sent to Synergy, an AI service or this static server. Reports show actual extracted labeled fields and the selected template. The report can inspect original extracted text, correct review fields and recheck. Changes do not rewrite the original file. Scanned PDFs require OCR and show an explicit unsupported message. Templates currently check the reporting dates, owner and next step only; there is no AI content review or live comparison.

Open AI Synergy → AI Document Validator as EPMO (two samples) or Afnan (assigned Project Alpha sample). Selecting an unchecked sample starts checks automatically. The report stays in its own tab with structured preview, findings filters, evidence location, editing, save/recheck, stale-result warnings and checked-version history. Renad has a no-assignment state; Leadership has no validator tab. Standalone drafts/checks are separate from chat and isolated by account. All clear on reload.

The document-validator module and its tests cover separate document state, immutable snapshots, rechecks, regressions and revisions. This milestone checks three editable sample fields. AI content review and live Synergy comparisons remain unconnected.

A local AI Synergy UI prototype using the supplied Tawuniya logo and local WOFF2 typeface. The role-aware foundation provides navigation for UC01 Assistant/Documents, UC02 Forecasts and UC03 Data quality. See [design.md](design.md) for design tokens and flows, and [PRODUCT.md](PRODUCT.md) for product context.

## Run

Requires Node.js 20 or later. No dependency installation is needed.

```sh
npm run dev
```

Open http://localhost:5173. To use a different port, run `PORT=5174 npm run dev`. The server binds to loopback only.

```sh
npm run check
```

## Deploy the passcode-protected demo on Vercel

Import the repository into Vercel and use the checked-in build settings. In **Settings → Environment Variables**, add `AI_SYNERGY_DEMO_PASSCODE` as a Secret for each environment you deploy, such as Production and Preview. Enter exactly six digits, including any leading zero, then deploy or redeploy. Share the passcode separately from the demo URL.

Visitors see the public overview at `/demo.html` before entering the workspace. A valid passcode gives the browser an eight-hour session. The gate covers direct workspace, iframe, and app asset requests. If the passcode is missing or its value differs from the six-digit format, the overview remains available and the workspace stays locked. Changing the passcode and redeploying invalidates earlier sessions on the new deployment.

To try the full flow locally, set `AI_SYNERGY_DEMO_PASSCODE` in your shell before running `npm run dev`. With the variable unset, local development opens the workspace directly and `/demo.html` remains available for layout review.

## Tawuniya sign-in and Mobility embedding

Select **AI Synergy** in Mobility or **Tawuniya sign-in** in the demo account panel. **Continue with Tawuniya SSO** opens a demo account picker inside the iframe. Select an account to load the workspace in that same frame with its role and project scope. The host retains the frame when switching platform tabs.

The demo picker uses sample identities. The gateway route is available for future integration through the server-side `TAWUNIYA_SSO_START_URL` variable. Live session establishment and the return to Mobility require Tawuniya integration. See the [implementation plan](AI-Synergy-02-Implementation-Plan.md).

## Try the flow

The initial screen is a coded mock of the supplied **Mobility** application reference, with a purple platform header, breadcrumbs, project navigation, gauges, summary figures and a sample comparison chart. The previous full-screen screenshot is no longer rendered.

Click **AI Synergy**, immediately after **Projects Overview**, to open the sign-in screen in the workspace iframe. The first two tabs are **AI Assistance** (supplied AI orbit icon) and **AI Document Validator** (document/check icon). Assistant/Documents (UC01), Forecasts (UC02), Data quality (UC03), and authorized Administration live in this tab.

The bottom-right **AI Assistance** FAB opens a separate query-only chat. It has its own messages and unsent draft, can expand/collapse, and never contains the full workspace navigation or document editor. Requests for document tools, forecasts or quality provide a handoff to the AI Synergy tab. The current workspace destination and draft survive opening/closing assistance.

## Demo accounts and navigation

Click **Demo account** in the top-right platform header. The default account is EPMO Excellence Team. The same role policy applies in the AI Synergy tab and AI Assistance.

| Account family | Available destinations | Sample scope |
| --- | --- | --- |
| Executive / Health Head / Technology Owner | Assistant, Forecasts, Data quality | All projects / Health sector / Technology portfolio |
| Project Manager (Renad / Afnan) | Assistant, Documents with Create and Validate, Forecasts, Data quality | Assigned projects; Renad has no assigned sample, Afnan has Project Alpha |
| EPMO Excellence Team | Assistant, Documents with Validate, Forecasts, Data quality, Administration | All sample projects and both sample documents |

The embedded AI workspace uses role-aware horizontal tabs in its top bar, opposite the scope badge and conversation-history control. The conversation sidebar and history control appear only in the **AI Assistance** tab, which uses the supplied AI icon. Documents, Forecasts, Data quality and Administration use the full content width. On mobile the tabs scroll horizontally above the scope controls. Administration is also reachable through the EPMO account panel. Each account retains separate workspace and assistance activity, unsent drafts, and saved/unsaved artifact edits. Switching retires in-flight sample responses and restores their prompts to the outgoing account's drafts. Task/tab navigation preserves progress. Reloading clears session state.

**This milestone implements the foundation:** Forecasts and Data quality show their effective sample project scope and inspectable project context, with explicit unconnected states. They do not calculate forecasts, run scans or show invented results. Create document and Administration expose role-appropriate entry pages; guided authoring, prompt management and logs remain later milestones.

## Existing UC01 journeys

1. Open **AI Synergy → Assistant**, then select **What’s the latest status of Project Alpha?** to receive a sample project answer. Alternatively use the AI Assistance FAB for a separate query conversation.
2. Open the source button to inspect its reporting period and supporting evidence.
3. Ask a follow-up or try **How is the milestone delivery KPI performing?** in a new conversation.
4. For EPMO or a Project Manager, open **AI Document Validator → Validate document**, or click **Validate document** in the composer toolbar. Choose a sample document and checking starts automatically. The starter question **Can you check my report against its template?** also opens the conversational journey. Selecting a document from the composer’s plus button also starts validation immediately. Document choices follow the demo account's scope.
5. Expand a finding, select **Edit this section**, and add a reporting period, accountable owner or next-step due date.
6. **Save draft** to keep edits without changing the result, or **Save & recheck** to run the checks on the revised document. Partial corrections leave remaining issues open.
7. Inspect **View checked version** on an earlier result to see its original evidence. When required checks pass, open **Reviewer summary**. An optional suggestion can remain open.
8. Switch to Arabic to explore the translated RTL layout.

Sources and artifact editing open in scoped detail panels. Escape closes an open panel first; when assistance is expanded it returns to compact, then closes compact assistance. Escape does not close the embedded AI Synergy workspace. The composer supports Enter to send and Shift+Enter for a new line. Source/document panels support Escape and keyboard focus containment. Conversation history and feedback are in memory for the current page session.

## Forecasts (UC02)

Open **AI Synergy → Forecasts**. Use the **Projects** menu to show all projects in scope, one sector, one portfolio or one project. **Forecast [measure] at [date]** switches between IPI, TI, PI, MI and CI, at each project's end date, year-end 2026, Q1 2027 or Q2 2027. The page answers, in order:
1. **Outlook:** how many projects will be below plan, at risk or on plan, and the average now vs forecast with its 80% range.
2. **Early warnings:** changes since the September run and patterns in recent months (3+ month declines, stalled progress, long stretches below plan). Filter by type or followed projects, mark items reviewed, and set rules (chance-drop threshold, patterns, good news). Email and Synergy delivery are shown as not connected.
3. **Management summary:** generated from the forecast with a sample template, with Copy, Download CSV (the current project list) and Print / Save as PDF.
4. **Monthly chart:** IPI, TI, MI and CI actuals and forecast to end dates, with line toggles, hover values, the IPI 80% range, a horizon marker and the what-if line.
5. **What-if:** sliders for PI, AI, TI, MI and CI hold values from now for all shown projects or one project. Save up to four named scenarios and compare them.
6. **What drives it**, **Breakdown** and **Projects to watch**, which now has a "Since Sep" change column and a "Biggest drop" sort.
7. **Model accuracy:** a backtest of April forecasts against October actuals: average error, share inside the 80% range, right side of plan, bias, largest misses.

"How this forecast works" includes **Preview service states** (calculating, out-of-date run, partial data, service unavailable) for design review.

Select an outcome, driver or group to filter the list. Select a project for its fan chart, drivers, progress pace and scenarios. There are two scenarios, improve one index or move the end date, and up to three per project can be compared against an unchanged baseline. **Ask why** sends a forecast explanation to AI Assistance, with a link back.

Forecasts come from an illustrative, seeded model in `src/forecast-model.js`. It runs 1,000 simulated futures per project over 40 sample projects in `src/forecast-data.js`, so numbers are identical on every load. The IPI/TI weights follow the reference. The outcome thresholds (≥60% chance on plan = on plan, 30–59% = at risk) and the plain-language index names are working assumptions to confirm with EPMO. See [the forecasting plan](AI-Synergy-03-Forecasting-Plan.md).

## Data quality (UC03)

Open **AI Synergy → Data quality**. Detection finds issues with rules and simple statistics, and every finding has a reason computed by code. AI only summarizes and explains afterwards. The page shows, in order:
1. **Scan result:** how many findings need attention, how many objects they affect, a severity bar, and what changed since the previous scan (new, resolved, still present).
2. **What kind of problems** (completeness, validity, consistency, uniqueness, timeliness, statistical, with change since the previous scan) and **Fix first**, the objects with the most serious findings and who owns them.
3. **AI summary:** pick all findings that need attention or the current filtered view. The summary states its scope and lists every number it used, all taken from the scan.
4. **Findings:** filter by severity, category, object type, rule, review status and search. "New since last scan" is highlighted, and the list can be downloaded as CSV.

Select a finding for its reason, evidence, a chart for KPI findings, a plain-language explanation, who can fix it and a review: **Acknowledge**, **Mark explained** or **False positive** (a note is required for the last two), with an audit trail. Previous/Next move through the list. **Ask in AI Assistance** sends the explanation to the chat. Review status never changes Synergy data; explained and false-positive findings leave "Needs attention" but stay in the audit trail.

**Rules** (EPMO only) switches each of 21 rules on or off and sets thresholds (spike sensitivity, level shift sensitivity, repeated-value length, late-entry days). Changes apply on **Re-scan**, which compares against the scan before it. Leadership accounts are view-only; EPMO and project managers can re-scan and review. Project managers see project findings only; KPI findings belong to sector owners and are shown to EPMO and sector leadership. These permissions are working assumptions to confirm.

The sample has 40 projects and 14 KPIs with deliberate defects in two snapshots (the previous and current scan) in `src/quality-data.js`. The rule catalog, severities and thresholds in `src/quality-rules.js` are working assumptions to confirm with EPMO. Email and Synergy alert delivery are shown as not connected.

## Prototype boundary

Chat responses and business values are illustrative examples. The artifact editor runs three deterministic local checks on the entered reporting dates, accountable owner and next-step action/due date. It preserves a snapshot of each run and identifies resolved items on rerun. These field checks do not constitute full document analysis or template compliance verification. This app has no live Corporater/Synergy API, LLM, authentication, server authorization, upload/parser or persistent storage. It makes no network calls to an external service. Real integration, audit logs, reviewed translations and production accessibility validation remain future work.

## Files

- `src/app.js`: state, English/Arabic content, artifact editing and conversation flows.
- `src/artifact-review.js`: sample field checks and versioned validation snapshots.
- `src/demo-access.js`: demo identities, centralized capability policy and sample record/document scope.
- `src/foundation-views.js`: role-aware navigation, account switcher, Documents and staged Administration views.
- `tests/demo-access.test.js`: role boundaries, scope intersection and fail-closed policy checks. This tests the demo policy, not production authorization.
- `tests/artifact-review.test.js`: partial corrections, required/optional outcomes, invalid dates, regressions and snapshot isolation. Run with `npm test`.
- `src/platform-shell.js`: coded Mobility host mock, overview gauges/chart and platform tab configuration.
- `src/assistance-chat.js`: independent query-only AI Assistance shell and initial thread state.
- `tests/assistance-chat.test.js`: assistance thread isolation and reset behavior.
- `src/forecast-model.js`: index formulas, seeded simulation, outcome bands, scenarios and portfolio aggregation (no DOM).
- `src/forecast-data.js`: 40 illustrative forecast projects, scope filtering and cached baseline/scenario runs.
- `src/forecast-view.js`: Forecasts page, project detail panel, scenario comparison and the AI Assistance explanation.
- `tests/forecast-model.test.js`: formulas, determinism, insufficient history, scenario immutability/caps, what-if values, scope and totals.
- `src/forecast-insights.js`: early-warning rules (outcome changes, chance drops, patterns) and CSV export.
- `tests/forecast-insights.test.js`: pattern detection, previous run, alert rules and scope, backtest and CSV escaping.
- `src/quality-rules.js`: 21-rule catalog, categories, severities, statuses and configurable thresholds.
- `src/quality-data.js`: sample projects and KPI values with defects in two scan snapshots, and account scope.
- `src/quality-engine.js`: deterministic detection with computed reasons and evidence, scan comparison and priority ranking.
- `src/quality-view.js`: Data quality page, finding detail, rules panel, AI summary and the assistant explanation.
- `tests/quality-engine.test.js`: detection, configuration, scan comparison, scope and capability checks.
- `public/synergy-epmo-background.png`: retained historical reference asset, no longer rendered.
- `src/styles.css`: design tokens, local font definitions, responsive layouts and component states.
- `public/`: original supplied logo and three font weights.
- `dev-server.mjs`: dependency-free local static server.

## Project Hold validator, 11 November 2026

Open **AI Synergy → AI Document Validator** with the EPMO account. Under Recent & sample documents, select **Project Hold · Project Alpha**. It runs automatically and starts with two required findings: a resumption date before the hold date, and missing Strategic Planning sign-off details. Open a finding, choose Correct field, then Save & recheck. Try `2027-03-31` for the resumption date and clearly fictional planning name/date to demonstrate resolution. Earlier checks remain accessible in the version selector.

Uploads can now use **EPMO Project Hold · 2026.1-demo**, with an explicit in-scope project selection. PDF, DOCX, TXT and Markdown extraction remains browser-local. The Project Hold parser recognizes labeled fields in English/Arabic, including Word-style labels on separate lines. It does not infer values from the selected project, reconstruct tables or verify original template layout. Confirm extracted fields before relying on their checks. The original file remains unchanged by edits.

The 26 checks cover seven metadata fields, hold reason and impact, date ordering, five project-review rows, three demo-project comparisons, four sign-off detail rows and four explicitly skipped services. Skipped services are original template layout verification, digital signatures, AI content assessment and sensitive-data screening. They never count as passed. Required rules and sign-off applicability are reference-informed demo assumptions, not an approved acceptance policy. The app supplies no compliance percentage, automated approval or production submission. Summaries are derived from check results without AI.

The new modules are `src/project-hold.js` (rules, extraction and immutable snapshots) and `src/project-hold-ui.js` (report and editor). Older report demos and conversational validation retain their existing checks. Project Hold drafts, uploads and revisions use the existing account-isolated session state. Reload clears them.

Validation for this milestone: syntax checks and 41 automated tests passed. Browser interaction and visual verification could not run because local browser access was disabled in Work settings.
