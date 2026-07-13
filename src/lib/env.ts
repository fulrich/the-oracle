import { z } from "zod";

const publicSupabaseEnvSchema = z.object({
  url: z.url(),
  publishableKey: z.string().min(1),
});

const publicSiteUrlSchema = z.url();

export type PublicSupabaseEnv = z.infer<typeof publicSupabaseEnvSchema>;

let cachedPublicSupabaseEnv: PublicSupabaseEnv | undefined;
let cachedPublicSiteUrl: string | undefined;

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  if (cachedPublicSupabaseEnv) {
    return cachedPublicSupabaseEnv;
  }

  const result = publicSupabaseEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  cachedPublicSupabaseEnv = result.data;
  return result.data;
}

export function getPublicSiteUrl(): string {
  if (cachedPublicSiteUrl) {
    return cachedPublicSiteUrl;
  }

  const result = publicSiteUrlSchema.safeParse(
    process.env.NEXT_PUBLIC_SITE_URL,
  );
  if (!result.success) {
    throw new Error(
      "Application origin is not configured. Set NEXT_PUBLIC_SITE_URL.",
    );
  }

  cachedPublicSiteUrl = new URL(result.data).origin;
  return cachedPublicSiteUrl;
}

export function isLocalAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_LOCAL_AUTH === "true"
  );
}
