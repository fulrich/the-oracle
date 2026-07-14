import "server-only";

import type { CharacterIdentity } from "@/lib/auth";
import type { MemoryMediaRow } from "@/lib/memory-media.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DmMediaMemoryOption = {
  id: string;
  position: number;
  title: string;
};

export type DmMediaCharacterOption = CharacterIdentity & {
  memories: DmMediaMemoryOption[];
};

export type DmMediaAsset = Pick<
  MemoryMediaRow,
  | "id"
  | "character_id"
  | "memory_id"
  | "folder"
  | "purpose"
  | "file_name"
  | "width"
  | "height"
  | "sort_order"
  | "mime_type"
  | "created_at"
> & {
  memoryTitle: string | null;
  memoryPosition: number | null;
  previewUrl: string;
  isProfile: boolean;
};

export type DmMediaLibrary = {
  selectedCharacterId: string;
  characters: DmMediaCharacterOption[];
  assets: DmMediaAsset[];
};

const mediaColumns =
  "id, character_id, memory_id, storage_object_name, folder, purpose, file_name, width, height, sort_order, mime_type, created_at";

export async function loadDmMediaLibrary(
  requestedCharacterId?: string,
): Promise<DmMediaLibrary> {
  const supabase = await createServerSupabaseClient();
  const { data: characterRows, error: characterError } = await supabase
    .from("characters")
    .select(
      "id, slug, display_name, initials, subtitle, archive_note, profile_media_id",
    )
    .order("display_name");

  if (characterError) {
    throw new Error("Unable to load media characters.");
  }

  const characters = await Promise.all(
    characterRows.map(async (character) => {
      const { data: memories, error: memoryError } = await supabase
        .from("memories")
        .select("id, position, title")
        .eq("character_id", character.id)
        .eq("publication_status", "published")
        .order("position");

      if (memoryError) {
        throw new Error("Unable to load media memories.");
      }

      return {
        id: character.id,
        slug: character.slug,
        displayName: character.display_name,
        initials: character.initials,
        subtitle: character.subtitle,
        archiveNote: character.archive_note,
        profileMediaId: character.profile_media_id,
        memories: memories.map((memory) => ({
          id: memory.id,
          position: memory.position,
          title: memory.title,
        })),
      } satisfies DmMediaCharacterOption;
    }),
  );

  const selectedCharacterId = characters.some(
    (character) => character.id === requestedCharacterId,
  )
    ? requestedCharacterId!
    : characters[0]?.id;

  if (!selectedCharacterId) {
    return { selectedCharacterId: "", characters, assets: [] };
  }

  const { data: mediaRows, error: mediaError } = await supabase
    .from("memory_media")
    .select(mediaColumns)
    .eq("character_id", selectedCharacterId)
    .order("created_at", { ascending: false });

  if (mediaError) {
    throw new Error("Unable to load the media library.");
  }

  const selectedCharacter = characters.find(
    (character) => character.id === selectedCharacterId,
  );
  const memoryById = new Map(
    selectedCharacter?.memories.map((memory) => [memory.id, memory]) ?? [],
  );
  const assets = mediaRows.map((row) => {
    const memory = row.memory_id ? memoryById.get(row.memory_id) : undefined;
    return {
      id: row.id,
      character_id: row.character_id,
      memory_id: row.memory_id,
      folder: row.folder,
      purpose: row.purpose,
      file_name: row.file_name,
      width: row.width,
      height: row.height,
      sort_order: row.sort_order,
      mime_type: row.mime_type,
      created_at: row.created_at,
      memoryTitle: memory?.title ?? null,
      memoryPosition: memory?.position ?? null,
      previewUrl: `/api/memory-media/${row.id}`,
      isProfile: selectedCharacter?.profileMediaId === row.id,
    };
  });

  return { selectedCharacterId, characters, assets };
}
