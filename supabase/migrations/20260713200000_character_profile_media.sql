begin;

-- Profile artwork is mutable character metadata, while the reviewed character
-- roster itself remains fixed. The existing media library owns the bytes and
-- labels; this pointer selects one asset for the character identity.
alter table public.characters
  add column profile_media_id uuid,
  add constraint characters_profile_media_id_fkey
    foreign key (profile_media_id)
    references public.memory_media (id)
    on delete set null;

create function app_private.enforce_character_profile_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  media_character_id uuid;
begin
  if new.profile_media_id is null then
    return new;
  end if;

  select media.character_id
  into media_character_id
  from public.memory_media as media
  where media.id = new.profile_media_id;

  if media_character_id is null then
    raise foreign_key_violation using
      message = 'The selected profile image does not exist.';
  end if;

  if media_character_id <> new.id then
    raise check_violation using
      message = 'A character profile image must belong to the same character.';
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_character_profile_media() from public, anon, authenticated;

create trigger characters_enforce_profile_media
before insert or update of profile_media_id on public.characters
for each row execute function app_private.enforce_character_profile_media();

-- The application role can update only this mutable metadata column. Core
-- character identity fields remain unavailable to the application role.
grant update (profile_media_id) on public.characters to authenticated;
create policy "administrators manage character profile images"
on public.characters
for update
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

create function app_private.audit_character_profile_media_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    previous_data,
    new_data
  ) values (
    (select auth.uid()),
    'character.profile_media.updated',
    'characters',
    new.id,
    jsonb_build_object('profile_media_id', old.profile_media_id),
    jsonb_build_object('profile_media_id', new.profile_media_id)
  );

  return new;
end;
$$;

revoke all on function app_private.audit_character_profile_media_change() from public, anon, authenticated;

create trigger audit_character_profile_media
after update of profile_media_id on public.characters
for each row execute function app_private.audit_character_profile_media_change();

create function app_private.can_view_profile_media(target_media_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.characters as character
    where character.profile_media_id = target_media_id
      and app_private.can_view_character(character.id)
  );
$$;

revoke all on function app_private.can_view_profile_media(uuid) from public, anon;
grant execute on function app_private.can_view_profile_media(uuid) to authenticated;

-- A profile asset is authorized through the assigned character, independently
-- of whether its memory has been revealed. Memory artwork retains its existing
-- reveal-based authorization.
drop policy "players read media for visible memories" on public.memory_media;
create policy "players read media for visible memories"
on public.memory_media
for select
to authenticated
using (
  app_private.can_view_memory(memory_id)
  or app_private.can_view_profile_media(id)
);

create or replace function app_private.can_view_memory_media(target_object_name text)
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
      and (
        app_private.can_view_memory(media.memory_id)
        or app_private.can_view_profile_media(media.id)
      )
  );
$$;

drop policy "players read authorized memory media objects" on storage.objects;
create policy "players read authorized memory media objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'memory-media'
  and app_private.can_view_memory_media(name)
);

commit;
