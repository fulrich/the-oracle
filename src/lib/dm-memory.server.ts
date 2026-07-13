import "server-only";

import type { CharacterIdentity } from "@/lib/auth";
import type { DmMediaAsset } from "@/lib/dm-media.server";
import type { MemoryMediaRow } from "@/lib/memory-media.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const mediaColumns =
  "id, character_id, memory_id, storage_object_name, folder, purpose, file_name, width, height, sort_order, mime_type, created_at";

type MemoryDetailRow = {
  id: string;
  position: number;
  chapter_label: string;
  title: string;
  excerpt: string;
  publication_status: "draft" | "published" | "archived";
  memory_reveals: { memory_id: string }[] | null;
};

export type DmMemoryMediaDetail = {
  character: CharacterIdentity;
  memory: {
    id: string;
    position: number;
    chapterLabel: string;
    title: string;
    excerpt: string;
    revealed: boolean;
  };
  attached: DmMediaAsset[];
  available: DmMediaAsset[];
};

function assetFromRow(
  row: MemoryMediaRow,
  memory: { title: string; position: number } | null,
): DmMediaAsset {
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
  };
}

export async function loadDmMemoryMedia(
  characterId: string,
  memoryId: string,
): Promise<DmMemoryMediaDetail | null> {
  const supabase = await createServerSupabaseClient();
  const [characterResult, memoryResult, mediaResult] = await Promise.all([
    supabase
      .from("characters")
      .select("id, slug, display_name, initials, subtitle, archive_note")
      .eq("id", characterId)
      .maybeSingle(),
    supabase
      .from("memories")
      .select(
        "id, position, chapter_label, title, excerpt, publication_status, memory_reveals(memory_id)",
      )
      .eq("id", memoryId)
      .eq("character_id", characterId)
      .eq("publication_status", "published")
      .maybeSingle(),
    supabase
      .from("memory_media")
      .select(mediaColumns)
      .eq("character_id", characterId)
      .order("sort_order", { ascending: true }),
  ]);

  if (characterResult.error || memoryResult.error || mediaResult.error) {
    throw new Error("Unable to load memory artwork.");
  }
  if (!characterResult.data || !memoryResult.data) {
    return null;
  }

  const memory = memoryResult.data as MemoryDetailRow;
  const character: CharacterIdentity = {
    id: characterResult.data.id,
    slug: characterResult.data.slug,
    displayName: characterResult.data.display_name,
    initials: characterResult.data.initials,
    subtitle: characterResult.data.subtitle,
    archiveNote: characterResult.data.archive_note,
  };
  const memoryOption = { title: memory.title, position: memory.position };
  const assets = mediaResult.data.map((row) =>
    assetFromRow(row, row.memory_id ? memoryOption : null),
  );

  return {
    character,
    memory: {
      id: memory.id,
      position: memory.position,
      chapterLabel: memory.chapter_label,
      title: memory.title,
      excerpt: memory.excerpt,
      revealed: Boolean(memory.memory_reveals),
    },
    attached: assets.filter((asset) => asset.memory_id === memory.id),
    available: assets.filter((asset) => asset.memory_id === null),
  };
}
