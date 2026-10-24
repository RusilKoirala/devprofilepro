# Test coverage and limits

24 October 2026. Local app, baseline dfacad7. Read [REPORT.md](REPORT.md) for the buyer assessment and 31 findings.

## Status definitions

- **Live pass:** the observed flow completed in the browser or through the running local HTTP route.
- **Live fail:** an issue was reproduced against the running product.
- **Offline:** actual functions/tests ran without a complete signed-in browser workflow.
- **Inspected:** UI/source reviewed; successful server-side completion is not established.
- **Not run:** no completion claim. Reasons are listed below.

A passing small fixture is not proof of good results on a long real Career Record. A working download endpoint is not proof that the dashboard can find the file. Both distinctions mattered in this audit.

## Feature matrix

| Area / feature | Method and result | Status / finding |
| --- | --- | --- |
| Landing page | Rendered, read offer, examined example and main CTAs | Live; availability/feature promises disagree with implementation, F10/F11 |
| Landing navigation anchors | All inspected /# targets existed | Live pass |
| Mobile navigation | Opened menu and followed sign-in | Live pass |
| Landing responsiveness | Measured 390px mobile and approximately 1441px desktop; no document overflow in those landing views | Live pass for sampled views |
| Pricing monthly/pass toggle | $29/90-day pass changed to $12/month; renewal language changed | Live pass |
| Pricing FAQs | Expanded unlimited explanation; compared it with budget path | Live UI; promise conflict F08 |
| Waitlist form | Inspected loading/success/error UI and route; invalid/missing emails returned 400 | Partial live pass; real signup/contact creation not run |
| Sign-in | Signed-out app redirected to local Clerk page; provider/email controls rendered | Live pass to sign-in |
| OAuth sign-in completion | Owner completed login; authenticated app then loaded | User completed; not an automated OAuth test |
| Sign-up / new account | No disposable fresh account supplied | Not run |
| Protected routes | /home, /record, /resume, /start/new and data/PDF/LaTeX/export APIs redirected signed-out requests | Live pass; eight paths in API results |
| First-run path chooser | All three persona paths rendered | Live pass for navigation/UI |
| First-resume source screen | Connected GitHub, school, optional PDF/ZIP/notes and provider disclosure rendered | Inspected; no rebuild of owner's base resume |
| Fresh-account full build | Requires a disposable account to avoid replacing/merging existing career material | Not run end to end |
| GitHub OAuth linking | Existing connected account was shown; permission/linking flow not changed | Inspected |
| GitHub repo import/sync | Reviewed ranking, limits, manifests, source persistence and manual UI | Inspected; no live re-import |
| GitHub automatic background update | No current watcher/schedule/setting found | Missing advertised behavior, F10 |
| GitHub PR ingestion | Reviewed action/parser flow | Inspected; not live imported |
| PDF resume/LinkedIn ingestion | Inspected upload, extraction, transcription and error paths | Inspected; no live source upload to owner's record |
| LinkedIn import dialog | PDF and ZIP choices, external guidance links, disabled empty-submit state rendered | Live pass for dialog |
| LinkedIn ZIP reader | Existing tests exercised CSV quoting/newlines, private-column removal and career-file selection | Offline pass; transport size conflict F18 |
| Pasted notes | Inspected source form/ingestion path | Inspected; no new live source saved |
| X bio/posts | No reader/input path found, despite marketing promise | Missing, F10 |
| AI extraction | Ran all three existing fixtures against configured provider | Offline live-provider pass |
| AI fact checking | Existing quote, quantity, metadata, ownership, question-fact tests | Offline pass |
| AI question generation | Live-provider fixture run produced bounded questions, including ownership | Offline live-provider pass |
| First-run tappable interview | Reviewed progress, answer batching, skip and persistence | Inspected; not completed on owner data |
| Existing impact questions | Rendered on record/editor; empty Save disabled | UI inspected; actual answers not changed |
| AI bullet writing | Live-provider fixture run: six bullets in student fixture, six in resume fixture, zero personal team bullets before ownership | Offline live-provider pass |
| Career Record loading | Real record and source status rendered | Live pass |
| Provenance popover | Clicked source chip; claim, exact quote and source filename appeared | Live pass |
| Duplicate record handling | Same freelance period and similar employers appeared as multiple entries | Live quality issue, F14 |
| Manual add dialog | Opened form; empty Add was blocked by required Name validation | Live pass for required-field validation; saving not run |
| Fact merge | Existing dedupe tests; action reviewed | Offline pass / inspected; no live merge of owner data |
| Base resume editor | Loaded all visible sections and controls | Live pass; output-quality findings F04 |
| PDF preview | Rendered embedded live PDF; downloaded file checked independently | Live pass |
| Readiness checks/parser view | Loaded actual parsed PDF and warnings | Live pass mechanically; misleading readiness F04 |
| Mobile editor layout | 390px viewport, document width 433px; controls clipped | Live fail, F05 |
| Mobile readiness shortcut | Click selected Checks; scroll remained zero and Checks was about 4650px below top | Live fail, F06 |
| Header/detail forms | Reviewed form/action paths; no shared owner contact/details saved | Inspected |
| Manual bullet edit | Actual editLine + buildResume exercised against in-memory database adapter | Offline shared-version mutation reproduced, F03 |
| Add/delete bullet and undo | Reviewed shared persistence and undo snapshot | Inspected; destructive/live owner wording changes not run |
| AI rewrite / Polish | Writer exercised in fixtures; UI/actions reviewed | Offline writer pass; live button rewrite not run on shared wording |
| Section ordering | Chat moved Skills first; editor arrow moved it again; final audit order restored | Live pass |
| Item drag ordering | Button/drag implementation and pure order tests examined | Offline pass; browser drag not exercised |
| Hide item on tailored resume | Hid Student API on audit resume only | Live pass |
| Restore item | Chat restored Student API | Live pass; dependent section move was skipped, F22 |
| Pin / restore fit cuts | Existing pinned-overflow PDF test passed; UI/action paths reviewed | Offline pass; live shared pin not changed |
| One-page fitting | Existing real pagination test passed; downloaded base was one Letter page | Live/offline pass for sampled document |
| Fit priority on tailored resumes | Real-PDF synthetic reproduction cut job-relevant low-original-rank content first | Offline failure reproduced, F12 |
| New tailored resume | Saved audit resume and job/match data successfully | Live completion; incorrect evidence associations F01 |
| Match report accuracy | Compared visible explanation and persisted selection/facts | Live fail, F01 |
| Reopen match report | Opened generated resume, returned/reloaded creation/editor views | Missing UI access, F07 |
| Resume chat layout edit | Sent explicit section-order-only request; applied move persisted | Live pass |
| Chat dependent actions | Show project then move its formerly absent section | Live partial failure, F22 |
| Chat history persistence | Reloaded audit resume; changes remained, chat reset to empty | Live history-loss finding, F21 |
| Long chat | Client sends growing history; server max(30) before slice(-12) | Code-level deterministic failure, F21; not 16 paid live turns |
| Resume library management | Third resume appeared; no rename/duplicate/archive/delete workflow found | Missing controls, F15 |
| PDF download | Browser received file; success toast; JSON export confirmed saved snapshot | Live pass |
| Saved PDF re-download | Direct observed export ID used because history UI is broken; original/re-download SHA-256 equal | Live pass for endpoint; UI access blocked by F02 |
| Export history/dashboard | Still zero after full reload despite three exported rows in backup | Live fail, F02 |
| History query diagnosis | Public-key, read-only query shape returned PGRST201 for duplicate relationships | Live diagnostic confirmed F02; no private rows read in diagnostic |
| Mark as sent | Control/action reviewed; actual history table unavailable because F02 | Not run live |
| LaTeX download | Browser downloaded .tex | Live pass for download; content mismatch F26 |
| Overleaf | POST/export implementation reviewed; external upload not executed | Inspected; compiled parity not verified |
| JSON export | Browser downloaded full JSON; parsed counts, selected audit rows, export IDs | Live pass; full backup kept out of repository |
| Public ATS valid upload | Synthetic resume + job post checked in browser and HTTP | Live pass; 88 parsing score and 75% keyword match in browser case |
| Public ATS missing email | Parsed PDF returned report but claimed ATS readability failure | Live misleading result, F24 |
| Public ATS blank PDF | 200 with fail verdict | Live pass for detection |
| Public ATS non-PDF | 400 with actionable error | Live pass |
| Public ATS corrupt PDF | 422 with actionable error | Live pass |
| Public ATS >5MB | 400 with size guidance | Live pass |
| Public ATS no file | 400 requesting PDF | Live pass |
| ATS raw-text expansion | Opened report; expected synthetic text displayed | Live pass |
| ATS check another | Cleared file/report; job post stayed available | Live pass |
| ATS changing file after result | New filename with previous report still visible | Live fail, F23 |
| ATS keyword matching | Common tools worked; Go-only case omitted Go | Live/offline findings, F25 |
| Short selectable text | Real analysis function called with 115 readable characters; called probable scanned image | Offline failure reproduced, F24 |
| ATS rate limiting | Reviewed IP/request-count behavior; intentionally did not exhaust public quota | Inspected; distributed enforcement not established |
| Pro display | Current cancelled monthly plan correctly showed retained access/end date | Live display inspected; subscription unchanged |
| Upgrade/checkout | Reviewed API session creation, return path, fallbacks | Inspected; no financial transaction |
| Billing portal / keep Pro / cancel | Visible controls and handlers reviewed | Not invoked; account's existing cancellation preserved |
| Billing events | Existing tests covered monthly, cancellation, past-due, pass stacking, refunds and stale-event cases | Offline pass; signed provider webhook delivery not replayed |
| Payment return | Banner trusts upgraded query parameter rather than verified payment | Inspected issue, F28 |
| Plan allowances/usage | UI, accounting queries, action enforcement and daily budget reviewed | Code findings F08/F09/F27; free/pro exhaustion not live exercised |
| Cross-user ownership/RLS | SQL constraints/policies and existing database-test script reviewed | Not rerun against hosted DB or two test identities |
| URL checking / SSRF controls | Existing destination, redirect and DNS-pinning tests passed | Offline pass; no live adversarial network testing |
| Account/source/data removal | No complete app workflow found; no records deleted | Missing control, F17 |

