import { NextResponse } from "next/server";
import { z } from "zod";

import { MEMORY_MEDIA_BUCKET } from "@/lib/memory-media.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const mediaIdSchema = z.uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const parsed = mediaIdSchema.safeParse((await params).mediaId);
  if (!parsed.success) {
    return new NextResponse(null, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: media, error: mediaError } = await supabase
    .from("memory_media")
    .select("storage_object_name, mime_type")
    .eq("id", parsed.data)
    .maybeSingle();

  if (mediaError || !media) {
    return new NextResponse(null, { status: 404 });
  }

  const { data: object, error: objectError } = await supabase.storage
    .from(MEMORY_MEDIA_BUCKET)
    .download(media.storage_object_name);

  if (objectError || !object) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(object, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": media.mime_type,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
