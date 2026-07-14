begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(23);

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
      file_name,
      created_by
    ) values (
      '49000000-0000-4000-8000-000000000005',
      '20000000-0000-4000-8000-000000000003',
      null,
      'characters/20000000-0000-4000-8000-000000000003/assets/49000000-0000-4000-8000-000000000005.webp',
      'forge studies',
      'attachment',
      'image/webp',
      'kaelen-forge.webp',
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
      file_name
    ) values (
      '49000000-0000-4000-8000-000000000006',
      '20000000-0000-4000-8000-000000000003',
      null,
      'characters/20000000-0000-4000-8000-000000000003/assets/49000000-0000-4000-8000-000000000006.webp',
      'forge studies',
      'hero',
      'image/webp',
      'invalid-hero.webp'
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
select lives_ok(
  $$insert into public.memory_media (
      id,
      character_id,
      memory_id,
      storage_object_name,
      folder,
      purpose,
      mime_type,
      file_name,
      width,
      height,
      created_by
    ) values (
      '49000000-0000-4000-8000-000000000008',
      '20000000-0000-4000-8000-000000000003',
      null,
      'characters/20000000-0000-4000-8000-000000000003/assets/49000000-0000-4000-8000-000000000008.webp',
      'portraits',
      'attachment',
      'image/webp',
      'kaelen-profile.webp',
      1200,
      800,
      '00000000-0000-4000-8000-000000000001'
    )$$,
  'an administrator can add a profile candidate without attaching it to a memory'
);
select lives_ok(
  $$update public.characters
    set profile_media_id = '49000000-0000-4000-8000-000000000008',
        profile_crop = '{
          "x": 0.1667,
          "y": 0,
          "width": 0.6666,
          "height": 1,
          "positionX": 0.5,
          "positionY": 0.5,
          "scale": 1.5,
          "sourceWidth": 1200,
          "sourceHeight": 800
        }'::jsonb
    where id = '20000000-0000-4000-8000-000000000003'$$,
  'an administrator can select and frame a same-character profile image'
);
select throws_ok(
  $$update public.characters
    set profile_crop = '{"x": 1.5}'::jsonb
    where id = '20000000-0000-4000-8000-000000000003'$$,
  '23514',
  null,
  'invalid profile framing metadata is rejected'
);
select results_eq(
  $$select action from public.admin_audit_events
    where entity_type = 'characters'
      and entity_id = '20000000-0000-4000-8000-000000000003'
      and action = 'character.profile_media.updated'$$,
  $$values ('character.profile_media.updated'::text)$$,
  'selecting a profile image is audited'
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
select results_eq(
  $$select count(*) from public.memory_media where id = '49000000-0000-4000-8000-000000000008'$$,
  $$values (1::bigint)$$,
  'a player sees a profile asset even when it is not attached to a memory'
);
select results_eq(
  $$with attempted as (
      update public.characters
      set profile_media_id = null
      where id = '20000000-0000-4000-8000-000000000003'
      returning id
    )
    select count(*) from attempted$$,
  $$values (0::bigint)$$,
  'players cannot change a character profile image'
);
select throws_ok(
  $$insert into public.memory_media (
      id,
      character_id,
      memory_id,
      storage_object_name,
      purpose,
      mime_type,
      file_name
    ) values (
      '49000000-0000-4000-8000-000000000007',
      '20000000-0000-4000-8000-000000000003',
      null,
      'characters/20000000-0000-4000-8000-000000000003/assets/49000000-0000-4000-8000-000000000007.webp',
      'attachment',
      'image/webp',
      'player-upload.webp'
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
select results_eq(
  $$select count(*) from public.memory_media where id = '49000000-0000-4000-8000-000000000008'$$,
  $$values (0::bigint)$$,
  'another player cannot see the profile asset'
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
  $$insert into public.memory_media (
      id,
      character_id,
      storage_object_name,
      purpose,
      mime_type,
      file_name,
      created_by
    ) values (
      '49000000-0000-4000-8000-000000000009',
      '20000000-0000-4000-8000-000000000004',
      'characters/20000000-0000-4000-8000-000000000004/assets/49000000-0000-4000-8000-000000000009.webp',
      'attachment',
      'image/webp',
      'other-character.webp',
      '00000000-0000-4000-8000-000000000001'
    )$$,
  'an administrator can add another character profile candidate'
);
select throws_ok(
  $$update public.characters
    set profile_media_id = '49000000-0000-4000-8000-000000000009'
    where id = '20000000-0000-4000-8000-000000000003'$$,
  '23514',
  null,
  'a character cannot select another character profile asset'
);
select lives_ok(
  $$delete from public.memory_media where id = '49000000-0000-4000-8000-000000000008'$$,
  'removing a profile asset clears the character pointer'
);
select results_eq(
  $$select profile_media_id, profile_crop
    from public.characters
    where id = '20000000-0000-4000-8000-000000000003'$$,
  $$values (null::uuid, null::jsonb)$$,
  'removing a profile asset also clears its framing metadata'
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
