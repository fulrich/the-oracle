#!/usr/bin/env node
// Uploads reviewed, player-safe memory artwork into the private `memory-media`
// Storage bucket and registers the matching `memory_media` rows.
//
// This is an OPERATOR script, not part of the application runtime. It requires a
// Supabase service-role key, which must never be committed, exposed to the
// browser, or placed in a NEXT_PUBLIC_* variable. The application itself never
// uses the service role; it reads media through per-request signed URLs gated by
// RLS.
//
// Files in the source directory must be named `memory-01.webp`, `memory-02.webp`,
// ... where the number is the memory's campaign position for the character. Each
// file is uploaded to `<memory_id>/hero.webp` and registered as the memory's
// `hero` image. Re-running is idempotent (objects and rows are upserted).
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/import-memory-media.mjs \
//       --character kaelen-ironheart \
//       --source /path/to/vault/art/players/kaelen-ironheart/memories \
//       [--dry-run]

import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "memory-media";

const MIME_BY_EXT = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
};

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--character") {
      args.character = argv[(i += 1)];
    } else if (arg === "--source") {
      args.source = argv[(i += 1)];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function fail(message) {
  console.error(`\nerror: ${message}\n`);
  process.exit(1);
}

const { character, source, dryRun } = parseArgs(process.argv.slice(2));

if (!character || !source) {
  fail("Both --character <slug> and --source <dir> are required.");
}

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  fail("Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL).");
}
if (!serviceRoleKey) {
  fail(
    "Set SUPABASE_SERVICE_ROLE_KEY (operator only; never commit or expose it).",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: characterRow, error: characterError } = await supabase
  .from("characters")
  .select("id, slug, display_name")
  .eq("slug", character)
  .maybeSingle();

if (characterError) {
  fail(`Unable to look up character: ${characterError.message}`);
}
if (!characterRow) {
  fail(`No character found with slug "${character}".`);
}

const { data: memoryRows, error: memoriesError } = await supabase
  .from("memories")
  .select("id, position, title, artwork_alt")
  .eq("character_id", characterRow.id)
  .order("position", { ascending: true });

if (memoriesError) {
  fail(`Unable to load memories: ${memoriesError.message}`);
}

const memoryByPosition = new Map(
  memoryRows.map((memory) => [memory.position, memory]),
);

const entries = (await readdir(source, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => /^memory-\d+\.(webp|png|jpe?g|avif)$/i.test(name))
  .sort();

if (entries.length === 0) {
  fail(`No files matching memory-NN.<ext> found in ${source}.`);
}

console.log(
  `\n${dryRun ? "[dry run] " : ""}Importing ${entries.length} image(s) for ${characterRow.display_name} (${characterRow.slug})\n`,
);

let uploaded = 0;
let skipped = 0;

for (const name of entries) {
  const position = Number.parseInt(name.match(/^memory-(\d+)\./i)[1], 10);
  const memory = memoryByPosition.get(position);

  if (!memory) {
    console.warn(
      `  - ${name}: no published memory at position ${position}; skipping`,
    );
    skipped += 1;
    continue;
  }

  const ext = extname(name).toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) {
    console.warn(`  - ${name}: unsupported extension ${ext}; skipping`);
    skipped += 1;
    continue;
  }

  const objectName = `${memory.id}/hero${ext}`;
  const altText =
    memory.artwork_alt?.trim() ||
    `Illustration for "${memory.title}", memory ${position} of ${characterRow.display_name}`;

  console.log(
    `  - ${name} -> ${objectName} (position ${position}: "${memory.title}")`,
  );

  if (dryRun) {
    continue;
  }

  const fileBuffer = await readFile(join(source, name));

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(objectName, fileBuffer, { contentType: mimeType, upsert: true });

  if (uploadError) {
    fail(`Failed to upload ${objectName}: ${uploadError.message}`);
  }

  const { error: rowError } = await supabase.from("memory_media").upsert(
    {
      memory_id: memory.id,
      storage_object_name: objectName,
      purpose: "hero",
      sort_order: 0,
      mime_type: mimeType,
      alt_text: altText,
    },
    { onConflict: "storage_object_name" },
  );

  if (rowError) {
    fail(
      `Failed to register memory_media row for ${objectName}: ${rowError.message}`,
    );
  }

  uploaded += 1;
}

console.log(
  `\n${dryRun ? "[dry run] " : ""}Done. ${uploaded} uploaded, ${skipped} skipped.\n`,
);
