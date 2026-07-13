"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdministrator } from "@/lib/dm-auth.server";
import { MEMORY_MEDIA_BUCKET } from "@/lib/memory-media.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const supportedMimeTypes = [
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type SupportedMimeType = (typeof supportedMimeTypes)[number];
type MediaPurpose = "hero" | "card" | "attachment";

const extensionByMimeType: Record<SupportedMimeType, string> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const mediaPurposeSchema = z.enum(["hero", "card", "attachment"]);
const folderSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) => !/[\u0000-\u001f\u007f]/u.test(value))
  .refine((value) => !/(^|\/)\.\.($|\/)/u.test(value));
const altTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => !/[\u0000-\u001f\u007f]/u.test(value));

const prepareUploadSchema = z.object({
  characterId: z.uuid(),
  mimeType: z.enum(supportedMimeTypes),
});

const registerMediaSchema = z.object({
  assetId: z.uuid(),
  characterId: z.uuid(),
  storageObjectName: z.string().min(1).max(300),
  mimeType: z.enum(supportedMimeTypes),
  folder: folderSchema,
  memoryId: z.uuid().nullable(),
  purpose: mediaPurposeSchema,
  altText: altTextSchema,
  width: z.number().int().positive().max(10000).nullable(),
  height: z.number().int().positive().max(10000).nullable(),
  sortOrder: z.number().int().min(0).max(9999),
});

const updateMediaSchema = z.object({
  assetId: z.uuid(),
  folder: folderSchema,
  memoryId: z.uuid().nullable(),
  purpose: mediaPurposeSchema,
  altText: altTextSchema,
  sortOrder: z.number().int().min(0).max(9999),
});

const assetIdSchema = z.object({ assetId: z.uuid() });

export type MediaActionResult =
  | { ok: true; assetId: string; message?: string }
  | { ok: false; message: string };

function failure(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

function revalidateMedia(characterId: string) {
  revalidatePath("/dm/media");
  revalidatePath(`/dm/characters/${characterId}`);
  revalidatePath(`/dm/preview/${characterId}`);
  revalidatePath("/");
}

export async function prepareMediaUpload(input: {
  characterId: string;
  mimeType: string;
}) {
  await requireAdministrator();

  const parsed = prepareUploadSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Choose a character and a supported image.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: character, error } = await supabase
    .from("characters")
    .select("id")
    .eq("id", parsed.data.characterId)
    .maybeSingle();

  if (error || !character) {
    throw new Error("That character is not available.");
  }

  const assetId = crypto.randomUUID();
  const extension = extensionByMimeType[parsed.data.mimeType];
  const storageObjectName = `characters/${parsed.data.characterId}/assets/${assetId}.${extension}`;

  return { assetId, storageObjectName, bucket: MEMORY_MEDIA_BUCKET };
}

async function verifyStoredObject(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storageObjectName: string,
) {
  const slash = storageObjectName.lastIndexOf("/");
  const directory = storageObjectName.slice(0, slash);
  const filename = storageObjectName.slice(slash + 1);
  const { data, error } = await supabase.storage
    .from(MEMORY_MEDIA_BUCKET)
    .list(directory, { limit: 20, search: filename });

  return !error && data?.some((object) => object.name === filename);
}

async function verifyMemoryTarget(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  characterId: string,
  memoryId: string | null,
) {
  if (!memoryId) {
    return true;
  }

  const { data: memory, error } = await supabase
    .from("memories")
    .select("id, character_id")
    .eq("id", memoryId)
    .eq("character_id", characterId)
    .eq("publication_status", "published")
    .maybeSingle();

  return !error && Boolean(memory);
}

async function nextMediaSortOrder(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  memoryId: string | null,
  purpose: MediaPurpose,
) {
  if (!memoryId) return 0;

  const { data, error } = await supabase
    .from("memory_media")
    .select("sort_order")
    .eq("memory_id", memoryId)
    .eq("purpose", purpose)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data?.sort_order ?? -1) + 1;
}

