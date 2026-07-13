"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import {
  deleteMediaAsset,
  prepareMediaUpload,
  registerMediaAsset,
  updateMediaAsset,
} from "@/app/dm/media-actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type {
  DmMediaAsset,
  DmMediaCharacterOption,
} from "@/lib/dm-media.server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const acceptedMimeTypes = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const purposeLabels = {
  hero: "Primary artwork",
  card: "Card crop",
  attachment: "Supporting image",
} as const;

type UploadDraft = {
  id: string;
  file: File;
};

type MediaLibraryProps = {
  characters: DmMediaCharacterOption[];
  selectedCharacterId: string;
  assets: DmMediaAsset[];
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function imageDimensions(file: File) {
  if (typeof createImageBitmap !== "function") {
    return { width: null, height: null };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return { width: null, height: null };
  }
}

export function DmMediaLibrary({
  characters,
  selectedCharacterId,
  assets,
}: MediaLibraryProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedCharacter = characters.find(
    (character) => character.id === selectedCharacterId,
  );
  const [folder, setFolder] = useState("uncategorized");
  const [drafts, setDrafts] = useState<UploadDraft[]>([]);
  const [folderFilter, setFolderFilter] = useState("all");
  const [dropActive, setDropActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  const folders = useMemo(
    () => Array.from(new Set(assets.map((asset) => asset.folder))).sort(),
    [assets],
  );
  const filteredAssets =
    folderFilter === "all"
      ? assets
      : assets.filter((asset) => asset.folder === folderFilter);

  function chooseCharacter(characterId: string) {
    router.push(`/dm/media?characterId=${encodeURIComponent(characterId)}`);
  }

  function addFiles(fileList: FileList | File[]) {
    const accepted: UploadDraft[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(fileList)) {
      if (!acceptedMimeTypes.has(file.type)) {
        rejected.push(`${file.name}: unsupported image type`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name}: larger than 10 MB`);
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file });
    }

    if (rejected.length) {
      setMessage({ kind: "error", text: rejected.join("; ") });
    } else if (accepted.length) {
      setMessage(null);
    }
    setDrafts((current) => [...current, ...accepted]);
  }

  function removeDraft(id: string) {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  }

  async function uploadDrafts() {
    if (!selectedCharacter || drafts.length === 0) return;

    setBusy(true);
    setMessage(null);
    const supabase = createBrowserSupabaseClient();
    let uploaded = 0;

    try {
      for (const draft of drafts) {
        const prepared = await prepareMediaUpload({
          characterId: selectedCharacter.id,
          mimeType: draft.file.type,
        });
        const { error: uploadError } = await supabase.storage
          .from(prepared.bucket)
          .upload(prepared.storageObjectName, draft.file, {
            cacheControl: "3600",
            contentType: draft.file.type,
            upsert: false,
          });

        if (uploadError) {
          await supabase.storage
            .from(prepared.bucket)
            .remove([prepared.storageObjectName]);
          throw new Error(`${draft.file.name}: ${uploadError.message}`);
        }

        const dimensions = await imageDimensions(draft.file);
        const result = await registerMediaAsset({
          assetId: prepared.assetId,
          characterId: selectedCharacter.id,
          storageObjectName: prepared.storageObjectName,
          mimeType: draft.file.type,
          folder: folder.trim() || "uncategorized",
          memoryId: null,
          purpose: "attachment",
          fileName: draft.file.name,
          width: dimensions.width,
          height: dimensions.height,
          sortOrder: 0,
        });

        if (!result.ok) {
          await supabase.storage
            .from(prepared.bucket)
            .remove([prepared.storageObjectName]);
          throw new Error(`${draft.file.name}: ${result.message}`);
        }
        uploaded += 1;
        setDrafts((current) => current.filter((item) => item.id !== draft.id));
      }

      setDrafts([]);
      setMessage({
        kind: "success",
        text: `${uploaded} image${uploaded === 1 ? "" : "s"} added to the library. Attach them from a memory page.`,
      });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "The upload failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!selectedCharacter) {
    return null;
  }

  return (
    <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(20rem,0.75fr)_minmax(0,1.25fr)]">
      <section aria-labelledby="upload-heading">
        <div className="border border-white/10 bg-[#0e1219] p-5 sm:p-6">
          <p className="font-mono text-[0.58rem] tracking-[0.14em] text-[#8ad9cb] uppercase">
            Add to the library
          </p>
          <h2
            className="mt-2 text-xl font-semibold text-[#e8e4da]"
            id="upload-heading"
          >
            Drop artwork
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#7f898d]">
            Names do not matter. Organize images here first, then attach them to
            a specific memory from memory management.
          </p>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-[0.62rem] tracking-[0.1em] text-[#899397] uppercase">
              Character
              <select
                className="border border-white/10 bg-[#0b0e14] px-3 py-2.5 text-sm tracking-normal text-[#d9dbd5] normal-case focus:border-[#8ad9cb]/45 focus:ring-2 focus:ring-[#8ad9cb]/20 focus:outline-none"
                onChange={(event) => chooseCharacter(event.target.value)}
                value={selectedCharacter.id}
              >
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-[0.62rem] tracking-[0.1em] text-[#899397] uppercase">
              Folder or category
              <input
                className="border border-white/10 bg-[#0b0e14] px-3 py-2.5 text-sm tracking-normal text-[#d9dbd5] normal-case placeholder:text-[#4f5a60] focus:border-[#8ad9cb]/45 focus:ring-2 focus:ring-[#8ad9cb]/20 focus:outline-none"
                maxLength={80}
                onChange={(event) => setFolder(event.target.value)}
                placeholder="e.g. forge, portrait studies"
                value={folder}
              />
            </label>
          </div>

          <button
            className={`mt-6 flex min-h-32 w-full flex-col items-center justify-center border border-dashed px-5 text-center transition ${dropActive ? "border-[#8ad9cb]/70 bg-[#8ad9cb]/10" : "border-white/15 bg-white/[0.02] hover:border-[#8ad9cb]/40 hover:bg-white/[0.04]"}`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDropActive(false);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              setDropActive(false);
              addFiles(event.dataTransfer.files);
            }}
            type="button"
          >
            <span className="text-sm text-[#d0d4cf]">Drop images here</span>
            <span className="mt-1 text-xs text-[#69747a]">
              or choose files · WebP, PNG, JPEG, AVIF · 10 MB max each
            </span>
          </button>
          <input
            accept="image/avif,image/jpeg,image/png,image/webp"
            className="sr-only"
            multiple
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
            ref={fileInputRef}
            type="file"
          />

          {drafts.length ? (
            <div
              className="mt-5 grid gap-3"
              aria-label="Images ready to upload"
            >
              {drafts.map((draft) => (
                <div
                  className="border border-white/8 bg-[#0b0e14] p-3"
                  key={draft.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[#d5d8d1]">
                        {draft.file.name}
                      </p>
                      <p className="mt-1 font-mono text-[0.55rem] text-[#687379]">
                        {formatBytes(draft.file.size)}
                      </p>
                    </div>
                    <button
                      className="shrink-0 text-xs text-[#8f999b] underline underline-offset-4 hover:text-[#e0b1a8] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                      onClick={() => removeDraft(draft.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="border border-[#8ad9cb]/30 bg-[#8ad9cb]/8 px-4 py-3 text-[0.62rem] font-semibold tracking-[0.12em] text-[#c9e8e1] uppercase hover:border-[#8ad9cb]/55 hover:bg-[#8ad9cb]/12 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65 disabled:cursor-wait disabled:opacity-50"
                disabled={busy}
                onClick={() => void uploadDrafts()}
                type="button"
              >
                {busy
                  ? "Uploading…"
                  : `Upload ${drafts.length} image${drafts.length === 1 ? "" : "s"}`}
              </button>
            </div>
          ) : null}

          {message ? (
            <p
              className={`mt-4 border px-3 py-2.5 text-sm leading-5 ${message.kind === "error" ? "border-[#c77f72]/30 bg-[#c77f72]/8 text-[#e4b5ac]" : "border-[#8ad9cb]/25 bg-[#8ad9cb]/6 text-[#b9ddd6]"}`}
              role={message.kind === "error" ? "alert" : "status"}
            >
              {message.text}
            </p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="library-heading">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[0.58rem] tracking-[0.14em] text-[#8ad9cb] uppercase">
              {selectedCharacter.displayName}
            </p>
            <h2
              className="mt-2 text-xl font-semibold text-[#e8e4da]"
              id="library-heading"
            >
              Artwork library
            </h2>
          </div>
          <label className="flex items-center gap-2 text-[0.58rem] tracking-[0.1em] text-[#7d878b] uppercase">
            Folder
            <select
              className="border border-white/10 bg-[#0e1219] px-2.5 py-2 text-xs tracking-normal text-[#cfd3ce] normal-case focus:border-[#8ad9cb]/45 focus:outline-none"
              onChange={(event) => setFolderFilter(event.target.value)}
              value={folderFilter}
            >
              <option value="all">All</option>
              {folders.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredAssets.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {filteredAssets.map((asset) => (
              <MediaAssetCard
                asset={asset}
                character={selectedCharacter}
                key={asset.id}
                onChanged={() => router.refresh()}
              />
            ))}
          </div>
        ) : (
          <p className="mt-5 border border-white/10 py-14 text-center text-sm text-[#697277]">
            No artwork in this folder yet.
          </p>
        )}
      </section>
    </div>
  );
}

function MediaAssetCard({
  asset,
  character,
  onChanged,
}: {
  asset: DmMediaAsset;
  character: DmMediaCharacterOption;
  onChanged: () => void;
}) {
  const [folder, setFolder] = useState(asset.folder);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    const result = await updateMediaAsset({
      assetId: asset.id,
      folder,
    });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMessage("Saved");
    onChanged();
  }

  async function remove() {
    if (!window.confirm("Remove this image from the library?")) return;
    setBusy(true);
    setMessage(null);
    const result = await deleteMediaAsset({ assetId: asset.id });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onChanged();
  }

  return (
    <article className="border border-white/10 bg-[#0e1219] p-3">
      <div className="relative aspect-[4/3] overflow-hidden border border-white/8 bg-[#090d13]">
        <Image
          alt={asset.file_name}
          className="object-cover"
          fill
          sizes="(min-width: 1280px) 22rem, (min-width: 640px) 40vw, 100vw"
          src={asset.previewUrl}
          unoptimized
        />
        <span className="absolute top-2 left-2 bg-[#090d13]/80 px-2 py-1 font-mono text-[0.5rem] tracking-[0.1em] text-[#b5c0bd] uppercase">
          {purposeLabels[asset.purpose]}
        </span>
      </div>

      <div className="mt-3 grid gap-3">
        <p className="truncate text-sm text-[#d5d8d1]" title={asset.file_name}>
          {asset.file_name}
        </p>
        <p className="text-xs text-[#858f92]">
          {asset.memory_id ? (
            <Link
              className="text-[#b9ddd6] underline underline-offset-4 hover:text-white"
              href={`/dm/characters/${character.id}/memories/${asset.memory_id}`}
            >
              Attached to memory{" "}
              {String(asset.memoryPosition ?? "").padStart(2, "0")} ·{" "}
              {asset.memoryTitle}
            </Link>
          ) : (
            "Unattached — choose a memory to attach it."
          )}
        </p>
        <label className="grid gap-1 text-[0.56rem] tracking-[0.08em] text-[#7f898d] uppercase">
          Folder
          <input
            className="border border-white/10 bg-[#0b0e14] px-2.5 py-2 text-xs tracking-normal text-[#d9dbd5] normal-case focus:border-[#8ad9cb]/45 focus:outline-none"
            maxLength={80}
            onChange={(event) => setFolder(event.target.value)}
            value={folder}
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <button
            className="text-[0.58rem] tracking-[0.1em] text-[#a27770] uppercase hover:text-[#e0b1a8] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65 disabled:opacity-50"
            disabled={busy}
            onClick={() => void remove()}
            type="button"
          >
            Remove
          </button>
          <div className="flex items-center gap-3">
            {message ? (
              <span className="text-xs text-[#9ccdc4]" role="status">
                {message}
              </span>
            ) : null}
            <button
              className="border border-white/12 px-3 py-2 text-[0.58rem] tracking-[0.1em] text-[#bfc8c5] uppercase hover:border-[#8ad9cb]/40 hover:text-[#d8eee9] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65 disabled:opacity-50"
              disabled={busy}
              onClick={() => void save()}
              type="button"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
