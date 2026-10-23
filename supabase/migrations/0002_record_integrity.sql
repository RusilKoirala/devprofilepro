-- Keep relationship ownership and export immutability at the database boundary,
-- including writes made directly through the public Supabase API.
alter table public.items add constraint items_owner_id unique (user_id, id);
alter table public.sources add constraint sources_owner_id unique (user_id, id);
alter table public.jobs add constraint jobs_owner_id unique (user_id, id);
alter table public.resumes add constraint resumes_owner_id unique (user_id, id);

alter table public.facts add constraint facts_owned_item foreign key (user_id, item_id) references public.items(user_id, id);
alter table public.facts add constraint facts_owned_source foreign key (user_id, source_id) references public.sources(user_id, id);
alter table public.bullets add constraint bullets_owned_item foreign key (user_id, item_id) references public.items(user_id, id);
alter table public.questions add constraint questions_owned_item foreign key (user_id, item_id) references public.items(user_id, id);
alter table public.resumes add constraint resumes_owned_job foreign key (user_id, job_id) references public.jobs(user_id, id);
alter table public.exports add constraint exports_owned_resume foreign key (user_id, resume_id) references public.resumes(user_id, id);

create or replace function public.check_bullet_facts() returns trigger
language plpgsql set search_path = '' as $$
begin
  if cardinality(new.fact_ids) = 0 or (
    select count(*) from public.facts f
    where f.id = any(new.fact_ids) and f.user_id = new.user_id and f.item_id = new.item_id
  ) <> cardinality(new.fact_ids) then
    raise exception 'Bullet facts must belong to the same user and item';
  end if;
  return new;
end $$;
create trigger bullets_check_facts before insert or update on public.bullets
  for each row execute function public.check_bullet_facts();

-- The initial broad policy allowed an exported file to be overwritten in place.
drop policy "own files" on storage.objects;
create policy "read own files" on storage.objects for select to authenticated
  using (bucket_id in ('uploads','exports') and (storage.foldername(name))[1] = public.requesting_user_id());
create policy "insert own files" on storage.objects for insert to authenticated
  with check (bucket_id in ('uploads','exports') and (storage.foldername(name))[1] = public.requesting_user_id());
create policy "update own uploads" on storage.objects for update to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = public.requesting_user_id())
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = public.requesting_user_id());
create policy "delete own files" on storage.objects for delete to authenticated
  using (bucket_id in ('uploads','exports') and (storage.foldername(name))[1] = public.requesting_user_id());

create or replace function public.exports_only_sent_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - 'sent_at' - 'resume_id') is distinct from (to_jsonb(old) - 'sent_at' - 'resume_id')
     or (new.resume_id is distinct from old.resume_id and new.resume_id is not null) then
    raise exception 'exports are immutable';
  end if;
  return new;
end $$;

-- Replace a batch atomically, keeping existing IDs wherever possible. Updating
-- the layouts in the same transaction leaves a usable draft even if refit fails.
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
      select 1 from public.bullets b where b.item_id = v_item_id and b.user_id = owner_id and b.user_edited
    ) then continue; end if;

    -- Missing model output must never erase an existing item's bullets.
    if not exists (select 1 from jsonb_array_elements(p_bullets) b where (b->>'item_id')::uuid = v_item_id) then continue; end if;
    select coalesce(array_agg(b.id order by b.created_at, b.id), '{}'::uuid[]) into old_ids
      from public.bullets b where b.item_id = v_item_id and b.user_id = owner_id;
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
      where r.user_id = owner_id and exists (
        select 1 from jsonb_array_elements(r.layout->'items') entry where (entry->>'item_id')::uuid = v_item_id
      );
    delete from public.bullets b where b.item_id = v_item_id and b.user_id = owner_id and not (b.id = any(new_ids));
  end loop;
end $$;
revoke all on function public.replace_generated_bullets(uuid[], jsonb, boolean) from public, anon;
grant execute on function public.replace_generated_bullets(uuid[], jsonb, boolean) to authenticated;
