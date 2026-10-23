-- Run after the migrations against a disposable/local Supabase database.
-- All fixtures roll back. No service-role credentials are required.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"review_user_a","role":"authenticated"}', true);

insert into public.items (id, type, data, status) values
  ('10000000-0000-0000-0000-000000000001', 'project', '{"name":"CLI"}', 'shown');
insert into public.facts (id, item_id, text, label) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Built a CLI', 'user');
insert into public.bullets (id, item_id, text, fact_ids) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Old wording', array['20000000-0000-0000-0000-000000000001']::uuid[]);
insert into public.resumes (id, title, layout) values
  ('40000000-0000-0000-0000-000000000001', 'Base resume', '{"headline":"Developer","section_order":["project"],"items":[{"item_id":"10000000-0000-0000-0000-000000000001","bullet_ids":["30000000-0000-0000-0000-000000000001"]}]}');
insert into public.exports (id, resume_id, snapshot, pdf_path, filename) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '{}', 'review_user_a/export.pdf', 'Resume.pdf');
insert into storage.objects (bucket_id, name) values ('exports', 'review_user_a/export.pdf');

select public.replace_generated_bullets(array['10000000-0000-0000-0000-000000000001']::uuid[], '[
  {"item_id":"10000000-0000-0000-0000-000000000001","text":"New wording","fact_ids":["20000000-0000-0000-0000-000000000001"]},
  {"item_id":"10000000-0000-0000-0000-000000000001","text":"Second bullet","fact_ids":["20000000-0000-0000-0000-000000000001"]}
]');

do $$ begin
  if (select text from public.bullets where id = '30000000-0000-0000-0000-000000000001') <> 'New wording' then
    raise exception 'Replacement lost an existing bullet ID';
  end if;
  if (select jsonb_array_length(layout->'items'->0->'bullet_ids') from public.resumes where id = '40000000-0000-0000-0000-000000000001') <> 2 then
    raise exception 'Replacement did not maintain layout references';
  end if;

  -- The first update must roll back if a later bullet fails validation.
  begin
    perform public.replace_generated_bullets(array['10000000-0000-0000-0000-000000000001']::uuid[], '[
      {"item_id":"10000000-0000-0000-0000-000000000001","text":"Must roll back","fact_ids":["20000000-0000-0000-0000-000000000001"]},
      {"item_id":"10000000-0000-0000-0000-000000000001","text":"Invalid","fact_ids":["99999999-0000-0000-0000-000000000001"]}
    ]');
    raise exception 'Expected invalid facts to be rejected';
  exception when raise_exception then
    if sqlerrm <> 'Bullet facts must belong to the same user and item' then raise; end if;
  end;
  if (select text from public.bullets where id = '30000000-0000-0000-0000-000000000001') <> 'New wording' then
    raise exception 'Failed replacement destroyed the old wording';
  end if;
end $$;

update public.bullets set user_edited = true where id = '30000000-0000-0000-0000-000000000001';
select public.replace_generated_bullets(array['10000000-0000-0000-0000-000000000001']::uuid[], '[{"item_id":"10000000-0000-0000-0000-000000000001","text":"Must keep edit","fact_ids":["20000000-0000-0000-0000-000000000001"]}]');
do $$ begin
  if (select text from public.bullets where id = '30000000-0000-0000-0000-000000000001') <> 'New wording' then
    raise exception 'Unrequested regeneration overwrote an edit';
  end if;
end $$;
select public.replace_generated_bullets(array['10000000-0000-0000-0000-000000000001']::uuid[], '[{"item_id":"10000000-0000-0000-0000-000000000001","text":"Explicit rewrite","fact_ids":["20000000-0000-0000-0000-000000000001"]}]', true);
do $$ begin
  if (select count(*) from public.bullets) <> 1 then raise exception 'Stale bullets survived replacement'; end if;
end $$;

-- Historical bytes can be read/deleted, but cannot be overwritten in place.
update storage.objects set name = 'review_user_a/replaced.pdf' where name = 'review_user_a/export.pdf';
do $$ begin
  if not exists (select 1 from storage.objects where name = 'review_user_a/export.pdf') then
    raise exception 'An exported file was overwritten';
  end if;
  begin
    update public.exports set filename = 'Changed.pdf' where id = '50000000-0000-0000-0000-000000000001';
    raise exception 'Expected immutable export';
  exception when raise_exception then
    if sqlerrm <> 'exports are immutable' then raise; end if;
  end;
end $$;
update public.exports set sent_at = now() where id = '50000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claims', '{"sub":"review_user_b","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.exports) or exists (select 1 from storage.objects) then raise exception 'Cross-user read leaked data'; end if;
  begin
    insert into public.facts (item_id, text, label) values ('10000000-0000-0000-0000-000000000001', 'Cross-user write', 'user');
    raise exception 'Cross-user relationship was accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    perform public.replace_generated_bullets(array['10000000-0000-0000-0000-000000000001']::uuid[], '[]');
    raise exception 'Cross-user replacement was accepted';
  exception when raise_exception then
    if sqlerrm <> 'Item not found' then raise; end if;
  end;
end $$;
rollback;
