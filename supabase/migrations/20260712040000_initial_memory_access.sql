-- Initial authorization model for the private player memory archive.
-- All campaign content entering these tables must already be reviewed as player-safe.

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated, supabase_auth_admin;

create type public.app_role as enum ('admin', 'player');
create type public.memory_publication_status as enum ('draft', 'published', 'archived');
create type public.memory_media_purpose as enum ('hero', 'card', 'attachment');

create table public.allowed_users (
  id uuid primary key default gen_random_uuid(),
  normalized_email text not null unique,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  role public.app_role not null default 'player',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint allowed_users_normalized_email_check check (
    normalized_email = lower(btrim(normalized_email))
    and normalized_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  initials text not null,
  subtitle text,
  archive_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint characters_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint characters_display_name_check check (length(btrim(display_name)) > 0),
  constraint characters_initials_check check (length(btrim(initials)) between 1 and 4)
);

-- Reviewed player-safe character names are immutable reference data. Campaign
-- prose and other vault content do not belong in this migration.
insert into public.characters (id, slug, display_name, initials)
values
  ('20000000-0000-4000-8000-000000000001', 'aelarion-valcrest', 'Aelarion Valcrest', 'AV'),
  ('20000000-0000-4000-8000-000000000002', 'dain-voltiran', 'Dain Voltiran', 'DV'),
  ('20000000-0000-4000-8000-000000000003', 'kaelen-ironheart', 'Kaelen Ironheart', 'KI'),
  ('20000000-0000-4000-8000-000000000004', 'telestra-thornveil', 'Telestra Thornveil', 'TT'),
  ('20000000-0000-4000-8000-000000000005', 'vaelin-duskbane', 'Vaelin Duskbane', 'VD');

create table public.character_assignments (
  allowed_user_id uuid primary key references public.allowed_users (id) on delete cascade,
  character_id uuid not null unique references public.characters (id) on delete restrict,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  assigned_by uuid references auth.users (id) on delete set null
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  slug text not null,
  position integer not null,
  chapter_label text not null,
  title text not null,
  excerpt text not null,
  markdown_body text not null,
  publication_status public.memory_publication_status not null default 'draft',
  artwork_alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint memories_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint memories_position_check check (position > 0),
  constraint memories_chapter_label_check check (length(btrim(chapter_label)) > 0),
  constraint memories_title_check check (length(btrim(title)) > 0),
  constraint memories_excerpt_check check (length(btrim(excerpt)) > 0),
  constraint memories_markdown_body_check check (length(btrim(markdown_body)) > 0),
  constraint memories_character_position_key unique (character_id, position),
  constraint memories_character_slug_key unique (character_id, slug)
);

create index memories_character_status_position_idx
  on public.memories (character_id, publication_status, position);

-- A row represents an active reveal. Revocation deletes the row; the audit log
-- preserves both reveal and revoke history.
create table public.memory_reveals (
  memory_id uuid primary key references public.memories (id) on delete cascade,
  revealed_at timestamptz not null default now(),
  revealed_by uuid default auth.uid() references auth.users (id) on delete set null
);

create table public.memory_media (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  storage_object_name text not null unique,
  purpose public.memory_media_purpose not null,
  sort_order integer not null default 0,
  mime_type text not null,
  alt_text text not null,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint memory_media_object_name_check check (
    storage_object_name = btrim(storage_object_name)
    and storage_object_name <> ''
    and storage_object_name !~ '(^|/)\.\.(/|$)'
  ),
  constraint memory_media_sort_order_check check (sort_order >= 0),
  constraint memory_media_mime_type_check check (
    mime_type in ('image/avif', 'image/jpeg', 'image/png', 'image/webp')
  ),
  constraint memory_media_alt_text_check check (length(btrim(alt_text)) > 0),
  constraint memory_media_width_check check (width is null or width > 0),
  constraint memory_media_height_check check (height is null or height > 0),
  constraint memory_media_memory_purpose_order_key unique (memory_id, purpose, sort_order)
);

create index memory_media_memory_id_idx on public.memory_media (memory_id);

create table public.admin_audit_events (
  id bigint generated always as identity primary key,
  -- Deliberately not a foreign key: audit attribution must survive Auth deletion.
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_events_entity_idx
  on public.admin_audit_events (entity_type, entity_id, created_at desc);
create index admin_audit_events_actor_idx
  on public.admin_audit_events (actor_user_id, created_at desc);

create function app_private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function app_private.set_updated_at() from public, anon, authenticated;

create trigger allowed_users_set_updated_at
before update on public.allowed_users
for each row execute function app_private.set_updated_at();

create trigger characters_set_updated_at
before update on public.characters
for each row execute function app_private.set_updated_at();

create trigger character_assignments_set_updated_at
before update on public.character_assignments
for each row execute function app_private.set_updated_at();

create trigger memories_set_updated_at
before update on public.memories
for each row execute function app_private.set_updated_at();

create trigger memory_media_set_updated_at
before update on public.memory_media
for each row execute function app_private.set_updated_at();

create function app_private.enforce_allowed_identity_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.auth_user_id is not null and not exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = new.auth_user_id
      and lower(btrim(auth_user.email)) = new.normalized_email
  ) then
    raise exception using
      errcode = '23514',
      message = 'Allowlist email must match the linked Auth identity.';
  end if;

  return new;
end;
$$;

create function app_private.guard_linked_allowed_user_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.auth_user_id is not null then
    raise exception using
      errcode = '23503',
      message = 'Linked allowlist entries must be disabled, not deleted.';
  end if;

  return old;
end;
$$;

create function app_private.guard_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_email text;
begin
  select allowed_user.normalized_email
  into linked_email
  from public.allowed_users as allowed_user
  where allowed_user.auth_user_id = old.id;

  if linked_email is not null
    and lower(btrim(new.email)) is distinct from linked_email
  then
    raise exception using
      errcode = '23514',
      message = 'Linked Auth email must continue to match the allowlist.';
  end if;

  return new;
end;
$$;

create function app_private.set_assignment_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.character_id is distinct from old.character_id then
    new.assigned_at = now();
  end if;

  if (select auth.uid()) is not null then
    new.assigned_by = (select auth.uid());
  end if;

  return new;
end;
$$;

create function app_private.enforce_assignment_player_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.allowed_users as allowed_user
    where allowed_user.id = new.allowed_user_id
      and allowed_user.role = 'player'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Only player identities can be assigned to characters.';
  end if;

  return new;
end;
$$;

create function app_private.guard_assigned_player_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role <> 'player' and exists (
    select 1
    from public.character_assignments as assignment
    where assignment.allowed_user_id = new.id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Remove the character assignment before changing the player role.';
  end if;

  return new;
end;
$$;

create function app_private.enforce_reveal_is_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_publication_status public.memory_publication_status;
begin
  -- Serialize reveal and publication changes on the parent memory. Without this
  -- lock, a concurrent archive could miss an uncommitted reveal and leave a
  -- stale row that becomes visible after republishing.
  select memory.publication_status
  into current_publication_status
  from public.memories as memory
  where memory.id = new.memory_id
  for update;

  if current_publication_status is distinct from 'published' then
    raise exception using
      errcode = '23514',
      message = 'Only published memories can be revealed.';
  end if;

  if (select auth.uid()) is not null then
    new.revealed_by = (select auth.uid());
  end if;

  return new;
end;
$$;

create function app_private.revoke_reveal_when_unpublished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.publication_status = 'published'
    and new.publication_status <> 'published'
  then
    delete from public.memory_reveals
    where memory_id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_allowed_identity_match() from public, anon, authenticated;
revoke all on function app_private.guard_linked_allowed_user_delete() from public, anon, authenticated;
revoke all on function app_private.guard_auth_user_email_change() from public, anon, authenticated;
revoke all on function app_private.set_assignment_metadata() from public, anon, authenticated;
revoke all on function app_private.enforce_assignment_player_role() from public, anon, authenticated;
revoke all on function app_private.guard_assigned_player_role() from public, anon, authenticated;
revoke all on function app_private.enforce_reveal_is_published() from public, anon, authenticated;
revoke all on function app_private.revoke_reveal_when_unpublished() from public, anon, authenticated;

create trigger enforce_allowed_identity_match
before insert or update of normalized_email, auth_user_id on public.allowed_users
for each row execute function app_private.enforce_allowed_identity_match();

create trigger guard_linked_allowed_user_delete
before delete on public.allowed_users
for each row execute function app_private.guard_linked_allowed_user_delete();

create trigger guard_auth_user_email_change
before update of email on auth.users
for each row execute function app_private.guard_auth_user_email_change();

create trigger character_assignments_set_metadata
before insert or update on public.character_assignments
for each row execute function app_private.set_assignment_metadata();

create trigger enforce_assignment_player_role
before insert or update of allowed_user_id on public.character_assignments
for each row execute function app_private.enforce_assignment_player_role();

create trigger guard_assigned_player_role
before update of role on public.allowed_users
for each row execute function app_private.guard_assigned_player_role();

create trigger enforce_reveal_is_published
before insert or update on public.memory_reveals
for each row execute function app_private.enforce_reveal_is_published();

create trigger revoke_reveal_when_unpublished
after update of publication_status on public.memories
for each row execute function app_private.revoke_reveal_when_unpublished();

create function app_private.current_allowed_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select allowed_user.id
  from public.allowed_users as allowed_user
  where allowed_user.auth_user_id = (select auth.uid())
    and allowed_user.active
  limit 1
$$;

create function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from public.allowed_users as allowed_user
      where allowed_user.auth_user_id = (select auth.uid())
        and allowed_user.active
        and allowed_user.role = 'admin'
    ),
    false
  )
