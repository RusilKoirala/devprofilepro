# DevProfile Pro: buyer, UX, and functional audit

Date: 24 October 2026 (Asia/Kathmandu). Repository baseline: dfacad7. Tested the local app at http://localhost:3000 against its configured services.

## Would I pay?

**I would use the free version, but I would not pay for Pro yet.** The main problem is confidence in the result and the paid workflow. The visual style is not the biggest obstacle. There are real UI defects, especially on mobile, but a visual redesign alone would leave the strongest reasons not to buy untouched.

The valuable idea is a developer resume built from evidence: import work once, ask for missing context, and produce versions for applications without inventing accomplishments. Free PDF/LaTeX downloads, readable exports, source quotes, and a non-renewing pass are good choices. There is enough functioning software here to test that proposition seriously.

What breaks it today: a newly generated match report attached explanations to the wrong projects; the dashboard could not find saved downloads; wording is shared across supposedly separate resume versions; and weak existing output was labelled ready to send. These make me check the product's work instead of trusting it to save time.

| Question | Assessment |
| --- | --- |
| Is it UI? | Partly. Mobile clips controls, hides the preview far below the editor, and has a readiness shortcut that gives no visible response. Desktop hierarchy is broadly understandable. |
| Is it missing features? | Yes. Persistent match-report access, independent wording per resume, resume management, source removal, and useful application tracking are missing or incomplete. |
| Are features broken? | Yes. Live tailoring produced incorrect evidence associations. Download history fails on a real database query. ATS results become stale when the input changes. |
| Is the core output worth money? | In the sampled account, it still requires significant human editing. The current small synthetic AI evals pass, so this is a coverage gap as well as a quality problem. |
| Is the price the main issue? | I would fix delivered value before changing the price. The $12/month and $29/90-day options are clear, but the actual paid advantage and availability promises do not yet line up. |

This is one evaluator's purchase judgment, not conversion research or a claim that all users feel the same way.

## What was actually tested

I used the public UI, then the existing signed-in account after the owner completed login. The account had 18 sources, 25 non-contact Career Record entries, two existing resumes, and Pro access. I created one clearly named audit resume, ran two layout/inclusion chat requests, moved a section with editor controls, hid/restored a project on that audit resume, downloaded PDF/LaTeX/JSON, and checked saved-export retrieval. Existing resume wording, source evidence, interview answers, and billing were not changed.

The detailed [coverage matrix](TEST-COVERAGE.md) distinguishes live UI results, offline reproductions, code inspection, and untested cases. **This is not a claim that every feature passed end to end.** A fresh-account build, live source imports/sync, destructive operations, actual purchases/refunds/cancellation, and multi-user hosted RLS tests remain unverified.

Validation completed:

- 46/46 existing automated tests passed.
- ESLint passed with one existing LogoLoop image warning; TypeScript passed.
- Live AI evaluation: all three synthetic fixtures and all 27 expectations passed, using the configured provider. See [live output](evidence/live-ai-eval.log). Dry-run output alone was not treated as an AI-quality test.
- Isolated production build with Webpack passed after allowing Google Fonts network access. See [build output](evidence/build-with-network.log). The unchanged default npm run build also passed in an isolated copy with locally cloned dependencies; see [default build output](evidence/build-default.log).
- Public ATS API: valid, missing-contact, blank, non-PDF, corrupt, oversized, and missing-file cases exercised. Invalid waitlist payloads and signed-out protected routes exercised. See [API results](evidence/api-results.json).
- Actual exported PDF: one Letter page, selectable text, no observed page clipping. Saved re-download was byte-for-byte identical: SHA-256 deb4a9f91bec0ee571ae00178eaa13f4c0cb38c87caaada227608815bfee67d6.

## Findings, ordered by buyer impact

P1 means a major trust, core-task, or purchase blocker. P2 means a material workflow/quality defect. P3 means lower-impact friction. Evidence labels matter: an inspected code path is not a live failure.

### F01 — P1 — The paid match report associates evidence with the wrong items

