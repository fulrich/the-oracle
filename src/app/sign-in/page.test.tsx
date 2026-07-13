import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthStateMock } = vi.hoisted(() => ({
  getAuthStateMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/app/auth/actions", () => ({
  signInWithGoogle: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getAuthState: getAuthStateMock }));

import SignInPage from "./page";

beforeEach(() => {
  getAuthStateMock.mockResolvedValue({ status: "anonymous" });
});

describe("sign-in page", () => {
  it("keeps the sign-in surface simple and immersive", async () => {
    render(await SignInPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { name: "Enter the archive." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enter" })).toBeInTheDocument();
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/private archive/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Local test identities")).not.toBeInTheDocument();
  });
});
