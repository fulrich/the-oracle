import "server-only";

import type { CharacterIdentity } from "@/lib/auth";
import { archiveRowsToMemorySet } from "@/lib/memory-archive.server";
import type { MemorySet } from "@/lib/memory";
import { attachMemoryMedia } from "@/lib/memory-media.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CharacterAssignmentSummary = CharacterIdentity & {
  assignment: { email: string } | null;
};

export async function loadCharacterAssignments(): Promise<
  CharacterAssignmentSummary[]
> {
  const supabase = await createServerSupabaseClient();
  const [charactersResult, assignmentsResult] = await Promise.all([
    supabase
      .from("characters")
      .select("id, slug, display_name, initials, subtitle, archive_note")
      .order("display_name"),
    supabase.from("character_assignments").select(
      `
        character_id,
        allowed_users!inner(normalized_email)
      `,
    ),
  ]);

  if (charactersResult.error || assignmentsResult.error) {
    throw new Error("Unable to load character assignments.");
  }

  const assignmentByCharacter = new Map(
    assignmentsResult.data.map(
      (assignment) => [assignment.character_id, assignment] as const,
    ),
  );

  return charactersResult.data.map((character) => {
    const assignment = assignmentByCharacter.get(character.id);
    return {
      id: character.id,
      slug: character.slug,
      displayName: character.display_name,
      initials: character.initials,
      subtitle: character.subtitle,
      archiveNote: character.archive_note,
      assignment: assignment
        ? { email: assignment.allowed_users.normalized_email }
        : null,
    };
  });
}

export type DmCharacterMemory = {
  id: string;
  position: number;
  chapterLabel: string;
  title: string;
  excerpt: string;
  revealed: boolean;
};

export type DmCharacterMemories = {
  character: CharacterIdentity;
  memories: DmCharacterMemory[];
};

export async function loadDmCharacterMemories(
  characterId: string,
): Promise<DmCharacterMemories | null> {
  const supabase = await createServerSupabaseClient();
  const [characterResult, memoriesResult] = await Promise.all([
    supabase
      .from("characters")
      .select("id, slug, display_name, initials, subtitle, archive_note")
      .eq("id", characterId)
      .maybeSingle(),
    supabase
      .from("memories")
      .select(
        "id, position, chapter_label, title, excerpt, memory_reveals(memory_id)",
      )
      .eq("character_id", characterId)
      .eq("publication_status", "published")
      .order("position"),
  ]);

  if (characterResult.error || memoriesResult.error) {
    throw new Error("Unable to load character memories.");
  }
  if (!characterResult.data) {
    return null;
  }

  return {
    character: {
      id: characterResult.data.id,
      slug: characterResult.data.slug,
      displayName: characterResult.data.display_name,
      initials: characterResult.data.initials,
      subtitle: characterResult.data.subtitle,
      archiveNote: characterResult.data.archive_note,
    },
    memories: memoriesResult.data.map((memory) => ({
      id: memory.id,
      position: memory.position,
      chapterLabel: memory.chapter_label,
      title: memory.title,
      excerpt: memory.excerpt,
      revealed: memory.memory_reveals !== null,
    })),
  };
}

export type DmCharacterPreview = {
  memorySet: MemorySet;
};

export async function loadDmCharacterPreview(
  characterId: string,
): Promise<DmCharacterPreview | null> {
  const supabase = await createServerSupabaseClient();
  const { data: characterRow, error: characterError } = await supabase
    .from("characters")
    .select("id, slug, display_name, initials, subtitle, archive_note")
    .eq("id", characterId)
    .maybeSingle();

  if (characterError) {
    throw new Error("Unable to load the preview character.");
  }
  if (!characterRow) {
    return null;
  }

  const character: CharacterIdentity = {
    id: characterRow.id,
    slug: characterRow.slug,
    displayName: characterRow.display_name,
    initials: characterRow.initials,
    subtitle: characterRow.subtitle,
    archiveNote: characterRow.archive_note,
  };

  const { data: archiveRows, error: archiveError } = await supabase.rpc(
    "visible_character_memory_archive",
    { target_character_id: character.id },
  );
  if (archiveError) {
    throw new Error("Unable to load the character preview.");
  }

  const memorySet = archiveRowsToMemorySet(character, archiveRows);
  return {
    memorySet: await attachMemoryMedia(supabase, memorySet),
  };
}
