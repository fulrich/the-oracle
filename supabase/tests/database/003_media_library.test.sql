begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

-- An unassigned asset is an administrator-only library item until attached.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.memory_media (
      id,
      character_id,
      memory_id,
      storage_object_name,
      folder,
      purpose,
      mime_type,
      alt_text,
      created_by
    ) values (
      '49000000-0000-4000-8000-000000000005',
      '20000000-0000-4000-8000-000000000003',
      null,
      'characters/20000000-0000-4000-8000-000000000003/assets/49000000-0000-4000-8000-000000000005.webp',
      'forge studies',
      'attachment',
      'image/webp',
      'A study of the forge interior.',
      '00000000-0000-4000-8000-000000000001'
    )$$,
  'an administrator can add an unattached asset to the library'
);
select results_eq(
  $$select count(*) from public.memory_media where id = '49000000-0000-4000-8000-000000000005'$$,
  $$values (1::bigint)$$,
  'the administrator can read the new library asset'
);
select results_eq(
  $$select action from public.admin_audit_events where entity_type = 'memory_media' and entity_id = '49000000-0000-4000-8000-000000000005'$$,
  $$values ('memory_media.created'::text)$$,
  'adding an asset is audited'
);
select throws_ok(
  $$insert into public.memory_media (
      id,
      character_id,
      memory_id,
      storage_object_name,
      folder,
      purpose,
      mime_type,
      alt_text
    ) values (
      '49000000-0000-4000-8000-000000000006',
      '20000000-0000-4000-8000-000000000003',
      null,
      'characters/20000000-0000-4000-8000-000000000003/assets/49000000-0000-4000-8000-000000000006.webp',
      'forge studies',
      'hero',
      'image/webp',
      'Invalid unattached hero.'
    )$$,
  'P0001',
  null,
  'an unattached asset cannot claim a primary role'
);
select throws_ok(
  $$update public.memory_media
    set character_id = '20000000-0000-4000-8000-000000000004',
        memory_id = '33000000-0000-4000-8000-000000000001'
    where id = '49000000-0000-4000-8000-000000000005'$$,
  'P0001',
  null,
  'an asset cannot attach across character boundaries'
);
select lives_ok(
  $$update public.memory_media
    set memory_id = '33000000-0000-4000-8000-000000000001',
        purpose = 'attachment'
    where id = '49000000-0000-4000-8000-000000000005'$$,
  'an administrator can attach an asset to a matching published memory'
);
select results_eq(
  $$select action from public.admin_audit_events where entity_type = 'memory_media' and entity_id = '49000000-0000-4000-8000-000000000005' order by id$$,
  $$values ('memory_media.created'::text), ('memory_media.updated'::text)$$,
  'attaching an asset is audited'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select results_eq(
  $$select count(*) from public.memory_media where id = '49000000-0000-4000-8000-000000000005'$$,
  $$values (1::bigint)$$,
  'a player sees attached media for a revealed memory'
);
select throws_ok(
  $$insert into public.memory_media (
      id,
      character_id,
      memory_id,
      storage_object_name,
      purpose,
      mime_type,
      alt_text
    ) values (
      '49000000-0000-4000-8000-000000000007',
      '20000000-0000-4000-8000-000000000003',
      null,
      'characters/20000000-0000-4000-8000-000000000003/assets/49000000-0000-4000-8000-000000000007.webp',
      'attachment',
      'image/webp',
      'Player must not upload.'
    )$$,
  '42501',
  null,
  'players cannot insert media library assets'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
select results_eq(
  $$select count(*) from public.memory_media where id = '49000000-0000-4000-8000-000000000005'$$,
  $$values (0::bigint)$$,
  'another player cannot see the attached asset'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select lives_ok(
  $$delete from public.memory_media where id = '49000000-0000-4000-8000-000000000005'$$,
  'an administrator can remove an asset'
);
select results_eq(
  $$select action from public.admin_audit_events where entity_type = 'memory_media' and entity_id = '49000000-0000-4000-8000-000000000005' order by id$$,
  $$values ('memory_media.created'::text), ('memory_media.updated'::text), ('memory_media.deleted'::text)$$,
  'removing an asset is audited'
);

select * from finish();
rollback;
