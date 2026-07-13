import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerClientMock,
  isLocalAuthEnabledMock,
  redirectMock,
  signInWithPasswordMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  isLocalAuthEnabledMock: vi.fn(),
  redirectMock: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
  signInWithPasswordMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/env", () => ({
  getPublicSiteUrl: () => "https://oracle.example",
  isLocalAuthEnabled: isLocalAuthEnabledMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerClientMock,
}));

import { signInAsLocalAccount } from "./actions";

beforeEach(() => {
  createServerClientMock.mockReset();
  isLocalAuthEnabledMock.mockReset();
  redirectMock.mockClear();
  signInWithPasswordMock.mockReset();
  signInWithPasswordMock.mockResolvedValue({ error: null });
  createServerClientMock.mockResolvedValue({
    auth: { signInWithPassword: signInWithPasswordMock },
  });
});

describe("local test sign-in action", () => {
  it("cannot contact Auth without the explicit local-development opt-in", async () => {
    isLocalAuthEnabledMock.mockReturnValue(false);
    const formData = new FormData();
    formData.set("account", "player.one@example.test");

    await expect(signInAsLocalAccount(formData)).rejects.toThrow(
      "redirect:/sign-in?error=local_unavailable",
    );
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("accepts only a known synthetic account identifier", async () => {
    isLocalAuthEnabledMock.mockReturnValue(true);
    const formData = new FormData();
    formData.set("account", "intruder@example.test");

    await expect(signInAsLocalAccount(formData)).rejects.toThrow(
      "redirect:/sign-in?error=local_invalid",
    );
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("uses the fixed seed password only on the server", async () => {
    isLocalAuthEnabledMock.mockReturnValue(true);
    const formData = new FormData();
    formData.set("account", "player.one@example.test");

    await expect(signInAsLocalAccount(formData)).rejects.toThrow("redirect:/");
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "player.one@example.test",
      password: "local-oracle-password",
    });
  });
});
