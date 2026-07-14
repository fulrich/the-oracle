import "server-only";

import { cache } from "react";

import { parseProfileMediaCrop } from "@/lib/profile-media";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type AppRole = Database["public"]["Enums"]["app_role"];

export type CharacterIdentity = {
  id: string;
  slug: string;
  displayName: string;
  initials: string;
  subtitle: string | null;
  archiveNote: string | null;
  profileMediaId?: string | null;
  profileCrop?: ReturnType<typeof parseProfileMediaCrop>;
};

export type ActiveViewer = {
  authUserId: string;
  allowedUserId: string;
  email: string;
  role: AppRole;
  character: CharacterIdentity | null;
};

export type AuthState =
  | { status: "anonymous" }
  | { status: "denied" }
  | { status: "active"; viewer: ActiveViewer };

/**
 * Resolves authentication and current application authorization together.
 * JWT claims establish identity; protected database rows establish active
 * access, role, and the optional static-character assignment.
 */
export const getAuthState = cache(async (): Promise<AuthState> => {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const authUserId = claimsData?.claims?.sub;

  if (claimsError || typeof authUserId !== "string") {
    return { status: "anonymous" };
  }

  const { data: allowedUser, error: allowedUserError } = await supabase
    .from("allowed_users")
    .select("id, normalized_email, role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (allowedUserError) {
    throw new Error("Unable to verify application access.");
  }

  // The allowlist SELECT policy only returns the caller's active row. A valid
  // Auth identity without one is authenticated but denied application access.
  if (!allowedUser) {
    return { status: "denied" };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("character_assignments")
    .select(
      "character_id, characters(id, slug, display_name, initials, subtitle, archive_note, profile_media_id, profile_crop)",
    )
    .eq("allowed_user_id", allowedUser.id)
    .maybeSingle();

  if (assignmentError) {
    throw new Error("Unable to resolve the character assignment.");
  }

  const character = assignment?.characters
    ? {
        id: assignment.characters.id,
        slug: assignment.characters.slug,
        displayName: assignment.characters.display_name,
        initials: assignment.characters.initials,
        subtitle: assignment.characters.subtitle,
        archiveNote: assignment.characters.archive_note,
        profileMediaId: assignment.characters.profile_media_id,
        profileCrop: parseProfileMediaCrop(assignment.characters.profile_crop),
      }
    : null;

  return {
    status: "active",
    viewer: {
      authUserId,
      allowedUserId: allowedUser.id,
      email: allowedUser.normalized_email,
      role: allowedUser.role,
      character,
    },
  };
});
