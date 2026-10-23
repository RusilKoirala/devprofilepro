# DevProfile Pro — User Solutions (Core Features)

> Read [USER_PROBLEMS.md](USER_PROBLEMS.md) first. This doc lists the **core features** that solve those problems. It says **what** each feature must do, not **how** to build it.

> **[Claude section]** Drafted by Claude. Not yet reviewed by the team.

**The bar for a feature to be on this list:**

1. It solves a specific problem from USER_PROBLEMS.md (referenced as `P1.3` = Problem 1, point 3).
2. It's something the big resume tools don't do, or don't do well. If it's just "a template" or "a text editor", it isn't here.
3. It respects the principles: never invent, specific over generic, one page, user stays in control, no paywall trap.

There are 12 features. Two are the **foundation** everything else stands on. The rest map to the three problems.

---

## Foundation

### F1. Career Record: one source of truth for everything you've done

**Solves:** P2.3 (the file fights them), P2.4 (data in many places), P3.5 (version chaos)

**What it does:**
- Keeps everything the user has done as a permanent record of facts: jobs, dates, projects, stacks, numbers, education, links. It isn't stored as a document.
- Every resume (the base and every tailored version) is a **view** of this record. Nothing is a frozen file.
- Every fact remembers **where it came from**: GitHub repo, old resume, LinkedIn PDF, or "the user told us".
- Holds **more than fits on one page**. Old projects that got cut aren't deleted. They stay in the record, ready to come back when they fit a job.
- The user can see, edit, hide, or delete any fact at any time.

**What the user gets:** They never lose their resume again, and they never retype anything. "resume_final_v3_REAL.pdf" stops existing.

**Why no one else does this:** Builders store a document per resume. Change your job title and you change it in every copy by hand. We store the career once and generate the documents.

**Done means:**
- Editing a fact once updates every resume that uses it.
- A cut project can be restored onto any resume in one action.
- Every fact shows its source.

---

### F2. Proof Trail: every line on the resume is backed by a source

**Solves:** P1.5 (over-selling), P3.4 (AI makes it fake), and the hiring-manager distrust of AI resumes (65% say skills are harder to verify)

**What it does:**
- Every bullet, skill, and number on the resume is linked to the source fact(s) it came from. The user can click any line and see why it's there.
- **Hard rule: no source, no line.** The product never writes a claim, metric, tool, or title the sources don't support. If it can't back something up, it asks (see F5). It never guesses.
- Facts get one of three labels so the user knows how solid each one is:
  - **Verified**: seen directly in a source we can check (repo exists, commits by this user, stars, language, deployed link works).
  - **From your documents**: taken from the old resume or LinkedIn PDF.
  - **You told us**: a number or detail the user typed in.
- **"Defend this line" flag:** marks any line the user might struggle to explain in an interview (a tool that appears once in a minor repo, a vague team claim) so they can soften or remove it before sending.
- **Optional public proof link:** a link the user can choose to share with a recruiter. It shows the verified evidence behind the resume (repos, contributions, dates) and nothing private.

**What the user gets:** Confidence that every line holds up when an interviewer asks about it. A resume that reads as trustworthy at a time when hiring managers assume AI resumes are inflated.

**Why no one else does this:** AI builders and ChatGPT are optimised to make you sound impressive, so they fill gaps with plausible fiction. Nobody traces each line back to evidence or gives the employer a way to check. This is our main trust advantage.

**Done means:**
- 100% of resume lines can be traced back to a source.
- Zero invented metrics, tools, or titles in any output.
- The user can see the label (verified / documents / you told us) on every line.

---

## Problem 1 — "I've never made a resume and I don't know where to start"

### F3. Start From What Exists: no forms, no blank page

**Solves:** P1.1 (blank-page paralysis), P1.2 (their evidence is already on GitHub)

**What it does:**
- Three ways in, any combination: **connect GitHub**, **upload an old resume / LinkedIn PDF**, **paste anything** (a portfolio page, a project write-up, notes, a course list).
- Pulls out the facts into the Career Record (F1) and produces a **complete first draft right away**, with no questions first.
- Works with very little input. A student with only a GitHub account and a university name still gets a full, credible one-page draft.
- Never shows the user an empty "Experience" box.

**What the user gets:** They go from nothing to a real draft in about a minute. The founder's ask: "Look at what I've already done and turn it into a proper resume."

**Why no one else does this:** Template builders give you a layout and empty boxes to type into. LinkedIn import tools exist, but none read a developer's actual work (code, repos, contributions) as the main source.

**Done means:**
- A first-timer with only GitHub gets a full draft in under 60 seconds.
- The user types nothing before seeing the first draft.

---

### F4. Hidden Experience Finder: "you have more experience than you think"

**Solves:** P1.2 ("I have no experience" when they do), P1.4 (half-finished repos hurt), P2.5 (old content stays too long)

