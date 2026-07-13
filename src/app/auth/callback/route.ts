import { NextResponse } from "next/server";
import { z } from "zod";

import { getPublicSiteUrl } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const authorizationCodeSchema = z.string().min(1).max(4096);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = authorizationCodeSchema.safeParse(
    requestUrl.searchParams.get("code"),
  );

  if (!code.success) {
    return NextResponse.redirect(
      new URL("/sign-in?error=oauth_callback", getPublicSiteUrl()),
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code.data);

  if (error) {
    return NextResponse.redirect(
      new URL("/sign-in?error=oauth_callback", getPublicSiteUrl()),
    );
  }

  // Authorization is intentionally re-evaluated by the destination page using
  // protected database state rather than OAuth/JWT metadata.
  return NextResponse.redirect(new URL("/", getPublicSiteUrl()));
}
