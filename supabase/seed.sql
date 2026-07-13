-- Deterministic, synthetic local fixtures only.
-- Password for these local email users: local-oracle-password

insert into public.allowed_users (id, normalized_email, role, active)
values
  ('10000000-0000-4000-8000-000000000001', 'dm@example.test', 'admin', true),
  ('10000000-0000-4000-8000-000000000002', 'player.one@example.test', 'player', true),
  ('10000000-0000-4000-8000-000000000003', 'player.two@example.test', 'player', true),
  ('10000000-0000-4000-8000-000000000004', 'disabled@example.test', 'player', true),
  ('10000000-0000-4000-8000-000000000005', 'pending@example.test', 'player', true)
on conflict (id) do update
set normalized_email = excluded.normalized_email,
    role = excluded.role,
    active = excluded.active;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  reauthentication_token,
  is_sso_user,
  is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'dm@example.test',
    extensions.crypt('local-oracle-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Synthetic DM"}'::jsonb,
    false,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'player.one@example.test',
    extensions.crypt('local-oracle-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Synthetic Player One"}'::jsonb,
    false,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    false,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000000',
    '00000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'player.two@example.test',
    extensions.crypt('local-oracle-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Synthetic Player Two"}'::jsonb,
    false,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'disabled@example.test',
    extensions.crypt('local-oracle-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Synthetic Disabled Player"}'::jsonb,
    false,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    false,
    false
  )
on conflict (id) do update
set email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

-- GoTrue expects this legacy token field to be a string even though the
-- auth.users column itself is nullable.
update auth.users
set email_change = ''
where id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004'
);

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '50000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '{"sub":"00000000-0000-4000-8000-000000000001","email":"dm@example.test","email_verified":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    '{"sub":"00000000-0000-4000-8000-000000000002","email":"player.one@example.test","email_verified":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000003',
    '{"sub":"00000000-0000-4000-8000-000000000003","email":"player.two@example.test","email_verified":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '50000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000004',
    '{"sub":"00000000-0000-4000-8000-000000000004","email":"disabled@example.test","email_verified":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
on conflict (id) do update
set identity_data = excluded.identity_data,
    updated_at = now();

update public.allowed_users
set active = false
where id = '10000000-0000-4000-8000-000000000004';

insert into public.character_assignments (
  allowed_user_id,
  character_id,
  assigned_by
)
values
  (
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  )
on conflict (allowed_user_id) do update
set character_id = excluded.character_id,
    assigned_by = excluded.assigned_by;

-- Reviewed campaign memories are imported by migration. Local reveals keep the
-- deterministic player fixtures useful without changing production defaults.
insert into public.memory_reveals (memory_id, revealed_by)
values
  (
    '33000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '34000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  )
on conflict (memory_id) do nothing;
