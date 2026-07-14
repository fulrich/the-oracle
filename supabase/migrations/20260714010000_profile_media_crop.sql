begin;

-- The source artwork remains in the media library. This metadata records the
-- square framing chosen for the character profile so every avatar surface can
-- render the same crop without creating or replacing the original asset.
alter table public.characters
  add column profile_crop jsonb;

grant update (profile_crop) on public.characters to authenticated;

create function app_private.enforce_profile_media_crop()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  media_width integer;
  media_height integer;
  crop_x numeric;
  crop_y numeric;
  crop_width numeric;
  crop_height numeric;
  position_x numeric;
  position_y numeric;
  crop_scale numeric;
  source_width numeric;
  source_height numeric;
begin
  -- ON DELETE SET NULL on the profile media foreign key reaches this trigger.
  -- Clear stale framing metadata at the same time as the pointer.
  if new.profile_media_id is null then
    new.profile_crop := null;
    return new;
  end if;

  if new.profile_crop is null then
    return new;
  end if;

  if jsonb_typeof(new.profile_crop) <> 'object'
    or not (new.profile_crop ?& array[
      'x', 'y', 'width', 'height', 'positionX', 'positionY', 'scale',
      'sourceWidth', 'sourceHeight'
    ])
  then
    raise check_violation using
      message = 'The profile crop metadata is incomplete.';
  end if;

  begin
    crop_x := (new.profile_crop ->> 'x')::numeric;
    crop_y := (new.profile_crop ->> 'y')::numeric;
    crop_width := (new.profile_crop ->> 'width')::numeric;
    crop_height := (new.profile_crop ->> 'height')::numeric;
    position_x := (new.profile_crop ->> 'positionX')::numeric;
    position_y := (new.profile_crop ->> 'positionY')::numeric;
    crop_scale := (new.profile_crop ->> 'scale')::numeric;
    source_width := (new.profile_crop ->> 'sourceWidth')::numeric;
    source_height := (new.profile_crop ->> 'sourceHeight')::numeric;
  exception when others then
    raise check_violation using
      message = 'The profile crop metadata contains invalid numbers.';
  end;

  if crop_x < 0 or crop_y < 0
    or crop_width <= 0 or crop_height <= 0
    or crop_x + crop_width > 1
    or crop_y + crop_height > 1
    or position_x < 0 or position_x > 1
    or position_y < 0 or position_y > 1
    or crop_scale < 1 or crop_scale > 3
    or source_width <= 0 or source_height <= 0
    or source_width <> trunc(source_width)
    or source_height <> trunc(source_height)
  then
    raise check_violation using
      message = 'The profile crop metadata is outside its allowed bounds.';
  end if;

  select media.width, media.height
  into media_width, media_height
  from public.memory_media as media
  where media.id = new.profile_media_id;

  if media_width is not null and source_width <> media_width then
    raise check_violation using
      message = 'The profile crop width does not match the selected image.';
  end if;
  if media_height is not null and source_height <> media_height then
    raise check_violation using
      message = 'The profile crop height does not match the selected image.';
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_profile_media_crop() from public, anon, authenticated;

create trigger characters_enforce_profile_crop
before insert or update of profile_media_id, profile_crop on public.characters
for each row execute function app_private.enforce_profile_media_crop();

create or replace function app_private.audit_character_profile_media_change()
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
    jsonb_build_object(
      'profile_media_id', old.profile_media_id,
      'profile_crop', old.profile_crop
    ),
    jsonb_build_object(
      'profile_media_id', new.profile_media_id,
      'profile_crop', new.profile_crop
    )
  );

  return new;
end;
$$;

revoke all on function app_private.audit_character_profile_media_change() from public, anon, authenticated;

drop trigger audit_character_profile_media on public.characters;
create trigger audit_character_profile_media
after update of profile_media_id, profile_crop on public.characters
for each row execute function app_private.audit_character_profile_media_change();

commit;
