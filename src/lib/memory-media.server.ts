import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Memory, MemorySet } from "@/lib/memory";
import type { Database } from "@/types/database";

const MEMORY_MEDIA_BUCKET = "memory-media";

// Signed URLs are short-lived on purpose: access is re-authorized on every page
// load through RLS, so a link that outlives a reveal being hidden is undesirable.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const DEFAULT_IMAGE_WIDTH = 1600;
const DEFAULT_IMAGE_HEIGHT = 2000;

type MediaRow = Pick<
  Database["public"]["Tables"]["memory_media"]["Row"],
  | "memory_id"
  | "storage_object_name"
  | "purpose"
  | "alt_text"
  | "width"
  | "height"
  | "sort_order"
>;

function firstByMemory(
  rows: readonly MediaRow[],
  purpose: MediaRow["purpose"],
): Map<string, MediaRow> {
  const byMemory = new Map<string, MediaRow>();
  for (const row of rows) {
    if (row.purpose !== purpose) {
      continue;
    }
    if (!byMemory.has(row.memory_id)) {
      byMemory.set(row.memory_id, row);
    }
  }
  return byMemory;
}

/**
 * Resolves the private artwork for each memory in a set into signed URLs and
 * upgrades those memories to the "artwork" visual state. Memories without
 * authorized media keep their abstract placeholder. Authorization is enforced by
 * Storage RLS: signing only succeeds for objects the current session may read.
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
      "memory_id, storage_object_name, purpose, alt_text, width, height, sort_order",
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

  const objectNames = Array.from(
    new Set(
      mediaRows
        .filter((row) => row.purpose === "hero" || row.purpose === "card")
        .map((row) => row.storage_object_name),
    ),
  );
  if (objectNames.length === 0) {
    return memorySet;
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(MEMORY_MEDIA_BUCKET)
    .createSignedUrls(objectNames, SIGNED_URL_TTL_SECONDS);

  if (signError) {
    throw new Error("Unable to sign memory media URLs.");
  }

  const urlByObject = new Map<string, string>();
  for (const item of signed ?? []) {
    if (item.path && item.signedUrl && !item.error) {
      urlByObject.set(item.path, item.signedUrl);
    }
  }

  return {
    ...memorySet,
    memories: memorySet.memories.map((memory): Memory => {
      const hero = heroByMemory.get(memory.id);
      if (!hero) {
        return memory;
      }

      const heroUrl = urlByObject.get(hero.storage_object_name);
      if (!heroUrl) {
        return memory;
      }

      const card = cardByMemory.get(memory.id);
      const cardUrl =
        (card && urlByObject.get(card.storage_object_name)) ?? heroUrl;

      return {
        ...memory,
        visualState: "artwork",
        image: {
          src: heroUrl,
          cardSrc: cardUrl,
          alt: hero.alt_text,
          width: hero.width ?? DEFAULT_IMAGE_WIDTH,
          height: hero.height ?? DEFAULT_IMAGE_HEIGHT,
        },
      };
    }),
  };
}