**Evidence: live UI and saved data.** I requested a backend resume for Go, Node.js, PostgreSQL, Docker, APIs, and testing. Generation succeeded and saved “AUDIT - Backend Engineer - 2026-10-24”. However:

- “Skills” was explained as an open-source contributor role with role logging and permission handling.
- “Student API” was explained as an Express/Postgres uptime-monitoring platform, which describes PulseOps. Student API's own saved facts describe Go/JavaScript, a Dockerfile, deployment, and commits.
- The summary said PulseOps and an open-source role were included. The saved selection was a freelance job, a skills item, and Student API.
- Education was omitted even though the record contains it and the tailoring system prompt says to keep it when available.

This is not just awkward prose: it gives the user incorrect reasons to believe the resume covers a job. Known IDs are checked, but a valid ID can still refer to the wrong evidence. [Screenshot](evidence/tailor-result-mismatched-evidence.png), [saved report](evidence/tailor-saved-report.json), [tailor implementation](../../lib/ai/tailor.ts).

**Smallest useful correction:** require claims and requirement statuses to cite supporting facts belonging to the named item; enforce required selections in code; check coverage against the final fitted resume. Add this real long-record failure to the eval set. Do not treat a plausible summary as verified evidence.

### F02 — P1 — Download history is broken, including after a full reload

**Evidence: live UI, JSON backup, and read-only database diagnostic.** PDF download showed a success toast. The backup contained three export rows, but the dashboard showed “Downloads 0”, “No downloads yet”, and “Download your first PDF”. Reloading did not repair it.

The dashboard embeds resumes(title) without disambiguating the relationship. The database has both exports_resume_id_fkey and exports_owned_resume. A read-only request with the same query shape returned HTTP 300 / PGRST201: more than one relationship was found. The page ignores the query error and converts it into an empty history. [Diagnostic](evidence/history-query-diagnostic.json), [backup counts](evidence/data-export-counts.json), [screenshot](evidence/dashboard-stale-downloads.png), [dashboard query](../../app/(app)/home/page.tsx).

**Correction:** use an explicit relationship, for example resumes!exports_owned_resume(title), and handle query errors visibly. An error must not become “you have never downloaded anything”. Retest history, mark-as-sent, and its re-download link after fixing the query.

### F03 — P1 — Separate resumes do not have independent wording

**Evidence: actual edit/build functions reproduced with an in-memory database adapter; source inspection.** Editing a bullet on a tailored resume updated the same bullet read by the base resume. Deletion, entry details, contact details, and pinning also use shared records. Hide/show and order are more isolated, which makes the boundaries difficult to predict.

The Career Record page does disclose that changes affect every resume. The editor/chat says it edits “this resume”, however, and a buyer needs different emphasis for different applications. Historical PDF snapshots are safe; editable resume versions are not independent. Updating one resume also does not necessarily re-fit or refresh the other affected resumes.

[Reproduction](evidence/module-reproductions.json), [edit implementation](../../lib/record/edits.ts), [document construction](../../lib/resume/build.ts).

**Correction:** keep common facts, but store resume-specific wording and visibility. Until then, clearly identify shared changes at the point of editing and show every affected resume. A confirmation alone would not supply the missing ability to tailor wording independently.

### F04 — P1 — Existing resume quality is below the confidence implied by “ready to send”

**Evidence: signed-in editor, parser view, and rendered existing PDF.** The sample contained:

- A bullet repeating the job title and employment dates already in the heading.
- Deployment-URL bullets beside project headings that already have links.
- Repeated technology inventories instead of distinct achievements.
- A contributor role with no accomplishment bullets while its ownership question remained open.
- Overlapping Skills/Languages lists, with Node.js in Languages.
- Expected graduation repeated in education details and the date field.

The checks said “Reviewed and ready to send” and only raised date/skill warnings. They check structure, links, and fact references; they do not establish that the resume is persuasive, complete, or free of repetition. [Editor evidence](evidence/editor-checks-desktop.png), [rendered export](evidence/exported-base-resume.png), [readiness logic](../../lib/resume/checks.ts).

**Correction:** call the result a structurally checked draft; flag empty experience entries, duplicate information, thin deployment-only bullets, and unresolved ownership. Let users resolve the highest-impact questions before declaring readiness.

