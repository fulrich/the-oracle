import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerClientMock,
  deleteEqMock,
  fromMock,
  getAuthStateMock,
  insertMock,
  memoryMaybeSingleMock,
  notFoundMock,
  redirectMock,
  revalidatePathMock,
  rpcMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  deleteEqMock: vi.fn(),
  fromMock: vi.fn(),
  getAuthStateMock: vi.fn(),
  insertMock: vi.fn(),
  memoryMaybeSingleMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("not-found");
  }),
  redirectMock: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
  revalidatePathMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));
vi.mock("@/lib/auth", () => ({ getAuthState: getAuthStateMock }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerClientMock,
}));

import { assignPlayerToCharacter, setMemoryVisibility } from "./actions";

const adminViewer = {
  status: "active",
  viewer: { role: "admin" },
};

function memoryVisibilityForm(operation: "reveal" | "hide") {
  const formData = new FormData();
  formData.set("characterId", "20000000-0000-4000-8000-000000000003");
  formData.set("memoryId", "33000000-0000-4000-8000-000000000002");
  formData.set("operation", operation);
  return formData;
}

beforeEach(() => {
  createServerClientMock.mockReset();
  deleteEqMock.mockReset();
  fromMock.mockReset();
  getAuthStateMock.mockReset();
  insertMock.mockReset();
  memoryMaybeSingleMock.mockReset();
  notFoundMock.mockClear();
  redirectMock.mockClear();
  revalidatePathMock.mockClear();
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ error: null });
  insertMock.mockResolvedValue({ error: null });
  deleteEqMock.mockResolvedValue({ error: null });
  memoryMaybeSingleMock.mockResolvedValue({
    data: { id: "33000000-0000-4000-8000-000000000002" },
    error: null,
  });
  fromMock.mockImplementation((table: string) => {
    if (table === "memories") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: memoryMaybeSingleMock }),
            }),
          }),
        }),
      };
    }
    if (table === "memory_reveals") {
      return {
        delete: () => ({ eq: deleteEqMock }),
        insert: insertMock,
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  createServerClientMock.mockResolvedValue({ from: fromMock, rpc: rpcMock });
});

describe("DM character assignment actions", () => {
  it("rejects a player before performing an administrative mutation", async () => {
    getAuthStateMock.mockResolvedValue({
      status: "active",
      viewer: { role: "player" },
    });
    const formData = new FormData();
    formData.set("characterId", "20000000-0000-4000-8000-000000000003");
    formData.set("email", "player@example.test");

    await expect(assignPlayerToCharacter(formData)).rejects.toThrow(
      "not-found",
    );
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("normalizes and assigns a validated email through the atomic RPC", async () => {
    getAuthStateMock.mockResolvedValue(adminViewer);
    const formData = new FormData();
    formData.set("characterId", "20000000-0000-4000-8000-000000000003");
    formData.set("email", " PLAYER@Example.Test ");

    await expect(assignPlayerToCharacter(formData)).rejects.toThrow(
      "redirect:/dm?updated=assignment",
    );
    expect(rpcMock).toHaveBeenCalledWith("assign_player_to_character", {
      target_character_id: "20000000-0000-4000-8000-000000000003",
      target_email: "player@example.test",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dm");
  });

  it("rejects a player before changing memory visibility", async () => {
    getAuthStateMock.mockResolvedValue({
      status: "active",
      viewer: { role: "player" },
    });
    const formData = memoryVisibilityForm("reveal");

    await expect(setMemoryVisibility(formData)).rejects.toThrow("not-found");
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("reveals a published memory belonging to the selected character", async () => {
    getAuthStateMock.mockResolvedValue(adminViewer);
    const formData = memoryVisibilityForm("reveal");

    await expect(setMemoryVisibility(formData)).rejects.toThrow(
      "redirect:/dm/characters/20000000-0000-4000-8000-000000000003?updated=reveal",
    );
    expect(insertMock).toHaveBeenCalledWith({
      memory_id: "33000000-0000-4000-8000-000000000002",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/dm/preview/20000000-0000-4000-8000-000000000003",
    );
  });

  it("hides a revealed memory belonging to the selected character", async () => {
    getAuthStateMock.mockResolvedValue(adminViewer);
    const formData = memoryVisibilityForm("hide");

    await expect(setMemoryVisibility(formData)).rejects.toThrow(
      "redirect:/dm/characters/20000000-0000-4000-8000-000000000003?updated=hide",
    );
    expect(deleteEqMock).toHaveBeenCalledWith(
      "memory_id",
      "33000000-0000-4000-8000-000000000002",
    );
  });
});
