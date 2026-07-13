import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClientMock, getClaimsMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getClaimsMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));
vi.mock("@/lib/env", () => ({
  getPublicSupabaseEnv: () => ({
    url: "https://project.supabase.co",
    publishableKey: "sb_publishable_test",
  }),
}));

import { refreshAuthSession } from "@/lib/supabase/proxy";

type MockServerClientOptions = {
  cookies: {
    setAll: (
      cookies: Array<{
        name: string;
        value: string;
        options: { httpOnly?: boolean; path?: string };
      }>,
    ) => void;
  };
};

beforeEach(() => {
  createServerClientMock.mockImplementation(
    (_url: string, _key: string, options: MockServerClientOptions) => ({
      auth: {
        getClaims: async () => {
          getClaimsMock();
          options.cookies.setAll([
            {
              name: "sb-session",
              value: "refreshed",
              options: { httpOnly: true, path: "/" },
            },
          ]);
          return { data: { claims: { sub: "user-id" } }, error: null };
        },
      },
    }),
  );
});

describe("Supabase auth proxy", () => {
  it("validates claims and propagates refreshed cookies both directions", async () => {
    const request = new NextRequest("https://oracle.example/memories");

    const response = await refreshAuthSession(request);

    expect(getClaimsMock).toHaveBeenCalledOnce();
    expect(request.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(response.headers.get("location")).toBeNull();
  });
});
