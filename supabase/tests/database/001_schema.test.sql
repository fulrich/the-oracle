begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(42);

select has_schema('app_private', 'private authorization schema exists');
select has_table('public', 'allowed_users', 'allowed_users table exists');
select has_table('public', 'characters', 'characters table exists');
select has_column(
  'public',
  'characters',
  'profile_media_id',
  'characters can select a mutable profile media asset'
);
select has_table('public', 'character_assignments', 'character_assignments table exists');
select has_table('public', 'memories', 'memories table exists');
select has_table('public', 'memory_reveals', 'memory_reveals table exists');
select has_table('public', 'memory_media', 'memory_media table exists');
select has_table('public', 'admin_audit_events', 'admin_audit_events table exists');
select has_column(
  'public',
  'memory_media',
  'character_id',
  'media assets are scoped to a character'
);
select has_column(
  'public',
  'memory_media',
  'folder',
  'media assets support logical folders'
);
select has_column(
  'public',
  'memory_media',
  'file_name',
  'media assets retain their source filenames as labels'
);
select ok(
  (
    select is_nullable = 'YES'
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'memory_media'
      and column_name = 'memory_id'
  ),
  'media assets may remain unattached'
);

select ok(
  (
    select count(*) = 7 and bool_and(table_class.relrowsecurity)
    from pg_catalog.pg_class as table_class
    join pg_catalog.pg_namespace as table_schema
      on table_schema.oid = table_class.relnamespace
    where table_schema.nspname = 'public'
      and table_class.relname in (
        'allowed_users',
        'characters',
        'character_assignments',
        'memories',
        'memory_reveals',
        'memory_media',
        'admin_audit_events'
      )
  ),
  'RLS is enabled on every application table'
);

select ok(
  exists (
    select 1
    from storage.buckets
    where id = 'memory-media'
      and public = false
  ),
  'memory media bucket exists and is private'
);

select has_function(
  'public',
  'visible_memory_archive',
  array['uuid'],
  'the explicit player archive projection exists'
);
select has_function(
  'public',
  'assign_player_to_character',
  array['uuid', 'text'],
  'the atomic character assignment function exists'
);
select has_function(
  'public',
  'visible_character_memory_archive',
  array['uuid'],
  'the character-first DM preview projection exists'
);
select ok(
  has_function_privilege(
    'supabase_auth_admin',
    'app_private.before_user_created(jsonb)',
    'execute'
  ),
  'Supabase Auth can execute the allowlist hook'
);
select ok(
  not has_function_privilege(
    'anon',
    'app_private.before_user_created(jsonb)',
    'execute'
  ),
  'anonymous callers cannot execute the allowlist hook'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.visible_memory_archive(uuid)',
    'execute'
  ),
  'authenticated callers can execute the player archive projection'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.visible_memory_archive(uuid)',
    'execute'
  ),
  'anonymous callers cannot execute the player archive projection'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.assign_player_to_character(uuid, text)',
    'execute'
  ),
  'authenticated administrators can call the assignment function through RLS'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.assign_player_to_character(uuid, text)',
    'execute'
  ),
  'anonymous callers cannot execute the assignment function'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.visible_character_memory_archive(uuid)',
    'execute'
  ),
  'authenticated administrators can call the character preview projection'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.visible_character_memory_archive(uuid)',
    'execute'
  ),
  'anonymous callers cannot execute the character preview projection'
);
select hasnt_column(
  'public',
  'memories',
  'quote',
  'memories do not persist the discarded pull-quote field'
);
select col_is_pk(
  'public',
  'character_assignments',
  'allowed_user_id',
  'one current character assignment is allowed per email'
);
select has_index(
  'public',
  'memories',
  'memories_character_position_key',
  'memory positions are unique within a character archive'
);
select has_index(
  'public',
  'character_assignments',
  'character_assignments_character_id_key',
  'only one player email can be assigned to each character'
);
select ok(
  not has_table_privilege('anon', 'public.memories', 'select'),
  'anonymous users receive no memory-table privileges'
);
select ok(
  has_table_privilege('authenticated', 'public.memories', 'select'),
  'authenticated users receive the SELECT privilege needed for RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.memories', 'truncate'),
  'authenticated users cannot bypass RLS with TRUNCATE'
);
select ok(
  not has_table_privilege('authenticated', 'public.characters', 'insert'),
  'characters cannot be created through the application role'
);
select ok(
  not has_table_privilege('authenticated', 'public.characters', 'update'),
  'characters cannot be edited through the application role'
);
select ok(
  has_column_privilege(
    'authenticated',
    'public.characters',
    'profile_media_id',
    'update'
  ),
  'authenticated administrators can update only the profile media column'
);
select ok(
  not has_table_privilege('authenticated', 'public.characters', 'delete'),
  'characters cannot be deleted through the application role'
);
select ok(
  not has_table_privilege('authenticated', 'public.memories', 'trigger'),
  'authenticated users cannot install table triggers'
);
select ok(
  not has_table_privilege('authenticated', 'public.memories', 'references'),
  'authenticated users cannot add references to application tables'
);
select ok(
  not has_table_privilege('authenticated', 'public.memories', 'maintain'),
  'authenticated users do not receive table maintenance privileges'
);
select ok(
  not has_sequence_privilege(
    'authenticated',
    'public.admin_audit_events_id_seq',
    'update'
  ),
  'authenticated users cannot mutate the audit identity sequence'
);
select matches(
  pg_get_functiondef(
    'app_private.enforce_reveal_is_published()'::regprocedure
  ),
  'for update',
  'the reveal trigger locks its parent memory against publication races'
);

select * from finish();
rollback;
