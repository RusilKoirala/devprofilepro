# DevProfile Pro — User Problems

> Read this before building any feature. Every feature should solve one of the three problems below. If it doesn't, it waits.

The product exists because **resumes are painful at three moments**: writing the first one, keeping it current, and fitting it to a specific job. We serve developers (students, early-career, and working engineers) at each of those moments.

**How to read this doc:** sections marked **[Founder section]** come from the founder's original problem statement. The three problem headings are the founder's as well. Sections marked **[Claude section]** were researched and drafted by Claude (an AI assistant) and still need review.

Research notes and sources are at the bottom. Most resume statistics online come from resume-tool vendors running their own surveys, so treat numbers here as **directional**, not exact. Where a popular stat is known to be weak, it's flagged.

---

## The context: why this hurts more now

> **[Claude section]** Researched and drafted by Claude. Not yet reviewed by the team.

Before the three problems, the environment users are in:

- **The first read is a skim.** In TheLadders' eye-tracking study, recruiters spent ~6 seconds (7.4s in the 2018 re-run) on the first keep-or-discard pass. About 80% of that time went to six things: name, current and previous titles/companies, their dates, and education. If those aren't instantly clear, the rest of the resume doesn't get read. (Small vendor study, 30 recruiters. It measures the first pass, not total review time.)
- **Volume is up, so each resume matters less, and there are more of them to make.** Handshake reports Class of 2024 students sent ~64% more applications per job than Class of 2023, and Class of 2025 was on track for +24% more again. Entry-level software engineering fell to ninth among the most-posted entry-level roles on Handshake (2024–25). More applications means more resume versions, more often.
- **Hiring managers are now suspicious of AI resumes.** Robert Half (2,000+ US hiring managers, Nov 2025): 65% say AI-enhanced resumes make skills harder to verify, and 42% now spend more time reviewing. AIResumeBuilder (929 hiring managers): ~61% say AI resumes often make candidates look more qualified than they are. Resume Now (900+ HR pros): the top complaint is **generic content** (36% name it as a top rejection reason), not AI use itself.
- **ATS fear is real but often exaggerated.** ~98% of Fortune 500 companies use an ATS (Jobscan's figure, widely repeated, not independently verified). The famous "75% of resumes are rejected by ATS before a human sees them" has **no published study** behind it. It traces back to a 2012 vendor sales pitch. What's real: bad formatting can parse badly, so skills don't land in the right fields and recruiters can't find you in search. Users are anxious about ATS even when they don't understand it.

**What this means for us:** the job isn't "make a pretty resume." It's to make a resume that is **clear in 6 seconds, specific instead of generic, true and verifiable, cleanly parseable, and cheap to produce many times.**

---

## Problem 1 — "I've never made a resume and I don't know where to start"

**Who:** First-timers. Students, new grads, bootcamp grads, self-taught devs, career switchers applying for their first internship or tech job.

### What they're facing

> **[Claude section]** Researched and drafted by Claude. Not yet reviewed by the team.

**1. Blank-page paralysis.**
- They don't know which sections they need, in what order, or how long it should be.
- Resume-writing is a top stressor. In LiveCareer's 2025 survey, 32% called it a significant source of stress, second only to not hearing back from employers (35%). (iHire's survey ranks it lower, at 11.4%, so the size of this depends on who you ask. For first-timers it's at the high end.)
- Templates (Word, Canva, Zety) give them a **layout, not content**. They still stare at empty boxes labelled "Experience."

**2. "I have no experience" — when they actually do.**
- They don't count projects, hackathons, coursework, open source, clubs, tutoring, or freelance work as "real" experience.
- Forum advice to first-timers is the same over and over: never write "no experience," lead with projects and coursework, and describe school projects the way you'd describe a job (team, task, outcome).
- Their best evidence is usually **already on GitHub**, but they don't know how to turn a repo into a resume bullet.

**3. They don't know how to write a bullet.**
- They write duties ("Worked on the backend") instead of results ("Cut API latency 40% by adding Redis caching").
- They don't know the XYZ formula ("Accomplished X, as measured by Y, by doing Z") or that rough numbers are fine as long as they're concrete.
- They list technologies with no context, as a skills dump.

**4. They don't know the unwritten rules.**
- One page. Reverse-chronological. No photo, no "Objective" paragraph, no skill-rating bars, no two-column fancy layouts that parse badly.
- Titles, companies, and dates must be easy to scan (that's where the first 6 seconds go).
- Test every link. A broken link or a GitHub full of half-finished tutorial repos can hurt more than no link.

**5. Under-selling and over-selling.**
- Many undersell ("it's just a side project"). Others pad with inflated claims or AI-generated fluff. Forums warn this backfires: interviewers ask about every line, and hiring managers now actively look for inflated AI resumes.

**6. The tool trap.**
- Popular builders (Zety, Resume.io) let you build for free, then put the **PDF download behind a paywall**: low-cost trials that auto-renew into ~$24-per-4-weeks subscriptions. Cancellation and billing complaints dominate their reviews (Resume.io has a 1.3/5 average on Product Hunt, mostly over billing). First-timers often meet this exactly when they're broke and in a hurry.
- The developer-favourite alternative, LaTeX (e.g. "Jake's Resume" on Overleaf), looks great and parses well, but it's intimidating to edit and easy to break.

### What they actually want

> **[Founder section]** From the founder's original problem statement.

"Look at what I've already done and turn it into a proper resume. Tell me it's right."

### How we solve it

> **[Claude section]** Researched and drafted by Claude. Not yet reviewed by the team.

- Connect GitHub, upload a LinkedIn PDF, or paste anything, and we pull out the facts. They never fill in a form from scratch.
- Turn repos into project bullets: what it is, the stack, and the outcome (stars, users, scale) where the sources give one.
- Bake the rules in: one page, scannable header, strong verbs, ATS-safe single-column LaTeX.
- **No invention.** Only what's in their sources, so every line holds up in an interview.
- Free to get the PDF. No paywall surprise at download (this is a direct contrast with the big builders).

**Success looks like:** A first-timer goes from nothing to a resume they're proud to send in **under 5 minutes**, without reading a "how to write a resume" guide.

---

## Problem 2 — "I have a resume, but I hate updating it"

**Who:** Working devs, interns going into their second internship, and anyone with a resume that's months or years stale.

### What they're facing

> **[Claude section]** Researched and drafted by Claude. Not yet reviewed by the team.

**1. Updating is reactive, so it happens at the worst time.**
- About half of people update only when job hunting: 51% in a 2025 BGSF poll. Indeed's 2024 report: 56% update at most once a year or only when preparing for a job search. TopResume: most wait until they need it.
- So the update happens under pressure: a recruiter just messaged, a referral is waiting, a layoff just happened.

**2. They've forgotten what they did.**
- Six to eighteen months of work has to be reconstructed from memory. The specific numbers (latency cut, users, % improvement) are gone. Career advisers recommend frequent updates exactly because wins are easiest to recall while they're fresh, but almost nobody does it.
- Meanwhile the evidence is sitting in GitHub (repos, commits, READMEs) and on LinkedIn.

**3. The file itself fights them.**
- The resume is a frozen file (`resume_final_v3_REAL.pdf`). The source Word/Canva/LaTeX file is lost, or on an old laptop, or it was made with a builder they no longer pay for.
- Adding one bullet pushes it onto page two. Now they have to decide what to cut, which is a judgement call they don't want to make.
- LaTeX users: one misplaced brace and the build breaks.

**4. Their data lives in many places, and none of them agree.**
- The resume, LinkedIn, GitHub profile, and portfolio site all drift out of sync. Updating one means manually updating the others.

**5. Old content stays too long.**
- Early projects and tutorial work that made sense for a student resume crowd out newer, stronger work. They don't know what to drop as they grow.

### What they actually want

> **[Founder section]** From the founder's original problem statement.

"My resume should already know what I've been doing. Update it in one click."

### How we solve it

> **[Claude section]** Researched and drafted by Claude. Not yet reviewed by the team.

- Import the existing resume as the starting point. It's the highest-signal source for dates and employers.
- Stay connected to GitHub (later LinkedIn/X) and detect changes.
- **One-click update** (and eventually automatic): new work is merged in, weaker or older filler is pushed out, and it stays one page.
- Show a clear diff of what was added, changed, or dropped, so they stay in control.
- Keep the resume as structured data (not a frozen file), so it's never "lost" and always editable.

**Success looks like:** Updating takes **one click and a quick review**, not an evening, and they can do it the moment a recruiter messages them.

---

## Problem 3 — "I need to tailor my resume for this specific job"

**Who:** Anyone actively applying. Both groups above, once they have a base resume.

### What they're facing

> **[Claude section]** Researched and drafted by Claude. Not yet reviewed by the team.

**1. They know they should tailor, but most don't, because it's tedious.**
- Kickresume: 74% say they tailor at least somewhat, but only 28% tailor significantly. 46% make minor tweaks, and 8% send the same CV everywhere.
- Novoresume (2026): only ~26% customise every time, and ~24% send the same resume to every job.
- With application counts rising, rewriting per job doesn't scale by hand.

**2. Tailoring seems to pay off.**
- Novoresume: among people who tailor every time, 6.4% ended a search with zero interviews. Among those who reuse one resume, it was 20.5%. (Self-reported, so it shows correlation, not cause.)
- Jobscan (2.5M+ applications): resumes whose job title matches the posting's title had a **10.6× higher interview rate**. (Vendor data, but the scale makes it the strongest signal available.)

**3. They don't know *what* to change.**
- Which projects to lead with? Which skills match? What wording does the posting use for the same thing they did ("CI/CD" vs "deployment pipelines")?
- They miss keywords recruiters search for in the ATS, which matters for being found, even if it isn't a magic auto-reject filter.

**4. Tailoring with generic AI makes it worse.**
- Pasting a job description into ChatGPT tends to produce keyword-stuffed, generic, or inflated text, which is exactly what hiring managers say they reject (generic content is the #1 complaint) and distrust (65% say AI resumes are harder to verify; ~62% in one survey say they've fired someone whose skills didn't match an AI-inflated resume).
- So the user is stuck between "untailored" and "tailored but fake-sounding."

**5. Version chaos.**
- Ten tailored copies across folders (`resume_google.pdf`, `resume_stripe_v2.pdf`). They lose track of which version went where, and when they update the base resume, none of the copies get the update.

### What they actually want

> **[Founder section]** From the founder's original problem statement.

"Paste the job post, get a version of my resume aimed at it, that still sounds like me and is all true."

### How we solve it

> **[Claude section]** Researched and drafted by Claude. Not yet reviewed by the team.

- Paste a job description (or link) and we re-prioritise their **real** experience, projects, and skills toward that role.
- Mirror the posting's wording where it truthfully applies (title, key skills), and reorder rather than invent.
- Every tailored line traces back to a source. Nothing is added that the base resume and sources can't back up.
- Tailored versions are saved per job and linked to the base resume, so a base update can flow into them.

**Success looks like:** A tailored resume per application in **under a minute**, that a hiring manager can't tell apart from a carefully hand-written one.

---

## How the three fit together

> **[Claude section]** Researched and drafted by Claude. Not yet reviewed by the team.

```
 First-timer ──▶ [1] Build from my data ──▶ Base resume ◀── [2] One-click update (stays fresh)
                                               │
                                               ▼
                                     [3] Tailor for a job ──▶ Job-specific versions
```

One **base resume** that's always current, generated from the user's real data, with tailored copies spun off per job.

## Principles that come from these problems

> **[Claude section]** Researched and drafted by Claude. Not yet reviewed by the team.

1. **Data in, resume out.** Users shouldn't type what we can read from their sources.
2. **Never invent.** Every line must be true and traceable to a source. This is also our answer to the "AI resume" distrust from hiring managers.
3. **Specific beats generic.** Real project names, real stacks, real numbers. Generic phrasing is the top reason resumes get rejected.
4. **Built for the 6-second skim.** Titles, companies, dates, and education are instantly scannable.
5. **One page, ATS-safe, always.** The product enforces the rules so users don't have to know them.
6. **Low effort beats more control.** Default to one click. Let power users edit after.
7. **User stays in control.** Show what changed or was added before it's final.
8. **No paywall trap.** Never let a user build a resume and then hold the download hostage.

## Priority (proposed)

> **[Claude section]** Researched and drafted by Claude. Not yet reviewed by the team.

| Order | Problem | Why |
| --- | --- | --- |
| 1 | Build from my data (first-timer) | Core engine. Problems 2 and 3 reuse it. Highest stress, biggest "aha" moment |
| 2 | One-click update | Our main differentiator. Nobody updates proactively, and it's the reason to come back |
| 3 | Tailor for a job | Strong evidence it pays off. Builds on a base resume existing |

## Open questions

> **[Claude section]** Researched and drafted by Claude. Not yet reviewed by the team.

- Which group do we lead with on the landing page: first-timers (bigger pain) or existing-resume users (easier to reach, want speed)?
- Do updates happen automatically, or always one click and a review?
- How do we *prove* "never invents" to users and hiring managers? (Show sources per bullet? A "verified from GitHub" mark?)
- Free tier boundaries: what's free forever versus paid, without becoming the paywall trap we're criticising?
- Do we support non-developer users later, or stay dev-focused (GitHub as the hook)?
- Users we should talk to directly to validate this: 5 students with no resume, 5 working devs with a stale resume, 5 active job seekers applying to 20+ jobs.

---

## Research notes & sources

> **[Claude section]** Researched and drafted by Claude. Not yet reviewed by the team.

**Recruiter screening time**
- TheLadders eye-tracking study (2012, re-run 2018): ~6s → 7.4s initial screen, 80% of time on six elements. [Recruiter.com](https://www.recruiter.com/i/theladders-reveals-research-reporting-that-resumes-spend-six-seconds-with-a-recruiter/), [MarketingProfs](https://www.marketingprofs.com/charts/2014/25190/eye-tracking-study-how-recruiters-view-resumes), [Hiration](https://www.hiration.com/blog/how-long-recruiters-spend-on-resume/)

**Tailoring**
- Novoresume Resume Report 2026: tailoring habits vs. zero-interview rate. [novoresume.com](https://novoresume.com/career-blog/resume-report-2026)
- Kickresume resume trends survey: 74% tailor somewhat, 28% significantly. [kickresume.com](https://www.kickresume.com/en/press/resume-trends-survey-cv-screening/)
- Jobscan State of the Job Search: 10.6× interview rate with a matching job title. [jobscan.co](https://www.jobscan.co/state-of-the-job-search)

**Updating habits**
- BGSF poll (2025): 51% update only when job hunting. [bgsf.com](https://www.bgsf.com/post/september-is-international-update-your-resume-month-is-your-professional-story-current)
- Indeed 2024 Workforce Insights Report. [indeed.com](https://www.indeed.com/job-search-services/workforce-insights-report)
- TopResume survey (2023, 4,825 job seekers). [topresume.com](https://resume2hire.topresume.com/career-advice/easy-ways-to-spring-clean-your-resume)

**Stress**
- LiveCareer Job Search Frustration Survey (2025): 32% find resume writing a significant stressor. [livecareer.com](https://www.livecareer.com/resources/job-search-frustration)
- iHire job seeker survey: resume writing at 11.4%, waiting to hear back at 55.3%. [ihire](https://www.ihireengineering.com/resourcecenter/jobseeker/pages/half-of-candidates-say-job-searching-harms-mental-health-how-to-ease-job-search-stress)

**AI resumes & hiring-manager trust**
- AIResumeBuilder survey (929 hiring managers). [goskagit.com](https://www.goskagit.com/airesumebuilder-com-survey-1-in-5-employers-may-adopt-pay-to-apply-model-as-ai/article_90c6c61b-de74-58fa-a260-310f0b0d2a65.html)
- Robert Half and others on AI making hiring harder. [CTV News](https://www.ctvnews.ca/sci-tech/article/why-employers-say-ai-is-making-hiring-harder/), [NRCA](https://www.nrca.net/RoofingNews/hiring-managers-sometimes-reject-applicants-who-use-ai.9-16-2025.12931/details/story), [Deel](https://www.deel.com/deel-works/ai-resume-crisis)

**ATS**
- The "75% rejected" stat has no published methodology. [The Interview Guys](https://blog.theinterviewguys.com/?p=1967), [f1jobs](https://www.f1jobs.io/resources/blog/ats-resume-service-75-percent-rejection-myth), [Simplify](https://simplify.jobs/blog/debunking-applicant-tracking-system-ats-myths/)
- ATS parsing and keyword search explained. [Resume Genius](https://resumegenius.com/blog/resume-help/ats-resume)

**Market & competitors**
- Entry-level application volume (Handshake data). [Rockstar Developer University](https://rockstardeveloperuniversity.com/entry-level-software-engineer-job-market-statistics/)
- Zety / Resume.io paywall and billing complaints. [Trustpilot – Resume.io](https://www.trustpilot.com/review/resume.io?page=6), [Product Hunt – Resume.io](https://www.producthunt.com/products/resume-io/reviews), [terms.law – Zety](https://terms.law/ToS-Watchdog/resume-builders/zety/), [Resume Coach – Zety review](https://www.resumecoach.com/reviews/zety-resume-builder-review/)
- Jake's Resume (popular LaTeX template for devs). [Bibby](https://trybibby.com/latex-templates/jakes-resume)

**First-timer & developer resume advice**
- Leading with projects, no "no experience," no padding. [CareerVillage](https://www.careervillage.org/questions/942582/what-how-to-write-your-resume-when-applying-for-cs-related-jobs-when-youre-a-self-learner-without), [freeCodeCamp forum](https://www.freecodecamp.org/forum/t/web-developer-no-experience-resume-examples/323852), [VisualCV](https://www.visualcv.com/blog/how-to-write-a-resume-with-no-experience/)
- Duties vs. impact, XYZ formula, GitHub link hygiene. [MentorCruise](https://mentorcruise.com/blog/why-your-software-engineering-resume-is-getting-ghosted-and-how-to-hack-the-process-e/), [HackerNoon](https://hackernoon.com/refactor-your-resume-like-an-engineer-and-get-more-interviews), [DEV Community](https://dev.to/ruby242/resume-mistakes-that-are-killing-your-software-engineering-job-applications-55i1)

---

## Codex research review — 23 October 2026

> **[Codex section]** Independent review of Claude's text above. All founder and Claude text above is preserved unchanged. This section records agreement, corrections, uncertainty, and proposed wording; it does not silently replace the original. Related claims in `USER_SOLUTIONS.md` and implementation assumptions in `SPEC.md` are reviewed where they affect these problems.

### Overall assessment

**Keep the three problems as a useful product hypothesis. Do not yet treat this document as validated customer research or a proven differentiation strategy.** Claude identified coherent moments in a developer's job search and useful principles: reduce repeated work, preserve real accomplishments, make changes reviewable, and avoid unsupported claims. Several statistics genuinely appear in the cited publishers' reports.

The main weakness is the reasoning between the statistics and the product decisions. A general job-seeker survey does not establish what first-time developers need most. A correlation between matching titles and interviews does not establish the benefit of editing a title. A public repository does not establish an individual's business impact. A feature proposal does not establish that competitors lack it or that this codebase implements it.

The most consequential corrections are:

1. **The claim that most applicants do not tailor contradicts the cited tailoring survey.** Limited tailoring and inconsistent tailoring are defensible problems; universal non-tailoring is not.
2. **The 10.6× figure is an observational association, not a promised improvement.** A large dataset does not remove confounding or selection bias.
3. **One page, six seconds, and ATS-safe are being turned into universal rules without adequate support.** Treat them as scoped design defaults and testable properties.
4. **A source trail establishes where a statement came from, not whether the statement is true.** The proposed “Verified” label is too broad.
5. **The competitive uniqueness claims are not reliable.** There are documented counterexamples for linked resume histories, free downloads, data export, and parsing previews.
6. **Automatic updates, complete GitHub coverage, and source-linked bullets are proposals, not established capabilities in this checkout.** The implementation audit below separates them.

### How this review was conducted

I read all three files in `docs`, inspected the relevant local implementation, and checked publisher reports, product documentation, pricing pages, and official ATS/GitHub documentation. Sources were accessed on 23 October 2026. This is desk research and code inspection: no customer interviews, controlled hiring experiment, competitor account walkthrough, or live end-to-end product test was conducted.

Verdicts mean:

- **Supported as reported:** the source contains the figure or behavior; this does not independently validate the underlying data.
- **Partly supported / overstated:** a narrower claim is supported, but the wording or conclusion goes further.
- **Mistaken / contradicted:** the cited evidence or inspected code conflicts with the claim.
- **Unverified:** the available evidence was insufficient; this does not mean false.
- **Hypothesis / product choice:** reasonable to test or choose, but not a finding established by the research.

Commercial sponsorship does not automatically invalidate a survey. The important questions are whom it sampled, what it asked, how outcomes were measured, and whether the conclusion follows. Repetition across blogs is not independent replication. Most sources here concern US or platform-specific populations, not a representative sample of developers worldwide.

### 1. Claim-by-claim factual audit

| Claude claim and location | Verdict | What the evidence supports and what needs correcting |
| --- | --- | --- |
| Context: recruiters initially spend about 6 seconds, or 7.4 seconds in 2018; 80% of attention goes to six fields | **Supported as reported, overgeneralized later** | The original Ladders report describes 30 recruiters and the six-field pattern; its 2018 announcement reports 7.4 seconds. The 30-person sample belongs to the original study and should not automatically be assigned to the update. These are initial-screen observations, not a universal deadline or a measure of the entire hiring review. [Original report](https://www.bu.edu/com/files/2018/10/TheLadders-EyeTracking-StudyC2.pdf), [2018 publisher announcement](https://www.prnewswire.com/news-releases/ladders-updates-popular-recruiter-eye-tracking-study-with-new-key-insights-on-how-job-seekers-can-improve-their-resumes-300744217.html). |
| Context: Handshake application growth of 64% and 24%; software engineering ninth | **Supported, with population and date limits** | Handshake's own report contains the 64% and 24% comparisons; these are platform applications per job, not necessarily each student's application count or resume-version count. Its CS spotlight confirms ninth place for 2024–25. Preserve the periods and platform qualifier. Neither proves that each resume “matters less.” [Handshake application report](https://joinhandshake.com/docs/network-trends/big-dreams-bigger-challenges.pdf), [CS spotlight](https://joinhandshake.com/blog/network-trends/class-of-2026-spotlight-computer-science/). |
| Context: Robert Half, 65% verification difficulty and 42% longer review | **Supported as reported** | The primary release confirms both numbers and over 2,000 US hiring managers. November 2025 was fieldwork; publication was 10 March 2026. These are reported employer perceptions and process changes, not independently measured detection of AI authorship. [Robert Half release and methodology](https://press.roberthalf.com/2026-03-10-Robert-Half-survey-67-of-HR-leaders-report-AI-generated-applications-are-slowing-hiring). |
| Context / P3.4: AIResumeBuilder, 61% overqualification and 62% firing | **Supported as survey reports; causal interpretation is weak** | The publisher reports both figures from 929 hiring managers in 2025. The firing figure concerns respondents reporting such an experience, not 62% of AI-assisted applicants being fired. The report does not establish reliable identification of AI authorship or isolate AI's causal role. [Original AIResumeBuilder survey](https://www.airesumebuilder.com/1-in-5-employers-may-adopt-pay-to-apply-model-as-ai-resumes-overwhelm-hiring-teams/). |
| Context / principles: Resume Now, generic content is the top rejection reason | **Number supported; ranking overstated** | The survey of 925 US HR workers on 28 March 2025 reports 36% identifying generic content as **a** top reason. That does not establish the number-one reason for all resume rejection. The same report says 77% are more likely to interview someone who used AI thoughtfully, which complicates the blanket anti-AI framing. [Resume Now report](https://www.resume-now.com/job-resources/careers/ai-applicant-report). |
| Context: about 98% of Fortune 500 use ATS | **Supported as a vendor estimate** | Jobscan's 2025 report gives 98.4%, or 492 of 500. This is not the proportion of all employers, and ATS adoption alone tells us nothing about how many applications are automatically rejected. [Jobscan report](https://www.jobscan.co/state-of-the-job-search). |
| Context: 75% ATS rejection has no published study and originated in a 2012 pitch | **Appropriate skepticism; exact origin not independently established here** | I did not establish a primary research basis for the 75% figure or independently authenticate the claimed first sales pitch. Say “we have not verified a published methodology,” rather than proving a universal negative. Actual automatic rejection exists: Greenhouse documents employer-configured rules based on application-question answers. [Greenhouse auto-reject documentation](https://support.greenhouse.io/hc/en-us/articles/360000653472-Auto-reject). |
| P1.1: LiveCareer 32% resume-writing frustration versus 35% no response | **Supported as reported** | The source surveyed 517 US job seekers in June 2025. Calling this a pain point is justified. The extra claim that first-timers are “at the high end” has no subgroup evidence here. [LiveCareer methodology and results](https://www.livecareer.com/resources/job-search-frustration). |
| P1.1: iHire puts resume writing at 11.4% | **Supported; not directly comparable** | iHire reports 11.4% for resume writing among job-search stressors. Different survey questions, answer options, samples, and periods can produce different proportions. These two values are not a confidence interval for the prevalence of the problem. [iHire report](https://www.ihireengineering.com/resourcecenter/jobseeker/pages/half-of-candidates-say-job-searching-harms-mental-health-how-to-ease-job-search-stress). |
| P1.6: Zety/Resume.io renew at roughly $24 every four weeks | **Partly supported; price conflation** | The Zety page retrieved lists a $1.95 14-day trial, then $25.95 every four weeks, with TXT in the free tier and additional formats in paid plans. This is a dated offer, not a universal price for two companies. Resume.io's pricing/help pages could not be retrieved reliably in this audit, so its current exact price and free-export exceptions remain unverified. [Zety pricing](https://zety.com/pricing). |
| P1.6: Resume.io has 1.3/5 on Product Hunt, mostly billing complaints | **Supported for that review page only** | The page showed 1.3 from 38 reviews, with prominent billing/cancellation complaints. This is a small, self-selected review population, not a representative measure of all customers or proof of how often a billing problem occurs. [Product Hunt reviews](https://www.producthunt.com/products/resume-io/reviews). |
| P2.1: BGSF 51% update only when job hunting | **Supported with a wording correction** | Its poll asks about updating a **resume or LinkedIn profile**, not just a resume. The article does not provide enough sampling detail to generalize to half of all workers. [BGSF poll](https://www.bgsf.com/post/september-is-international-update-your-resume-month-is-your-professional-story-current). |
| P2.1: Indeed 56% update annually or for a job search | **Supported as reported** | Indeed's page contains the 56% figure, but it also reports 35% updating at least every six months. Neither supports “almost nobody” updates or “nobody updates proactively.” [Indeed Workforce Insights](https://www.indeed.com/job-search-services/workforce-insights-report). |
| P2.1 / sources: TopResume 2023, 4,825 respondents | **Unverified in this audit** | The supplied URL was inaccessible through the research tool. I did not independently confirm the sample, date, or exact result. Do not count this as an additional verified study until the original report is recoverable. [Original supplied link](https://resume2hire.topresume.com/career-advice/easy-ways-to-spring-clean-your-resume). |
| P3.1: most people do not tailor; 74% tailor at least somewhat | **Heading contradicted by its own evidence** | Kickresume confirms 28% significant tailoring, 46% minor tweaks, 18% rarely, and 8% identical resumes. Its sample includes 1,004 respondents across candidates and HR, not 1,004 recruiters. The defensible problem is effort and depth of tailoring. [Kickresume survey](https://www.kickresume.com/en/press/resume-trends-survey-cv-screening/). |
| P3.1–2: Novoresume tailoring frequency and 6.4% versus 20.5% zero-interview outcomes | **Supported as reported; association only** | Its May 2026 survey of 2,000 US adults reports 25.7% tailoring every time and 24.4% never tailoring, alongside those outcome figures. Self-report, different applicant groups, and different application behavior prevent a causal interpretation. These are search-level zero-invite proportions, not per-application interview rates. [Novoresume report and methodology](https://novoresume.com/career-blog/resume-report-2026). |
| P3.2: matching job titles gives a 10.6× interview rate; large scale makes it strongest evidence | **Statistic reported; inference mistaken** | Jobscan reports the association across an analysis of over 2.5 million applications. Matching titles can indicate genuinely relevant prior experience. The public article does not give enough detail to establish that changing wording causes the difference. Large samples reduce some random uncertainty, not systematic bias. [Jobscan analysis](https://www.jobscan.co/state-of-the-job-search). |

### 2. Detailed review of the context section

**What is right:** rapid comprehension, truthful detail, and readable exports are reasonable goals. Claude also correctly distinguishes an initial skim from total review time and warns that many statistics are commercially produced.

**What is mistaken:** “clear in 6 seconds” becomes an unjustified hard rule later. The original timing study supports testing visual hierarchy, not making every resume conform to a timer. Kickresume's newer self-reports describe substantially longer overall reviews; those measurements concern different methods and stages, so neither should simply cancel the other. [Kickresume screening-time results](https://www.kickresume.com/en/press/resume-trends-survey-cv-screening/).

The statement that more applications mean each resume matters less is an interpretation, not a measured outcome. Higher competition could make differentiation more important. Application volume also does not tell us how many distinct documents applicants create.

**Suggested wording:** “Applicants face competitive screening and need documents that communicate relevant experience quickly. Some employers report difficulty verifying AI-assisted applications. We should help users produce readable, specific, source-supported drafts and review them before submission.”

### 3. Detailed review of Problem 1: starting a first resume

**Keep:** reducing blank-page work; recognizing projects, coursework, volunteering, and contributions; helping users explain what they personally did; and making export pricing clear before they invest time.

**Treat as hypotheses:** first-timers having the greatest stress, GitHub containing their best evidence, LaTeX being the developer-favourite format, and a bad GitHub profile being worse than no link. These may describe some users, but the cited material does not establish their prevalence or causal effect. Forum advice is useful for generating interview questions, not measuring the whole target audience.

Specific corrections:

- **“One page” is a scope choice.** It is a sensible starting default for many early-career applications, but not a universal hiring rule. Harvard's guidance allows one or two pages depending on the application. A senior engineer, researcher, and first-year student need different editorial decisions. [Harvard resume guidance](https://uraf.harvard.edu/resource/preparing-resume).
- **Formatting advice needs a target market.** Decide which countries, job types, and employer instructions the initial product supports. Avoid representing the complete list of “unwritten rules” as globally mandatory. A summary or objective should be judged by useful information, not its label alone.
- **A template is not the whole capability of every builder.** Zety itself offers resume-building and checking tools as well as templates; the claim that these products only supply empty layouts is an unfair category-level comparison. [Zety's listed tools](https://zety.com/pricing).
- **A repository is not a personal achievement by itself.** A README may describe a team's system, someone else's template, an intended feature, or a benchmark from a different setup. Ask what the applicant actually contributed. Stars are repository popularity, not users, revenue, engineering quality, or individual ownership.
- **Approximate numbers need a basis.** A measured improvement can be rounded and labelled approximate. A remembered estimate should remain an estimate. A selected range must not silently become an exact number or gain an invented period such as weekly users. If impact is unknown, describe the implemented behavior and scope without a metric.
- **GitHub-only input may be insufficient.** It may lack education, contact details, contribution ownership, or usable projects. A truthful partial draft with a few questions is better than filling a page with unsupported material. “No forms” should mean no unnecessary re-entry, not no clarification.

**Suggested problem statement:** “Some first-time developer applicants have relevant work but struggle to choose it, explain their contribution, and organize it into a resume. We need to test whether source-assisted drafting plus a few focused questions reduces that effort.”

**Success should measure a reviewed result.** “Under five minutes” is a target, not a finding. Measure time to a usable export including corrections, the proportion of users who finish, missing critical facts, and unsupported statements. Fast generation followed by substantial repair is not success.

### 4. Detailed review of Problem 2: updating a stale resume

**Keep:** stale documents, forgotten detail, duplicated information, and layout work are coherent problems. A structured career record, restoration, and a visible change review are sensible responses.

**Correct the evidence claim:** the available surveys support infrequent or event-driven updates for some respondents. They do not establish that nobody maintains a record or that a continuous-sync product will retain paying customers. Forgetting metrics over “six to eighteen months” is a plausible scenario, not a measured interval supplied by the research.

**The central missing distinction is public activity versus career impact.** A repository change cannot reliably reveal a promotion, mentoring, incident response, technical planning, confidential customer work, or a measured business outcome. GitHub explicitly describes public visibility of private contributions as anonymized activity; it does not expose the underlying private accomplishment. [GitHub contribution visibility](https://docs.github.com/en/account-and-profile/how-tos/contribution-settings/manage-visibility-settings-for-private-contributions-and-achievements).

The related solutions document does include manual “Win Capture,” which is a good correction to this blind spot. Give it equal consideration with GitHub ingestion. Low public activity should not be treated as low professional achievement.

**Automatic detection should produce suggestions.** New pushes can be maintenance, bot updates, another collaborator's work, or unfinished changes. Ask the user to approve attribution and wording before changing a resume. Preserve manually edited text and explain why an older item is proposed for removal.

**Version linkage needs explicit rules.** A shared career record can update future drafts, but the exact document already sent to an employer must remain an immutable snapshot. Updating the current base resume must not rewrite application history. The related feature proposal recognizes snapshots in F11, but F1's blanket promise that one edit updates every resume needs this exception.

**Suggested problem statement:** “Developers may have difficulty reconstructing and selecting accomplishments when they next need a resume. A persistent record and reviewable update suggestions could reduce that work; we need to establish how much useful information can actually be recovered from their available sources.”

### 5. Detailed review of Problem 3: tailoring for a job

**Keep:** choosing relevant experience, using accurate terminology, recording which version was sent, and refusing to fabricate qualifications.

**Correct the framing:** the cited evidence does not say most applicants avoid tailoring entirely. It supports variation in depth and frequency. There is also no direct measurement here that tedium is the main reason each non-tailoring respondent does not tailor.

**Do not convert associations into product promises.** Applicants with the same previous title as a vacancy may simply have more relevant experience. Title matching could be a marker of fit. Preserve actual historical job titles; a truthful target-role headline or clearly labelled equivalent is different from altering employment history.

The Novoresume report itself shows variation by age and different results by tailoring method. That is a reason to test this product's target segment, not to claim the aggregate benefit is universal. Its reported zero-interview comparison cannot be read as a threefold increase in interview probability per application. [Novoresume subgroup and tailoring results](https://novoresume.com/career-blog/resume-report-2026).

**The blanket claim that generic AI tailoring makes things worse is unproven here.** Employer surveys flag generic or inflated content; they do not test a specified model, prompt, source bundle, and review workflow against this product. Robert Half expressly acknowledges responsible AI assistance. Our differentiation must be demonstrated through fewer unsupported claims, less editing effort, and better relevance—not assumed because another tool is general-purpose. [Robert Half's qualifications](https://press.roberthalf.com/2026-03-10-Robert-Half-survey-67-of-HR-leaders-report-AI-generated-applications-are-slowing-hiring).

**Missing evidence is not a confirmed qualification gap.** If the career record does not mention Kubernetes, report “not found in your supplied information,” then ask. Do not conclude the user lacks the skill. Likewise, deployment pipelines are not automatically equivalent to having implemented both continuous integration and continuous delivery; check the actual work before changing terminology.

**Suggested problem statement:** “Applicants need to select and explain the experience relevant to a particular role without repeatedly editing the same facts, overstating their qualifications, or losing track of submitted versions.”

**Success should not be AI undetectability.** “A hiring manager can't tell” is neither a necessary benefit nor an established measurement. Prefer relevance, factual accuracy, retained meaning, user approval, and time to export. A generic phrase is not reliable evidence of AI authorship.

### 6. ATS and verification: what we can honestly promise

There are separate operations here: extracting text, mapping it into fields, searching or ranking candidates, applying configured eligibility rules, and human review. A good result at one stage does not guarantee the others.

Greenhouse documents that columns, tables, images, and header/footer contact details can cause incomplete parsing. It also says an unparsed resume can remain attached while candidate fields require manual entry. This supports simpler layouts and export tests; it does not establish automatic rejection of every complex layout. [Greenhouse parsing documentation](https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse).

LaTeX is an authoring system, not an ATS compatibility certificate. Test the actual output's reading order, searchable text, contacts, dates, and section extraction. An HTML preview is not proof that the generated PDF will have identical pagination or extraction. The related F6 promise to show exactly what “the ATS” sees should become **“our parser's extraction preview, with known limitations.”** Validate against named systems before making claims about those systems.

Similarly, change the broad verification labels:

| Proposed label or inference | More accurate interpretation |
| --- | --- |
| Verified because a public repository exists | Repository observed at a recorded URL and time; authorship and individual contribution still need support |
| Verified because a README states an outcome | Source-reported outcome; source may be wrong, stale, or refer to a team |
| From an old resume or LinkedIn export | Imported claim; not independently confirmed employment history |
| User supplied an estimate | User-confirmed estimate, with its precision and period retained |
| No source match found | Unknown or insufficient evidence, not necessarily false |

**Traceability and truthfulness need different checks.** A generated sentence can cite a real README while exaggerating its meaning. Preserve source excerpts or stable references, check that each factual assertion is supported, identify conflicts, and let the user correct attribution. Treat “never invent” as a requirement to evaluate and enforce, not a guarantee delivered by attaching a citation or validating JSON.

### 7. Competitive claims inherited by USER_SOLUTIONS.md

The repeated “Why no one else does this” paragraphs do not meet a research standard. One documented counterexample disproves “nobody”; not finding one does not prove uniqueness. Competitor descriptions below establish advertised or documented overlap, not independently tested product quality.

| Related feature | Research finding | Implication |
| --- | --- | --- |
| F1 / F11: shared history and linked updates do not exist elsewhere | Teal's indexed knowledge-base article describes shared work history, selectable achievements, and saving edits across resumes. The full indexed article was available, although a subsequent direct fetch returned 404; treat availability as a recheck item. [Teal resume syncing documentation](https://help.tealhq.com/en/articles/9535263-can-i-have-multiple-resumes-that-aren-t-connected). | The categorical novelty claim is contradicted by published competitor documentation. Compare revision controls, attribution, and submitted snapshots in a hands-on test. |
| F6 / F12: nobody provides an extraction view, free downloads, and portable data | Reactive Resume advertises an extraction checker, free PDF/Word downloads, and JSON export. [Reactive Resume](https://rxresu.me/). | These capabilities cannot be presented as exclusive. Whether our implementation is more useful requires testing. |
| P1.6 / F12: free resume export is a unique alternative to big builders | Resume.com's help center explicitly offers free PDF/text downloads and multiple resumes. [Resume.com free-plan explanation](https://support.resume.com/hc/en-us/articles/360008079171-Is-Resume-com-really-free). | Transparent pricing is valuable, but free export alone is not differentiation. |
| F3 / F4 / F5 / F7: nobody interprets developer work, asks impact questions, or tracks accomplishments | This audit did not establish an exhaustive comparison of these workflows. | Mark these as proposed advantages to investigate, not proven absence of competition. |

The related feature list also contains requirements that conflict unless resolved:

- **F3's complete GitHub-only draft versus F2's no unsupported claims:** incomplete sources must be allowed to produce an incomplete draft.
- **F9's always-one-page output versus never removing pinned items:** users can pin more content than fits. Ask them to resolve the overflow or allow another page; do not silently shrink text or break the promise.
- **F6's every link must pass versus normal access restrictions:** a blocked or login-required URL is not necessarily broken. Distinguish unreachable, restricted, untested, and confirmed broken links.
- **F6's date-gap warnings:** concurrent work and gaps can be legitimate. Flag inconsistent dates for clarification, not a person's life history as inherently wrong.
- **F10's every gap shown:** the input may be incomplete and requirements ambiguous. Show evidence coverage and unknowns, without claiming exhaustive knowledge of the applicant.
- **F12's user voice from READMEs:** team documentation may not have been written by the user. Let the user choose tone and preserve their edits.

**A defensible positioning hypothesis:** “Developer-focused resume drafting that makes source attribution and reviewable updates easy.” It still needs evidence that developers prefer it to their current workflow and existing products.

### 8. What the current repository actually supports

This is a static inspection of the working tree on the review date, not a statement about another branch or deployment. The named files below are local evidence. I did not change implementation code as part of this review.

| Document implication | Observed implementation | Consequence |
| --- | --- | --- |
| Full ingest → retrieval → generation → LaTeX → dashboard flow exists | `app` contains the marketing page and waitlist API. The dashboard, generation/extraction/fingerprint routes, `lib/rag`, `lib/ai/generate.ts`, and `lib/resume/latex.ts` named in `SPEC.md` are absent from this checkout. | Treat that flow as planned architecture, not a functioning product demonstrated here. |
| GitHub ingestion reads the developer's work comprehensively | `lib/ingest/github.ts` requests one page of up to 100 user repositories, excludes forks and archived repositories, emits up to 25 project documents, and reads at most eight READMEs, truncated to 6,000 characters each. | It can omit relevant work. Public user-repository listing is not a complete contribution history. [GitHub repository endpoint documentation](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user). |
| Contributions in other people's repositories and meaningful milestones are detected | The ingestion code does not retrieve PRs, commit diffs, releases, or user-impact measurements. It ranks using stars, forks, recency, and description presence. | Current ranking is a heuristic for selecting source material, not validated assessment of engineering quality or personal impact. |
| Change fingerprints are consistent | `githubFingerprint()` prefixes the length of a list capped at five; `ingestGitHub()` prefixes the length of a list capped at 100. | With six returned repositories and unchanged top-five entries, the prefixes would be `5` versus `6`. This would cause a false difference if a future sync flow compared them directly. No active sync route was found, so this is a latent mismatch, not a demonstrated running loop. |
| Every generated line has provenance | `lib/resume/schema.ts` has source documents with source/title/text/optional URL, but resume bullets and achievements are plain strings with no fact-to-source references. | Keeping a source list does not implement per-claim traceability or a proof trail. |
| A schema guarantees one page and factual output | The schema declares arrays and strings but does not enforce the spec's item limits, page size, source support, or factual correctness. | Those require additional validation, rendering, and review. Even bounded text lengths alone would not prove that a PDF fits. |
| Continuous monitoring and preserved application versions exist | No implemented resume history, scheduled sync, or submitted-version workflow was found in the inspected app/lib files. | Those remain proposed capabilities. Supabase helpers and type definitions alone do not implement them. |

The marketing components illustrate source-linked bullets, automatic updates, exports, and tailoring. Illustrations and copy are not implementation evidence. Before presenting those as available, verify the corresponding product flow.

### 9. Product decisions the evidence does not settle

**Which audience comes first:** Claude's ordering is plausible but unvalidated. Building a base resume is a technical dependency; targeting first-timers is a market choice. An existing resume can supply a base too. First-timers may need more guidance and have sparse sources; experienced developers may have richer history but less public evidence. Test both instead of equating architectural order with customer priority.

**Whether continuous updates create retention:** a user can have a painful update once a year and still have little reason to subscribe monthly. Measure return behavior and useful updates, not just agreement with the idea. Manual accomplishment capture may be more valuable than frequent GitHub polling for some users.

**Whether one page is worth enforcing:** if it is the initial product constraint, say which users it is designed for and make overflow decisions explicit. Do not call an editorial preference an ATS requirement.

**Whether free exports are sustainable:** preserve the no-surprise principle, but define generation limits, ongoing sync costs, storage, and paid features before promising unlimited service forever. Free PDF access and unlimited model usage are separate decisions.

**Whether provenance earns recruiter trust:** test whether candidates understand the evidence labels and whether recruiters find the optional proof useful. Do not infer demand for public proof pages from general concern about inflated resumes. Sharing should be deliberate, with users able to omit private or sensitive evidence.

### 10. Research and validation to run before committing to the roadmap

The proposed five people per segment is a reasonable first qualitative round, not enough to estimate market percentages or establish a winning segment. Recruit across public/private GitHub activity and the intended hiring market, including people who use Word, existing builders, or a general-purpose AI tool.

1. **Observe the last real task.** Ask participants to show their last draft/update/tailoring attempt, what triggered it, what took time, which facts were unavailable, and where they needed help. Avoid starting with a pitch for auto-sync.
2. **Test source coverage.** With permission, compare what the product can recover with what the user actually wants to claim. Record missing facts, wrong attribution, stale information, and conflicts between sources.
3. **Compare complete workflows.** Give participants a real job description and compare their existing workflow with a source-assisted draft. Include import, questions, editing, review, and export in the elapsed time. Counterbalance order where practical.
4. **Review quality independently.** Have appropriate reviewers assess readability, role relevance, and whether claims follow from the supplied evidence without being told which workflow produced each draft. Keep usefulness separate from guessing AI authorship.
5. **Test updates longitudinally.** Observe whether users have new resume-worthy work, whether suggestions capture it accurately, whether they return, and whether they approve or reject proposed cuts. A short demo cannot establish ongoing retention.
6. **Measure willingness to pay and actual alternatives.** Test concrete plan boundaries and see which capabilities people choose. Positive comments about the idea are weaker than completing a real task or returning with a second one.

Suggested measures are time to approved export, completion rate, user editing effort, unsupported-claim rate, incorrect-attribution rate, source coverage, extraction accuracy on named checks, accepted update suggestions, and successful snapshot retrieval. Report medians and slow cases, not only the fastest demo. Define thresholds before the pilot; the one-minute/five-minute figures above remain provisional targets.

### 11. Proposed wording to use when the team revises the original

These are recommendations for a later revision. Claude's original wording remains above for comparison.

| Original idea | Recommended wording |
| --- | --- |
| Most applicants do not tailor | Many applicants tailor lightly or inconsistently; we want to reduce the work of making relevant, truthful changes. |
| The 10.6× title-match association is the strongest signal because of dataset size | A vendor analysis reports an association between matching titles and interviews; dataset size alone does not establish evidence quality or the effect of changing a title. |
| Generic content is the number-one rejection reason | Generic content is one reported concern in a vendor survey of HR workers. |
| Their best evidence is already on GitHub | GitHub can supply evidence for some projects; important career facts may require documents or direct user input. |
| Verified from GitHub | Observed in the linked source, with personal contribution and outcome claims reviewed separately. |
| One page, ATS-safe, always | A readable one-page default for the initial audience, with export checks and explicit handling of overflow and employer requirements. |
| Exactly what an ATS sees | The fields and text our parser extracts; other systems may interpret the file differently. |
| Nobody updates proactively / no competitor does this | Some users struggle to maintain their resume; competitor overlap and the value of our proposed improvements need testing. |
| AI tailoring makes things worse | Unreviewed tailoring can introduce generic or unsupported claims; compare workflows on accuracy, relevance, and effort. |
| The resume automatically knows what you have done | Connected sources can suggest changes; users confirm contributions, missing context, and what belongs in the resume. |

**Codex recommendation:** retain the founder's three problem statements and the emphasis on truthful, low-effort work. Use the corrected evidence above for decisions, validate the target segment and source coverage, and demonstrate the core draft → review → export workflow before expanding into continuous monitoring and broad guarantees.
