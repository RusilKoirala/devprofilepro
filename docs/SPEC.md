# DevProfile Pro — Product Spec

> Give us your old resume and/or your GitHub, LinkedIn and X. We read everything, pull out the facts, and an AI writes a stunning **one-page LaTeX resume**. When your GitHub changes, the resume updates itself.

## 1. The flow

```
 ┌──────────── Sources ─────────────┐     ┌──── RAG ────┐     ┌──── Generation ────┐     ┌─── Output ───┐
 │ Old resume (PDF / text)          │     │ chunk       │     │ Claude (structured │     │ LaTeX (.tex) │
 │ GitHub username  → public API    │ ──▶ │ BM25 index  │ ──▶ │ JSON, one-page     │ ──▶ │ Overleaf     │
 │ LinkedIn  → "Save to PDF" / text │     │ per-section │     │ rules)             │     │ Live preview │
 │ X handle  → API (token) / bio    │     │ retrieval   │     │                    │     │ Print → PDF  │
 └──────────────────────────────────┘     └─────────────┘     └────────────────────┘     └──────────────┘
                     ▲                                                                          │
                     └──────────── auto-sync: GitHub fingerprint changed → regenerate ──────────┘
```

1. **Ingest** — every source becomes a list of `SourceDoc`s (`{ source, title, text, url? }`).
2. **Chunk + index** — docs are split into ~600-char overlapping chunks and indexed with BM25 (in-process, no vector DB needed for v1).
3. **Retrieve per section** — one query per resume section (header, experience, projects, skills, education, achievements). The top chunks for each are assembled into a labelled context block. This keeps the prompt focused and makes it work with large inputs (dozens of READMEs, long LinkedIn exports).
4. **Generate** — Claude (`claude-opus-5-5`) returns a typed `Resume` JSON object (Zod schema + structured outputs). The model never writes raw LaTeX, so output is always valid.
5. **Render** — `Resume` JSON → deterministic LaTeX template tuned to fit one page, plus an HTML preview of the same document.
6. **Auto-update** — sources are remembered in the browser. On load (and on "Sync now") we compare a GitHub fingerprint (repo count + latest push times). If it changed, the resume regenerates.

## 2. Sources — what is realistic

| Source | How we read it | Notes |
| --- | --- | --- |
| Old resume | PDF upload → text (`unpdf`) or paste | Highest-signal source for dates & employers |
| GitHub | Public REST API: profile, repos, languages, top READMEs | `GITHUB_TOKEN` optional (raises rate limit 60 → 5000/hr) |
| LinkedIn | Profile → **More → Save to PDF**, upload it, or paste text | LinkedIn blocks scraping and its API doesn't expose full profiles. The URL is still used in the header |
| X / Twitter | API v2 bio + recent posts when `X_BEARER_TOKEN` is set; otherwise paste bio | X API is paid; pasting works for everyone |

## 3. Output rules (one page)

- Header: name, headline, contact links (email, phone, location, website, GitHub, LinkedIn, X).
- ≤ 3 experiences × ≤ 4 bullets, ≤ 3 projects × ≤ 3 bullets, ≤ 2 education entries, ≤ 4 skill rows, ≤ 3 achievements.
- Bullets start with a strong verb, quantify when the sources give numbers, ≤ ~22 words.
- **No invention.** Anything not in the sources is left out. Unknown contact fields are empty.
- Optional "target role" steers what gets prioritised.

## 4. Architecture

| Path | Purpose |
| --- | --- |
| `app/(app)/dashboard/page.tsx` | The builder UI (shadcn/ui only) |
| `app/api/extract/route.ts` | PDF → text |
| `app/api/generate/route.ts` | Ingest → RAG → Claude → LaTeX |
| `app/api/github/fingerprint/route.ts` | Cheap change detection for auto-sync |
| `lib/ingest/*` | GitHub, X, text sources → `SourceDoc[]` |
| `lib/rag/*` | Chunking, BM25 index, per-section retrieval |
| `lib/ai/generate.ts` | Claude call with structured output |
| `lib/resume/schema.ts` | Zod `Resume` schema (single source of truth) |
| `lib/resume/latex.ts` | `Resume` → LaTeX, with escaping |

### UI rule

**Every UI element is a shadcn/ui component** (`components/ui/*`, added via `npx shadcn add`). No hand-rolled buttons, inputs, tabs, toasts or cards. The only custom markup is the resume document itself (the preview is the *content*, not UI chrome).

## 5. Environment

```
ANTHROPIC_API_KEY=...        # required
GITHUB_TOKEN=...             # optional, higher rate limit
X_BEARER_TOKEN=...           # optional, enables X ingestion
```

### Waitlist (coming-soon landing page)

`POST /api/waitlist` adds the email to Loops (loops.so) as a contact with `userGroup: "waitlist"` and `source: "landing-page"`. It needs `LOOPS_API_KEY` in `.env.local` (and in the host's env vars when deployed). Without it the route returns 503 and the form says so. A repeat signup (Loops 409) counts as success. Send the invite email from Loops by targeting the `waitlist` user group.

## 6. Next phases

- Persist profiles + resume history in Supabase (schema: `profiles`, `sources`, `resumes`), server-side cron (`/api/cron/sync`) so updates happen even when the app isn't open.
- Server-side PDF compile (Tectonic in a container) for a one-click PDF download.
- Multiple LaTeX templates; per-job tailoring from a pasted job description.
- Embedding-based retrieval (hybrid with BM25) once corpora get large.
