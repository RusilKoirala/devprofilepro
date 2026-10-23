# DevProfile Pro — Implementation Plan (MVP)

> Read [USER_PROBLEMS.md](USER_PROBLEMS.md) and [USER_SOLUTIONS.md](USER_SOLUTIONS.md) first. This doc says **how** we build it. It merges Claude's proposal (F1–F12) and Codex's proposal (C1–C9) into one buildable MVP, and replaces the architecture section of [SPEC.md](SPEC.md) where they disagree.

> **[Claude section]** Drafted 23 October 2026. Not yet reviewed by the team.

**Three rules for every decision in this doc:**

1. **MVP first.** If a feature isn't needed for a user to go from "nothing" to "a PDF I trust and can send", it waits.
2. **Buy, don't build.** If a hosted tool does the job (auth, database, storage, rate limits, email), we use it. We only write code for what makes us different: reading the user's work, writing honest bullets, and keeping versions.
3. **Never invent.** The one rule we enforce in code, not just in the prompt.

---

## 1. What we're building (in one paragraph)

A developer signs in (with GitHub, ideally), gives us what they have (GitHub, an old resume PDF, LinkedIn PDF, or pasted notes), and we turn it into a **Career Record**: a list of jobs, projects, education and skills, where every fact remembers where it came from. We ask a few short questions to fill gaps (numbers, "what did you personally do?"). We write a one-page resume from that record, show it as a PDF next to an editor, run simple checks, and let them download it free. Later they can paste a job post to get a tailored copy, and every downloaded PDF is kept so they always know what they sent where.

## 2. How Claude's and Codex's proposals were merged

Both proposals agree on the core. Where they differ, the MVP takes the simpler, more honest option.

| Topic | Claude (F) | Codex (C) | MVP decision |
| --- | --- | --- | --- |
| Career Record | F1: facts stored once, resumes are views | C1: same, plus conflicts, corrections, 5 evidence labels | **Keep F1.** Resumes are views of the record. Use **3 labels** (below). Conflicts are just shown as a question; no conflict-resolution engine |
| Proof Trail | F2: every line linked to a source | C1: claim-level sources with excerpts | **Keep both, and enforce it in code**: each fact stores a quote from its source, and the server checks the quote really exists in the source text |
| First draft | F3: draft before any questions | C2: honest partial draft, GitHub optional | **Both.** Draft first, questions after. Works with GitHub, PDF, or paste alone |
| Hidden experience | F4: rank projects, hide tutorials, find OSS PRs | C2: explain picks, don't auto-exclude, user pastes PR links | **Rank + explain + user can override.** OSS PR discovery waits; user pastes PR links for now |
| Impact questions | F5: ≤5 multiple-choice questions | C3: same, keep ranges, never force a number | **Same.** Max 5 questions, ranges kept as ranges, Skip always works |
| Checks | F6: 6-second view + ATS view + "Ready to send" | C4: concrete checks, extraction preview of the real PDF, no fake guarantees | **Codex's version.** Simple rule checks + link tests + "here's the text a parser reads from your actual PDF". No ATS score |
| One page | F9: always one page | C4: one page default, explicit overflow | **One page by default.** Auto-trim the weakest unpinned items, show what was cut and why. If pinned items alone overflow, say so and let the user choose |
| Living resume | F7: GitHub monitoring + Win Capture | C5/C6: manual capture + refresh on request first | **Codex's version.** "Log a win" + "Refresh GitHub" button. No background monitoring in the MVP |
| Update + diff | F8 | C6 | **Keep**, in Milestone 3 |
| Tailoring | F10: tailor + match report | C7: same, gaps split into "not found" vs "confirmed gap" | **Keep**, with Codex's status list simplified to 4 states |
| Versions | F11 | C8: exact snapshot of every export | **Codex's version.** Every download saves the exact PDF + data. Base updates are *offered* to tailored drafts, never forced |
| Voice + ownership | F12: learn the user's voice, free PDF, export all | C9: plain language, transparent limits | **Plain specific language** (no voice learning yet), **free PDF forever**, JSON + `.tex` export, generation limits shown up front |

### The 3 evidence labels (MVP)

| Label | Meaning | Example |
| --- | --- | --- |
| **From GitHub** | We saw it in the GitHub API (repo exists, language, stars, README text) | "Next.js, TypeScript" on a repo |
| **From your documents** | Taken from their uploaded resume / LinkedIn PDF / pasted text | "Software Intern, Acme, Jun–Aug 2025" |
| **You told us** | Answered in a question or typed in the editor | "~2k weekly users" |

Codex's "Estimate" becomes a field on the fact (`approx: true`, kept as "~" or a range in the text). "Needs clarification" becomes an open question. That's all five Codex states with only three labels on screen.

---

## 3. The stack (buy, don't build)

