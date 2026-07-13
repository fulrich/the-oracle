import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { MemorySet } from "@/lib/memory";
import { attachMemoryMedia } from "@/lib/memory-media.server";

function baseMemorySet(): MemorySet {
  return {
    playerName: "Kaelen Ironheart",
    playerInitials: "KI",
    playerSubtitle: "Player character",
    archiveNote: "The archive is quiet tonight",
    memories: [
      {
        id: "33000000-0000-4000-8000-000000000001",
        chapter: "Fragment I",
        title: "The Echo of the Forge",
        revealed: "Recovered Jul 12, 2026",
        excerpt: "The heat was a living thing.",
        body: ["The heat was a living thing."],
        quote: "",
        artwork: "threshold",
        artworkAlt: "An abstract echo",
        visualState: "placeholder",
        tones: { night: "#000", middle: "#111", glow: "#222", ember: "#333" },
      },
      {
        id: "33000000-0000-4000-8000-000000000002",
        chapter: "Fragment II",
        title: "The Stranger at the Bench",
        revealed: "Recovered Jul 12, 2026",
        excerpt: "The forge was a living thing.",
        body: ["The forge was a living thing."],
        quote: "",
        artwork: "cavern",
        artworkAlt: "An abstract echo",
        visualState: "placeholder",
        tones: { night: "#000", middle: "#111", glow: "#222", ember: "#333" },
      },
    ],
  };
}

function mediaRow(
  id: string,
  purpose: "hero" | "card" | "attachment",
  sortOrder: number,
) {
  return {
    id,
    character_id: "20000000-0000-4000-8000-000000000003",
    memory_id: "33000000-0000-4000-8000-000000000001",
    storage_object_name: `characters/kaelen/assets/${id}.webp`,
    folder: "forge",
    purpose,
    file_name: `memory-${sortOrder + 1}.webp`,
    width: 1600,
    height: 2000,
    sort_order: sortOrder,
    mime_type: "image/webp",
    created_at: "2026-07-13T00:00:00.000Z",
  };
}

function makeSupabase(options: {
  mediaRows?: unknown[];
  mediaError?: unknown;
}) {
  const order = vi.fn().mockResolvedValue({
    data: options.mediaRows ?? [],
    error: options.mediaError ?? null,
  });
  const inFn = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ in: inFn });
  const from = vi.fn().mockReturnValue({ select });

  return {
    client: {
      from,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    from,
  };
}

describe("attachMemoryMedia", () => {
  it("resolves multiple authorized assets through the access-checked media route", async () => {
    const hero = mediaRow("49000000-0000-4000-8000-000000000001", "hero", 0);
    const attachment = mediaRow(
      "49000000-0000-4000-8000-000000000002",
      "attachment",
      1,
    );
    const { client } = makeSupabase({ mediaRows: [hero, attachment] });

    const result = await attachMemoryMedia(client, baseMemorySet());

    expect(result.memories[0]).toMatchObject({
      visualState: "artwork",
      image: {
        src: "/api/memory-media/49000000-0000-4000-8000-000000000001",
        cardSrc: "/api/memory-media/49000000-0000-4000-8000-000000000001",
        alt: "memory-1.webp",
        purpose: "hero",
      },
      images: [
        {
          src: "/api/memory-media/49000000-0000-4000-8000-000000000001",
        },
        {
          src: "/api/memory-media/49000000-0000-4000-8000-000000000002",
          purpose: "attachment",
        },
      ],
    });
    expect(result.memories[1].visualState).toBe("placeholder");
  });

  it("keeps placeholders when no media rows exist", async () => {
    const { client } = makeSupabase({ mediaRows: [] });

    const result = await attachMemoryMedia(client, baseMemorySet());

    expect(result.memories.every((m) => m.visualState === "placeholder")).toBe(
      true,
    );
  });

  it("surfaces media metadata query failures", async () => {
    const { client } = makeSupabase({
      mediaError: new Error("database unavailable"),
    });

    await expect(attachMemoryMedia(client, baseMemorySet())).rejects.toThrow(
      "Unable to load memory media.",
    );
  });

  it("does not query when the set has no memories", async () => {
    const { client, from } = makeSupabase({});

    const result = await attachMemoryMedia(client, {
      ...baseMemorySet(),
      memories: [],
    });

    expect(from).not.toHaveBeenCalled();
    expect(result.memories).toEqual([]);
  });
});
