-- Resume library, application tracking and resume chat history.

-- ① Archive a resume without deleting it. Archived resumes leave the sidebar and the default list.
alter table public.resumes add column archived_at timestamptz;

-- ② Where an application stands, plus private notes. Still the only editable fields of an export.
alter table public.exports
  add column status text check (status in ('sent', 'interviewing', 'offer', 'rejected', 'no_response')),
  add column notes text check (char_length(notes) <= 2000);
create or replace function public.exports_only_sent_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - 'sent_at' - 'sent_to' - 'status' - 'notes' - 'resume_id')
       is distinct from (to_jsonb(old) - 'sent_at' - 'sent_to' - 'status' - 'notes' - 'resume_id')
     or (new.resume_id is distinct from old.resume_id and new.resume_id is not null) then
    raise exception 'exports are immutable';
  end if;
  return new;
end $$;
-- Rows marked sent before statuses existed.
update public.exports set status = 'sent' where sent_at is not null and status is null;

-- ③ Resume chat history, so a conversation follows the person across devices.
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  resume_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 20000),
  edits jsonb,
  error boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (user_id, resume_id) references public.resumes(user_id, id) on delete cascade
);
alter table public.chat_messages enable row level security;
create policy "own rows" on public.chat_messages for all to authenticated
  using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());
create index on public.chat_messages (resume_id, created_at);
