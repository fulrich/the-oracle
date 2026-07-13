import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthStateMock, loadArchiveMock, redirectMock } = vi.hoisted(() => ({
  getAuthStateMock: vi.fn(),
  loadArchiveMock: vi.fn(),
  redirectMock: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuthState: getAuthStateMock }));
vi.mock("@/lib/memory-archive.server", () => ({
  loadPlayerMemoryArchive: loadArchiveMock,
}));

import Home from "./page";

const playerViewer = {
  authUserId: "auth-id",
  allowedUserId: "allowed-id",
  email: "player@example.test",
  role: "player",
  character: {
    id: "character-id",
    slug: "character",
    displayName: "Character",
    initials: "CH",
    subtitle: null,
    archiveNote: null,
  },
};

beforeEach(() => {
  getAuthStateMock.mockReset();
  loadArchiveMock.mockReset();
  redirectMock.mockClear();
});

describe("player archive authentication", () => {
  it("redirects an anonymous request to sign-in before loading data", async () => {
    getAuthStateMock.mockResolvedValue({ status: "anonymous" });

    await expect(Home()).rejects.toThrow("redirect:/sign-in");
    expect(loadArchiveMock).not.toHaveBeenCalled();
  });

  it("redirects a valid but unauthorized identity to access denied", async () => {
    getAuthStateMock.mockResolvedValue({ status: "denied" });

    await expect(Home()).rejects.toThrow("redirect:/access-denied");
    expect(loadArchiveMock).not.toHaveBeenCalled();
  });

  it("redirects administrators before querying a personal archive", async () => {
    getAuthStateMock.mockResolvedValue({
      status: "active",
      viewer: { ...playerViewer, role: "admin", character: null },
    });

    await expect(Home()).rejects.toThrow("redirect:/dm");
    expect(loadArchiveMock).not.toHaveBeenCalled();
  });

  it("loads a player archive only after current authorization succeeds", async () => {
    getAuthStateMock.mockResolvedValue({
      status: "active",
      viewer: playerViewer,
    });
    loadArchiveMock.mockResolvedValue({
      status: "ready",
      memorySet: {
        playerName: "Character",
        playerInitials: "CH",
        playerSubtitle: "Player character",
        archiveNote: "Quiet",
        memories: [],
      },
    });

    const page = await Home();

    expect(loadArchiveMock).toHaveBeenCalledWith(playerViewer);
    expect(page.props.memorySet.playerName).toBe("Character");
  });
});