export async function registerMediaAsset(input: {
  assetId: string;
  characterId: string;
  storageObjectName: string;
  mimeType: string;
  folder: string;
  memoryId: string | null;
  purpose: "hero" | "card" | "attachment";
  altText: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
}): Promise<MediaActionResult> {
  const viewer = await requireAdministrator();
  const parsed = registerMediaSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Complete the image details before saving.");
  }

  const expectedObjectName = `characters/${parsed.data.characterId}/assets/${parsed.data.assetId}.${extensionByMimeType[parsed.data.mimeType]}`;
  if (parsed.data.storageObjectName !== expectedObjectName) {
    return failure("The upload could not be verified.");
  }
  if (!parsed.data.memoryId && parsed.data.purpose !== "attachment") {
    return failure(
      "Unattached images must be supporting images until attached.",
    );
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: character, error: characterError }, objectExists] =
    await Promise.all([
      supabase
        .from("characters")
        .select("id")
        .eq("id", parsed.data.characterId)
        .maybeSingle(),
      verifyStoredObject(supabase, parsed.data.storageObjectName),
    ]);

  if (characterError || !character || !objectExists) {
    return failure("The uploaded image could not be found.");
  }
  if (
    !(await verifyMemoryTarget(
      supabase,
      parsed.data.characterId,
      parsed.data.memoryId,
    ))
  ) {
    return failure("Choose a published memory for this character.");
  }

  const sortOrder = await nextMediaSortOrder(
    supabase,
    parsed.data.memoryId,
    parsed.data.purpose,
  );
  if (sortOrder === null) {
    return failure("The image order could not be calculated.");
  }

  const { error } = await supabase.from("memory_media").insert({
    id: parsed.data.assetId,
    character_id: parsed.data.characterId,
    memory_id: parsed.data.memoryId,
    storage_object_name: parsed.data.storageObjectName,
    folder: parsed.data.folder,
    purpose: parsed.data.purpose,
    sort_order: parsed.data.memoryId ? sortOrder : parsed.data.sortOrder,
    mime_type: parsed.data.mimeType,
    alt_text: parsed.data.altText,
    width: parsed.data.width,
    height: parsed.data.height,
    created_by: viewer.authUserId,
  });

  if (error) {
    return failure("The image details could not be saved.");
  }

  revalidateMedia(parsed.data.characterId);
  return { ok: true, assetId: parsed.data.assetId };
}

export async function updateMediaAsset(input: {
  assetId: string;
  folder: string;
  memoryId: string | null;
  purpose: "hero" | "card" | "attachment";
  altText: string;
  sortOrder: number;
}): Promise<MediaActionResult> {
  await requireAdministrator();
  const parsed = updateMediaSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Complete the image details before saving.");
  }
  if (!parsed.data.memoryId && parsed.data.purpose !== "attachment") {
    return failure(
      "Unattached images must be supporting images until attached.",
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("memory_media")
    .select("id, character_id")
    .eq("id", parsed.data.assetId)
    .maybeSingle();

  if (existingError || !existing) {
    return failure("That image is no longer in the library.");
  }
  if (
    !(await verifyMemoryTarget(
      supabase,
      existing.character_id,
      parsed.data.memoryId,
    ))
  ) {
    return failure("Choose a published memory for this character.");
  }

  const { error } = await supabase
    .from("memory_media")
    .update({
      folder: parsed.data.folder,
      memory_id: parsed.data.memoryId,
      purpose: parsed.data.purpose,
      alt_text: parsed.data.altText,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", parsed.data.assetId);

  if (error) {
    return failure("The image details could not be updated.");
  }

  revalidateMedia(existing.character_id);
  return { ok: true, assetId: parsed.data.assetId };
}

export async function deleteMediaAsset(input: {
  assetId: string;
}): Promise<MediaActionResult> {
  await requireAdministrator();
  const parsed = assetIdSchema.safeParse(input);
  if (!parsed.success) {
    return failure("That image is not available.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("memory_media")
    .select("id, character_id, storage_object_name")
    .eq("id", parsed.data.assetId)
    .maybeSingle();

  if (existingError || !existing) {
    return failure("That image is no longer in the library.");
  }

  const { error: deleteError } = await supabase
    .from("memory_media")
    .delete()
    .eq("id", existing.id);
  if (deleteError) {
    return failure("The image could not be removed.");
  }

  const { error: storageError } = await supabase.storage
    .from(MEMORY_MEDIA_BUCKET)
    .remove([existing.storage_object_name]);

  revalidateMedia(existing.character_id);
  return storageError
    ? {
        ok: true,
        assetId: existing.id,
        message: "Image removed; its storage cleanup will need a retry.",
      }
    : { ok: true, assetId: existing.id };
}