| Need | Tool | Why this one |
| --- | --- | --- |
| Framework + hosting | **Next.js 16 (already set up) on Vercel** | Already in the repo. Server Actions for most work, Route Handlers for PDF. Long AI calls fit in Vercel's function time limit |
| UI | **shadcn/ui** (already set up) + existing dark theme | SPEC.md rule: every UI element is a shadcn component |
| Auth | **Clerk** (`@clerk/nextjs`) | Sign-in pages, sessions, GitHub/Google login, and the **waitlist / invite-only mode** we need for launch, all hosted. Clerk also stores the user's **GitHub OAuth token**, so we can call the GitHub API as them (`clerkClient.users.getUserOauthAccessToken(userId, "github")`), which gives 5,000 req/hr per user instead of 60 |
| Database | **Supabase Postgres** (already a dependency) | Connected to Clerk via Supabase's official **Third-Party Auth** integration: Supabase trusts Clerk's session token, so Row Level Security works with Clerk user IDs. No custom JWT template |
| File storage | **Supabase Storage** | Uploaded resume PDFs and every exported PDF snapshot. Same project, same RLS |
| AI | **Claude (`claude-opus-5-5`) via `@anthropic-ai/sdk`** (already a dependency) | Structured JSON output validated with Zod (already a dependency). The model never writes LaTeX or HTML. Details in section 8 |
| PDF text extraction | **`unpdf`** (already a dependency) | Reads uploaded resumes, and reads back our own exported PDF for the "what a parser sees" check |
| PDF generation | **`@react-pdf/renderer`** | Pure JS, runs on Vercel, produces a real text PDF (searchable, selectable). No LaTeX install, no headless Chrome. We build one Jake's-Resume-style template in it |
| `.tex` export | Plain string template (no compile) + **"Open in Overleaf"** link | Power users get LaTeX. We never compile it, so it can't break our pipeline |
| Rate limits | **Upstash Ratelimit** (free tier) | One line per AI action to cap generations per user per day. Protects our Claude bill |
| Email | **Loops** (already used for the waitlist) | Invite waitlisted users. Later: optional "log a win" reminders |
| Analytics | **PostHog** (free tier) | Funnel: signed up → source added → draft seen → PDF downloaded. These are the numbers Codex's validation table asks for |
| Errors | **Sentry** (free tier) | Know when generation or PDF rendering fails |
| Payments | **None in MVP** | Free during beta. Show the daily limit instead. Add Stripe or Polar after we know costs |

**Deliberately not used in the MVP:**

