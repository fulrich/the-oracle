import "server-only";

import { notFound, redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth";
import type { ActiveViewer } from "@/lib/auth";

export async function requireAdministrator(): Promise<ActiveViewer> {
  const authState = await getAuthState();
  if (authState.status === "anonymous") {
    redirect("/sign-in");
  }
  if (authState.status === "denied") {
    redirect("/access-denied");
  }
  if (authState.viewer.role !== "admin") {
    notFound();
  }
  return authState.viewer;
}
