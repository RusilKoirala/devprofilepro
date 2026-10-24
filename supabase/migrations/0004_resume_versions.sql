-- Tailored resumes own their wording; resumes can be deleted; exports record where they went;
-- re-imported sources keep the text older facts were checked against.

-- ① Copy-on-write bullets. resume_id null = the Career Record's shared wording, used by every
-- resume. A bullet with resume_id belongs to that tailored resume only; `replaces` names the
-- shared bullet it stands in for on that resume (null = a line only this resume has).
alter table public.bullets
  add column resume_id uuid,
  add column replaces uuid references public.bullets(id) on delete set null;
alter table public.bullets add constraint bullets_owned_resume
  foreign key (user_id, resume_id) references public.resumes(user_id, id) on delete cascade;
create index on public.bullets (resume_id);

-- Regenerating shared wording must never touch a tailored resume's own lines, and a resume that
-- has its own wording for an item keeps its layout until it is re-fitted.
create or replace function public.replace_generated_bullets(
  p_item_ids uuid[], p_bullets jsonb, p_release_edits boolean default false
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  owner_id text := public.requesting_user_id();
  v_item_id uuid;
  old_ids uuid[];
  new_ids uuid[];
  saved_id uuid;
  bullet jsonb;
  n integer;
begin
  if owner_id is null or p_item_ids is null or p_bullets is null or jsonb_typeof(p_bullets) <> 'array' then
    raise exception 'Invalid bullet batch';
  end if;
  if exists (select 1 from unnest(p_item_ids) id where not exists (
    select 1 from public.items i where i.id = id and i.user_id = owner_id
  )) then raise exception 'Item not found'; end if;
  if exists (select 1 from jsonb_array_elements(p_bullets) b
    where not ((b->>'item_id')::uuid = any(p_item_ids)) or b->>'item_id' is null
  ) then raise exception 'Unexpected item in bullet batch'; end if;

  perform 1 from public.items i where i.id = any(p_item_ids) and i.user_id = owner_id order by i.id for update;
  foreach v_item_id in array p_item_ids loop
    if not p_release_edits and exists (
      select 1 from public.bullets b where b.item_id = v_item_id and b.user_id = owner_id and b.resume_id is null and b.user_edited
    ) then continue; end if;

    if not exists (select 1 from jsonb_array_elements(p_bullets) b where (b->>'item_id')::uuid = v_item_id) then continue; end if;
    select coalesce(array_agg(b.id order by b.created_at, b.id), '{}'::uuid[]) into old_ids
      from public.bullets b where b.item_id = v_item_id and b.user_id = owner_id and b.resume_id is null;
    new_ids := '{}'::uuid[];
    n := 0;
    for bullet in select b from jsonb_array_elements(p_bullets) b where (b->>'item_id')::uuid = v_item_id loop
      n := n + 1;
      saved_id := coalesce(old_ids[n], gen_random_uuid());
      insert into public.bullets (id, user_id, item_id, text, fact_ids, user_edited)
        values (saved_id, owner_id, v_item_id, bullet->>'text', array(select jsonb_array_elements_text(bullet->'fact_ids')::uuid), false)
        on conflict (id) do update set text = excluded.text, fact_ids = excluded.fact_ids, user_edited = false, updated_at = now();
      new_ids := array_append(new_ids, saved_id);
    end loop;

    update public.resumes r set
      layout = jsonb_set(r.layout, '{items}', (
        select jsonb_agg(case when (entry->>'item_id')::uuid = v_item_id
          then jsonb_set(entry, '{bullet_ids}', to_jsonb(new_ids)) else entry end order by ordinal)
        from jsonb_array_elements(r.layout->'items') with ordinality as li(entry, ordinal)
      )),
      cut_log = coalesce((select jsonb_agg(c) from jsonb_array_elements(r.cut_log) c where c->>'item_id' <> v_item_id::text), '[]'::jsonb),
      updated_at = now()
      where r.user_id = owner_id
        and exists (select 1 from jsonb_array_elements(r.layout->'items') entry where (entry->>'item_id')::uuid = v_item_id)
        and not exists (select 1 from public.bullets b where b.resume_id = r.id and b.item_id = v_item_id)
        and not coalesce(r.layout->'hidden_bullets', '[]'::jsonb) ?| array(select x::text from unnest(old_ids) x);
    delete from public.bullets b where b.item_id = v_item_id and b.user_id = owner_id and b.resume_id is null and not (b.id = any(new_ids));
  end loop;
end $$;
revoke all on function public.replace_generated_bullets(uuid[], jsonb, boolean) from public, anon;
grant execute on function public.replace_generated_bullets(uuid[], jsonb, boolean) to authenticated;

-- ② Deleting a resume keeps every PDF downloaded from it (resume_id becomes null).
alter table public.exports drop constraint exports_owned_resume;
alter table public.exports add constraint exports_owned_resume
  foreign key (user_id, resume_id) references public.resumes(user_id, id) on delete set null (resume_id);

-- ③ Where an export was sent: a company, job link or note. Still the only editable fields.
alter table public.exports add column sent_to text check (char_length(sent_to) <= 300);
create or replace function public.exports_only_sent_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - 'sent_at' - 'sent_to' - 'resume_id') is distinct from (to_jsonb(old) - 'sent_at' - 'sent_to' - 'resume_id')
     or (new.resume_id is distinct from old.resume_id and new.resume_id is not null) then
    raise exception 'exports are immutable';
  end if;
  return new;
end $$;
create index on public.exports (user_id, created_at desc);

-- ④ Re-reading a source keeps the text it replaced, so quotes from the earlier read stay checkable.
create table public.source_versions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  source_id uuid not null,
  raw_text text not null,
  fetched_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (user_id, source_id) references public.sources(user_id, id) on delete cascade
);
alter table public.source_versions enable row level security;
create policy "own rows" on public.source_versions for all to authenticated
  using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());
create index on public.source_versions (source_id);
