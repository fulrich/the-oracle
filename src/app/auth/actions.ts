"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getPublicSiteUrl, isLocalAuthEnabled } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const localAccountSchema = z.enum([
  "dm@example.test",
  "player.one@example.test",
  "player.two@example.test",
  "disabled@example.test",
]);

const localSeedPassword = "local-oracle-password";

export async function signInWithGoogle() {
  const supabase = await createServerSupabaseClient();
  const callbackUrl = new URL("/auth/callback", getPublicSiteUrl()).toString();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  });

  if (error || !data.url) {
    redirect("/sign-in?error=oauth_start");
  }

  redirect(data.url);
}

export async function signInAsLocalAccount(formData: FormData) {
  if (!isLocalAuthEnabled()) {
    redirect("/sign-in?error=local_unavailable");
  }

  const account = localAccountSchema.safeParse(formData.get("account"));
  if (!account.success) {
    redirect("/sign-in?error=local_invalid");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: account.data,
    password: localSeedPassword,
  });

  if (error) {
    redirect("/sign-in?error=local_sign_in");
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
