-- Plan allowances (docs/PRICING.md section 5, layer 1): one row per counted use, written by the
-- server after the use succeeds. Kinds match lib/plans.ts allowances. ai_runs can't be used for
-- this: it logs every attempt, retries and failures included.
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  kind text not null check (kind in ('tailored', 'fixes', 'updates')),
  ref text,
  created_at timestamptz not null default now()
);
alter table public.usage_events enable row level security;
-- Read and add only: a user can't delete rows to get their allowance back.
create policy "read own usage" on public.usage_events for select to authenticated
  using (user_id = public.requesting_user_id());
create policy "add own usage" on public.usage_events for insert to authenticated
  with check (user_id = public.requesting_user_id());
create index on public.usage_events (user_id, kind, created_at desc);

-- Carry over this month's usage counted the old way, so nobody's allowance resets mid-month.
-- (Syncs aren't carried over: the old count couldn't tell a first build from a sync.)
insert into public.usage_events (user_id, kind, ref, created_at)
  select user_id, 'tailored', id::text, created_at from public.resumes
  where kind = 'tailored' and created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc';
insert into public.usage_events (user_id, kind, ref, created_at)
  select user_id, 'fixes', id::text, created_at from public.ai_runs
  where ok and (step = 'chat' or (step = 'write' and meta->>'purpose' = 'fix'))
    and created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc';
