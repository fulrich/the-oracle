import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Refreshes Supabase's cookie-backed session. This is deliberately not an
 * authorization boundary: pages, actions, and route handlers authorize again
 * next to the data they use.
 */
export async function refreshAuthSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getPublicSupabaseEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims validates the token and refreshes it when necessary. Do not use
  // getSession here: its cookie value is not an authorization check.
  await supabase.auth.getClaims();

  return response;
}
