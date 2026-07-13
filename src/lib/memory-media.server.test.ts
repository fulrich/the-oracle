import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { attachMemoryMedia } from "@/lib/memory-media.server";
import type { MemorySet } from "@/lib/memory";

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

function makeSupabase(options: {
  mediaRows?: unknown[];
  signed?: unknown[];
  mediaError?: unknown;
  signError?: unknown;
}) {
  const order = vi.fn().mockResolvedValue({
    data: options.mediaRows ?? [],
    error: options.mediaError ?? null,
  });
  const inFn = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ in: inFn });
  const from = vi.fn().mockReturnValue({ select });

  const createSignedUrls = vi.fn().mockResolvedValue({
    data: options.signed ?? [],
    error: options.signError ?? null,
  });
  const storageFrom = vi.fn().mockReturnValue({ createSignedUrls });

  return {
    client: {
      from,
      storage: { from: storageFrom },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    from,
    inFn,
    createSignedUrls,
    storageFrom,
  };
}

describe("attachMemoryMedia", () => {
  it("upgrades memories with authorized hero media to signed artwork", async () => {
    const { client, createSignedUrls } = makeSupabase({
      mediaRows: [
        {
          memory_id: "33000000-0000-4000-8000-000000000001",
          storage_object_name: "33000000-0000-4000-8000-000000000001/hero.webp",
          purpose: "hero",
          alt_text: "The molten forge",
          width: 1600,
          height: 2000,
          sort_order: 0,
        },
      ],
      signed: [
        {
          path: "33000000-0000-4000-8000-000000000001/hero.webp",
          signedUrl: "https://example.test/signed/forge.webp?token=abc",
          error: null,
        },
      ],
    });

    const result = await attachMemoryMedia(client, baseMemorySet());

    expect(createSignedUrls).toHaveBeenCalledWith(
      ["33000000-0000-4000-8000-000000000001/hero.webp"],
      expect.any(Number),
    );
    expect(result.memories[0]).toMatchObject({
      visualState: "artwork",
      image: {
        src: "https://example.test/signed/forge.webp?token=abc",
        cardSrc: "https://example.test/signed/forge.webp?token=abc",
        alt: "The molten forge",
        width: 1600,
        height: 2000,
      },
    });
    // The second memory has no media and keeps its placeholder.
    expect(result.memories[1].visualState).toBe("placeholder");
    expect(result.memories[1].image).toBeUndefined();
  });

  it("keeps placeholders when no media rows exist and never signs", async () => {
    const { client, createSignedUrls } = makeSupabase({ mediaRows: [] });

    const result = await attachMemoryMedia(client, baseMemorySet());

    expect(createSignedUrls).not.toHaveBeenCalled();
    expect(result.memories.every((m) => m.visualState === "placeholder")).toBe(
      true,
    );
  });

  it("skips a memory when its object could not be signed", async () => {
    const { client } = makeSupabase({
      mediaRows: [
        {
          memory_id: "33000000-0000-4000-8000-000000000001",
          storage_object_name: "33000000-0000-4000-8000-000000000001/hero.webp",
          purpose: "hero",
          alt_text: "The molten forge",
          width: null,
          height: null,
          sort_order: 0,
        },
      ],
      signed: [
        {
          path: "33000000-0000-4000-8000-000000000001/hero.webp",
          signedUrl: "",
          error: "Object not found",
        },
      ],
    });

    const result = await attachMemoryMedia(client, baseMemorySet());

    expect(result.memories[0].visualState).toBe("placeholder");
    expect(result.memories[0].image).toBeUndefined();
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
