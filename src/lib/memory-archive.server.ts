import "server-only";

import type { ActiveViewer, CharacterIdentity } from "@/lib/auth";
import type { MemoryArtworkKind, Memory, MemorySet } from "@/lib/memory";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ArchiveRow =
  Database["public"]["Functions"]["visible_memory_archive"]["Returns"][number];

const artworkKinds: readonly MemoryArtworkKind[] = [
  "threshold",
  "cavern",
  "orchard",
  "portrait",
  "wind",
  "lantern",
];

const memoryTones: readonly Memory["tones"][] = [
  {
    night: "#0b1525",
    middle: "#244865",
    glow: "#96e3db",
    ember: "#f0bd73",
  },
  {
    night: "#100f22",
    middle: "#34315b",
    glow: "#c4a8ff",
    ember: "#6ee7d8",
  },
  {
    night: "#101b22",
    middle: "#28545e",
    glow: "#b8eee3",
    ember: "#e8bfa8",
  },
  {
    night: "#171221",
    middle: "#4b304e",
    glow: "#e0bed9",
    ember: "#efae7c",
  },
];

const revealDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function paragraphsFromMarkdown(markdown: string): readonly string[] {
  return markdown
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function archiveRowsToMemorySet(
  character: CharacterIdentity,
  rows: readonly ArchiveRow[],
): MemorySet {
  return {
    playerName: character.displayName,
    playerInitials: character.initials,
    playerSubtitle: character.subtitle ?? "Player character",
    archiveNote: character.archiveNote ?? "The archive is quiet tonight",
    memories: rows.map((row, index) => ({
      id: row.memory_id,
      chapter: row.chapter_label,
      title: row.title,
      revealed: `Recovered ${revealDateFormatter.format(new Date(row.revealed_at))}`,
      excerpt: row.excerpt,
      body: paragraphsFromMarkdown(row.markdown_body),
      bodyMarkdown: row.markdown_body,
      quote: "",
      artwork: artworkKinds[index % artworkKinds.length],
      artworkAlt:
        row.artwork_alt ?? `An abstract echo of ${row.title.toLowerCase()}`,
      visualState: "placeholder",
      tones: memoryTones[index % memoryTones.length],
    })),
  };
}

export type PlayerArchiveResult =
  { status: "unassigned" } | { status: "ready"; memorySet: MemorySet };

export async function loadPlayerMemoryArchive(
  viewer: ActiveViewer,
): Promise<PlayerArchiveResult> {
  if (viewer.role !== "player") {
    throw new Error("Only a player can load a personal memory archive.");
  }

  if (!viewer.character) {
    return { status: "unassigned" };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("visible_memory_archive");
  if (error) {
    throw new Error("Unable to load the memory archive.");
  }

  return {
    status: "ready",
    memorySet: archiveRowsToMemorySet(viewer.character, data),
  };
}