**What it does:**
- Finds the experience first-timers don't count and turns it into resume material:
  - Open-source contributions to **other people's** repos (merged PRs, issues fixed). These are usually missed because they don't live on the user's profile.
  - Hackathon projects, coursework and capstone projects, club and society tech work, freelance or family-business sites, tutoring, and deployed apps with real users.
- **Ranks every project by strength**: real users, stars, deployment, size of contribution, complexity, recency, originality.
- **Flags what should not appear**: tutorial clones, forks with no changes, empty or abandoned repos, course boilerplate, broken demo links. It recommends hiding them from the resume and from the pinned GitHub profile.
- **Decides the section order** for the user: no work history means Projects lead, and that's presented as normal, not as a weakness.
- Explains each pick in plain words ("Chosen because it's deployed and has 40 users", "Hidden because it's a fork with no changes").

**What the user gets:** A first-timer who believed they had "nothing" sees four solid projects and a real contribution they'd forgotten about.

**Why no one else does this:** No resume tool judges the quality of a developer's work. GitHub-to-resume generators dump every repo equally, tutorials included, which is exactly what recruiters say hurts.

**Done means:**
- Contributions to other people's repos are found and offered.
- Tutorial clones and empty forks never reach the resume by default.
- Every chosen or hidden project has a one-line reason.

---

### F5. Impact Questions: get the real number instead of inventing one

**Solves:** P1.3 (duties, not results), P2.2 (forgot the numbers), P1.5 (under/over-selling)

**What it does:**
- When a bullet is weak because a result is missing, the product asks **one short, specific question** instead of making something up:
  - "Roughly how many people used this?"
  - "Did this make anything faster? About how much?"
  - "Was this solo or a team? How many?"
- Questions are **multiple choice or rough ranges** ("<100 / 100–1k / 1k+") so answering takes seconds and rough numbers are fine.
- Asks **only the few questions that matter most** (biggest improvement to the resume per question), never a long interview.
- Answers go into the Career Record labelled **"You told us"** (F2), then rewrite the bullet as a result: "Worked on backend" → "Cut API response time ~40% by adding caching, serving ~2k weekly users."
- "Skip" is always allowed. A skipped question leaves an honest bullet without a number. It never gets a made-up one.

**What the user gets:** Strong, specific bullets without learning the XYZ formula, and without lying.

**Why no one else does this:** AI tools either leave weak bullets weak or invent numbers ("improved performance by 35%") that the user then can't defend in an interview. Asking a targeted question is what a good career coach does, and no tool does it.

**Done means:**
- No bullet ever gets a number the user didn't provide or a source didn't show.
- A first-timer answers 5 or fewer questions to get a strong resume.

---

### F6. "Is It Right?" Check: the recruiter's 6-second view and the ATS's view

**Solves:** P1.4 (unwritten rules), the founder's "Tell me it's right", and ATS anxiety

**What it does:**
- **6-Second View:** shows the user what a recruiter takes in on the first skim (name, titles, companies, dates, education) and warns if any of it is hard to find.
- **ATS View:** shows the resume exactly as an applicant-tracking system reads it, as plain fields (name, contact, each job, dates, skills), so the user sees for themselves that it parses cleanly. This replaces fear with proof.
- **Rule checks, always on, explained in plain words:**
  - One page, reverse-chronological, consistent date formats, no date gaps or overlaps that don't make sense.
  - Every link tested: GitHub, portfolio, live demos, LinkedIn. Broken links are flagged before sending.
  - No objective paragraph, photo, skill bars, or other outdated or harmful elements.
  - Skills listed on the resume are actually used somewhere in it (no skills dump).
- **Generic language check:** flags empty phrases ("passionate team player", "results-driven", "leveraged synergies") and AI-sounding fluff, and suggests the specific version based on the user's real facts.
- Ends with a clear verdict: **"Ready to send"**, or a short list of what to fix, worst first.

**What the user gets:** Permission to stop worrying. They know it's right without reading a single resume guide.

**Why no one else does this:** ATS "score" tools give a mysterious number and push keyword stuffing. Nobody shows the recruiter's first-pass view, tests every link, or gives a plain "ready to send".

**Done means:**
- Every resume can show its ATS-parsed view.
- No resume is marked "Ready to send" with a broken link or a parsing problem.

---

## Problem 2 — "I have a resume, but I hate updating it"

### F7. Living Resume: it notices what you've done, as you do it

**Solves:** P2.1 (updates only happen under pressure), P2.2 (forgot what they did)

**What it does:**
- Stays connected to GitHub and **notices meaningful new work**: a new project, a big feature shipped, a release, a merged contribution to a known open-source repo, a project crossing a milestone (users, stars, deployment).
- Ignores noise (typo commits, dependency bumps, config tweaks).
- Turns each meaningful change into a **suggested update**: "You shipped OAuth for your Expense Tracker. Add it?"
- **Win Capture:** a quick way to log a win the moment it happens (paste a PR link, a shipped feature, a number from a dashboard, a line of praise from a manager) in under 30 seconds. This is where work that isn't on GitHub (private company repos) gets captured while the numbers are still fresh.
- A light, optional nudge (e.g. monthly): "3 new things since your last update. Review?"

