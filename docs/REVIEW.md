# Implementation review — 23 October 2026

Scope: the local staged, unstaged and untracked implementation, compared with `IMPLEMENTATION.md`. This is primarily Milestone 1; later milestones are not implemented.

## Fixed in this review

| Finding | Correction |
| --- | --- |
| Rebuilding deleted record items and their bullets before replacement generation succeeded, invalidating existing layouts and losing visibility choices. | Imports now merge additively, retain existing IDs and wording, fill missing metadata, and deduplicate facts. |
| Regeneration deleted bullets first and cleared manual-edit protection even if generation failed. | `replace_generated_bullets` saves the batch and layout references in one database transaction, keeps existing IDs where possible, and releases edits only on a successful explicit rewrite. |
| Quantity validation treated `2k` and `2`, or `40%` and `40`, as equivalent. A valid quote could support an invented metric in fact text. | Validate complete quantities, ranges, bounds, percentages and uncertainty in both extracted facts and generated bullets. |
| Item metadata bypassed provenance checks, allowing unsupported titles, dates and skills into the rendered resume. | Ground metadata against the sources of verified facts. Omit unsupported fields instead of rendering them as verified. |
| Team ownership flags were discarded, allowing shared READMEs to become personal accomplishment bullets. | Retain the flag, add an ownership question, wait for an answer before writing personal bullets, and restrict their citations to user-supplied facts. |
| Editing a bullet retained source quotes that no longer supported the changed text. | Save the edited assertion as a user fact and replace the bullet's citations accordingly. |
| User-supplied links were fetched from the server without destination checks. | Reject private/reserved IPs and unsafe schemes/ports, pin validated DNS answers, validate every redirect, bound request duration, and discard response bodies. |
| RLS checked row owners but allowed references to another user's records. Storage UPDATE allowed PDF snapshots to be overwritten. | Add composite ownership foreign keys, bullet/fact validation, and separate storage policies that permit updates only to uploads. |
| Oversized nonwrapping PDF entries could draw beyond the page. | Allow entries to flow across pages; retain pinned content and report overflow. |
| Numeric date ranges and December/year boundaries could pass despite running backwards. Unknown dates appeared checked. | Correct month parsing and distinguish unchecked/unrecognized dates. |
| LaTeX escaping corrupted inserted backslash commands and left braces/commands unescaped in URLs. | Escape text in one pass and escape complete link targets and email addresses. |
| Several database/storage writes ignored errors; manual entries did not acquire bullets. | Check write results, retain usable old data on replacement failures, and create plain fact-based manual bullets without AI. |
| JSON backups silently stopped at PostgREST's row limit; failed reads became empty arrays. | Page through every table in stable order and fail explicitly on read errors. |
| GitHub count failures were interpreted as zero contributors, implying solo ownership. | Represent failed counts as unknown and require confirmed contribution counts before producing a solo signal. |
| Onboarding always disclosed Anthropic even when OpenAI was configured, and blocked manual-only records from building. | Name the active provider and allow existing manual entries to produce a draft without an uploaded source. |

The new migration must be applied before using the revised writing actions. It has been exercised on temporary PostgreSQL 16 with local Supabase auth/storage stubs; it has not been applied to a hosted database.

## Remaining implementation gaps

- Milestone 2 tailoring (`/jobs/new`, A4, match reports) and Milestone 3 wins, refresh proposals and revision review are absent. Do not advertise them as implemented.
- Account/data deletion, PostHog funnel tracking, Sentry and invite/waitlist configuration still need completion or deployment verification.
- Explicit second-page controls still need work.
- Source re-import overwrites raw text in place. Versioned source evidence is still needed for reliable historical provenance after refresh.
- Quote matching and quantity checks do not prove semantic entailment of every claim. User review and live model evaluations remain necessary. Strict metadata matching may omit supported paraphrases.
- Per-user generation caps require Upstash configuration. The process-local server spend guard is not a deployment-wide hard billing cap.