**Scope:** this is a real existing account sample, not proof that today's writer always produces these bullets. The three newly run synthetic writer fixtures passed. The gap is that passing those fixtures did not catch the actual account experience.

### F05 — P1 — Mobile editor content overflows and clips controls

**Evidence: live UI at a measured 390px CSS viewport.** Document width was 433px. The contact-card Edit button and section-order controls extended beyond the right edge. This is a functional editing problem, not a preference about spacing. [Screenshot](evidence/editor-mobile-top.png), [measurements](evidence/mobile-editor-measurements.json), [editor](../../components/app/resume-editor.tsx).

**Correction:** remove min-content pressure from the grid/editor children, allow contact text to break, and keep action buttons within the available width. Verify the same record at 360px, 390px, and 430px.

### F06 — P2 — Mobile preview/checks are buried; the readiness shortcut appears inert

**Evidence: live UI.** Preview/Checks was approximately 4,650px below the top of the base editor. Tapping “Ready, 2 to review” selected Checks but left scrollY at zero. The user gets no visible indication that anything happened. [Measurements](evidence/mobile-editor-measurements.json).

**Correction:** give mobile a persistent Edit / Preview / Checks switch, or scroll/focus the selected panel. A long editor followed by a long off-page-items list should not come before the only way to inspect the document. The existing readiness callback only sets the selected tab.

### F07 — P1 — The match report is stored but cannot be reopened through the resume UI

**Evidence: live navigation/reload and source inspection.** The initial tailoring result showed requirements and explanations. Opening the saved resume exposed Edit, Chat, Preview, and Checks, but no match-report view. The jobs row retains match_report; the resume page does not load it. Returning to the creation screen starts a new empty conversation.

**Correction:** attach a persistent Job / Match view to each tailored resume, containing the original job post, supporting evidence, gaps, and coverage after fitting. This is a paid benefit that must remain useful after the first generation screen closes. [Resume page](../../app/(app)/resume/[id]/page.tsx), [creation view](../../components/app/resume-home.tsx).

### F08 — P1 — Pro's unlimited promise conflicts with its hard AI stop

**Evidence: code and public pricing UI; threshold was not deliberately exhausted.** Pricing says unusually heavy use may switch to a faster model instead of cutting the user off. The AI budget path does not load the plan. Both plans share a default $0.50 per-user daily stop and a $2 per-process daily stop. Configured Upstash limits are also per step rather than plan. No promised plan-aware model downgrade exists.

**Correction:** implement the stated paid availability behavior or publish the actual allowances. Keep abuse protection, but a normal paying user should not discover a hidden shared beta budget mid-application. [Budget](../../lib/ai/budget.ts), [rate limits](../../lib/ratelimit.ts), [pricing FAQ](../../app/(marketing)/pricing/page.tsx).

### F09 — P1 — There is little enforced reason to upgrade during early access

**Evidence: code inspection, explicitly intentional in the source.** Free monthly allowances are displayed, but the tailoring UI says users can continue after exhausting them during early access. The server actions do not enforce these monthly plan allowances. PDF access, editing, and the underlying generation path remain the same; history is queried the same way for both plans.

This is a commercial-readiness issue, not an allegation that an accidental paywall bypass was found. **Why would I pay for volume while Free explicitly lets me keep going, especially when Pro has the same hard AI stop?**

**Correction:** either sell early-access support honestly, or implement and test a meaningful Pro service level before selling the stated upgrade. [Early-access allowance message](../../components/app/resume-home.tsx), [plan usage](../../lib/usage.ts), [server actions](../../lib/record/actions.ts).

### F10 — P1 — Automatic updates and X ingestion are advertised beyond the implementation

**Evidence: rendered landing page and repository-wide feature review.** The landing page says the product watches GitHub, updates every time you ship, and runs itself after setup. Its mockup shows a live update switch and change feed. Current source management provides manual update/sync actions; there is no implemented watcher, scheduled refresh route, user auto-update setting, or refresh-review lifecycle. The landing also advertises reading X bios/posts, while current ingestion has no X reader or handle input.