## Commands and results

Run from the repository root unless specified otherwise.

| Check | Result |
| --- | --- |
| npm test | 46 passed, 0 failed, approximately 2 seconds |
| npm run lint | 0 errors; existing next/no-img-element warning in components/LogoLoop.tsx |
| npx tsc --noEmit | Exit 0 |
| npm run eval -- --dry-run | Initial tsx CLI attempt hit sandbox IPC restrictions |
| node --env-file=.env.local --import tsx --require ./evals/stub-server-only.cjs evals/run.mts --dry-run | All three fixtures enumerated; this only checks fixture structure |
| Same direct-node eval without --dry-run | All three live-provider fixtures; 27 expectations passed, zero rejected returned bullets |
| Isolated next build --webpack | Initial sandbox DNS failure fetching Google Fonts; retried with network and passed |
| Isolated npm run build with symlinked dependencies | Turbopack rejected temporary node_modules symlink outside its root; a test-setup limitation, not an app defect |
| Default build with cloned installed dependencies | Passed with the unchanged npm run build script and cloned installed dependencies; see evidence/build-default.log |
| Reproduction scripts | See evidence/reproduce-modules.mts and evidence/reproduce-fit.mts; both exercised actual app functions |

The build copies use the same app sources/configuration and existing local environment, in temporary directories. No change was made to the running app's .next directory or product source to make a check pass.

