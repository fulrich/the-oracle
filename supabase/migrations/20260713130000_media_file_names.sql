begin;

-- Media names are supplied by the DM through the source filename. They are
-- presentation metadata only: storage paths remain opaque and no filename is
-- used to determine a character or memory relationship.
alter table public.memory_media
  add column file_name text;

update public.memory_media
set file_name = alt_text;

alter table public.memory_media
  alter column file_name set not null,
  add constraint memory_media_file_name_check check (
    file_name = btrim(file_name)
    and length(file_name) > 0
    and file_name !~ '[[:cntrl:]]'
  ),
  drop constraint memory_media_alt_text_check,
  drop column alt_text;

commit;
