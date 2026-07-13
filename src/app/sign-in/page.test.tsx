import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthStateMock, isLocalAuthEnabledMock } = vi.hoisted(() => ({
  getAuthStateMock: vi.fn(),
  isLocalAuthEnabledMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/app/auth/actions", () => ({
  signInAsLocalAccount: vi.fn(),
  signInWithGoogle: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getAuthState: getAuthStateMock }));
vi.mock("@/lib/env", () => ({
  isLocalAuthEnabled: isLocalAuthEnabledMock,
}));

import SignInPage from "./page";

beforeEach(() => {
  getAuthStateMock.mockResolvedValue({ status: "anonymous" });
  isLocalAuthEnabledMock.mockReturnValue(false);
});

describe("sign-in page", () => {
  it("keeps the production login surface concise", async () => {
    render(await SignInPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { name: "Enter the archive." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Continue with the Google account approved for this campaign.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Local test identities")).not.toBeInTheDocument();
  });

  it("shows real character names only in the opted-in local account selector", async () => {
    isLocalAuthEnabledMock.mockReturnValue(true);

    render(await SignInPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Kaelen Ironheart")).toBeInTheDocument();
    expect(screen.getByText("Telestra Thornveil")).toBeInTheDocument();
  });
});
