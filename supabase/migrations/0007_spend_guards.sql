-- Spend guards that a signed-in user can't undo through the public Supabase API.

-- ① ai_runs is the AI cost log the daily spend budget reads (lib/ai/budget.ts). The broad
-- "own rows" policy let a user update or delete their rows and reset that budget. Now it is
-- read and add only, like usage_events. Deletes happen with the service key
-- (lib/record/delete-user-data.ts).
drop policy "own rows" on public.ai_runs;
create policy "read own runs" on public.ai_runs for select to authenticated
  using (user_id = public.requesting_user_id());
create policy "add own runs" on public.ai_runs for insert to authenticated
  with check (user_id = public.requesting_user_id());

-- ② One row per build or sync (stageExtract). The AI steps that follow it (interview, writing,
-- questions, rewrite proposals) each run once per pass, so they can't be called on their own
-- to get uncounted AI. Service role only: users can't issue or reset passes.
create table public.build_passes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  -- Steps already run on this pass: 'interview', 'write', 'questions', 'rewrite'.
  used text[] not null default '{}',
  -- Entries this sync changed; rewrite proposals are offered for these only.
  item_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.build_passes enable row level security;
-- No policies: service role only.
create index on public.build_passes (user_id, created_at desc);