## Things that remain unverified

1. Fresh signup followed by real GitHub/PDF/LinkedIn import, interview answers, and first saved resume in an empty account.
2. Source refresh against changed remote material; loss/recovery after upload/model/database failures in a real session.
3. Real manual entry creation, rewrite, question-answer save, bullet deletion/undo, and shared pin behavior on disposable data. These could change the owner's shared Career Record, so this audit used inspection, existing tests, and isolated reproductions instead.
4. Actual checkout, entitlement timing, failed payment, cancellation/resume, pass purchase/renewal boundaries, and signed webhook delivery. Existing billing behavior tests are narrower than a real purchase journey.
5. Two-user hosted RLS/storage isolation and the database SQL integrity test suite. No disposable database or second identity was used.
6. Password-protected/scanned-PDF OCR through live AI transcription, image-heavy/very large documents, non-Latin fonts, Overleaf compilation, and all browser/device combinations.
7. Full screen-reader, keyboard-only, color-contrast, reduced-motion, accessibility-zoom and performance/load audits. This pass caught targeted label/overflow/feedback issues, not every possible accessibility problem.
8. Live waitlist email delivery. Invalid input was tested without adding contacts or sending mail.

## Evidence and privacy

The evidence folder contains selected UI screenshots, API/module results, build/eval logs, synthetic PDFs, and repeatable offline scripts. It does not contain keys, tokens, the complete downloaded JSON backup, or raw private source uploads. Some screenshots show the owner's resume and public professional details. Review them before external distribution.

An automatic review briefly blocked observation of Google sign-in because it could reveal private account content. The owner completed login; testing then continued on localhost. No attempt was made to inspect Google account content or bypass authentication.