## Validation

Offline tests cover evidence/quantity checks, team ownership, question answers, date handling, LaTeX escaping, SSRF destinations/redirects/DNS pinning, and real PDF pagination. `supabase/tests/record_integrity.sql` tests transaction rollback, layout references, manual edits, ownership, RLS and export immutability with two users.

TypeScript, production build and ESLint are checked separately. ESLint retains the existing `LogoLoop.tsx` image warning. AI fixture dry runs inspect fixture structure only; paid live AI calls and hosted Clerk/Supabase browser flows were not exercised in this review.

## Core-flow pass — 23 October 2026

Changes aimed at "best resume, effortlessly" (Problem 1, F3/F5/F6/F9):

| Change | Where |
| --- | --- |
| One "Build my resume" button: adds whatever is in the form, then runs extract → write → fit → questions as separate server calls, so the progress list shows real stages and what each found (items, facts matched, lines cut). | `components/app/start-form.tsx`, `stage*` actions in `lib/record/actions.ts`, `writeBase`/`relayoutResume` in `lib/record/pipeline.ts` |
| Optional target role on `/start` and in the header editor, passed to Write (A3) so bullets lead with what matters for it. Stored in `resumes.layout.target_role`. | same |
| Jobs and schools are always newest first; section order follows the person (Education first for students/interns, Experience first for working devs, Projects before Experience with no jobs). | `sectionOrder`, `orderItems`, `lib/resume/dates.ts` |
| Write prompt rewritten around a verb → what → tech → result structure, with weak openers rejected by the code check. | `lib/ai/write.ts` |
| Editor: edit name/contact/headline, edit any entry's title/company/dates/links/skills, add or remove a line (with undo), undo on hide, move projects/skills/awards and whole sections, rewrite with a direction (shorter, lead with impact, more technical, plainer). | `components/app/resume-editor.tsx` |
| Impact questions appear inside the entry they improve, with a "Make it stronger" summary; plain-code coaching hints (weak opener, filler, too long, repeated verb, no result) on each line. | `components/app/questions-panel.tsx`, `lib/resume/hints.ts` |
| A readiness badge ("Ready to send" / "N to fix") in the editor header, from the same checks as the Checks tab. | `components/app/checks-panel.tsx` |

Verified: typecheck, ESLint, unit tests (incl. new `lib/resume/hints.test.ts`), production build, and the editor/start UI rendered with mock data. Not verified: a signed-in end-to-end run against Supabase and a live AI provider.

## New resumes and resume chat — 23 October 2026

| Change | Where |
| --- | --- |
| `/resume`: a prompt ("paste a job post, or say what this resume is for") turns into a conversation. One AI call (A4, `step: "tailor"`) picks and orders Career Record items, then the resume is saved as `kind: "tailored"` with `layout.include`, fitted and checked, each as a visible step. It never rewords lines: bullets are shared by every resume. | `lib/ai/tailor.ts`, `stageTailorPlan`/`stageTailorSave`, `components/app/resume-home.tsx` |
| Hide/show on a tailored resume changes only its `include` list, not the item's status in the base resume. | `setItemStateIn` in `lib/record/edits.ts` |
| Resume chat (Edit / Chat toggle in the editor). Each message is one AI call (`step: "chat"`) that returns a reply and typed edits. Code checks every edit against the current resume (ids exist, no numbers that aren't in the entry's facts or the user's own messages, no filler), applies the ones that pass in order, re-fits once and reports each as applied or skipped. Rewording goes through the fact-checked writer (`rewrite_entry`). | `lib/ai/chat.ts`, `lib/record/chat-actions.ts` (+ test), `chatWithResume` |
| Edit logic moved to `lib/record/edits.ts` so server actions and the chat share it. | `lib/record/edits.ts` |

Not verified: live AI runs of tailoring and chat (the browser checks used mock data without a signed-in session). Rewrite and pin still act on the shared item, so they affect every resume that shows it.
