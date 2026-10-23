-- DevProfile Pro MVP schema. See docs/IMPLEMENTATION.md section 5.
-- Auth is Clerk via Supabase Third-Party Auth: auth.jwt()->>'sub' is the Clerk user ID.

create or replace function public.requesting_user_id() returns text
language sql stable as $$ select nullif(auth.jwt()->>'sub', '') $$;

-- What the user gave us, kept raw so quotes can be re-checked anytime
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  kind text not null check (kind in ('github','resume_pdf','linkedin_pdf','paste','pr_link','win')),
  label text not null,
  raw_text text not null default '',
  url text,
  file_path text,
  dedupe_key text,                 -- repo_id / PR url / file hash, for re-import
  meta jsonb not null default '{}',
  fetched_at timestamptz not null default now(),
  status text not null default 'ok' check (status in ('ok','partial','failed'))
);
-- Not partial, so PostgREST upserts can target it. NULL dedupe keys never conflict.
create unique index sources_dedupe on public.sources (user_id, kind, dedupe_key);

-- The Career Record
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  type text not null check (type in ('job','project','education','skills','award','contact')),
  data jsonb not null default '{}',
  rank int not null default 50,
  status text not null default 'suggested' check (status in ('suggested','shown','hidden')),
  reason text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Facts: the atoms every bullet is built from (the Proof Trail)
create table public.facts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  item_id uuid not null references public.items(id) on delete cascade,
  text text not null,
  label text not null check (label in ('github','document','user')),
  source_id uuid references public.sources(id) on delete set null,
  quote text,
  approx boolean not null default false,
  created_at timestamptz not null default now(),
  check (label = 'user' or (source_id is not null and quote is not null))
);

create table public.bullets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  item_id uuid not null references public.items(id) on delete cascade,
  text text not null,
  fact_ids uuid[] not null check (cardinality(fact_ids) > 0),
  user_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  item_id uuid not null references public.items(id) on delete cascade,
  prompt text not null,
  kind text,
  options jsonb not null default '[]',
  answer text,
  status text not null default 'open' check (status in ('open','answered','skipped')),
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  company text,
  role text,
  description text not null,
  match_report jsonb,
  created_at timestamptz not null default now()
);

-- A resume is a selection over the record, not a document
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  kind text not null default 'base' check (kind in ('base','tailored')),
  job_id uuid references public.jobs(id) on delete set null,
  title text not null,
  layout jsonb not null default '{}',
  cut_log jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every download. Never edited after creation (except sent_at).
create table public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  resume_id uuid references public.resumes(id) on delete set null,
  snapshot jsonb not null,
  pdf_path text not null,
  filename text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- AI cost and quality log
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  step text not null,
  model text not null,
  input_tokens int,
  output_tokens int,
  cache_read_tokens int,
  ms int,
  ok boolean not null,
  meta jsonb not null default '{}',   -- e.g. { facts_total, facts_dropped }
  created_at timestamptz not null default now()
);

-- Row Level Security: every row belongs to its Clerk user
do $$
declare t text;
begin
  foreach t in array array['sources','items','facts','bullets','questions','jobs','resumes','exports','ai_runs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = public.requesting_user_id())
         with check (user_id = public.requesting_user_id())', t);
    execute format('create index on public.%I (user_id)', t);
  end loop;
end $$;

-- Exports are immutable apart from "mark as sent"
create or replace function public.exports_only_sent_at() returns trigger
language plpgsql as $$
begin
  if new.snapshot is distinct from old.snapshot or new.pdf_path is distinct from old.pdf_path
     or new.filename is distinct from old.filename then
    raise exception 'exports are immutable';
  end if;
  return new;
end $$;
create trigger exports_immutable before update on public.exports
  for each row execute function public.exports_only_sent_at();

-- Storage: private buckets, files live under {clerk_user_id}/...
insert into storage.buckets (id, name, public) values ('uploads','uploads', false), ('exports','exports', false)
  on conflict (id) do nothing;

create policy "own files" on storage.objects for all to authenticated
  using (bucket_id in ('uploads','exports') and (storage.foldername(name))[1] = public.requesting_user_id())
  with check (bucket_id in ('uploads','exports') and (storage.foldername(name))[1] = public.requesting_user_id());