**Correction:** remove or mark these promises as planned, or ship them with review and recovery controls. Do not let a decorative future UI be mistaken for the current product. [Landing](evidence/landing-desktop.png), [mockup](../../components/marketing/app-mockup.tsx), [source management](../../components/app/record-sources.tsx).

### F11 — P2 — The homepage says to wait even while the app and checkout path are open

**Evidence: public and signed-in UI.** The hero, primary CTA, and availability FAQ still say “Join the waitlist” / opens in batches. Meanwhile sign-up works, pricing offers “Start free” / “Get Pro”, and the signed-in navigation offers Dashboard.

**Correction:** derive availability copy and primary CTAs from the same launch state. Give someone with an application due today a direct route to their first useful result. A waitlist is a poor primary action for an already available tool.

### F12 — P1 — Page fitting can remove job-relevant content before generic content

**Evidence: executed offline reproduction using real PDF fitting.** I ordered the most relevant backend project first but gave it a low original Career Record rank. The fitter cut six of its bullets while leaving all fourteen bullets of a generic high-ranked project. It uses original item rank, not the tailoring relevance order. The synthetic volume makes the conflict visible; it is not a claim that normal users should have fourteen bullets per entry.

**Correction:** fit using a resume-specific relevance score and bullet priorities. Recompute the match report from what survives the fit. [Reproduction](evidence/fit-relevance-reproduction.json), [fitter](../../lib/resume/fit.ts).

### F13 — P2 — Sync can find new facts without updating existing resume wording

**Evidence: code inspection.** Imports add facts to existing items, but ordinary writeBase/writeItems skips items that already have bullets. This protects manual work, but it also means an updated fact may never improve the existing wording. Metadata merges fill blanks rather than reconciling changed accepted values.

**Correction:** present refresh proposals for changed facts/entries and let the user approve wording updates while preserving manual edits. “Update everything” needs to explain which parts actually changed. [Pipeline](../../lib/record/pipeline.ts).

### F14 — P2 — The Career Record still makes the user reconcile duplicates and conflicts

**Evidence: live record.** The same freelance period appeared under “Web Application Developer” and “Full Stack Developer”. Layer5 appeared under two similar employer names. Contact facts repeated the same links under different phrasing and retained different website values. Exact identity keys include role/company text, so these variations can survive deduplication.

**Correction:** suggest entry-level merges and show conflicting accepted values with source/date context. Existing fact deduplication does not solve duplicate jobs or decide which website is current. [Identity keys](../../lib/record/types.ts), [fact dedupe](../../lib/record/dedupe.ts).

### F15 — P2 — No basic resume library management

**Evidence: live UI and action inventory.** I could create a third resume but found no rename, duplicate, archive, or delete action. The editor title is plain text. There is no search/filter for an active job hunt. The audit resume therefore remains in the account.

**Correction:** start with rename, duplicate, and recoverable archive/delete. This becomes more important as Pro encourages many versions. Do not make a user open an AI conversation to obtain basic document management.

### F16 — P2 — “What you sent where” does not record where

**Evidence: UI model/source; live history controls are blocked by F02.** Exports have a sent timestamp checkbox, but no recipient/company/job URL, application status, or note. On top of that, the dashboard reads only the latest 20 exports without pagination, for both plans, while Pro says every sent version is kept forever.

**Correction:** associate an immutable snapshot with an application destination and provide paginated history. Distinguish “stored forever” from “accessible in the UI”. Fixing the query alone does not complete the promised feature. [Exports table](../../components/app/exports-table.tsx), [dashboard](../../app/(app)/home/page.tsx).

### F17 — P2 — Account control is incomplete for uploaded career data

**Evidence: source/UI inventory; destructive behavior was not tested.** JSON export works. I found no app workflow to remove a source, remove its stored upload, selectively forget evidence, or delete all app data. A Clerk account menu is not proof that deleting identity also removes Supabase rows/files; no cleanup integration was found. Public navigation also has no privacy/retention or terms page.

