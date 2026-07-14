import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClientMock, revalidatePathMock, requireAdministratorMock } =
  vi.hoisted(() => ({
    createServerClientMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    requireAdministratorMock: vi.fn(),
  }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/dm-auth.server", () => ({
  requireAdministrator: requireAdministratorMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerClientMock,
}));

import {
  prepareMediaUpload,
  registerMediaAsset,
  setCharacterProfileMedia,
} from "./media-actions";

const characterId = "20000000-0000-4000-8000-000000000003";
const assetId = "49000000-0000-4000-8000-000000000010";
const objectName = `characters/${characterId}/assets/${assetId}.webp`;

beforeEach(() => {
  createServerClientMock.mockReset();
  revalidatePathMock.mockReset();
  requireAdministratorMock.mockReset();
  requireAdministratorMock.mockResolvedValue({
    authUserId: "00000000-0000-4000-8000-000000000001",
    role: "admin",
  });
});

describe("DM media actions", () => {
  it("generates an opaque storage object name without using the source filename", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: characterId },
      error: null,
    });
    const from = vi.fn().mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    });
    createServerClientMock.mockResolvedValue({ from });

    const result = await prepareMediaUpload({
      characterId,
      mimeType: "image/webp",
    });

    expect(result).toMatchObject({
      bucket: "memory-media",
      storageObjectName: expect.stringMatching(
        new RegExp(`^characters/${characterId}/assets/[0-9a-f-]+\\.webp$`),
      ),
    });
  });

  it("rejects unsupported media before touching Supabase", async () => {
    await expect(
      prepareMediaUpload({ characterId, mimeType: "image/gif" }),
    ).rejects.toThrow("Choose a character and a supported image.");
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("rejects a forged storage path", async () => {
    const result = await registerMediaAsset({
      assetId,
      characterId,
      storageObjectName: "characters/other/assets/forged.webp",
      mimeType: "image/webp",
      folder: "forge",
      memoryId: null,
      purpose: "attachment",
      fileName: "kaelen-forge.webp",
      width: 1200,
      height: 800,
      sortOrder: 0,
    });

    expect(result).toEqual({
      ok: false,
      message: "The upload could not be verified.",
    });
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("does not allow an unattached asset to claim a primary role", async () => {
    const result = await registerMediaAsset({
      assetId,
      characterId,
      storageObjectName: objectName,
      mimeType: "image/webp",
      folder: "forge",
      memoryId: null,
      purpose: "hero",
      fileName: "kaelen-forge.webp",
      width: 1200,
      height: 800,
      sortOrder: 0,
    });

    expect(result).toEqual({
      ok: false,
      message: "Unattached images must be supporting images until attached.",
    });
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("requires the administrator boundary before media registration", async () => {
    requireAdministratorMock.mockRejectedValue(new Error("not-found"));

    await expect(
      registerMediaAsset({
        assetId,
        characterId,
        storageObjectName: objectName,
        mimeType: "image/webp",
        folder: "forge",
        memoryId: null,
        purpose: "attachment",
        fileName: "kaelen-forge.webp",
        width: null,
        height: null,
        sortOrder: 0,
      }),
    ).rejects.toThrow("not-found");
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid profile selection before touching Supabase", async () => {
    const result = await setCharacterProfileMedia({
      characterId,
      assetId: "not-a-uuid",
      crop: null,
    });

    expect(result).toEqual({
      ok: false,
      message: "Choose a valid character and image.",
    });
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("updates the profile pointer only after validating the character asset", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const from = vi.fn((table: string) => {
      if (table === "characters") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: characterId },
                error: null,
              }),
            }),
          }),
          update,
        };
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: assetId, width: 1200, height: 800 },
                error: null,
              }),
            }),
          }),
        }),
      };
    });
    createServerClientMock.mockResolvedValue({ from });

    const crop = {
      x: 0.1667,
      y: 0,
      width: 0.6666,
      height: 1,
      positionX: 0.5,
      positionY: 0.5,
      scale: 1.5,
    };
    const result = await setCharacterProfileMedia({
      characterId,
      assetId,
      crop,
    });

    expect(result).toEqual({ ok: true, assetId });
    expect(update).toHaveBeenCalledWith({
      profile_crop: {
        ...crop,
        sourceHeight: 800,
        sourceWidth: 1200,
      },
      profile_media_id: assetId,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dm");
  });
});
