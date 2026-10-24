# DevProfile Pro

Build a developer resume from public GitHub data, uploaded PDFs, pasted notes, or manual entries. The current implementation covers the first-resume workflow; see [the implementation plan](docs/IMPLEMENTATION.md) and [review notes](docs/REVIEW.md) for remaining work.

## Local setup

1. Install Node.js 20.9 or newer, then run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in Clerk, Supabase, and an AI provider's keys.
3. Configure Clerk sign-in providers. Enable Clerk's Supabase integration and add Clerk as a third-party auth provider in Supabase. The app uses the ordinary publishable/anon Supabase key and Clerk session tokens; it does not need a Supabase service-role key.
4. Apply **all** files in `supabase/migrations/` in filename order. `0002_record_integrity.sql` is required by the atomic bullet-writing server action. Use a local Supabase database first; review the migration before applying it to an existing hosted database.
5. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

The landing page can run without Clerk keys. Protected routes require configured authentication. Set Upstash variables to enforce per-user generation limits; the environment example lists the AI spend guards too.

## Validation

- `npm test`: offline regression tests, including actual PDF rendering and pagination.
- `npm run lint`: ESLint.
- `npx tsc --noEmit`: TypeScript.
- `npm run build`: production build; Google Fonts requires network access.
- `npm run eval -- --dry-run`: inspect the AI fixtures without making paid AI calls.
- `npm run eval`: live AI evaluation; uses the configured provider and incurs API costs.

Run `supabase/tests/record_integrity.sql` with `psql -v ON_ERROR_STOP=1 -f ...` against a disposable/local database after applying the migrations. It exercises RLS, cross-user references, atomic replacements, manual-edit preservation, and immutable exports. Fixtures are rolled back.

## Code map

- `app/(app)`: onboarding, home, Career Record and resume editor.
- `app/api`: PDF previews, immutable exports, LaTeX downloads.
- `lib/ingest`: GitHub, merged PRs, PDF and paste ingestion.
- `lib/ai`: extraction, clarification questions, writing and spend guards.
- `lib/record`: persistence, provenance checks and server actions.
- `lib/resume`: document construction, PDF fitting, checks and LaTeX.
- `supabase/migrations`: schema, ownership rules and storage policies.

Private project. All rights reserved.
