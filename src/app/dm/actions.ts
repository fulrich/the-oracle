"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getAuthState } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const assignmentSchema = z.object({
  characterId: z.uuid(),
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

const memoryVisibilitySchema = z.object({
  characterId: z.uuid(),
  memoryId: z.uuid(),
  operation: z.enum(["reveal", "hide"]),
});

async function requireAdministrator() {
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
}

export async function assignPlayerToCharacter(formData: FormData) {
  await requireAdministrator();

  const input = assignmentSchema.safeParse({
    characterId: formData.get("characterId"),
    email: formData.get("email"),
  });
  if (!input.success) {
    redirect("/dm?error=invalid_assignment");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("assign_player_to_character", {
    target_character_id: input.data.characterId,
    target_email: input.data.email,
  });
  if (error) {
    redirect("/dm?error=assignment_failed");
  }

  revalidatePath("/dm");
  redirect("/dm?updated=assignment");
}

export async function setMemoryVisibility(formData: FormData) {
  await requireAdministrator();

  const input = memoryVisibilitySchema.safeParse({
    characterId: formData.get("characterId"),
    memoryId: formData.get("memoryId"),
    operation: formData.get("operation"),
  });
  if (!input.success) {
    redirect("/dm?error=invalid_memory");
  }

  const characterPath = `/dm/characters/${input.data.characterId}`;
  const supabase = await createServerSupabaseClient();
  const { data: memory, error: memoryError } = await supabase
    .from("memories")
    .select("id")
    .eq("id", input.data.memoryId)
    .eq("character_id", input.data.characterId)
    .eq("publication_status", "published")
    .maybeSingle();

  if (memoryError || !memory) {
    redirect(`${characterPath}?error=memory_update_failed`);
  }

  const { error } =
    input.data.operation === "reveal"
      ? await supabase.from("memory_reveals").insert({
          memory_id: input.data.memoryId,
        })
      : await supabase
          .from("memory_reveals")
          .delete()
          .eq("memory_id", input.data.memoryId);

  if (error) {
    redirect(`${characterPath}?error=memory_update_failed`);
  }

  revalidatePath(characterPath);
  revalidatePath(`/dm/preview/${input.data.characterId}`);
  redirect(`${characterPath}?updated=${input.data.operation}`);
}
