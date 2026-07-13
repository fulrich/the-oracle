begin;

-- Media is an asset library rather than a filename convention. Assets belong to
-- a character, may remain unattached while the DM organizes them, and can later
-- be attached to any published memory for that same character.
alter table public.memory_media
  add column character_id uuid;

update public.memory_media as media
set character_id = memory.character_id
from public.memories as memory
where memory.id = media.memory_id;

alter table public.memory_media
  alter column character_id set not null,
  alter column memory_id drop not null;

alter table public.memory_media
  add column folder text not null default 'uncategorized',
  add constraint memory_media_character_id_fkey
    foreign key (character_id) references public.characters (id) on delete cascade,
  add constraint memory_media_folder_check check (
    folder = btrim(folder)
    and length(folder) between 1 and 80
    and folder !~ '[[:cntrl:]]'
    and folder !~ '(^|/)\.\.(/|$)'
  );

create index memory_media_character_folder_idx
  on public.memory_media (character_id, folder, created_at desc);

-- A media row may be unattached only as a supporting image. Once attached,
-- memory and character must agree; this keeps an asset from crossing character
-- boundaries even when an administrator calls the table directly.
create function app_private.enforce_memory_media_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  memory_character_id uuid;
begin
  if new.memory_id is null then
    if new.purpose <> 'attachment' then
      raise exception 'Unattached media must use the attachment purpose.';
    end if;
    return new;
  end if;

  select memory.character_id
  into memory_character_id
  from public.memories as memory
  where memory.id = new.memory_id;

  if memory_character_id is null then
    raise exception 'Media memory does not exist.';
  end if;

  if memory_character_id <> new.character_id then
    raise exception 'Media character must match its memory character.';
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_memory_media_parent() from public, anon, authenticated;

create trigger memory_media_enforce_parent
before insert or update on public.memory_media
for each row execute function app_private.enforce_memory_media_parent();

-- Keep media changes in the same append-only administrative audit stream as
-- assignments and reveals. Storage objects themselves remain private; this
-- records the metadata mutation that controls whether an object is reachable.
create function app_private.audit_memory_media_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_data jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_data jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  target_entity_id uuid := coalesce(
    (new_data ->> 'id')::uuid,
    (old_data ->> 'id')::uuid
  );
  event_action text := case tg_op
    when 'INSERT' then 'memory_media.created'
    when 'UPDATE' then 'memory_media.updated'
    else 'memory_media.deleted'
  end;
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
    event_action,
    'memory_media',
    target_entity_id,
    old_data,
    new_data
  );

  return coalesce(new, old);
end;
$$;

revoke all on function app_private.audit_memory_media_change() from public, anon, authenticated;

create trigger audit_memory_media
after insert or update or delete on public.memory_media
for each row execute function app_private.audit_memory_media_change();

-- The application no longer needs a service-role media importer. Keep the
-- privileged key out of the runtime and revoke the explicit grants from the
-- earlier bootstrap migration. Admin uploads use the authenticated DM session.
revoke usage on type public.memory_media_purpose from service_role;
revoke select on public.characters from service_role;
revoke select on public.memories from service_role;
revoke select, insert, update, delete on public.memory_media from service_role;

commit;
