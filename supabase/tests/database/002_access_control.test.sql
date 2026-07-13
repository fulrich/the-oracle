begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(76);

-- Test-only draft and media registrations exercise publication and private
-- Storage boundaries without adding synthetic content to the application seed.
insert into public.memories (
  id,
  character_id,
  slug,
  position,
  chapter_label,
  title,
  excerpt,
  markdown_body,
  publication_status
)
values (
  '39000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000003',
  'test-only-draft',
  99,
  'Test fragment',
  'Test-only draft',
  'This row exists only inside the rolled-back pgTAP transaction.',
  'This row exists only inside the rolled-back pgTAP transaction.',
  'draft'
);

insert into public.memory_media (
  id,
  character_id,
  memory_id,
  storage_object_name,
  purpose,
  mime_type,
  file_name
)
values
  (
    '49000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000003',
    '33000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001/hero.webp',
    'hero',
    'image/webp',
    'kaelen-memory-01.webp'
  ),
  (
    '49000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    '33000000-0000-4000-8000-000000000002',
    '33000000-0000-4000-8000-000000000002/hero.webp',
    'hero',
    'image/webp',
    'kaelen-memory-02.webp'
  ),
  (
    '49000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000003',
    '39000000-0000-4000-8000-000000000001',
    '39000000-0000-4000-8000-000000000001/hero.webp',
    'hero',
    'image/webp',
    'kaelen-draft.webp'
  ),
  (
    '49000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000004',
    '34000000-0000-4000-8000-000000000001',
    '34000000-0000-4000-8000-000000000001/hero.webp',
    'hero',
    'image/webp',
    'telestra-memory-01.webp'
  );

insert into storage.objects (id, bucket_id, name, metadata)
values
  (
    '60000000-0000-4000-8000-000000000001',
    'memory-media',
    '33000000-0000-4000-8000-000000000001/hero.webp',
    '{"mimetype":"image/webp"}'::jsonb
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    'memory-media',
    '33000000-0000-4000-8000-000000000002/hero.webp',
    '{"mimetype":"image/webp"}'::jsonb
  ),
  (
    '60000000-0000-4000-8000-000000000003',
    'memory-media',
    '39000000-0000-4000-8000-000000000001/hero.webp',
    '{"mimetype":"image/webp"}'::jsonb
  ),
  (
    '60000000-0000-4000-8000-000000000004',
    'memory-media',
    '34000000-0000-4000-8000-000000000001/hero.webp',
    '{"mimetype":"image/webp"}'::jsonb
  ),
  (
    '60000000-0000-4000-8000-000000000005',
    'memory-media',
    '33000000-0000-4000-8000-000000000001/unregistered.webp',
    '{"mimetype":"image/webp"}'::jsonb
  );

