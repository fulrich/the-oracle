"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import AvatarEditor, {
  type AvatarEditorRef,
  type Position,
} from "react-avatar-editor";

import { setCharacterProfileMedia } from "@/app/dm/media-actions";
import { CharacterAvatar } from "@/components/character-avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CharacterAssignmentSummary } from "@/lib/dm.server";
const DEFAULT_POSITION: Position = { x: 0.5, y: 0.5 };
const DEFAULT_SCALE = 1;
const NUDGE_STEP = 0.02;

type ProfilePickerProps = {
  character: CharacterAssignmentSummary;
};

function editorStateFor(
  character: CharacterAssignmentSummary,
  assetId: string | null,
) {
  const crop =
    assetId === character.profileMediaId ? character.profileCrop : null;
  return {
    position: crop
      ? { x: crop.positionX, y: crop.positionY }
      : DEFAULT_POSITION,
    scale: crop?.scale ?? DEFAULT_SCALE,
  };
}

export function DmCharacterProfilePicker({ character }: ProfilePickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [busy, setBusy] = useState(false);
  const [editorError, setEditorError] = useState(false);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  const editorRef = useRef<AvatarEditorRef>(null);

  const selectedAsset = character.profileAssets.find(
    (asset) => asset.id === selectedAssetId,
  );

  function openPicker(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) return;

    const initialAssetId =
      character.profileMediaId ?? character.profileAssets[0]?.id ?? null;
    const initialState = editorStateFor(character, initialAssetId);
    setSelectedAssetId(initialAssetId);
    setPosition(initialState.position);
    setScale(initialState.scale);
    setEditorError(false);
    setMessage(null);
  }

  function chooseAsset(assetId: string) {
    const nextState = editorStateFor(character, assetId);
    setSelectedAssetId(assetId);
    setPosition(nextState.position);
    setScale(nextState.scale);
    setEditorError(false);
    setMessage(null);
  }

  function nudge(dx: number, dy: number) {
    setPosition((current) => ({
      x: Math.max(0, Math.min(1, current.x + dx)),
      y: Math.max(0, Math.min(1, current.y + dy)),
    }));
  }

  async function saveProfile() {
    if (!selectedAsset || !editorRef.current) return;

    const crop = editorRef.current.getCroppingRect();
    if (!crop) {
      setMessage({
        kind: "error",
        text: "The image crop is not ready yet.",
      });
      return;
    }

    setBusy(true);
    setMessage(null);
    const result = await setCharacterProfileMedia({
      characterId: character.id,
      assetId: selectedAsset.id,
      crop: {
        ...crop,
        positionX: position.x,
        positionY: position.y,
        scale,
      },
    });
    setBusy(false);

    if (!result.ok) {
      setMessage({ kind: "error", text: result.message });
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function clearProfile() {
    setBusy(true);
    setMessage(null);
    const result = await setCharacterProfileMedia({
      characterId: character.id,
      assetId: null,
      crop: null,
    });
    setBusy(false);

    if (!result.ok) {
      setMessage({ kind: "error", text: result.message });
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog onOpenChange={openPicker} open={open}>
      <DialogTrigger asChild>
        <button
          aria-label={`${character.profileMediaId ? "Edit" : "Set"} profile image for ${character.displayName}`}
          className="shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e14]"
          type="button"
        >
          <CharacterAvatar
            className="size-11 border border-[#c6a979]/25 bg-[#c6a979]/5 font-serif text-sm text-[#e2d5bd] transition hover:border-[#8ad9cb]/60"
            displayName={character.displayName}
            initials={character.initials}
            profileCrop={character.profileCrop}
            profileMediaId={character.profileMediaId}
            sizes="2.75rem"
          />
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[92svh] w-[min(96vw,58rem)] max-w-none overflow-y-auto border border-white/15 bg-[#0b0e14] p-5 text-[#dedbd2] shadow-2xl shadow-black/70 sm:p-7"
        overlayClassName="bg-black/80 supports-backdrop-filter:backdrop-blur-sm"
        showCloseButton={false}
      >
        <DialogTitle className="pr-8 text-lg text-[#ece8de]">
          Profile image · {character.displayName}
        </DialogTitle>
        <DialogDescription className="max-w-2xl text-[#858d91]">
          Choose an existing library image, then drag, zoom, or nudge it until
          the character is framed well.
        </DialogDescription>

        {character.profileAssets.length ? (
          <div className="mt-2 grid gap-7 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <section aria-labelledby={`profile-assets-${character.id}`}>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[0.56rem] tracking-[0.13em] text-[#8ad9cb] uppercase">
                    Existing artwork
                  </p>
                  <h3
                    className="mt-1 text-sm font-semibold text-[#dcd9d0]"
                    id={`profile-assets-${character.id}`}
                  >
                    Choose a source image
                  </h3>
                </div>
                <Link
                  className="text-[0.58rem] tracking-[0.09em] text-[#9ccdc4] uppercase underline underline-offset-4 hover:text-white focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                  href={`/dm/media?characterId=${character.id}`}
                >
                  Manage library
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {character.profileAssets.map((asset) => {
                  const selected = asset.id === selectedAssetId;
                  const current = asset.id === character.profileMediaId;
                  return (
                    <button
                      aria-pressed={selected}
                      className={`overflow-hidden border text-left transition focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/70 ${selected ? "border-[#8ad9cb]/75 bg-[#8ad9cb]/8" : "border-white/10 bg-[#0e1219] hover:border-white/25"}`}
                      key={asset.id}
                      onClick={() => chooseAsset(asset.id)}
                      type="button"
                    >
                      <span className="relative block aspect-square overflow-hidden bg-[#080b11]">
                        <Image
                          alt={asset.fileName}
                          className="object-cover"
                          fill
                          sizes="(min-width: 640px) 9rem, 42vw"
                          src={asset.previewUrl}
                          unoptimized
                        />
                        {current ? (
                          <span className="absolute top-2 left-2 bg-[#0b0e14]/85 px-2 py-1 font-mono text-[0.48rem] tracking-[0.1em] text-[#c9e8e1] uppercase">
                            Current
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate px-2.5 py-2 font-mono text-[0.54rem] text-[#bfc8c5]">
                        {asset.fileName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section
              aria-labelledby={`profile-editor-${character.id}`}
              className="border-t border-white/10 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6"
            >
              <p className="font-mono text-[0.56rem] tracking-[0.13em] text-[#8ad9cb] uppercase">
                Framing
              </p>
              <h3
                className="mt-1 text-sm font-semibold text-[#dcd9d0]"
                id={`profile-editor-${character.id}`}
              >
                Profile preview
              </h3>
              {selectedAsset ? (
                <>
                  <div className="mx-auto mt-4 w-full max-w-[17.5rem] overflow-hidden bg-[#080b11]">
                    <AvatarEditor
                      border={18}
                      borderRadius={140}
                      color={[8, 11, 17, 0.78]}
                      height={280}
                      image={selectedAsset.previewUrl}
                      onLoadFailure={() => setEditorError(true)}
                      onPositionChange={setPosition}
                      position={position}
                      ref={editorRef}
                      scale={scale}
                      showGrid
                      style={{
                        display: "block",
                        height: "auto",
                        width: "100%",
                      }}
                      width={280}
                    />
                  </div>
                  {editorError ? (
                    <p className="mt-3 text-sm text-[#e4b5ac]" role="alert">
                      This image could not be loaded.
                    </p>
                  ) : null}
                  <label className="mt-5 grid gap-2 text-[0.58rem] tracking-[0.1em] text-[#899397] uppercase">
                    <span className="flex items-center justify-between gap-3">
                      <span>Zoom</span>
                      <span className="font-mono text-[#bfc8c5]">
                        {scale.toFixed(2)}×
                      </span>
                    </span>
                    <input
                      aria-label="Profile image zoom"
                      className="accent-[#8ad9cb]"
                      max="3"
                      min="1"
                      onChange={(event) => setScale(Number(event.target.value))}
                      step="0.01"
                      type="range"
                      value={scale}
                    />
                  </label>
                  <fieldset className="mt-4">
                    <legend className="text-[0.58rem] tracking-[0.1em] text-[#899397] uppercase">
                      Nudge framing
                    </legend>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <span />
                      <button
                        aria-label="Move image up"
                        className="border border-white/12 py-2 text-sm text-[#c5d0cc] hover:border-[#8ad9cb]/45 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/70"
                        disabled={busy}
                        onClick={() => nudge(0, -NUDGE_STEP)}
                        type="button"
                      >
                        ↑
                      </button>
                      <span />
                      <button
                        aria-label="Move image left"
                        className="border border-white/12 py-2 text-sm text-[#c5d0cc] hover:border-[#8ad9cb]/45 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/70"
                        disabled={busy}
                        onClick={() => nudge(-NUDGE_STEP, 0)}
                        type="button"
                      >
                        ←
                      </button>
                      <button
                        aria-label="Move image down"
                        className="border border-white/12 py-2 text-sm text-[#c5d0cc] hover:border-[#8ad9cb]/45 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/70"
                        disabled={busy}
                        onClick={() => nudge(0, NUDGE_STEP)}
                        type="button"
                      >
                        ↓
                      </button>
                      <button
                        aria-label="Move image right"
                        className="border border-white/12 py-2 text-sm text-[#c5d0cc] hover:border-[#8ad9cb]/45 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/70"
                        disabled={busy}
                        onClick={() => nudge(NUDGE_STEP, 0)}
                        type="button"
                      >
                        →
                      </button>
                    </div>
                  </fieldset>
                  {message ? (
                    <p
                      className={`mt-4 text-sm ${message.kind === "error" ? "text-[#e4b5ac]" : "text-[#b9ddd6]"}`}
                      role={message.kind === "error" ? "alert" : "status"}
                    >
                      {message.text}
                    </p>
                  ) : null}
                  <button
                    className="mt-5 w-full border border-[#8ad9cb]/30 bg-[#8ad9cb]/8 px-4 py-3 text-[0.62rem] font-semibold tracking-[0.12em] text-[#c9e8e1] uppercase hover:border-[#8ad9cb]/55 hover:bg-[#8ad9cb]/12 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/70 disabled:cursor-wait disabled:opacity-50"
                    disabled={busy || editorError}
                    onClick={() => void saveProfile()}
                    type="button"
                  >
                    {busy ? "Saving…" : "Save profile image"}
                  </button>
                  {character.profileMediaId ? (
                    <button
                      className="mt-3 w-full text-[0.58rem] tracking-[0.1em] text-[#a27770] uppercase underline underline-offset-4 hover:text-[#e0b1a8] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/70 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void clearProfile()}
                      type="button"
                    >
                      Clear profile image
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="mt-5 text-sm leading-6 text-[#7d878b]">
                  Choose an image to begin framing the profile reference.
                </p>
              )}
            </section>
          </div>
        ) : (
          <div className="mt-5 border border-white/10 bg-[#0e1219] px-5 py-8 text-center">
            <p className="text-sm text-[#aeb6b5]">
              No artwork is available for this character yet.
            </p>
            <Link
              className="mt-3 inline-block text-[0.6rem] tracking-[0.1em] text-[#9ccdc4] uppercase underline underline-offset-4 hover:text-white focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
              href={`/dm/media?characterId=${character.id}`}
            >
              Open media library
            </Link>
          </div>
        )}
        <DialogClose asChild>
          <button
            className="absolute top-4 right-4 text-xs text-[#899397] underline underline-offset-4 hover:text-white focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/70"
            type="button"
          >
            Close
          </button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