**Correction:** provide source-level removal and a complete app-data deletion workflow, explain retention and provider processing, and test cleanup. This is a trust and control finding, not a legal-compliance conclusion.

### F18 — P2 — LinkedIn ZIP size support conflicts with the upload transport

**Evidence: code inspection.** ZIP ingestion allows 50 MB, while Next server actions allow a 12 MB body. The source UI has no corresponding preflight size check. Many files accepted by the ingestion function cannot reach it through the actual UI transport.

**Correction:** agree on one end-to-end limit, validate it before upload, and use a suitable upload route/storage flow if large archives are required. [ZIP reader](../../lib/ingest/linkedin-zip.ts), [server-action configuration](../../next.config.ts).

### F19 — P2 — Partial source failures can continue into an apparently successful update

**Evidence: code inspection.** addSources can return ok:true with failed coverage rows. The first-resume flow checks that some source succeeded, but RecordSources.update does not. It proceeds to extraction/writing against the old record even if the new import failed, potentially spending AI usage and ending with “up to date”. Uploaded PDFs are also stored before parsing, with no cleanup if parsing throws.

**Correction:** stop or explicitly request continuation when all requested inputs fail; separate “read old data again” from “imported your new source”. Clean up failed uploads. [Source update flow](../../components/app/record-sources.tsx), [PDF ingestion](../../lib/ingest/pdf.ts).

### F20 — P2 — Re-import overwrites the source behind old citations

**Evidence: code inspection.** saveSources upserts the same source ID with new raw text. Existing facts/quotes still cite that row. A future GitHub README update can make a historical quote impossible to verify against its original source. Immutable PDFs preserve the output, but do not preserve full historical evidence.

**Correction:** version source text and bind facts to the exact version read. [Source persistence](../../lib/record/db.ts).

### F21 — P2 — Chat history disappears, and a long conversation eventually hits a deterministic limit

**Evidence: live reload for history loss; code inspection for length failure.** Reloading the audit resume reset chat to “Tell me what to change”, although edits persisted. Messages exist only in component state. Separately, the server validates at most 30 messages before taking the last 12, while the client keeps sending the growing conversation. After 15 complete exchanges, the next user message produces 31 messages and fails validation.

**Correction:** persist useful history per resume and trim before applying the bounded-history schema. Surface a recoverable error/retry state rather than raw validation details. [Chat component](../../components/app/resume-chat.tsx), [server validation](../../lib/record/actions.ts).

### F22 — P2 — A multi-action chat can reject a section it just restored

**Evidence: live UI.** After hiding Student API on the audit resume, I requested restoration and section order Experience, Projects, Skills. The result said it restored Student API but skipped moving Projects because “That section isn't on this resume.” The validation context was built before restoration. Other moves happened to result in the requested final order, but the skipped-action explanation was still incorrect.

**Correction:** validate/apply dependent actions against evolving state, or plan and validate the final state before writing. Add a show-entry-then-move-section regression. [Screenshot](evidence/chat-restore-skipped-section.png), [chat action processing](../../lib/record/actions.ts).

### F23 — P2 — ATS results remain visible for a different selected file

**Evidence: reproduced in public UI.** I checked clean-resume.pdf, then selected missing-contact.pdf. The old passing result and Alex's old email remained visible until another check completed. Editing the job post has the same stale-result risk because results are not tied to a particular input.

**Correction:** clear/invalidate the report whenever the file or job post changes; label results with filename and checked time. Also clear a previous selected file when rejecting a new one. [Screenshot](evidence/ats-stale-result.png), [file selection state](../../components/marketing/ats-checker.tsx).

### F24 — P2 — The ATS verdict conflates missing content with an unreadable PDF

**Evidence: public UI/API and offline analysis.** The missing-email PDF yielded readable text but was labelled “An ATS will struggle to read this.” Missing education also produces a parsing failure under the heuristic. A separate offline input containing 115 fully selectable characters was called a probable scanned image solely because it was short. “No bullet points found” also receives a green content check.

**Correction:** separate extraction/readability, missing information, and content strength. Report what was observed instead of asserting that ATS software cannot read a file. Put the tool's limited scope near the verdict, not only below the report. [API results](evidence/api-results.json), [reproduction](evidence/module-reproductions.json), [analysis logic](../../lib/ats/analyze.ts).