$$;

create function app_private.can_view_character(target_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_admin()
    or exists (
      select 1
      from public.allowed_users as allowed_user
      join public.character_assignments as assignment
        on assignment.allowed_user_id = allowed_user.id
      where allowed_user.auth_user_id = (select auth.uid())
        and allowed_user.active
        and assignment.character_id = target_character_id
    )
$$;

create function app_private.can_view_memory(target_memory_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_admin()
    or exists (
      select 1
      from public.memories as memory
      join public.memory_reveals as reveal on reveal.memory_id = memory.id
      join public.character_assignments as assignment
        on assignment.character_id = memory.character_id
      join public.allowed_users as allowed_user
        on allowed_user.id = assignment.allowed_user_id
      where memory.id = target_memory_id
        and memory.publication_status = 'published'
        and allowed_user.auth_user_id = (select auth.uid())
        and allowed_user.active
    )
$$;

create function app_private.can_view_memory_media(target_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memory_media as media
    where media.storage_object_name = target_object_name
      and app_private.can_view_memory(media.memory_id)
  )
$$;

revoke all on function app_private.current_allowed_user_id() from public, anon;
revoke all on function app_private.is_admin() from public, anon;
revoke all on function app_private.can_view_character(uuid) from public, anon;
revoke all on function app_private.can_view_memory(uuid) from public, anon;
revoke all on function app_private.can_view_memory_media(text) from public, anon;
grant execute on function app_private.current_allowed_user_id() to authenticated;
grant execute on function app_private.is_admin() to authenticated;
grant execute on function app_private.can_view_character(uuid) to authenticated;
grant execute on function app_private.can_view_memory(uuid) to authenticated;
grant execute on function app_private.can_view_memory_media(text) to authenticated;

create function app_private.before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  incoming_email text := lower(btrim(event -> 'user' ->> 'email'));
  incoming_provider text := event -> 'user' -> 'app_metadata' ->> 'provider';
begin
  if incoming_provider = 'google'
    and incoming_email is not null
    and exists (
      select 1
      from public.allowed_users as allowed_user
      where allowed_user.normalized_email = incoming_email
        and allowed_user.active
    )
  then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error',
    jsonb_build_object(
      'http_code', 403,
      'message', 'This account is not approved for The Forgotten Oracle.'
    )
  );
end;
$$;

revoke all on function app_private.before_user_created(jsonb) from public, anon, authenticated;
grant execute on function app_private.before_user_created(jsonb) to supabase_auth_admin;

create function app_private.link_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_allowed_user_id uuid;
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', '') <> 'google'
    and session_user <> 'postgres'
  then
    raise exception using
      errcode = '23514',
      message = 'Only Google identities can link to the application allowlist.';
  end if;

  update public.allowed_users as allowed_user
  set auth_user_id = new.id,
      updated_at = now()
  where allowed_user.normalized_email = lower(btrim(new.email))
    and allowed_user.active
    and (allowed_user.auth_user_id is null or allowed_user.auth_user_id = new.id)
  returning allowed_user.id into linked_allowed_user_id;

  if linked_allowed_user_id is null then
    raise exception using
      errcode = '23514',
      message = 'Auth identity does not match an active allowlist entry.';
  end if;

  return new;
end;
$$;

revoke all on function app_private.link_new_auth_user() from public, anon, authenticated;

create trigger link_new_auth_user_to_allowlist
after insert on auth.users
for each row execute function app_private.link_new_auth_user();

create function app_private.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_data jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_data jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  target_entity_id uuid;
  event_action text;
begin
  if tg_table_name = 'allowed_users' then
    target_entity_id := coalesce((new_data ->> 'id')::uuid, (old_data ->> 'id')::uuid);
    event_action := case tg_op
      when 'INSERT' then 'allowed_user.created'
      when 'UPDATE' then 'allowed_user.updated'
      else 'allowed_user.deleted'
    end;
  elsif tg_table_name = 'character_assignments' then
    target_entity_id := coalesce(
      (new_data ->> 'allowed_user_id')::uuid,
      (old_data ->> 'allowed_user_id')::uuid
    );
    event_action := case tg_op
      when 'INSERT' then 'character_assignment.created'
      when 'UPDATE' then 'character_assignment.updated'
      else 'character_assignment.deleted'
    end;
  elsif tg_table_name = 'memory_reveals' then
    target_entity_id := coalesce(
      (new_data ->> 'memory_id')::uuid,
      (old_data ->> 'memory_id')::uuid
    );
    event_action := case tg_op
      when 'INSERT' then 'memory.revealed'
      else 'memory.revoked'
    end;
  else
    raise exception 'Unsupported audited table: %', tg_table_name;
  end if;

  insert into public.admin_audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    previous_data,
    new_data
  ) values (
    (select auth.uid()),
    event_action,
    tg_table_name,
    target_entity_id,
    old_data,
    new_data
  );

  return coalesce(new, old);
