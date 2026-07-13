import "client-only";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  const { url, publishableKey } = getPublicSupabaseEnv();
  browserClient = createBrowserClient<Database>(url, publishableKey);

  return browserClient;
}