### F25 — P2 — The keyword checker drops Go and misses common naming equivalents

**Evidence: executed offline case and code inspection.** A Go job and a Go resume produced a report that did not assess Go at all. The implementation explicitly discards “Go” unless “Golang” also occurs. A whole-term list also treats many common aliases separately, such as Postgres versus PostgreSQL.

**Correction:** use contextual disambiguation and canonical skill aliases. The result should show which requirements were recognized, unsupported, or uncertain. A developer-specific tool should handle Go particularly well. [Reproduction](evidence/module-reproductions.json), [keyword matching](../../lib/ats/keywords.ts).

### F26 — P2 — LaTeX is not an exact editable copy of the downloaded PDF

**Evidence: actual LaTeX download, implementation, and offline reproduction.** The PDF is generated with React PDF; the .tex is a separate template with different fonts/sizing. The LaTeX contact line omits location, which the PDF includes. Fitting is measured on the React PDF, not a compiled .tex file. One-page parity in Overleaf is therefore unverified.

**Correction:** include identical content, state which renderer determines page fit, and verify compiled LaTeX for representative documents. Do not imply that an exact PDF can always be recreated simply by opening the .tex. [Reproduction](evidence/module-reproductions.json), [LaTeX template](../../lib/resume/latex.ts), [PDF template](../../lib/resume/pdf/Template.tsx).

### F27 — P2 — Usage numbers do not match the pricing vocabulary reliably

**Evidence: code inspection.** Pricing describes one rebuild plus one GitHub sync; usage combines them as two successful extraction runs. Every successful chat run counts as an AI fix even if it changes nothing or all edits are skipped. Counts reset by calendar month, including Pro, and query errors silently become zero usage or a Free plan.

**Correction:** record successful user-level usage events with a clear definition, separate builds/syncs if selling them separately, and show an unavailable state on billing/usage query failure. [Usage implementation](../../lib/usage.ts), [plan definitions](../../lib/plans.ts).

### F28 — P2 — The payment-return page can claim payment was received without checking

**Evidence: code inspection; no purchase was made.** Any nonempty upgraded query parameter on /home triggers the banner. If the user is not Pro, it says “Payment received, thank you” and tells them to wait/refresh. The query string is not evidence of successful payment. There is no visible timed reconciliation/retry workflow.

**Correction:** render a neutral “Checking payment status” state until a verified payment/entitlement is confirmed. Provide a useful recovery route for delayed/failed entitlement rather than asking a paying customer to keep refreshing. [Dashboard banner](../../app/(app)/home/page.tsx).

### F29 — P2 — First-run progress and answers are not resumable after interruption

**Evidence: code inspection; fresh-account completion was not rerun.** Onboarding phases, selected files, interview cards, and answer choices are client state. The UI asks users to keep the tab open; failures return to an earlier phase. A reload can lose unsaved answers and cause another import/extract pass. Ordinary network exceptions are not consistently caught around all staged client calls, so a rejected call can leave a busy state.

**Correction:** persist a build/job checkpoint and save interview answers as they are completed. Retry the failed stage without rereading everything. Distinguish stalled, failed, resumable, and completed jobs. [First-resume flow](../../components/app/first-resume-flow.tsx), [start form](../../components/app/start-form.tsx).

### F30 — P2 — Important inputs lack programmatic labels; some status feedback is visual only

**Evidence: accessibility-tree inspection and code.** Impact-question text is rendered separately from an unlabeled input; the tree exposes a generic text field. GitHub username fallback and optional ATS job-post input rely on placeholders. ATS errors/results lack a clear live announcement. The custom Edit/Chat tab controls do not implement the full keyboard behavior supplied by the Radix tabs used elsewhere.

**Correction:** associate prompts/labels and descriptions with inputs; announce async errors/results; use consistent accessible tab behavior. Reordering does have button alternatives, which is good. This was a targeted accessibility inspection, not a complete screen-reader certification. [Questions](../../components/app/questions-panel.tsx), [ATS form](../../components/marketing/ats-checker.tsx), [editor](../../components/app/resume-editor.tsx).

