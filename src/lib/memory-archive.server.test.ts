import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import type { ActiveViewer } from "@/lib/auth";
import { archiveRowsToMemorySet } from "@/lib/memory-archive.server";
import type { Database } from "@/types/database";

type ArchiveRow =
  Database["public"]["Functions"]["visible_memory_archive"]["Returns"][number];

const viewer: ActiveViewer & {
  character: NonNullable<ActiveViewer["character"]>;
} = {
  authUserId: "00000000-0000-4000-8000-000000000002",
  allowedUserId: "10000000-0000-4000-8000-000000000002",
  email: "player.one@example.test",
  role: "player",
  character: {
    id: "20000000-0000-4000-8000-000000000003",
    slug: "kaelen-ironheart",
    displayName: "Kaelen Ironheart",
    initials: "KI",
    subtitle: null,
    archiveNote: null,
    profileMediaId: "49000000-0000-4000-8000-000000000010",
  },
};

const row: ArchiveRow = {
  archive_note: "The archive is quiet tonight",
  artwork_alt: "An abstract echo of a dwarven forge",
  chapter_label: "Fragment I",
  character_display_name: "Kaelen Ironheart",
  character_id: viewer.character.id,
  character_initials: "KI",
  character_slug: "kaelen-ironheart",
  character_subtitle: "Player character",
  excerpt: "The heat was a living thing—biting, breathing, unrelenting.",
  markdown_body:
    "The heat was a living thing.\n\n**Sparks crossed the forge.**",
  memory_id: "33000000-0000-4000-8000-000000000001",
  memory_position: 1,
  memory_slug: "the-echo-of-the-forge",
  revealed_at: "2026-07-12T04:00:00.000Z",
  title: "The Echo of the Forge",
};

describe("database memory archive mapping", () => {
  it("maps only authorized RPC rows into the existing reader model", () => {
    const memorySet = archiveRowsToMemorySet(viewer.character, [row]);

    expect(memorySet).toMatchObject({
      playerName: "Kaelen Ironheart",
      playerInitials: "KI",
      profileMediaId: "49000000-0000-4000-8000-000000000010",
      memories: [
        {
          id: row.memory_id,
          title: row.title,
          bodyMarkdown: row.markdown_body,
          visualState: "placeholder",
        },
      ],
    });
    expect(memorySet.memories[0].body).toEqual([
      "The heat was a living thing.",
      "**Sparks crossed the forge.**",
    ]);
  });

  it("keeps the assigned static character visible when no memories are revealed", () => {
    const memorySet = archiveRowsToMemorySet(viewer.character, []);

    expect(memorySet.playerName).toBe("Kaelen Ironheart");
    expect(memorySet.memories).toEqual([]);
  });
});
