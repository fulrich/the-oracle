"use server";

import { redirect } from "next/navigation";

import { getPublicSiteUrl } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