### F31 — P3 — The public sample is too polished to establish the ordinary user's outcome

**Evidence: marketing UI; buyer judgment.** The example emphasizes large user counts, stars, downloads, and senior-level work. The real sampled record needed ownership answers and had much thinner deployment/stack bullets. An early-career developer cannot see a realistic source-to-first-draft-to-reviewed-result example before signup. The mockup's export controls are deliberately inert and hidden from assistive technology; that is not itself a broken button.

**Correction:** add a clearly labelled, working sample built from modest student/public-repo evidence, with its actual PDF, edits, limitations, and time to completion. Show how answers improve weak material. This would establish value more effectively than more lighting or animation.

## What is missing, without turning everything into a feature request

The following would directly support the product's current paid proposition:

1. Independent wording per resume while retaining shared source facts.
2. A persistent job post / match report with evidence that survives fitting and editing.
3. Reliable, searchable application/export history with a destination.
4. Resume rename/duplicate/archive, source removal, and data cleanup.
5. A review flow for changed source evidence, rather than silent merging or automatic acceptance.
6. A resumable first build and explicit recovery for AI, upload, and payment failures.

Multiple visual templates, cover letters, interview prep, and a full job CRM are **not prerequisites** to fix the current product. Their absence should not distract from broken delivery of existing promises. Cover letters/interview prep are described as future access, so I did not mark them as broken shipped features.

## Purchase objections by user type

| User | Why I might try it | Why I would not pay yet |
| --- | --- | --- |
| Student with a few public repos | Questions and evidence could turn sparse work into a defensible first resume. | The sample overemphasizes popularity; weak repo facts still need coaching. Mobile editing is frustrating. |
| Experienced engineer with mostly private work | Manual notes and old-resume imports can preserve real accomplishments. | GitHub is not my main evidence source; duplicate jobs/conflicting facts and weak output make reconciliation work for me. |
| Active applicant sending many versions | Tailoring, match reports, and immutable snapshots could save repeated work. | Incorrect evidence matching, shared wording, disappearing reports, and broken history undermine exactly the volume workflow Pro sells. |
| Returning user months later | A maintained Career Record could remove the need to start over. | Automatic maintenance is advertised but absent; current sync does not reliably turn updated facts into revised existing wording. |

## Fix order and release gate

**First:** fix F01/F02/F03, then verify that a resume can be tailored, independently edited, exported, found again, and linked to the correct job with accurate evidence. These are trust blockers.

**Second:** fix output/readiness quality and the mobile editor. Test ordinary early-career inputs, not only impressive sample resumes. Preserve the current simple visual language while correcting overflow and navigation.

**Third:** reconcile launch, pricing, AI availability, sync, and privacy/control promises with the implementation. Charge for an advantage that is actually delivered and test failed/late payments before relying on checkout revenue.

A useful release scenario is: a new student and an experienced engineer each import evidence; resolve ownership/conflicts; produce a good base resume; tailor two jobs; change one version without changing the other; recover from a failed call/reload; export and retrieve the exact sent PDF; reopen its accurate match report; and manage plan/data access. Run it on phone and desktop. Passing unit tests alone is insufficient.

## Account/artifact changes made during this audit

- Added one resume: AUDIT - Backend Engineer - 2026-10-24 (ID dfe48d24-0a2a-4364-8c42-f9a9aa46a927), plus its job/match row.
- Ran two chat requests affecting only that resume's section order/inclusion. Restored Student API; final section order is Experience, Projects, Skills.
- Created one additional saved PDF export of the existing base resume. Downloaded that snapshot again, plus LaTeX and JSON, into the browser's normal Downloads folder.
- Did not change existing bullet wording, sources, real answers, billing, subscriptions, or account settings. Did not remove the audit resume through a database shortcut; the missing UI management action is F15.
- Repository changes are confined to this audit folder. Evidence includes synthetic fixtures and selected screenshots of the owner's product data; review before sharing the folder publicly. No credentials or full JSON account backup were copied into this folder.