end;
$$;

revoke all on function app_private.audit_admin_change() from public, anon, authenticated;

create trigger audit_allowed_users
after insert or update or delete on public.allowed_users
for each row execute function app_private.audit_admin_change();

create trigger audit_character_assignments
after insert or update or delete on public.character_assignments
for each row execute function app_private.audit_admin_change();

create trigger audit_memory_reveals
after insert or delete on public.memory_reveals
for each row execute function app_private.audit_admin_change();

-- Atomically creates/reactivates a player allowlist entry and assigns it to one
-- immutable character. Reusing an email moves that player; reusing a character
-- replaces its previous assignment. Table RLS and audit triggers still apply.
create function public.assign_player_to_character(
  target_character_id uuid,
  target_email text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_target_email text := lower(btrim(target_email));
  target_allowed_user_id uuid;
  target_role public.app_role;
begin
  if not app_private.is_admin() then
    raise insufficient_privilege using message = 'Only administrators can assign players.';
  end if;

  -- Serialize competing assignments without requiring UPDATE privileges on the
  -- immutable character row.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_character_id::text, 0)
  );

  perform 1
  from public.characters as character
  where character.id = target_character_id;

  if not found then
    raise foreign_key_violation using message = 'The selected character does not exist.';
  end if;

  select allowed_user.id, allowed_user.role
  into target_allowed_user_id, target_role
  from public.allowed_users as allowed_user
  where allowed_user.normalized_email = normalized_target_email;

  if target_allowed_user_id is null then
    insert into public.allowed_users (
      normalized_email,
      role,
      active,
      created_by
    ) values (
      normalized_target_email,
      'player',
      true,
      (select auth.uid())
    )
    returning id into target_allowed_user_id;
  elsif target_role <> 'player' then
    raise check_violation using message = 'Administrator identities cannot be assigned as players.';
  else
    update public.allowed_users
    set active = true
    where id = target_allowed_user_id
      and not active;
  end if;

  delete from public.character_assignments
  where character_id = target_character_id
    and allowed_user_id <> target_allowed_user_id;

  insert into public.character_assignments (
    allowed_user_id,
    character_id,
    assigned_by
  ) values (
    target_allowed_user_id,
    target_character_id,
    (select auth.uid())
  )
  on conflict (allowed_user_id) do update
  set character_id = excluded.character_id,
      assigned_by = excluded.assigned_by,
      updated_at = now();

  return target_allowed_user_id;
