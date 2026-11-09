# DevProfile Pro

Turn your GitHub, an old resume, or a few notes into a clean, one-page developer resume, then tailor it to a specific job.

**Live demo: [devprofilepro.vercel.app](https://devprofilepro.vercel.app)** (sign in to try the full app)

## What it does

- **Imports your work** from public GitHub repos and merged pull requests, an uploaded PDF resume, pasted text, or manual entries.
- **Builds a Career Record**: one place for every project, job and skill, with a note on where each fact came from.
- **Writes the resume** with AI (Claude or OpenAI), asks follow-up questions when something is vague, and never invents numbers it can't back up.
- **Tailors to a job**: paste a job description to get a version focused on it, plus a match report that shows which requirements your evidence actually covers.
- **Exports** a one-page PDF that fits automatically, or LaTeX source.
- **Free ATS checker** at [/ats-checker](https://devprofilepro.vercel.app/ats-checker): upload any resume PDF to see what an applicant tracking system can read. No account needed.

## Tech stack

Next.js 16 (App Router), React 19, Tailwind CSS 4 and shadcn/ui · Clerk for auth · Supabase Postgres with row-level security · Anthropic/OpenAI SDKs · `@react-pdf/renderer` for PDFs · Upstash for rate limits.

## Run it locally

1. Install Node.js 20.9 or newer, then run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill it in. You need, at minimum:
   - `APP_ENABLED=true` (without it, only the landing page is served)
   - Clerk keys (or leave them empty to use Clerk's keyless dev mode)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`
   - `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
3. In Clerk, enable the Supabase integration; in Supabase, add Clerk as a third-party auth provider.
4. Apply every file in `supabase/migrations/` in filename order.
5. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

Payments (Dodo), the waitlist (Loops) and rate limits (Upstash) are optional.

## Checks

- `npm test`: offline tests, including real PDF rendering and pagination
- `npm run lint` and `npx tsc --noEmit`
- `npm run eval -- --dry-run`: inspect the AI fixtures without paid calls (`npm run eval` makes real, billed calls)
- `supabase/tests/record_integrity.sql`: RLS and data-integrity tests; run it against a disposable database with `psql -v ON_ERROR_STOP=1 -f ...`

## Code map

- `app/(app)`: onboarding, home, Career Record and the resume editor
- `app/api`: PDF previews, exports, LaTeX downloads, webhooks
- `lib/ingest`: GitHub, merged PRs, PDF and paste import
- `lib/ai`: extraction, follow-up questions, writing and spend limits
- `lib/record`: storage, source tracking and server actions
- `lib/resume`: document building, PDF fitting, checks and LaTeX
- `supabase/migrations`: schema, ownership rules and storage policies

## License

[MIT](LICENSE)