set local role anon;
select throws_ok(
  $$select count(*) from public.memories$$,
  '42501',
  null,
  'anonymous users cannot query memory content'
);
select results_eq(
  $$select count(*) from storage.objects where bucket_id = 'memory-media'$$,
  $$values (0::bigint)$$,
  'anonymous users cannot discover private memory objects'
);
select throws_ok(
  $$truncate table public.memories cascade$$,
  '42501',
  null,
  'anonymous users cannot bypass RLS by truncating memory tables'
);
select throws_ok(
  $$select setval('public.admin_audit_events_id_seq', 1, false)$$,
  '42501',
  null,
  'anonymous users cannot mutate the audit identity sequence'
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
  $$select count(*) from public.allowed_users$$,
  $$values (1::bigint)$$,
  'player one sees only their allowlist entry'
);
select results_eq(
  $$select normalized_email from public.allowed_users$$,
  $$values ('player.one@example.test'::text)$$,
  'player one sees the expected allowlist identity'
);
select results_eq(
  $$select count(*) from public.characters$$,
  $$values (1::bigint)$$,
  'player one sees one assigned character'
);
select results_eq(
  $$select count(*) from public.character_assignments$$,
  $$values (1::bigint)$$,
  'player one sees only their assignment'
);
select results_eq(
  $$select count(*) from public.memories$$,
  $$values (1::bigint)$$,
  'player one sees only one published and revealed memory'
);
select results_eq(
  $$select title from public.memories$$,
  $$values ('The Echo of the Forge'::text)$$,
  'player one sees their revealed memory'
);
select results_eq(
  $$select count(*) from public.memories where id = '33000000-0000-4000-8000-000000000002'$$,
  $$values (0::bigint)$$,
  'player one cannot see an unrevealed memory'
);
select results_eq(
  $$select count(*) from public.memories where id = '39000000-0000-4000-8000-000000000001'$$,
  $$values (0::bigint)$$,
  'player one cannot see a draft even when it has a reveal row'
);
select results_eq(
  $$select count(*) from public.memories where character_id = '20000000-0000-4000-8000-000000000004'$$,
  $$values (0::bigint)$$,
  'player one cannot see player two memories'
);
select results_eq(
  $$select count(*) from public.memory_reveals$$,
  $$values (1::bigint)$$,
  'player one sees only the reveal for readable content'
);
select results_eq(
  $$select count(*) from public.memory_media$$,
  $$values (1::bigint)$$,
  'player one sees metadata only for readable media'
);
select results_eq(
  $$select count(*) from storage.objects where bucket_id = 'memory-media'$$,
  $$values (1::bigint)$$,
  'player one sees exactly one registered object for readable content'
);
select results_eq(
  $$select count(*) from storage.objects where name like '%unregistered.webp'$$,
  $$values (0::bigint)$$,
  'a matching folder name does not expose an unregistered object'
);
select throws_ok(
  $$truncate table public.memories cascade$$,
  '42501',
  null,
  'players cannot bypass RLS by truncating memory tables'
);
select throws_ok(
  $$
    insert into public.memories (
      character_id,
      slug,
      position,
      chapter_label,
      title,
      excerpt,
      markdown_body
    ) values (
      '20000000-0000-4000-8000-000000000003',
      'player-created-memory',
      99,
      'Fragment XCIX',
      'Forbidden write',
      'Players cannot create memories.',
      'This insert must fail.'
    )
  $$,
  '42501',
  null,
  'players cannot create memories'
);
select throws_ok(
  $$
    insert into public.memory_reveals (memory_id, revealed_by)
    values (
      '33000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000002'
    )
  $$,
  '42501',
  null,
  'players cannot reveal memories'
);
select results_eq(
  $$
    with deleted as (
      delete from public.memory_reveals
      where memory_id = '33000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*) from deleted
  $$,
  $$values (0::bigint)$$,
  'players cannot revoke memories'
);
select results_eq(
  $$
    with changed as (
      update public.allowed_users
      set active = false
      where id = '10000000-0000-4000-8000-000000000002'
      returning 1
    )
    select count(*) from changed
  $$,
  $$values (0::bigint)$$,
  'players cannot change their own allowlist state'
);
select results_eq(
  $$select count(*) from public.admin_audit_events$$,
  $$values (0::bigint)$$,
  'players cannot read the administrative audit log'
);
select results_eq(
  $$select count(*) from public.visible_memory_archive()$$,
  $$values (1::bigint)$$,
  'the player archive projection matches player one RLS visibility'
);
select results_eq(
  $$
    select count(*)
    from public.visible_memory_archive('10000000-0000-4000-8000-000000000002')
  $$,
  $$values (1::bigint)$$,
  'a player may explicitly request their own archive'
);
select throws_ok(
  $$
    select count(*)
    from public.visible_memory_archive('10000000-0000-4000-8000-000000000003')
  $$,
  '42501',
  null,
  'a player cannot preview another player'
);
select throws_ok(
  $$
    select public.assign_player_to_character(
      '20000000-0000-4000-8000-000000000005',
      'intruder@example.test'
    )
  $$,
  '42501',
  null,
  'a player cannot assign an email to a character'
);
select throws_ok(
  $$
    select count(*)
    from public.visible_character_memory_archive(
      '20000000-0000-4000-8000-000000000003'
    )
  $$,
  '42501',
  null,
  'a player cannot use the character-first DM preview'
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
  $$select count(*) from public.memories$$,
  $$values (1::bigint)$$,
  'player two sees one revealed memory'
);
select results_eq(
  $$select count(*) from public.memories where character_id = '20000000-0000-4000-8000-000000000003'$$,
  $$values (0::bigint)$$,
  'player two cannot see player one memories'
);
select results_eq(
  $$select count(*) from storage.objects where bucket_id = 'memory-media'$$,
  $$values (1::bigint)$$,
  'player two sees only their registered memory object'
);
select results_eq(
  $$select count(*) from public.visible_memory_archive()$$,
  $$values (1::bigint)$$,
  'the archive projection returns player two content'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);

select results_eq(
  $$select count(*) from public.memories$$,
  $$values (0::bigint)$$,
  'a disabled player sees no memories'
);
select results_eq(
  $$select count(*) from public.characters$$,
  $$values (0::bigint)$$,
  'a disabled player sees no assigned character'
);
select throws_ok(
  $$select count(*) from public.visible_memory_archive()$$,
  '42501',
  null,
  'a disabled player cannot use the archive projection'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select results_eq(
  $$select count(*) from public.memories$$,
  $$values (33::bigint)$$,
  'the DM can see all approved memories plus the test-only draft'
);
select results_eq(
  $$
    select character.display_name, count(memory.id)
    from public.characters as character
    left join public.memories as memory
      on memory.character_id = character.id
      and memory.publication_status = 'published'
    group by character.id, character.display_name
    order by character.display_name
  $$,
  $$values
    ('Aelarion Valcrest'::text, 4::bigint),
    ('Dain Voltiran'::text, 12::bigint),
    ('Kaelen Ironheart'::text, 12::bigint),
    ('Telestra Thornveil'::text, 4::bigint),
    ('Vaelin Duskbane'::text, 0::bigint)
  $$,
  'the migration imports every currently written campaign memory'
);
select results_eq(
  $$
    select count(*)
    from public.memories
    where publication_status = 'published'
      and id::text like '3_000000-0000-4000-8000-%'
  $$,
  $$values (32::bigint)$$,
  'all approved campaign memories are player-ready but independently reveal-gated'
);
select results_eq(
  $$select display_name from public.characters order by display_name$$,
  $$values
    ('Aelarion Valcrest'::text),
    ('Dain Voltiran'::text),
    ('Kaelen Ironheart'::text),
    ('Telestra Thornveil'::text),
    ('Vaelin Duskbane'::text)
  $$,
  'the DM sees the reviewed static character roster'
);
select results_eq(
  $$
    select count(*)
    from public.allowed_users
    where id in (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000004',
      '10000000-0000-4000-8000-000000000005'
    )
  $$,
  $$values (5::bigint)$$,
  'the DM can manage every deterministic allowlist fixture'
);
select results_eq(
  $$
    select count(*)
    from public.visible_character_memory_archive(
      '20000000-0000-4000-8000-000000000003'
    )
  $$,
  $$values (1::bigint)$$,
  'DM character preview applies publication and reveal visibility'
);
select results_eq(
  $$
    select count(*)
    from public.visible_character_memory_archive(
      '20000000-0000-4000-8000-000000000002'
    )
  $$,
  $$values (0::bigint)$$,
  'DM can preview an unassigned character with an empty archive'
);
select throws_ok(
  $$
    insert into public.character_assignments (
      allowed_user_id,
      character_id,
      assigned_by
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000001'
    )
  $$,
  '23514',
  null,
  'an administrator cannot be assigned directly to a character'
);
select lives_ok(
  $$
    select public.assign_player_to_character(
      '20000000-0000-4000-8000-000000000005',
      'pending@example.test'
    )
  $$,
  'the DM can assign an allowlisted email to a static character'
);
select results_eq(
  $$
    select character_id
    from public.character_assignments
    where allowed_user_id = '10000000-0000-4000-8000-000000000005'
  $$,
  $$values ('20000000-0000-4000-8000-000000000005'::uuid)$$,
  'the assignment function stores the selected character mapping'
);
select results_eq(
  $$
    select count(*)
    from public.admin_audit_events
    where action = 'character_assignment.created'
      and entity_id = '10000000-0000-4000-8000-000000000005'
      and actor_user_id = '00000000-0000-4000-8000-000000000001'
  $$,
  $$values (1::bigint)$$,
  'assigning a player creates an attributed audit event'
);
select throws_ok(
  $$
    update public.allowed_users
    set role = 'admin'
    where id = '10000000-0000-4000-8000-000000000005'
  $$,
  '23514',
  null,
  'an assigned player cannot be promoted to administrator'
);
select throws_ok(
  $$
    update public.allowed_users
    set normalized_email = 'renamed@example.test'
    where id = '10000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  null,
  'administrators cannot casually rename a linked allowlist identity'
);
select throws_ok(
  $$
    delete from public.allowed_users
    where id = '10000000-0000-4000-8000-000000000002'
  $$,
  '23503',
  null,
  'linked allowlist entries must be disabled rather than deleted'
);
select results_eq(
  $$
    select count(*)
    from public.visible_memory_archive('10000000-0000-4000-8000-000000000002')
  $$,
  $$values (1::bigint)$$,
  'DM preview applies player one visibility rather than admin visibility'
);
select results_eq(
  $$
    select count(*)
    from public.visible_memory_archive('10000000-0000-4000-8000-000000000003')
  $$,
  $$values (1::bigint)$$,
  'DM preview applies player two visibility'
);
select results_eq(
  $$
    select count(*)
    from public.visible_memory_archive('10000000-0000-4000-8000-000000000004')
  $$,
  $$values (0::bigint)$$,
  'DM preview shows no archive for a disabled player'
);
select throws_ok(
  $$
    insert into public.memory_reveals (memory_id, revealed_by)
    values (
      '39000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001'
    )
  $$,
  '23514',
  null,
  'the DM cannot reveal a draft memory'
);
select lives_ok(
  $$
    insert into public.memory_reveals (memory_id, revealed_by)
    values (
      '33000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000001'
    )
  $$,
  'the DM can reveal a published memory'
);
select results_eq(
  $$
    select count(*)
    from public.admin_audit_events
    where action = 'memory.revealed'
      and entity_id = '33000000-0000-4000-8000-000000000002'
      and actor_user_id = '00000000-0000-4000-8000-000000000001'
  $$,
  $$values (1::bigint)$$,
  'revealing a memory creates one audit event'
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
  $$select count(*) from public.memories$$,
  $$values (2::bigint)$$,
  'the newly revealed memory is immediately visible to player one'
);
select results_eq(
  $$select count(*) from public.memory_media$$,
  $$values (2::bigint)$$,
  'the newly revealed memory exposes its registered media metadata'
);
select results_eq(
  $$select count(*) from storage.objects where bucket_id = 'memory-media'$$,
  $$values (2::bigint)$$,
  'the newly revealed memory exposes its registered private object'
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
  $$
    delete from public.memory_reveals
    where memory_id = '33000000-0000-4000-8000-000000000002'
  $$,
  'the DM can revoke a memory'
);
select results_eq(
  $$
    select count(*)
    from public.admin_audit_events
    where action = 'memory.revoked'
      and entity_id = '33000000-0000-4000-8000-000000000002'
      and actor_user_id = '00000000-0000-4000-8000-000000000001'
  $$,
  $$values (1::bigint)$$,
  'revoking a memory creates one audit event'
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
  $$select count(*) from public.memories$$,
  $$values (1::bigint)$$,
  'revocation immediately removes the memory from player one'
);
select results_eq(
  $$select count(*) from storage.objects where bucket_id = 'memory-media'$$,
  $$values (1::bigint)$$,
  'revocation immediately removes access to the private object'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    update public.memory_reveals
    set revealed_at = now()
    where memory_id = '33000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'reveal rows are immutable even for administrators'
);
select ok(
  (select count(*) > 0 from public.admin_audit_events),
  'the DM can read the audit log'
);
select lives_ok(
  $$
    update public.memories
    set publication_status = 'archived'
    where id = '33000000-0000-4000-8000-000000000001'
  $$,
  'the DM can archive a published memory'
);
select results_eq(
  $$
    select count(*)
    from public.memory_reveals
    where memory_id = '33000000-0000-4000-8000-000000000001'
  $$,
  $$values (0::bigint)$$,
  'archiving a memory revokes its active reveal'
);
select lives_ok(
  $$
    update public.memories
    set publication_status = 'published'
    where id = '33000000-0000-4000-8000-000000000001'
  $$,
  'the DM can republish an archived memory'
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
  $$select count(*) from public.memories$$,
  $$values (0::bigint)$$,
  'republishing does not silently reactivate an old reveal'
);

reset role;
select throws_ok(
  $$
    update auth.users
    set email = 'intruder@example.test'
    where id = '00000000-0000-4000-8000-000000000002'
  $$,
  '23514',
  null,
  'a linked Auth identity cannot drift to another email'
);
select is(
  app_private.before_user_created(
    '{"user":{"email":"PLAYER.ONE@example.test","app_metadata":{"provider":"google"}}}'::jsonb
  ),
  '{}'::jsonb,
  'the auth hook accepts an active allowlisted email case-insensitively'
);
select is(
  app_private.before_user_created(
    '{"user":{"email":"player.one@example.test","app_metadata":{"provider":"email"}}}'::jsonb
  ) -> 'error' ->> 'http_code',
  '403',
  'the auth hook rejects password signup even for an allowlisted email'
);
select is(
  app_private.before_user_created(
    '{"user":{"email":"disabled@example.test","app_metadata":{"provider":"google"}}}'::jsonb
  ) -> 'error' ->> 'http_code',
  '403',
  'the auth hook rejects a disabled email'
);
select is(
  app_private.before_user_created(
    '{"user":{"email":"intruder@example.test","app_metadata":{"provider":"google"}}}'::jsonb
  ) -> 'error' ->> 'http_code',
  '403',
  'the auth hook rejects an email outside the allowlist'
);
select ok(
  (
    select count(*) > 0
    from public.admin_audit_events
    where actor_user_id = '00000000-0000-4000-8000-000000000001'
  ),
  'the audit log contains events attributed to the DM'
);
select lives_ok(
  $$
    delete from auth.users
    where id = '00000000-0000-4000-8000-000000000001'
  $$,
  'the Auth identity can be removed without deleting audit history'
);
select ok(
  (
    select count(*) > 0
    from public.admin_audit_events
    where actor_user_id = '00000000-0000-4000-8000-000000000001'
  ),
  'audit attribution survives deletion of the Auth identity'
);

select * from finish();
rollback;