end;
$$;

revoke all on function public.assign_player_to_character(uuid, text) from public, anon;
grant execute on function public.assign_player_to_character(uuid, text) to authenticated;

-- The player archive and DM preview both use this projection. A player can only
-- request themselves; an active administrator can request another allowlist row.
create function public.visible_memory_archive(target_allowed_user_id uuid default null)
returns table (
  memory_id uuid,
  character_id uuid,
  character_slug text,
  character_display_name text,
  character_initials text,
  character_subtitle text,
  archive_note text,
  memory_slug text,
  memory_position integer,
  chapter_label text,
  title text,
  excerpt text,
  markdown_body text,
  artwork_alt text,
  revealed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_allowed_user_id uuid := app_private.current_allowed_user_id();
  resolved_target_id uuid := coalesce(target_allowed_user_id, caller_allowed_user_id);
begin
  if caller_allowed_user_id is null then
    raise insufficient_privilege using message = 'An active allowlist entry is required.';
  end if;

  if resolved_target_id <> caller_allowed_user_id and not app_private.is_admin() then
    raise insufficient_privilege using message = 'Only administrators can preview another player.';
  end if;

  return query
  select
    memory.id,
    character.id,
    character.slug,
    character.display_name,
    character.initials,
    character.subtitle,
    character.archive_note,
    memory.slug,
    memory.position,
    memory.chapter_label,
    memory.title,
    memory.excerpt,
    memory.markdown_body,
    memory.artwork_alt,
    reveal.revealed_at
  from public.allowed_users as target_user
  join public.character_assignments as assignment
    on assignment.allowed_user_id = target_user.id
  join public.characters as character
    on character.id = assignment.character_id
  join public.memories as memory
    on memory.character_id = character.id
  join public.memory_reveals as reveal
    on reveal.memory_id = memory.id
  where target_user.id = resolved_target_id
    and target_user.active
    and memory.publication_status = 'published'
  order by memory.position;
end;
$$;

revoke all on function public.visible_memory_archive(uuid) from public, anon;
grant execute on function public.visible_memory_archive(uuid) to authenticated;

-- Character preview is independent of whether a player email has been assigned.
-- It retains the DM session and applies the same publication + reveal gates.
create function public.visible_character_memory_archive(target_character_id uuid)
returns table (
  memory_id uuid,
  character_id uuid,
  character_slug text,
  character_display_name text,
  character_initials text,
  character_subtitle text,
  archive_note text,
  memory_slug text,
  memory_position integer,
  chapter_label text,
  title text,
  excerpt text,
  markdown_body text,
  artwork_alt text,
  revealed_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not app_private.is_admin() then
    raise insufficient_privilege using message = 'Only administrators can preview a character.';
  end if;

  return query
  select
    memory.id,
    character.id,
    character.slug,
    character.display_name,
    character.initials,
    character.subtitle,
    character.archive_note,
    memory.slug,
    memory.position,
    memory.chapter_label,
    memory.title,
    memory.excerpt,
    memory.markdown_body,
    memory.artwork_alt,
    reveal.revealed_at
  from public.characters as character
  join public.memories as memory on memory.character_id = character.id
  join public.memory_reveals as reveal on reveal.memory_id = memory.id
  where character.id = target_character_id
    and memory.publication_status = 'published'
  order by memory.position;
end;
$$;

revoke all on function public.visible_character_memory_archive(uuid) from public, anon;
grant execute on function public.visible_character_memory_archive(uuid) to authenticated;

alter table public.allowed_users enable row level security;
alter table public.characters enable row level security;
alter table public.character_assignments enable row level security;
alter table public.memories enable row level security;
alter table public.memory_reveals enable row level security;
alter table public.memory_media enable row level security;
alter table public.admin_audit_events enable row level security;

create policy "players read their own allowlist entry"
on public.allowed_users for select to authenticated
using (id = app_private.current_allowed_user_id());

create policy "administrators manage allowlist entries"
on public.allowed_users for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

-- Characters are immutable campaign reference data. Administrators assign
-- allowlisted users to them, but the application never creates or edits them.
create policy "authorized users read relevant characters"
on public.characters for select to authenticated
using (app_private.can_view_character(id));

create policy "players read their own character assignment"
on public.character_assignments for select to authenticated
using (allowed_user_id = app_private.current_allowed_user_id());

create policy "administrators manage character assignments"
on public.character_assignments for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

create policy "players read revealed published memories"
on public.memories for select to authenticated
using (app_private.can_view_memory(id));

create policy "administrators manage memories"
on public.memories for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

create policy "players read their active memory reveals"
on public.memory_reveals for select to authenticated
using (app_private.can_view_memory(memory_id));

create policy "administrators reveal memories"
on public.memory_reveals for insert to authenticated
with check (
  app_private.is_admin()
  and revealed_by = (select auth.uid())
);

create policy "administrators revoke memories"
on public.memory_reveals for delete to authenticated
using (app_private.is_admin());

create policy "administrators read all memory reveals"
on public.memory_reveals for select to authenticated
using (app_private.is_admin());

create policy "players read media for visible memories"
on public.memory_media for select to authenticated
using (app_private.can_view_memory(memory_id));

create policy "administrators manage memory media"
on public.memory_media for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

create policy "administrators read the audit log"
on public.admin_audit_events for select to authenticated
using (app_private.is_admin());

-- Supabase's bootstrap roles may carry broad default table privileges. Remove
-- them before granting the exact operations used by the application; RLS does
-- not protect TRUNCATE, TRIGGER, REFERENCES, MAINTAIN, or sequence mutation.
revoke all on table public.allowed_users from anon, authenticated;
revoke all on table public.characters from anon, authenticated;
revoke all on table public.character_assignments from anon, authenticated;
revoke all on table public.memories from anon, authenticated;
revoke all on table public.memory_reveals from anon, authenticated;
revoke all on table public.memory_media from anon, authenticated;
revoke all on table public.admin_audit_events from anon, authenticated;
revoke all on sequence public.admin_audit_events_id_seq from anon, authenticated;

revoke all on type public.app_role from anon, authenticated;
revoke all on type public.memory_publication_status from anon, authenticated;
revoke all on type public.memory_media_purpose from anon, authenticated;
grant usage on type public.app_role to authenticated;
grant usage on type public.memory_publication_status to authenticated;
grant usage on type public.memory_media_purpose to authenticated;
grant select, insert, delete on public.allowed_users to authenticated;
grant update (role, active) on public.allowed_users to authenticated;
grant select on public.characters to authenticated;
grant select, insert, update, delete on public.character_assignments to authenticated;
grant select, insert, update, delete on public.memories to authenticated;
grant select, insert, delete on public.memory_reveals to authenticated;
grant select, insert, update, delete on public.memory_media to authenticated;
grant select on public.admin_audit_events to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-media',
  'memory-media',
  false,
  10485760,
  array['image/avif', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "active users inspect the memory media bucket"
on storage.buckets for select to authenticated
using (
  id = 'memory-media'
  and app_private.current_allowed_user_id() is not null
);

create policy "players read authorized memory media objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'memory-media'
  and app_private.can_view_memory_media(name)
);

create policy "administrators manage memory media objects"
on storage.objects for all to authenticated
using (
  bucket_id = 'memory-media'
  and app_private.is_admin()
)
with check (
  bucket_id = 'memory-media'
  and app_private.is_admin()
);
