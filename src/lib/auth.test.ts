import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  allowedUserResult,
  assignmentResult,
  createServerClientMock,
  getClaimsMock,
} = vi.hoisted(() => ({
  allowedUserResult: {
    current: { data: null, error: null } as {
      data: unknown;
      error: unknown;
    },
  },
  assignmentResult: {
    current: { data: null, error: null } as {
      data: unknown;
      error: unknown;
    },
  },
  createServerClientMock: vi.fn(),
  getClaimsMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerClientMock,
}));

import { getAuthState } from "@/lib/auth";

function queryReturning(result: { current: unknown }) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => result.current,
      }),
    }),
  };
}

beforeEach(() => {
  getClaimsMock.mockReset();
  allowedUserResult.current = { data: null, error: null };
  assignmentResult.current = { data: null, error: null };
  createServerClientMock.mockResolvedValue({
    auth: { getClaims: getClaimsMock },
    from: (table: string) =>
      table === "allowed_users"
        ? queryReturning(allowedUserResult)
        : queryReturning(assignmentResult),
  });
});

describe("authentication data access layer", () => {
  it("treats a missing verified claim as anonymous", async () => {
    getClaimsMock.mockResolvedValue({
      data: null,
      error: { message: "missing" },
    });

    await expect(getAuthState()).resolves.toEqual({ status: "anonymous" });
  });

  it("distinguishes a valid Auth identity without an active allowlist row", async () => {
    getClaimsMock.mockResolvedValue({
      data: { claims: { sub: "auth-user-id" } },
      error: null,
    });

    await expect(getAuthState()).resolves.toEqual({ status: "denied" });
  });

  it("loads role and static-character assignment from protected rows", async () => {
    getClaimsMock.mockResolvedValue({
      data: { claims: { sub: "auth-user-id" } },
      error: null,
    });
    allowedUserResult.current = {
      data: {
        id: "allowed-user-id",
        normalized_email: "player@example.test",
        role: "player",
      },
      error: null,
    };
    assignmentResult.current = {
      data: {
        character_id: "character-id",
        characters: {
          id: "character-id",
          slug: "fixed-character",
          display_name: "Fixed Character",
          initials: "FC",
          subtitle: "Player character",
          archive_note: "The archive waits",
        },
      },
      error: null,
    };

    await expect(getAuthState()).resolves.toMatchObject({
      status: "active",
      viewer: {
        authUserId: "auth-user-id",
        allowedUserId: "allowed-user-id",
        role: "player",
        character: {
          id: "character-id",
          slug: "fixed-character",
          displayName: "Fixed Character",
        },
      },
    });
  });
});
