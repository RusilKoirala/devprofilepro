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
- Contact fields and item metadata lack a complete editing workflow. Explicit second-page controls also need work.
- Onboarding progress advances on a timer rather than reporting actual server stages.
- Source re-import overwrites raw text in place. Versioned source evidence is still needed for reliable historical provenance after refresh.
- Quote matching and quantity checks do not prove semantic entailment of every claim. User review and live model evaluations remain necessary. Strict metadata matching may omit supported paraphrases.
- Per-user generation caps require Upstash configuration. The process-local server spend guard is not a deployment-wide hard billing cap.

## Validation

Offline tests cover evidence/quantity checks, team ownership, question answers, date handling, LaTeX escaping, SSRF destinations/redirects/DNS pinning, and real PDF pagination. `supabase/tests/record_integrity.sql` tests transaction rollback, layout references, manual edits, ownership, RLS and export immutability with two users.

TypeScript, production build and ESLint are checked separately. ESLint retains the existing `LogoLoop.tsx` image warning. AI fixture dry runs inspect fixture structure only; paid live AI calls and hosted Clerk/Supabase browser flows were not exercised in this review.
