import { afterEach, describe, expect, it, vi } from "vitest";

import { isLocalAuthEnabled } from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("local authentication configuration", () => {
  it("requires both development mode and an explicit server opt-in", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ENABLE_LOCAL_AUTH", "true");

    expect(isLocalAuthEnabled()).toBe(true);
  });

  it("cannot be enabled in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_LOCAL_AUTH", "true");

    expect(isLocalAuthEnabled()).toBe(false);
  });
});