- **BM25 / RAG** (in the current SPEC). All of a user's input is ~30–40k tokens and fits easily in Claude's context. Section 7 explains why and when we'd add it.
- **Vector DB, queues, cron.** Nothing runs in the background in the MVP. When we add GitHub monitoring later, use **Inngest** or **Trigger.dev** rather than our own cron.
- **X / Twitter ingestion.** Paid API, low signal. Users can paste their bio.
- **Supabase Auth.** Clerk replaces it. Remove `lib/supabase/middleware.ts` session logic (Supabase's `auth.*` calls stop working once Clerk provides the token anyway).

### Environment variables

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # older projects call this ANON_KEY

# AI
ANTHROPIC_API_KEY=

# Rate limits
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Already in use
LOOPS_API_KEY=

# Optional
NEXT_PUBLIC_POSTHOG_KEY=
SENTRY_DSN=
GITHUB_TOKEN=          # fallback for users who signed in without GitHub
```

---

## 4. The big picture

```
                ┌──────────────── Sources ────────────────┐
 Sign in (Clerk)│ GitHub (via Clerk token)                │
       │        │ Resume / LinkedIn PDF  → unpdf → text   │
       ▼        │ Pasted notes / PR links                 │
  Onboarding ──▶│ each saved as a `sources` row (raw text)│
                └───────────────────┬─────────────────────┘
                                    ▼
                    ① INGEST (code: text + GitHub signals, section 6)
                                    ▼
                    ② EXTRACT + RANK (Claude A1: facts + quotes, keep/hide + reason)
                                    ▼
                    ③ QUOTE CHECK (code: does each quote exist in its source?)
                         ├─ yes → fact saved to Career Record with label
                         └─ no  → dropped, or turned into a question
                                    ▼
                    ④ QUESTIONS (Claude A2: ≤5 multiple-choice gaps)
                                    ▼
                    ⑤ WRITE (Claude A3: bullets that cite fact IDs only)
                                    ▼
                    ⑥ FIT (code: render PDF, count pages, trim weakest unpinned)
                                    ▼
                    ⑦ CHECK (code: links, dates, buzzwords, parser view)
                                    ▼
                    ⑧ EXPORT (PDF + snapshot saved to Storage, free download)
```

**Key idea:** steps ②④⑤ use Claude (every AI call is listed in section 8). Steps ①③⑥⑦⑧ are plain code. Plain code is what lets us *promise* "no source, no line" and "one page" instead of hoping the prompt works.

---

## 5. Data model (Supabase)

Eight tables in the MVP (the seven below plus `ai_runs`). Every table has `user_id text not null` (the Clerk user ID) and RLS: a user can only read and write their own rows.

```sql
-- What the user gave us, kept raw so we can re-check quotes anytime
sources (
  id uuid pk, user_id text,
  kind text check (kind in ('github','resume_pdf','linkedin_pdf','paste','pr_link','win')),
  label text,                 -- "resume_2024.pdf", "github: rusil", "pasted notes"
  raw_text text,              -- the full extracted text we verify quotes against
  url text, file_path text,   -- Storage path for uploaded PDFs
  meta jsonb,                 -- numbers/flags straight from an API (stars, deps, contributors…)
  fetched_at timestamptz, status text   -- 'ok' | 'partial' | 'failed'
)

-- The Career Record: one row per job / project / education / skill group / award
items (
  id uuid pk, user_id text,
  type text check (type in ('job','project','education','skills','award','contact')),
  data jsonb,                 -- typed per `type` (company, role, start, end, tech[], url…)
  rank int,                   -- strength score from step ③
  status text default 'suggested',   -- 'suggested' | 'shown' | 'hidden'
  reason text,                -- "Deployed, 40 users" / "Fork with no changes"
  pinned bool default false,
  created_at, updated_at
)

-- Facts: the atoms every bullet is built from (this is the Proof Trail)
facts (
  id uuid pk, user_id text, item_id uuid fk items,
  text text,                  -- "Built OAuth login with NextAuth"
  label text check (label in ('github','document','user')),
  source_id uuid fk sources null,   -- null when label = 'user'
  quote text,                 -- exact excerpt from source.raw_text (verified in code)
  approx bool default false,  -- "~2k", "100–1k"
  created_at
)

-- Bullets shown on resumes; each one must cite ≥1 fact
bullets (
  id uuid pk, user_id text, item_id uuid fk items,
  text text,
  fact_ids uuid[] not null,   -- the proof trail; empty array is rejected
  user_edited bool default false,   -- AI never overwrites these
  created_at, updated_at
)

-- Impact questions (F5 / C3)
questions (
  id uuid pk, user_id text, item_id uuid fk items,
  prompt text, options jsonb,  -- ["<100","100–1k","1k+"] or free text
  answer text, status text     -- 'open' | 'answered' | 'skipped'
)

-- A resume is a SELECTION over the record, not a document
resumes (
  id uuid pk, user_id text,
  kind text check (kind in ('base','tailored')),
  job_id uuid fk jobs null,
  title text,                  -- "Base resume" / "Stripe — Backend Intern"
  layout jsonb,                -- { sections: [...order], items: [{id, bullet_ids[]}], headline }
  cut_log jsonb,               -- [{item_id, reason}] from the fit step
  updated_at
)

jobs (id uuid pk, user_id text, company text, role text, description text,
      match_report jsonb, created_at)

-- Every download. Never edited after creation.
exports (
  id uuid pk, user_id text, resume_id uuid fk resumes,
  snapshot jsonb,              -- the fully rendered resume content at that moment
  pdf_path text,               -- Supabase Storage path
  filename text,               -- "Rusil_Koirala_Stripe_Backend.pdf"
  sent_at timestamptz null,    -- user marks "I sent this"
  created_at
)
```

Also from the start: `ai_runs` for AI cost and quality logging (section 8.1). Milestone 3 adds one more table: `wins (id, user_id, text, link, item_id null, status 'new'|'used'|'dismissed', created_at)`.

**Why `facts` and `bullets` are separate:** a fact is something true ("used Redis", "~2k users"). A bullet is wording. Tailoring and updates can reword bullets freely, but can't add facts. Editing a fact once updates every resume that uses it (F1).

---

## 6. Ingestion: getting the user's data in

Every source ends up as one or more rows in `sources` with **plain text in `raw_text`** plus structured numbers in `meta`. Everything after this step (AI, quote checks, refresh) works on those rows, so each source type only has to solve "turn X into clean text + signals".

```
GitHub (API) ──┐
PDF upload ────┤──▶ lib/ingest/* ──▶ sources rows { kind, label, raw_text, meta, url } ──▶ Extract (AI)
Paste / notes ─┤                                                    │
PR links ──────┤                                                    └──▶ Signals → facts directly (no AI)
Manual form ───┘──▶ facts with label "you told us" (skips AI entirely)
```

`meta` holds numbers and flags we read straight from an API, so they never pass through AI.

### 6.1 GitHub — `lib/ingest/github.ts` (rework the existing file)

**Token:** if the user signed in with GitHub, use their token from Clerk (`getUserOauthAccessToken`). Otherwise ask for a username and use our server `GITHUB_TOKEN`. Read-only, public data only.

**What we fetch** (all REST, ~5 calls per repo, ~80 calls per user, well inside 5,000/hr):

| Call | What we get | Used for |
| --- | --- | --- |
| `GET /user` (or `/users/{u}`) | name, bio, location, blog, email, company | Contact facts |
| `GET /users/{u}/repos?type=owner&per_page=100` (paginate, max 300) | every repo: stars, forks, `fork`, `archived`, `homepage`, `pushed_at`, topics | Candidate list |
| `GET /repos/{r}/readme` (raw) | README text, max 6k chars | Main text Claude reads |
| `GET /repos/{r}/languages` | bytes per language | Tech stack (verified) |
| `GET /repos/{r}/contents/package.json` (or `requirements.txt`, `go.mod`, `Cargo.toml`, `pyproject.toml`) | dependencies | Frameworks like Next.js, Prisma, FastAPI (verified, no AI guess) |
| `GET /repos/{r}/contributors?per_page=10` | contributor count + user's commit share | **Solo vs team** (so we ask "what did you build?" on team repos) |
| `GET /repos/{r}/commits?author={u}&per_page=1` | read the `Link` header's last page = the user's commit count | Did they actually work on it (important for forks) |

**Which repos get the deep fetch:** score every repo with plain code, then deep-fetch the top 15. The rest are stored as one-line entries (name, description, language) so the user can still pick them.

- Score up: has homepage (deployed), README > 500 chars, recent push, stars, user commits > 10, has dependencies manifest.
- Score down: fork with 0 user commits, empty repo, name looks like a tutorial (`todo`, `clone`, `tutorial`, `course`) and no README of its own.
- **Never auto-delete.** Low-scored repos are kept with `status: hidden` and a reason, per Codex. The user can show them.

**Output:** one `sources` row for the profile, one row per deep-fetched repo (`kind: 'github'`, `meta: {repo_id, stars, forks, is_fork, archived, homepage, pushed_at, languages, deps, contributors, user_commits}`), and one row with the one-line list of the rest.

**Signals become facts with no AI:** "Built with TypeScript, Next.js, Prisma", "Deployed at x.vercel.app", "12 stars", "Solo project" are written straight from `meta` as facts labelled **From GitHub**. AI only reads the README for what the project *does*.

**Fix while reworking:** remove `githubFingerprint()` (the Codex review found its count doesn't match `ingestGitHub()`). "Refresh GitHub" in Milestone 3 compares by `repo_id` + `pushed_at` instead.

### 6.2 Pasted PR links — `lib/ingest/github-pr.ts`

User pastes `github.com/owner/repo/pull/123`. We call `GET /repos/{owner}/{repo}/pulls/123` and keep it **only if `user.login` matches the user and `merged_at` is set**. We store the title, body, additions/deletions and files changed. This is how open-source contributions to *other people's* repos get in, with proof, without crawling all of GitHub (F4, scaled down as Codex suggested).

### 6.3 Resume / LinkedIn PDF — `lib/ingest/pdf.ts`

1. Upload to Supabase Storage (`uploads/{userId}/…`). PDF only, max 5 MB, max 2 files.
2. Extract text with `unpdf` (`extractText`, page by page).
3. Clean it: fix ligatures (`ﬁ` → `fi`), join hyphenated line breaks, turn bullet symbols into `- `, collapse spaces.
4. Pull hyperlinks too: read each page's link annotations through `unpdf`'s `getDocumentProxy` (pdf.js `getAnnotations`), so a "GitHub" word linking to `github.com/x` isn't lost.
5. Detect LinkedIn exports (contains `linkedin.com/in/` and the LinkedIn section headings) and set `kind: 'linkedin_pdf'`.
6. **Scanned PDF fallback:** if we get under ~200 characters of text, send the PDF to Claude to transcribe (AI call A0 below), save that as `raw_text`, and tell the user "We read this from an image, please check it".

### 6.4 Paste — `lib/ingest/paste.ts`

A textarea, max 20k characters: portfolio text, project notes, course list, "I built X at my part-time job". Stored as is, `kind: 'paste'`. If they paste only a URL, we ask them to paste the page text instead (no web scraping in the MVP).

### 6.5 Manual entry (no ingestion at all)

A form for "Add a job / project / education". Writes `items` + `facts` labelled **You told us** directly. This is the escape hatch for private work and for anyone with nothing to upload (Codex: GitHub must be optional).

### 6.6 Coverage report

After ingestion, `/start` shows what we actually read, never "we read everything" (Codex C2):

> ✓ GitHub: 15 repos read in full, 22 listed · ✓ resume.pdf: 2 pages · ✗ linkedin.pdf: couldn't read text, transcribed from image, please check

### 6.7 Re-import and duplicates

- GitHub repos are matched by `repo_id`, PRs by URL, PDFs by file hash. Re-importing updates the same `sources` row instead of adding another.
- Items extracted twice (same company + role + start date, or same repo) are merged by plain code before saving.
- A fact the user edited or confirmed is never overwritten by a re-import. A new conflicting value becomes a question ("Your resume says Jun 2024, LinkedIn says Jul 2024. Which is right?").

---

## 7. RAG: why the MVP doesn't need it, and when we add it

The current SPEC plans chunking + a BM25 index + per-section retrieval. **For the MVP we drop it.**

**Why:**

| Input | Rough size |
| --- | --- |
| Old resume | 1–2k tokens |
| LinkedIn PDF | 2–5k tokens |
| 15 READMEs × ≤6k chars | ~20–25k tokens |
| GitHub signals + paste | ~3–5k tokens |
| **Total** | **~30–40k tokens** |

Claude's context window is 1M tokens. The whole input fits ~25 times over. RAG exists to pick the relevant bits when everything *doesn't* fit; here it would only add code and a risk: a chunk that wasn't retrieved is a fact the model never sees, and that's exactly the "you have more experience than you think" content F4 is about.

**What we do instead: "read once, then use the record."**

1. **Extract (A1) reads everything once.** All source texts go in one call, packed in a fixed order (resume → LinkedIn → paste → GitHub profile → repos by score), each wrapped in `<source id="…" kind="…">` tags so Claude can cite the ID.
2. **After that, nothing reads raw sources again.** Questions, writing and tailoring work from the **Career Record** (structured items + facts, ~5–10k tokens). The Career Record *is* our retrieval index: it's already deduplicated, labelled and small.
3. **Quote check uses plain string matching** against `raw_text`. No embeddings needed.
4. **Budget guard:** before calling A1, count tokens (`messages.countTokens`). If it's over ~150k, drop READMEs from the lowest-scored repos first and list what was skipped in the coverage report.
5. **Prompt caching:** the system prompt + the packed sources block are marked `cache_control`, so a retry or a second pass on the same sources costs ~10% of the input price.

**When we add retrieval (later, not MVP), and how:**

| Trigger | Add |
| --- | --- |
| Users routinely hit the 150k budget (many repos, long docs) | Chunk READMEs by heading and do one extraction call per chunk group, merging items in code (map-reduce). Still no index |
| A feature needs to *search* evidence, e.g. "find proof I used Kafka" across code and PRs | **Postgres full-text search** in Supabase (`tsvector` on chunks). It's BM25-like, free, and already in our database |
| Keyword search misses synonyms ("CI/CD" vs "deployment pipeline") | Add **pgvector** in the same Supabase database + an embeddings API, hybrid with full-text. No separate vector DB |

---

## 8. Every place we use AI

### 8.1 Shared setup — `lib/ai/client.ts`

One helper that every AI call goes through:

```ts
// lib/ai/client.ts (sketch)
import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"

export async function generate<T>(opts: {
  step: AiStep, userId: string, schema: z.ZodType<T>,
  system: string, content: Anthropic.ContentBlockParam[], effort?: "low" | "medium" | "high"
}): Promise<T> {
  // 1. Upstash rate-limit check for (userId, step)
  // 2. client.messages.parse({ model: MODEL, output_config: { format: zodOutputFormat(schema), effort }, ... })
  // 3. stop_reason "refusal" / "max_tokens" → typed error, never half-saved data
  // 4. validation failure → retry once, then throw
  // 5. log usage (input/output/cache tokens, ms, ok) to ai_runs + PostHog
}
```

- **Model:** one constant in `lib/ai/model.ts`. Default **`claude-opus-5-5`** ($4 / $20 per million tokens in/out). It's the current default model and our output quality is the product. Whether the cheap, high-volume steps (A0, A1) can move to **`claude-haiku-5-5`** ($0.10 / $0.50) is a team decision to make *after* comparing both on our test cases (section 15), not a guess.
- **Structured output:** `client.messages.parse()` + `zodOutputFormat(schema)`. Claude always returns JSON matching our Zod schema. The model never writes LaTeX, HTML or PDF.
- **Effort:** `output_config.effort`. `medium` (the default) for most steps, `high` for Write and Tailor where wording quality matters. Thinking is on by default on Opus 5.5; we don't show it.
- **Untrusted input:** READMEs and pasted text can contain "ignore your instructions…". The system prompt says source text is data, never instructions; the output schema can't do anything but describe facts; the quote check throws out anything not in the source.
- **Refusal fallback (optional):** the API has a server-side `fallbacks` option that retries a refused request on another model. Resume text should almost never be refused, so this is low priority; turn it on only if `ai_runs` shows refusals.
- **Cost tracking:** add a small table `ai_runs (id, user_id, step, model, input_tokens, output_tokens, cache_read_tokens, ms, ok, created_at)`. It answers "what does one resume cost us" and powers the daily limits.

### 8.2 The AI calls

| # | Call | When | Reads | Returns | Checked by code |
| --- | --- | --- | --- | --- | --- |
| A0 | **Transcribe** | Only for scanned PDFs | The PDF as a document block | Plain text | Length > 0; user is told to check it |
| A1 | **Extract + rank** | Onboarding, new source added | All `sources` (packed, cached) + GitHub signals | Items, facts with quotes, rank, show/hide + reason, section order | Quote check, dedupe, IDs exist |
| A2 | **Questions** | After A1, after big changes | Career Record | ≤5 questions with options | Max 5, each tied to a real item |
| A3 | **Write** | After A1/A2, "Regenerate" on one item | Shown items + their facts + target role | Bullets citing fact IDs | Fact IDs valid, numbers present in facts, banned words, length |
| A4 | **Tailor** | Paste a job description | JD text + whole Career Record | Requirements + status, layout, reworded bullets | Same as A3 + no new tech terms; names/titles/dates copied from record |
| A5 | **Win → facts** (M3) | "Log a win", new repo on refresh | One win note / new repo source + the item list | Facts with quotes + which item they belong to | Quote check; shown as a proposal in the diff, never applied silently |

Everything else is plain code: quote check, dedupe, GitHub signals → facts, fit to one page, checks, link tests, diff, PDF, `.tex`, export.

### 8.3 Each call in detail

**A0 — Transcribe** (`lib/ai/transcribe.ts`)
- Input: the PDF as a base64 `document` block. Prompt: "Transcribe this resume exactly as written. Do not fix, add or summarise."
- Output schema: `{ text: string }`.
- Then it goes through ingestion like any other PDF text.

**A1 — Extract + rank** (`lib/ai/extract.ts`) — the biggest call
- Input: system prompt (cached) + packed sources (cached) + GitHub `meta` summary per repo.
- Output schema (sketch):
  ```ts
  z.object({
    items: z.array(z.object({
      temp_id: z.string(),
      type: z.enum(["job","project","education","skills","award","contact"]),
      data: z.record(z.string(), z.any()),       // company/role/start/end, or name/url/tech…
      show: z.boolean(), rank: z.number().int().min(1).max(100),
      reason: z.string(),                       // "Deployed, solo, real users" / "Fork with no changes"
      team_project: z.boolean(),                // → triggers "what did you build?" question
      facts: z.array(z.object({ text: z.string(), source_id: z.string(), quote: z.string() })),
    })),
    section_order: z.array(z.string()),          // Projects first when there's no job history
  })
  ```
- Prompt rules: quote word-for-word or don't output the fact; keep dates exactly as written; a school assignment is never a job; never assume the user built everything in a team repo; popularity is context, not the deciding factor.
- After: quote check (section 9 ③), dedupe, save. Facts that fail the check are dropped and counted.
- Size: ~30–40k tokens in, ~5–8k out. Use streaming + `finalMessage()` here because the output is long.

**A2 — Questions** (`lib/ai/questions.ts`)
- Input: Career Record (items + facts, no raw sources).
- Output: `{ questions: [{ item_id, prompt, options: string[], kind: "users"|"speed"|"team"|"ownership"|"outcome"|"conflict" }] }`, max 5.
- Priority: conflicts between sources → "what did you personally do" on team projects → users → measurable change → solo/team.
- Answer handling is code, not AI: the chosen option is saved as a fact labelled **You told us** (ranges kept, `approx: true`), then A3 rewrites only that item.

**A3 — Write** (`lib/ai/write.ts`)
- Input: shown items with their facts (with fact IDs), target role if given, bullet budget per item (from the fit step), user-edited bullets marked "keep".
- Output: `{ bullets: [{ item_id, text, fact_ids: string[] }], headline: string }`.
- Prompt rules: start with a verb, ≤ ~22 words, plain technical words, only use what the cited facts say, no numbers unless a cited fact has that number, keep ranges as ranges. Banned: "spearheaded", "leveraged", "synergy", "passionate", "results-driven", "cutting-edge".
- Checks: every `fact_id` exists and belongs to the item; every number in `text` appears in a cited fact; no banned words; length. Fail → one retry with the error listed → else fall back to the plain fact text.
- Headline: must match a real title or be a neutral "Software Developer"; never claims a title the user hasn't held.

**A4 — Tailor** (`lib/ai/tailor.ts`)
- Input: job description text + the **whole** Career Record (including hidden items and cut bullets) + the base resume layout.
- Output:
  ```ts
  z.object({
    company: z.string(), role: z.string(),
    requirements: z.array(z.object({
      text: z.string(), must_have: z.boolean(),
      status: z.enum(["covered","in_record_not_shown","not_found","unclear"]),
      fact_ids: z.array(z.string()),
    })),
    layout: z.object({ section_order: z.array(z.string()),
                       items: z.array(z.object({ item_id: z.string(), bullet_ids: z.array(z.string()) })) }),
    rewrites: z.array(z.object({ bullet_id: z.string(), text: z.string(), fact_ids: z.array(z.string()) })),
  })
  ```
- "Confirmed gap" (Codex) is not an AI output: when the user answers "No, I don't have this" on a `not_found` row, code sets it.
- Checks: everything from A3, plus any tech word in a rewrite must already be in the cited facts or the user's skills. Company names, titles and dates are always taken from `items`, never from the AI output.

**A5 — Win → facts** (`lib/ai/win.ts`, Milestone 3)
- A win note is saved as a `sources` row (`kind: 'win'`), so this is a small A1: input is that one source + the list of existing items, output is facts with quotes + `item_id` (or "new item").
- Results only appear as proposals in the "Update my resume" diff.

### 8.4 Cost per user (estimate, Opus 5.5)

| Action | Tokens in / out (incl. thinking) | ≈ Cost |
| --- | --- | --- |
| First resume (A1 + A2 + A3) | ~55k / ~15k | **~$0.50** |
| Answer questions + rewrite (A3 on a few items) | ~8k / ~3k | ~$0.10 |
| Tailor one job (A4) | ~20k / ~8k | ~$0.25 |
| Log a win (A5) | ~3k / ~1k | ~$0.03 |

Rough numbers from the sizes above, to replace with real numbers from `ai_runs` in the first week. Re-runs on the same sources are cheaper because of prompt caching. If Haiku 5.5 passes our tests for A0/A1, the first resume drops to roughly a third of this.

### 8.5 Keeping AI quality honest

- Save each test case from section 15 as a fixture in `evals/fixtures/` (inputs + what must or must not appear).
- `npm run eval` runs A1–A4 on them and reports: facts dropped by the quote check, bullets rejected by the number check, unsupported tech words in tailoring, banned words.
- Run it whenever a prompt or the model changes. A prompt change that raises the drop/reject rate doesn't ship.

---

## 9. The non-AI steps

### ③ Quote check — `lib/record/verify.ts`

- Normalise whitespace, quote marks and case, then check `source.raw_text.includes(quote)`.
- Pass → save the fact with label **From GitHub** or **From your documents**.
- Fail → drop it. If it looked important (a number, a title, a date), create a question instead: "Your resume mentions X. Is that right?"
- **This is the "no source, no line" guarantee.** The share of facts dropped here is our hallucination metric (logged in `ai_runs`).

### ⑥ Fit to one page — `lib/resume/fit.ts`

1. Build the resume content from `resumes.layout` + record.
2. Render the PDF with `@react-pdf/renderer`, read page count with `unpdf`.
3. If > 1 page: remove the lowest-`rank` unpinned bullet (or item if it has none left), log `{item_id, reason: "Older and weaker than X"}` in `cut_log`, repeat.
4. If only pinned content remains and it still overflows: stop and show "Your pinned items don't fit on one page. Unpin something or allow 2 pages."
5. Min font size is fixed in the template; we never shrink text to fit.

Cut items stay in the Career Record and can be restored in one click (F1).

### ⑦ Checks — `lib/resume/checks.ts`

Each check returns `pass | warn | fail | not_checked`. "Not checked" never shows as a pass (Codex).

| Check | How |
| --- | --- |
| Page count = 1 | From the fit step |
| Contact present | Name + email + one link exist |
| Dates consistent | Same format everywhere, end ≥ start |
| Links work | Server `fetch` HEAD (fallback GET) with 5s timeout: OK / broken (404) / restricted (401/403, e.g. LinkedIn) / couldn't check |
| No buzzwords | Regex against a small banned-phrase list |
| Skills are used | Each listed skill appears in at least one bullet or project tech list |
| Every line has a source | Every bullet has ≥1 fact (always true by construction; show it anyway) |
| **Parser view** | Run `unpdf` on the *exported* PDF and show the plain text in a tab: "This is what an applicant-tracking system reads from your file." No score |

Verdict: **"Reviewed and ready to export"** only when there are no `fail`s. Warnings are listed, worst first. Download is never blocked; the verdict is advice.

### ⑧ Export — `app/api/pdf/[resumeId]/route.ts`

- Renders the PDF (same template as the preview), saves it to Storage, writes an `exports` row with the full `snapshot`, returns the file with a clean filename.
- Re-downloading an old export returns the stored file, never a re-render (C8).
- Also offered: **`.tex`** (string template of the same content, with LaTeX escaping) + **"Open in Overleaf"**, and **"Download my data" (JSON of all tables)**.
- `next.config.ts`: add `serverExternalPackages: ["@react-pdf/renderer"]`; return `new Uint8Array(buffer)` as the body.

---

## 10. Screens

All under `app/(app)/`, protected by Clerk middleware. Marketing pages stay in `app/(marketing)/`.

| Route | What's on it |
| --- | --- |
| `/sign-in`, `/sign-up` | Clerk's `<SignIn/>` / `<SignUp/>`, styled dark. GitHub button first |
| `/start` | Onboarding. Three cards: **GitHub** (auto-connected if they signed in with it; otherwise a username box), **Upload PDF** (resume or LinkedIn), **Paste anything**. "Build my resume" button runs ①→⑥ with a step-by-step progress list. Shows what was read and what failed ("Couldn't read the PDF — paste the text instead?") |
| `/resume/[id]` | **The main screen.** Left: editor (sections → items → bullets; each bullet shows its label chip, click to see the source quote; pin, hide, edit, restore cut items). Right: live PDF preview. Tabs above the preview: **Questions** (the ≤5 cards), **Checks** (verdict + list), **Parser view**. Top bar: Download PDF · More (.tex, Overleaf, JSON) |
| `/record` | The full Career Record: every item including hidden and cut ones, with sources. Add a project or job by hand. Add a source |
| `/jobs/new` | Paste a job description (+ company, role). Shows the Match Report next to the tailored draft. "Save tailored resume" |
| `/home` | List of resumes (base + tailored, with job names), list of exports with "Mark as sent" and date, "Log a win" box (Milestone 3) |

Reuse the existing shadcn components in `components/ui/`. New ones likely needed: `dialog`, `popover`, `checkbox`, `select`, `radio-group`, `collapsible`.

---

## 11. Folder structure (target)

```
app/
  (marketing)/…                       # existing landing page
  (auth)/sign-in/[[...sign-in]]/page.tsx
  (auth)/sign-up/[[...sign-up]]/page.tsx
  (app)/layout.tsx                    # app shell, Clerk <UserButton/>
  (app)/start/page.tsx
  (app)/home/page.tsx
  (app)/record/page.tsx
  (app)/resume/[id]/page.tsx
  (app)/jobs/new/page.tsx
  api/pdf/[resumeId]/route.ts         # render + save + download
  api/exports/[exportId]/route.ts     # download a stored snapshot
  api/waitlist/route.ts               # existing
middleware.ts                         # clerkMiddleware, protect (app) routes
lib/
  supabase/server.ts                  # createClient with Clerk accessToken
  supabase/client.ts                  # browser client with Clerk session token
  ingest/github.ts                    # existing; rework per section 6.1
  ingest/github-pr.ts  ingest/pdf.ts  ingest/paste.ts
  ai/client.ts  ai/model.ts           # shared generate() helper, model constant
  ai/transcribe.ts  ai/extract.ts  ai/questions.ts  ai/write.ts  ai/tailor.ts  ai/win.ts
  record/verify.ts                    # quote check
  record/actions.ts                   # server actions: edit/pin/hide/restore
  resume/schema.ts                    # existing Zod Resume (render shape)
  resume/build.ts                     # layout + record → Resume
  resume/fit.ts  resume/checks.ts  resume/latex.ts
  resume/pdf/Template.tsx             # @react-pdf/renderer Jake's-style template
  ratelimit.ts                        # Upstash
supabase/migrations/0001_init.sql     # tables + RLS above (+ sources.meta, ai_runs)
evals/fixtures/                       # test cases for AI quality (section 8.5)
```

Clean up: `types/index.ts` (old, unused types) and Supabase-auth session code in `lib/supabase/middleware.ts`.

---

## 12. Build order

Small milestones, each ending in something a real user can do (Codex's rule). Each step is roughly a day or two for one person.

### Milestone 0 — Plumbing (no user-facing feature yet)

1. Create Clerk app: enable GitHub (scope `read:user`, public repos only) + Google + email. Turn on **waitlist mode** so only invited people get in.
2. Install `@clerk/nextjs`, add `middleware.ts`, sign-in/up pages, `(app)` layout with `<UserButton/>`.
3. Create Supabase project. Enable the **Clerk integration** in the Clerk dashboard, add Clerk as a **Third-Party Auth** provider in Supabase.
4. Write `0001_init.sql`: tables + `alter table … enable row level security` + policy `user_id = auth.jwt()->>'sub'` on every table. Create private Storage buckets `uploads` and `exports` with the same rule on the path prefix.
5. Update `lib/supabase/server.ts` and `client.ts` to pass Clerk's token via the `accessToken` option.
6. Add Upstash, PostHog, Sentry. Add env vars to Vercel.
7. **Test:** user A cannot read user B's rows (try it with two accounts).

### Milestone 1 — Create and export (Problem 1) ← **the MVP**

1. Ingestion ① (section 6): GitHub via Clerk token, PR links, PDF upload → Storage → `unpdf` (+ A0 fallback), paste, manual entry, coverage report.
2. `lib/ai/client.ts` + `ai_runs` logging. Then Extract + rank (A1) → Quote check ③ → Career Record in `/record`, with hide/show/pin and reasons.
3. Write (A3) → base resume. React-PDF template + live preview.
4. Fit ⑥ with cut log + restore.
5. Questions (A2) tab; answers create **You told us** facts and rewrite only the affected item.
6. `evals/fixtures/` + `npm run eval` (section 8.5).
7. Checks ⑦ + Parser view.
8. Export ⑧: PDF download, snapshot, `.tex`, JSON.
9. Editor: inline edit (sets `user_edited`), label chips, source popover.

**Ship to the first waitlist batch here.** Done when: a first-timer with only GitHub *and* a person with only an old resume PDF can both reach a downloaded PDF, with every line traceable.

### Milestone 2 — Tailor and remember (Problem 3)

1. `/jobs/new`: paste JD → Tailor (A4) → Match Report + tailored `resumes` row linked to `jobs`.
2. Same fit + checks + export on tailored resumes.
3. `/home` exports list: "Mark as sent", re-download the exact stored file.
4. Filename `First_Last_Company_Role.pdf`.

Done when: a user can tailor, export, mark as sent, later edit the base, and still download the exact PDF they sent.

### Milestone 3 — Keep it current (Problem 2)

1. "Log a win" box (`wins` table): save text + optional link in one action. Win → facts (A5) runs when they ask to update.
2. "Refresh GitHub" button: re-ingest, compare against existing repos by repo ID (not the old fingerprint), propose new projects.
3. "Update my resume": turn new wins/repos into proposed facts + bullets → **diff view** (Added / Changed / Dropped with reasons) → accept all or one by one → re-fit → new version. Old version stays restorable.
4. When the base changes, offer the change to each tailored draft (review, never forced). Exports never change.

**Why Problem 3 before Problem 2:** active job seekers need tailoring right away, while updating only pays off weeks later. Both build on Milestone 1. If early users say otherwise, swap them.

### Later (not MVP)

- Background GitHub monitoring (Inngest/Trigger.dev) + monthly "3 new things" email via Loops.
- Finding merged PRs in other people's repos automatically (GitHub search API).
- Job URL import, public proof link, learning the user's writing voice, more templates, payments.

---

## 13. Limits and cost control

- Upstash rate limit per user: e.g. **10 full generations / day** and **20 tailors / day** during beta (tune after seeing real Claude costs in PostHog/Anthropic console). Show the remaining count in the UI *before* they click (C9).
- Editing, re-fitting, checks and PDF download never use AI and are **never limited**. If the limit is hit, the user keeps full access to their resume.
- Cache GitHub responses in `sources.raw_text`; only re-fetch on "Refresh GitHub".
- Cap input size: max 15 READMEs, 6k chars each (already in `lib/ingest/github.ts`), max 2 PDFs, 20k chars of paste.

## 14. Privacy basics

- Everything private by default. Nothing public in the MVP.
- Say on `/start`: "Your files are processed by Anthropic (Claude) to extract facts. We don't train on them."
- "Delete my account" in settings: deletes all rows + Storage files + the Clerk user.
- GitHub scope is read-only public data.

## 15. Test cases before inviting users

From Codex's list, the ones that matter for the MVP:

| Case | Expected |
| --- | --- |
| Student with GitHub only, 3 small repos | Full one-page draft, Projects first, no invented job |
| Resume PDF only, no GitHub | Draft from the PDF alone |
| Scanned (image) PDF | "Couldn't read this PDF, paste the text instead", other sources still used |
| Team project README | Asks "which part did you build?" before writing personal bullets |
| User answers "100–1k users" | Bullet says "100–1k", never "1,000" |
| Bullet with a number not in any fact | Rejected by the write check |
| Pinned items overflow one page | Clear message, no silent shrink or cut |
| LinkedIn link returns 999/403 | "Restricted", not "broken" |
| Base edited after an export was marked sent | Old export downloads unchanged |
| User B tries to fetch user A's export URL | 404 |

Track from day one (PostHog): signed up → source added → draft generated → PDF downloaded, time to first download, % of facts dropped by verify, % of questions skipped, bullets edited by hand.

---

## 16. Open decisions for the team

1. **Model choice** after running the evals: Opus 5.5 everywhere, or Haiku 5.5 for transcribe/extract (A0/A1).
2. **Daily limits** for beta, once we see real cost per generation.
3. **Waitlist batch size** for the first invite.
4. Confirm **Milestone 2 (tailor) before Milestone 3 (update)**.

## Sources for the tooling choices

- [Clerk: Supabase third-party auth integration (changelog)](https://clerk.com/changelog/2025-03-31-supabase-integration)
- [Clerk: Next.js authentication guide 2026, part 2](https://clerk.com/articles/nextjs-authentication-guide-2026-2)
- [Clerk: How Clerk integrates with Next.js and Supabase](https://clerk.com/blog/how-clerk-integrates-nextjs-supabase)
- [Clerk: `getUserOauthAccessToken()` reference](https://clerk.com/docs/reference/backend/user/get-user-oauth-access-token)
- [Generate a PDF in React (react-pdf in a Next.js route)](https://spacejelly.dev/posts/generate-a-pdf-from-html-in-javascript)