**What the user gets:** When a recruiter messages them, the resume is already current. Nothing has to be remembered.

**Why no one else does this:** Every resume tool is passive. It does nothing until you open it to job-hunt. A resume that keeps track of your work over time is the core differentiator.

**Done means:**
- Meaningful GitHub work shows up as a suggestion without the user doing anything.
- Logging a win takes under 30 seconds.

---

### F8. One-Click Update with a clear diff

**Solves:** P2.1 (pressure), P2.3 (adding one bullet breaks the page), principle 7 (user stays in control)

**What it does:**
- One button: **Update my resume.** Pulls in everything new from the Career Record and suggested updates, and produces the new version.
- Shows a **plain diff** before anything is final:
  - **Added** (new project, new role, new bullet)
  - **Changed** (reworded, number updated, reordered)
  - **Dropped** (pushed off the page, with the reason)
- Accept all, or accept and reject line by line.
- Always lands on **one page**. Uses F9 to decide what makes room.
- Any previous version can be restored.

**What the user gets:** Updating takes one click and a two-minute review, not an evening.

**Why no one else does this:** Updating anywhere else means opening an old file, retyping, and fighting the layout. Nobody shows a "what changed" review for a resume.

**Done means:**
- An update never moves the resume onto a second page.
- Nothing changes on the resume without appearing in the diff.

---

### F9. One-Page Judgement: decides what stays and what goes

**Solves:** P2.3 (one bullet pushes to page two), P2.5 (old content stays too long), P1.4 (one-page rule)

**What it does:**
- When space runs out, it decides **what to cut by strength and relevance**, not by whatever was added last: weaker bullets, older student projects once there's real work, duplicate skills, coursework once there's experience.
- Adjusts as the user grows. A student resume leads with projects and education. A working dev's resume shrinks education to one line and drops early tutorials.
- **Pin and lock:** the user can pin anything that must always stay (a key project, a specific line) and it will never be cut.
- Always explains what was cut and why ("Dropped 'Todo App (2022)': older and weaker than your 3 newer projects"). Cut items stay in the Career Record (F1).

**What the user gets:** They never again have to make the painful "what do I delete" call alone, and the resume matures as they do.

**Why no one else does this:** Other tools shrink the font or let you overflow onto page two. None make the editorial judgement a senior engineer or recruiter would.

**Done means:**
- Every resume is exactly one page.
- Pinned items are never removed.
- Every cut has a visible reason.

---

## Problem 3 — "I need to tailor my resume for this specific job"

### F10. Truthful Tailoring with a Match Report

