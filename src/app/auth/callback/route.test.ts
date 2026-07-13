import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClientMock, exchangeCodeForSessionMock } = vi.hoisted(
  () => ({
    createServerClientMock: vi.fn(),
    exchangeCodeForSessionMock: vi.fn(),
  }),
);

vi.mock("@/lib/env", () => ({
  getPublicSiteUrl: () => "https://oracle.example",
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerClientMock,
}));

import { GET } from "./route";

beforeEach(() => {
  createServerClientMock.mockClear();
  exchangeCodeForSessionMock.mockReset();
  exchangeCodeForSessionMock.mockResolvedValue({ error: null });
  createServerClientMock.mockResolvedValue({
    auth: { exchangeCodeForSession: exchangeCodeForSessionMock },
  });
});

describe("OAuth callback", () => {
  it("exchanges a valid PKCE code and redirects to the configured origin", async () => {
    const response = await GET(
      new Request(
        "https://untrusted-host.example/auth/callback?code=valid-code",
      ),
    );

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("valid-code");
    expect(response.headers.get("location")).toBe("https://oracle.example/");
  });

  it("rejects a missing code without contacting Auth", async () => {
    const response = await GET(
      new Request("https://oracle.example/auth/callback"),
    );

    expect(createServerClientMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://oracle.example/sign-in?error=oauth_callback",
    );
  });

  it("uses a generic callback failure without exposing provider details", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: { message: "sensitive provider response" },
    });

    const response = await GET(
      new Request("https://oracle.example/auth/callback?code=bad-code"),
    );

    expect(response.headers.get("location")).toBe(
      "https://oracle.example/sign-in?error=oauth_callback",
    );
    expect(response.headers.get("location")).not.toContain("sensitive");
  });
});
