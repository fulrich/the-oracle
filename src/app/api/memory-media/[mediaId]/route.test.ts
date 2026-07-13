import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerClientMock,
}));

import { GET } from "./route";

const mediaId = "49000000-0000-4000-8000-000000000001";

beforeEach(() => {
  createServerClientMock.mockReset();
});

function mockClient({
  media = {
    storage_object_name: "characters/kaelen/assets/hero.webp",
    mime_type: "image/webp",
  },
  mediaError = null,
  object = new Blob(["artwork"]),
  objectError = null,
}: {
  media?: {
    storage_object_name: string;
    mime_type: string;
  } | null;
  mediaError?: unknown;
  object?: Blob | null;
  objectError?: unknown;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: media,
    error: mediaError,
  });
  const download = vi.fn().mockResolvedValue({
    data: object,
    error: objectError,
  });
  createServerClientMock.mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({ download }),
    },
  });
  return { download };
}

describe("memory media route", () => {
  it("checks RLS-backed metadata and returns private non-cacheable media", async () => {
    const { download } = mockClient();

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ mediaId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(download).toHaveBeenCalledWith("characters/kaelen/assets/hero.webp");
  });

  it("returns 404 for an invalid media id", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ mediaId: "not-a-uuid" }),
    });

    expect(response.status).toBe(404);
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("returns 404 when RLS hides the media row", async () => {
    const { download } = mockClient({ media: null });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ mediaId }),
    });

    expect(response.status).toBe(404);
    expect(download).not.toHaveBeenCalled();
  });

  it("returns 404 when the registered object is missing", async () => {
    mockClient({ object: null, objectError: new Error("missing") });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ mediaId }),
    });

    expect(response.status).toBe(404);
  });
});