**Solves:** P3.1 (too tedious), P3.3 (don't know what to change), P3.4 (generic AI makes it fake)

**What it does:**
- Paste a job description or link. Get a tailored, one-page version **in under a minute**.
- Tailoring only **re-chooses and re-frames real facts**. It never adds anything:
  - Leads with the projects and experience most relevant to this job, including items from the Career Record that weren't on the base resume.
  - Reorders skills and bullets so the matching ones come first.
  - **Mirrors the posting's wording where it's truthfully the same thing** ("deployment pipelines" → "CI/CD" when the user really did it).
  - Aligns the headline or title to the role's title when the user's real experience supports it (the strongest signal in the research: 10.6× interview rate).
- **Match Report**, shown next to the tailored resume:
  - **Covered:** each requirement in the posting, and the real evidence on the resume that meets it.
  - **Covered but hidden:** things the user has in the Career Record that match but weren't showing. Now included.
  - **Gaps:** requirements the user doesn't meet, stated plainly. **Never faked or keyword-stuffed.** The user decides whether to apply anyway.
  - **Wording matches:** which of the posting's key terms the resume now uses, so the user is findable in recruiter searches.
- Still passes every check in F6 and every rule in F2 (no source, no line).

**What the user gets:** "Paste the job post, get a version aimed at it that still sounds like me and is all true." Plus an honest read on how well they fit before they spend time applying.

**Why no one else does this:** Keyword-match tools push you to stuff in missing terms, and ChatGPT rewrites you into someone you aren't. Nobody pulls matching but hidden experience out of your full history, shows gaps honestly, and backs every tailored line with proof.

**Done means:**
- A tailored version takes under a minute.
- No tailored resume contains a skill, tool, or claim missing from the Career Record.
- Every gap is shown, not hidden or papered over.

---

### F11. Linked Versions: every tailored copy stays connected to the base

**Solves:** P3.5 (version chaos), P2.4 (copies drift out of sync)

**What it does:**
- Every tailored resume is saved against **its job**: company, role, posting, date created, date sent.
- Tailored versions stay **linked to the Career Record**. When the user updates the base (a new project, a fixed date), the change can flow into every tailored version in one click, with a diff (F8).
- One simple list answers: "Which version did I send to Stripe, and what was on it?" The exact version sent is kept as a snapshot even after later updates, so the user can review it before an interview.
- Clear file names on download (e.g. `Rusil_Koirala_Stripe_Backend.pdf`). No more `resume_v2_final`.

**What the user gets:** Twenty applications, zero confusion. Before any interview, they can open exactly what that company saw.

**Why no one else does this:** Tailored copies elsewhere are disconnected duplicates. Fix a typo in the base and you fix it in ten files, or forget to. Linked versions that inherit base updates don't exist in other tools.

**Done means:**
- A base update can be pushed to every tailored version.
- The exact version sent to each company can always be opened.

---

## Across all three problems

### F12. Sounds Like You, Yours Forever

**Solves:** P3.4 ("still sounds like me"), P1.6 (the paywall trap and the LaTeX trap), principle 8

**What it does:**

*Sounds like you:*
- Writes in **the user's own voice**, learned from how they already write (old resume, READMEs, project descriptions). It doesn't use the same "Spearheaded… Leveraged… Orchestrated…" voice every AI resume shares.
- Prefers plain, specific, technical language, the way engineers actually describe their work.
- Any line can be edited freely. The product keeps the user's edits and doesn't overwrite them on the next update.

*Yours forever:*
- **Free PDF download. No paywall at the moment of download, ever.** The user always knows up front what's free.
- Clean, single-column, ATS-safe, professional design that developers already trust (the Jake's-Resume style) with **none of the LaTeX pain**: nothing to compile, nothing to break.
- Export everything: PDF, the LaTeX source, and the full Career Record as data. The user can leave at any time and take it all with them.
- No auto-renewing trial traps. Cancelling is one click.

**What the user gets:** A resume that sounds like them, looks like the one the best devs use, and that nobody can hold hostage.

**Why no one else does this:** Zety and Resume.io build their business on charging at download. Overleaf/LaTeX gives quality but is intimidating to edit. Nobody offers both the quality and the ease, for free, with full export.

**Done means:**
- A user can download their PDF without entering payment details.
- A user can export their full data and LaTeX source at any time.
- User edits are never overwritten by an update.

---

## Feature map

| # | Feature | Problem | The one thing that makes it ours |
| --- | --- | --- | --- |
| F1 | Career Record | 2, 3 | Career stored once, resumes are views. Nothing is a frozen file |
| F2 | Proof Trail | All | Every line traceable to evidence. No source, no line |
| F3 | Start From What Exists | 1 | First draft from GitHub/resume/paste with zero forms |
| F4 | Hidden Experience Finder | 1, 2 | Judges the quality of dev work. Surfaces the good, hides the tutorials |
| F5 | Impact Questions | 1, 2 | Asks for the real number instead of inventing one |
| F6 | "Is It Right?" Check | 1 | Recruiter 6-second view + ATS view + link tests + "Ready to send" |
| F7 | Living Resume | 2 | Notices your work as it happens. Tools are passive, this is active |
| F8 | One-Click Update + Diff | 2 | Update in one click, see exactly what changed |
| F9 | One-Page Judgement | 1, 2 | Makes the editorial cut a senior engineer would make, with reasons |
| F10 | Truthful Tailoring + Match Report | 3 | Re-frames real facts, shows gaps honestly, never stuffs keywords |
| F11 | Linked Versions | 3 | Tailored copies inherit base updates. Know what you sent where |
| F12 | Sounds Like You, Yours Forever | All | Your voice, LaTeX quality without LaTeX, free download, full export |

## Deliberately not core (for now)

These came up in research but don't meet the bar above yet:

- **Cover letters.** A different problem. Revisit once tailoring is strong.
- **Many templates or themes.** Quantity over quality. One excellent, ATS-safe design beats twenty.
- **A full job-application tracker (CRM).** F11 covers "what did I send where". A full tracker is a different product.
- **Auto-updating LinkedIn and portfolio.** Solves P2.4 fully, but depends on access we don't control. The Career Record (F1) is the base for it later.
- **Auto-applying to jobs.** Works against quality and against hiring-manager trust.
- **Non-developer resumes.** Stay dev-focused while GitHub is the main source.

---

## Codex solution proposal — 23 October 2026

> **[Codex section]** Proposed solutions based on the founder's three problems and the [Codex research review in USER_PROBLEMS.md](USER_PROBLEMS.md#codex-research-review--23-october-2026). Claude's complete proposal above is preserved unchanged. This section describes recommended product behavior, not capabilities already implemented or customer demand already validated. Feature IDs `C1`–`C9` belong to this proposal; `F1`–`F12` refer to Claude's proposal above.

### The product we should build

**Help developers turn the work they can describe or supply into a resume they have reviewed, keep that information reusable, and adapt it to a job without rewriting their history.**

The central product is a career record connected to editable resume drafts. Import reduces typing; focused questions fill important gaps; suggestions help choose and explain relevant work; the user approves changes; exports preserve what was actually sent.

The initial audience should be developers applying to internships and early-career roles, including career switchers. This is a proposed scope choice to keep the first release manageable, not a research finding that they are the best market. Test both first-time applicants and applicants with an existing resume. Use an English-language, US-style private-sector resume as the initial formatting default, state that scope, and let employer instructions take precedence.

GitHub is an optional source. Someone whose work is private, whose projects live elsewhere, or who has no GitHub account must still be able to complete the core task.

| User's problem | Proposed solution | Useful outcome |
| --- | --- | --- |
| P1: I do not know where to start | Import what exists, ask only for essential missing context, and suggest a readable first draft | A reviewed resume without having to learn resume structure first |
| P2: Updating is difficult | Save accomplishments separately from the document and propose a reviewable revision | A current resume without reconstructing or reformatting everything |
| P3: Tailoring is repetitive and confusing | Select relevant facts from the full record, show evidence coverage, and save a version against the job | A relevant application document with accurate history and a retrievable submitted copy |

### Shared foundation

#### C1. Career record with clear sources and user corrections

**Solves:** P1.5, P2.2–4, P3.4–5. **Builds on:** F1 and F2.

Keep jobs, dates, education, projects, contributions, skills, accomplishments, and links independently of any page layout. A resume selects from this record; removing an item from a resume does not delete the underlying information.

Each factual claim should retain its source, the relevant excerpt or observation, when it was imported, and any correction the user made. Distinguish:

| Evidence label | Meaning |
| --- | --- |
| Observed in connected source | The named source showed this particular fact at the recorded time; for example, a repository's name or star count |
| Imported from your document | A resume, export, or pasted document made this claim |
| Confirmed by you | The user supplied or explicitly confirmed the claim |
| Estimate | A value is approximate, with its range, unit, period, and basis retained where supplied |
| Needs clarification | Sources conflict or a proposed claim lacks enough support |

These labels can coexist: a claim can come from a document and subsequently be confirmed by the user. They describe provenance and uncertainty, not an independent certification of the applicant's skills.

When two sources disagree about a role's dates, keep both inputs and ask which should be used. Do not choose whichever makes the resume stronger. A correction should remain in force on later imports unless the user changes it. Keep a newer source observation separate from the user's accepted value until the conflict is resolved.

Generated wording must point back to the specific claims it uses. A citation to a whole repository is insufficient when the sentence adds an unsupported metric, leadership role, or technical detail. User edits that add facts become user-supplied claims; do not falsely label them as supported by the earlier source.

**Done means:**

- A user can inspect the supporting claims for a generated bullet, correct them, and see which drafts use them.
- Re-importing the same material does not create duplicate jobs or overwrite accepted corrections.
- A conflict can be resolved or left out of a draft without losing either source.
- A removed resume item remains available in the career record; deleting it from the record is a separate, explicit action.
- Historical exports stay unchanged when the record changes, subject to explicit deletion controls in C9.

### Problem 1 — Create a first resume

#### C2. Start with available material and suggest what belongs

**Solves:** P1.1–2 and P1.4. **Builds on:** F3 and F4.

Offer an existing resume upload, pasted notes, a user-provided profile export, or selected public GitHub material. An existing-resume user starts with their current content. A first-timer can start with a project description, course assignment, volunteer activity, or a short account of something they built.

Show what was successfully read and what remains missing. If a PDF cannot be read, offer text paste and preserve any other successful imports. If GitHub is unavailable, continue with the user's other material. Report the actual import coverage instead of saying all work has been read.

Suggest sections and candidate items according to the available evidence and intended role. Projects and education may lead when there is no employment history. Paid work, freelance work, coursework, and personal projects must retain their real context; a school assignment must not become employment.

Recommend projects for explainable reasons: relevant technology, a clear individual contribution, a demonstrable result, or a useful example of solving a problem. Popularity can supply context but should not be the deciding measure of quality. An archived project or a project based on a tutorial may still demonstrate relevant work; ask what the user added instead of automatically excluding it.

For an external contribution, let the user supply a PR link or description in the first release. Comprehensive discovery across other people's repositories belongs to a later source expansion. Never infer that an account owner personally implemented every feature described in a repository.

**Example:** A student supplies a group-project README. The product can suggest a project entry describing the application, then ask which part the student implemented before writing personal accomplishment bullets.

**Done means:**

- The user can reach a draft without connecting GitHub or providing employment history.
- Suggested inclusions and exclusions have a short reason and can be overridden.
- Sparse input produces an honest partial draft and a useful next question, not fabricated content or a demand to fill every section.
- Imported contact details, dates, and contribution attribution are available for review before final export.

#### C3. Ask focused questions and write defensible bullets

**Solves:** P1.2–3 and P1.5; also P2.2. **Builds on:** F5 and the writing portion of F12.

Ask the question that would most improve an important line: what the user personally did, what changed, who used the result, or how an outcome was measured. Present a short initial set, ideally three to five questions, with the option to skip or continue later. That question count is a usability target, not a guarantee that every case can be completed within it.

Write bullets from the action, context, and supported result. A result can be a working capability, a completed migration, or a reduced manual step; it need not be a percentage. Avoid forcing users to invent a number because the template expects one.

**Example, using only the supplied facts:**

- Notes: “I built the Express API and Redis cache for our group project. We did not measure speed.”
- Draft: “Built an Express API with Redis caching for a team coursework project.”
- Follow-up: “Did you measure a change in response time?” If the answer is no, keep the non-numeric bullet.
- If the user supplies comparable before/after measurements, calculate the change transparently and preserve the test conditions. A local benchmark must not become a production result.

If the user supplies a range, retain that precision. “100–1,000 users” must not become “1,000 weekly active users.” Distinguish total users, active users, downloads, and repository stars. Ask before claiming sole ownership or leadership of team work.

Use plain language by default. Let users edit wording and mark preferred text to retain. Do not assume a shared README represents their personal writing style.

**Done means:**

- Every generated factual assertion has supporting record entries; unsupported assertions are omitted or returned as questions.
- User estimates retain their units, time periods, and uncertainty through rewriting and tailoring.
- Skipping a question leaves an accurate, possibly less detailed draft.
- Users can keep their wording without the next generation replacing it silently.

#### C4. Review and export a readable document

**Solves:** P1.4 and P1.6; also P2.3. **Builds on:** F6, F9, and the export portion of F12.

Provide one restrained, single-column layout first. The user edits content without having to maintain LaTeX. One page is the initial recommendation for this audience; it is not an ATS eligibility rule.

When the document overflows, suggest shortening repetition or leaving out less relevant material, with reasons. Keep a minimum readable type size and preserve pinned content. If the user's selected content cannot fit, explicitly offer further cuts or a second page. Do not promise both unlimited pinned content and a guaranteed one-page result.

The review should answer three concrete questions:

1. **Is the content accurate enough for the user to approve?** Surface unresolved dates, missing contact details, unsupported generated claims, and unclear attribution. Legitimate employment gaps or concurrent roles are not errors by themselves.
2. **Is the exported document readable?** Check clipping, page breaks, text size, section order, and whether links and contact information are usable.
3. **What does our extraction check find?** Show the text and fields extracted from the actual exported PDF, with the parser identified. This is a compatibility check with defined coverage, not a prediction that every employer's system will accept the application.

Link results should distinguish confirmed broken links, access-restricted links, temporary failures, and untested links. Give the user a useful action without forcing removal of a valid login-protected link. Incomplete checks must not appear as passed.

Use a completion message such as “Reviewed and ready to export” only after the required review is complete. Explain any remaining warnings. Users can save incomplete work at any time; the final document should not contain unresolved placeholders or known unsupported generated claims.

**Done means:**

- The reviewed export is the artifact downloaded, with checked pagination and searchable text.
- Overflow is resolved explicitly; pinned items and manual wording survive layout changes.
- Generation or rendering failures preserve the user's work and offer a retry.
- Review results state what was checked and what was not. There is no universal ATS score or interview guarantee.
- PDF export works without requiring the user to install or edit LaTeX; `.tex` export is available when the implemented renderer produces it.

### Problem 2 — Keep the resume current

#### C5. Capture accomplishments while the context is available

**Solves:** P2.1–2 and P2.4. **Builds on:** F7's Win Capture.

Let a user save a short note such as “Migrated the billing service this week,” optionally with a link or a measurement. Save it immediately; completing a polished bullet should not be required to record the event.

Later, suggest questions about the user's contribution, context, result, and what is appropriate to share. Support work that has no public artifact: mentoring, incident response, documentation, internal projects, and process improvements. A public GitHub account must not be required to establish value.

Allow optional reminders with a user-selected frequency and a clear off switch. Notes remain private by default. Help users record a shareable description without requiring confidential source code, customer names, or internal screenshots.

**Done means:**

- A short note can be saved in one action and expanded later; under 30 seconds is an initial usability target.
- Notes can be linked to existing jobs/projects without duplicating those entries.
- Saving a note does not immediately change a resume or make its contents public.
- Users can review which notes have been included, deferred, or dismissed.

#### C6. Propose an update, show the changes, preserve the prior version

**Solves:** P2.1 and P2.3–5. **Builds on:** F8 and F9.

“Update my resume” gathers accepted new information and prepares a proposed revision. New facts still needing confirmation remain questions or suggestions. The old accepted resume remains usable until the user approves the revision.

Show additions, wording changes, corrected facts, reordering, and proposed removals. Explain cuts using the current target role and the user's preferences. Removing a project from the page should not remove it from the career record. A factual correction should be distinguished from a stylistic rewrite.

Let the user accept individual changes or all reviewed changes. Re-check the resulting combination for overflow and consistency, because accepting only part of a proposal can create a different document. Preserve edited or pinned wording unless the user approves a specific replacement.

Offer source refresh on request first. Show when each source was last checked and whether the refresh was complete. If a source fails, keep the previous accepted facts and label the failed check. Missing access is not evidence that a job ended or an accomplishment disappeared.

Background GitHub monitoring can be added later as an opt-in source of suggestions. A push or release should trigger an examination of possible changes, not automatically become a claim that the user shipped a feature or achieved a business result.

**Done means:**

- Every change to the accepted resume is visible before approval, and the previous version can be restored.
- A refresh with no relevant accepted changes leaves the resume unchanged.
- Repeated refreshes do not produce duplicate accomplishments or repeat dismissed suggestions unless the underlying evidence changes materially.
- Failed imports, partial data, and interrupted updates preserve the existing draft and accepted resume.
- Updates never change previously exported or submitted copies in place.

### Problem 3 — Tailor for a particular job

#### C7. Select relevant experience and explain the match

**Solves:** P3.1–4. **Builds on:** F10.

Start with a pasted job description. Save the supplied text with the job so later edits or removal of the online posting do not erase the context. URL import can follow once reliable; paste remains the fallback.

Identify explicit requirements and distinguish them from preferences. If wording is ambiguous, say so. Compare the posting with the full career record, including facts omitted from the base resume, and suggest the most relevant examples.

Use an evidence report with actionable distinctions:

| Status | Meaning and next action |
| --- | --- |
| Supported in your record | Show the relevant experience and proposed resume wording |
| Supported but not included | Offer to include or prioritize an existing fact |
| Partially supported | State exactly what is supported and what needs clarification |
| Not found in supplied information | Ask whether the user has relevant experience; do not declare they lack it |
| Confirmed gap | The user has confirmed they do not meet this requirement; leave it unclaimed |
| Requirement unclear | Show the ambiguous wording and let the user decide how to address it |

Tailoring may reorder content, select different projects, shorten irrelevant detail, and use equivalent terminology where the meaning is supported. Preserve historical employer names, job titles, dates, seniority, and measured outcomes. A target-role headline must not silently rewrite a previous role.

Do not convert exposure to a technology into professional proficiency or part of a requirement into full coverage. Reusing the posting's terminology is helpful only when accurate. Present gaps as information for the user's decision, without inventing qualifications or predicting an interview probability.

Show a proposed tailored draft and changes from the starting version. New facts supplied during tailoring go through C1 and can be offered for reuse; they do not silently alter every other resume.

**Done means:**

- Users can see why each substantive change was proposed and trace factual claims to their record.
- Tailoring cannot introduce unsupported metrics, tools, titles, dates, or qualifications.
- A missing requirement produces a question or an honest coverage status, not fabricated text.
- The tailored document receives the same content and export checks as the base resume.
- User review and editing remain available even when no useful tailoring changes are found.

#### C8. Remember which document belongs to which application

**Solves:** P3.5 and P2.4. **Builds on:** F11.

Keep company, role, supplied posting, draft revision, export time, and optional user-recorded submission time together. Users can retrieve the exact exported document instead of regenerating an approximation from today's record.

Separate four objects in the product's behavior:

| Object | How it changes |
| --- | --- |
| Career record | Accumulates source material, accepted facts, and corrections |
| Base draft | Receives edits and approved update proposals |
| Job-specific draft | Receives changes selected for that job; shared corrections are offered for review |
| Exported/submitted snapshot | Retains its original content and file until explicitly deleted; never overwritten by sync |

When a fact changes, identify affected active drafts and offer a review. Do not propagate a job-specific wording choice to unrelated drafts. Do not treat a download as proof of submission; the user records which exported version was actually sent.

Use descriptive filenames and let users restore or duplicate an earlier version. Keep this focused on document history rather than building a full application-management platform.

**Done means:**

- A user can retrieve the exact file associated with a recorded submission after later edits.
- Shared corrections can be reviewed across affected drafts without overwriting local wording choices.
- A second download of a historical snapshot returns that snapshot, not a newly generated document.
- Editing a submitted version creates a new draft or export while retaining the earlier record.

### Across all three problems

#### C9. Predictable access, transparent limits, and portable information

**Solves:** P1.6, P2.3–4, and trust across all three workflows. **Builds on:** F12.

Disclose free and paid limits before a user starts a chargeable operation. The proposed free core includes manual editing, basic PDF export, and downloading the user's stored career data. Limit costly generation or ongoing monitoring explicitly rather than charging unexpectedly when the user reaches download.

Keep accepted drafts editable when an AI allowance is exhausted. A failure to generate should not remove access to existing resumes. Exact generation quotas, paid prices, and monitoring limits require a cost model and a pricing test; this proposal does not promise unlimited AI usage.

Provide portable career data and exports without requiring a public profile. Explain which external services process supplied material before that processing occurs. Source attachments and evidence remain private unless the user deliberately shares them. Disconnecting a source stops new access and offers a separate choice about retaining or deleting imported material.

Distinguish hiding an item, removing it from one draft, and deleting it from stored history. “Immutable snapshot” means protected from automatic rewriting, not exempt from an explicit deletion request. Explain the scope of deletion, including stored snapshots or attachments, before carrying it out; already downloaded copies remain under the user's control.

**Done means:**

- A user knows a feature's limit and any price before using it.
- Editing and downloading existing accepted work do not depend on an active generation allowance.
- Career data can be exported and restored in a documented format.
- Users control connected sources, private evidence, reminders, and stored-data deletion.
- No evidence page or resume becomes public automatically.

### Recommended delivery sequence

Build complete user workflows in small releases. Foundation work belongs inside these releases rather than becoming a separate project with no usable outcome.

| Stage | Deliverable | Included scope | Exit condition |
| --- | --- | --- | --- |
| 1. Create and export | A usable first resume from supplied material | Essential C1, C2, C3, C4, C9; resume/text input and optional selected public GitHub sources | A first-timer and an existing-resume user can complete import, clarification, editing, review, save, and PDF export |
| 2. Return and update | A user can maintain their accepted resume | C5, C6, version restoration, and the snapshot foundations of C8 | New information can be added and reviewed without losing edits, previous files, or source context |
| 3. Tailor and remember | A job-specific version with retrievable history | C7 and full C8, initially using pasted job descriptions | A user can review a tailored export, record it as submitted, and retrieve it after a later base update |
| 4. Reduce ongoing effort | Source refresh becomes more automatic where useful | Opt-in background checks, broader contribution discovery, optional reminders | Pilot users receive useful suggestions with acceptable noise and retain control of their accepted documents |

The first three stages together address all three founder problems. Background monitoring should follow evidence that manual updates help and source coverage is sufficient. Stage numbers are a proposed build order, not proof of market priority or a delivery-date commitment.

Before implementing, reconcile the current spec and code with these behaviors: the research review found missing core flows, no per-claim provenance, and inconsistent GitHub fingerprints. Those are prerequisites to address, not capabilities this proposal assumes are already working.

### What changes from Claude's proposal

| Claude proposal | Codex decision |
| --- | --- |
| F1–F2: career record and proof trail | Keep, with claim-level sources, explicit uncertainty, conflict resolution, and preservation of exported history |
| F3–F5: immediate draft, hidden experience, impact questions | Keep, with honest partial drafts, contribution questions, and no automatic assumption that popularity or public activity equals ability |
| F6: recruiter view and ATS view | Replace universal assurances with concrete content checks and an extraction preview of the actual file |
| F7: living resume | Begin with manual accomplishment capture and requested refresh; add monitoring as suggestions after validation |
| F8–F9: update and one-page judgement | Keep reviewed changes and suggested cuts; make one page a default with explicit overflow choices |
| F10: truthful tailoring | Keep, distinguish missing evidence from confirmed gaps, and preserve historical facts |
| F11: linked versions | Keep shared corrections for drafts and exact snapshots for past exports/submissions |
| F12: voice and ownership | Keep editable language, portable data, and clear pricing; define sustainable service limits |
| “Why no one else does this” | Replace with the benefit delivered and evidence that our implementation performs the task well |

### Validation and acceptance

The promises about speed are targets to test. Measure the complete task, including import, clarification, review, repair, and download. Do not report generation time as time to a usable resume.

| Workflow | What to measure | Initial target or required behavior |
| --- | --- | --- |
| First resume | Time to user-approved export, completion, and correction effort | Aim for under five minutes with sufficient input; separately report sparse-input cases |
| Update | Time to reviewed revision, useful suggestions, and unintended changes | Aim for a short review; require no silent overwrites of accepted facts or manual edits |
| Tailoring | Time to suggested draft and time to approved export | Aim for a suggested draft within a minute; report review time separately |
| Source support | Unsupported statements, attribution errors, and unlabelled estimates | No known unsupported generated claim may remain in an approved export; observed failures require correction and regression checks |
| Export | Clipping, pagination, searchable text, and extraction of key fields | Check the actual produced artifact; do not mark skipped checks as passed |
| History | Recovery after editing, syncing, and re-exporting | Retrieve the exact stored file for a recorded submission |
| Continued use | Return behavior and accepted accomplishments over time | Establish whether users benefit before expanding automatic monitoring |

Use representative cases before release: a student with one coursework project; a developer with private work only; conflicting dates across sources; a team README with unclear authorship; a user estimate expressed as a range; content that overflows with pinned items; a restricted link; a failed source refresh; a job requirement absent from the record; and a submitted resume followed by a base correction.

Keep the product claim specific: **“Start with what you have, review the facts and wording, and keep reusable versions for each job.”** The value to prove is less repeated work and a more trustworthy document, not a guaranteed interview increase, universal ATS compatibility, or exclusive ownership of the feature category.
