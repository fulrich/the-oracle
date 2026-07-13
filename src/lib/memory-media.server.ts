import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Memory, MemoryImage, MemorySet } from "@/lib/memory";
import type { Database } from "@/types/database";

export const MEMORY_MEDIA_BUCKET = "memory-media";

const DEFAULT_IMAGE_WIDTH = 1600;
const DEFAULT_IMAGE_HEIGHT = 2000;

export type MemoryMediaRow = Pick<
  Database["public"]["Tables"]["memory_media"]["Row"],
  | "id"
  | "character_id"
  | "memory_id"
  | "storage_object_name"
  | "folder"
  | "purpose"
  | "alt_text"
  | "width"
  | "height"
  | "sort_order"
  | "mime_type"
  | "created_at"
>;

function firstByMemory(
  rows: readonly MemoryMediaRow[],
  purpose: MemoryMediaRow["purpose"],
): Map<string, MemoryMediaRow> {
  const byMemory = new Map<string, MemoryMediaRow>();
  for (const row of rows) {
    if (row.purpose !== purpose || row.memory_id === null) {
      continue;
    }
    if (!byMemory.has(row.memory_id)) {
      byMemory.set(row.memory_id, row);
    }
  }
  return byMemory;
}

function imageFromRow(row: MemoryMediaRow): MemoryImage {
  const mediaUrl = `/api/memory-media/${row.id}`;
  return {
    src: mediaUrl,
    cardSrc: mediaUrl,
    alt: row.alt_text,
    width: row.width ?? DEFAULT_IMAGE_WIDTH,
    height: row.height ?? DEFAULT_IMAGE_HEIGHT,
    purpose: row.purpose,
  };
}

/**
 * Resolves the private artwork for each memory in a set into same-origin,
 * access-checked media URLs and upgrades those memories to the "artwork" visual
 * state. Memories without authorized media keep their abstract placeholder. The
 * media route re-checks database and Storage authorization on every request.
 */
export async function attachMemoryMedia(
  supabase: SupabaseClient<Database>,
  memorySet: MemorySet,
): Promise<MemorySet> {
  const memoryIds = memorySet.memories.map((memory) => memory.id);
  if (memoryIds.length === 0) {
    return memorySet;
  }

  const { data: mediaRows, error } = await supabase
    .from("memory_media")
    .select(
      "id, character_id, memory_id, storage_object_name, folder, purpose, alt_text, width, height, sort_order, mime_type, created_at",
    )
    .in("memory_id", memoryIds)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Unable to load memory media.");
  }
  if (!mediaRows || mediaRows.length === 0) {
    return memorySet;
  }

  const heroByMemory = firstByMemory(mediaRows, "hero");
  const cardByMemory = firstByMemory(mediaRows, "card");
  const imagesByMemory = new Map<string, MemoryImage[]>();

  for (const row of mediaRows) {
    if (!row.memory_id) {
      continue;
    }
    const images = imagesByMemory.get(row.memory_id) ?? [];
    images.push(imageFromRow(row));
    images.sort(
      (left, right) =>
        (({ hero: 0, attachment: 1, card: 2 })[left.purpose] ?? 3) -
        ({ hero: 0, attachment: 1, card: 2 }[right.purpose] ?? 3),
    );
    imagesByMemory.set(row.memory_id, images);
  }

  return {
    ...memorySet,
    memories: memorySet.memories.map((memory): Memory => {
      const images = imagesByMemory.get(memory.id) ?? [];
      if (images.length === 0) {
        return memory;
      }

      const hero = heroByMemory.get(memory.id);
      const card = cardByMemory.get(memory.id);
      const primary =
        images.find((image) => image.purpose === "hero") ?? images[0];
      const cardUrl = card ? `/api/memory-media/${card.id}` : undefined;

      return {
        ...memory,
        visualState: "artwork",
        images,
        image: {
          ...primary,
          cardSrc: cardUrl ?? primary.cardSrc,
          alt: hero?.alt_text ?? primary.alt,
        },
      };
    }),
  };
}
