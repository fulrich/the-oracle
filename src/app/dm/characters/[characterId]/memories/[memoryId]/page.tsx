import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  LogOutIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { signOut } from "@/app/auth/actions";
import {
  attachMediaToMemory,
  detachMediaFromMemory,
} from "@/app/dm/media-actions";
import { setMemoryVisibility } from "@/app/dm/actions";
import { getAuthState } from "@/lib/auth";
import { loadDmMemoryMedia } from "@/lib/dm-memory.server";

export const metadata: Metadata = {
  title: "Manage memory artwork",
};

const errorMessages: Record<string, string> = {
  invalid_media_attachment: "That artwork selection was not valid.",
  media_attachment_failed: "The artwork could not be attached.",
  media_detachment_failed: "The artwork could not be detached.",
};

export default async function DmMemoryArtworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ characterId: string; memoryId: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
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

  const resolvedParams = await params;
  const characterId = z.uuid().safeParse(resolvedParams.characterId);
  const memoryId = z.uuid().safeParse(resolvedParams.memoryId);
  if (!characterId.success || !memoryId.success) {
    notFound();
  }

  const [detail, query] = await Promise.all([
    loadDmMemoryMedia(characterId.data, memoryId.data),
    searchParams,
  ]);
  if (!detail) {
    notFound();
  }

  const errorMessage = query.error ? errorMessages[query.error] : undefined;

  return (
    <main className="min-h-svh bg-[#0b0e14] text-[#dedbd2]">
      <header className="border-b border-white/10 bg-[#0e1219]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon
              aria-hidden="true"
              className="size-5 text-[#8ad9cb]"
            />
            <div>
              <p className="text-sm font-semibold">Forgotten Oracle</p>
              <p className="text-[0.62rem] tracking-[0.13em] text-[#717a80] uppercase">
                Memory management
              </p>
            </div>
          </div>
          <form action={signOut}>
            <button
              className="flex items-center gap-2 border border-white/10 px-3 py-2 text-xs text-[#9ba1a2] hover:border-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
              type="submit"
            >
              <LogOutIcon aria-hidden="true" className="size-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <Link
          className="inline-flex items-center gap-2 text-[0.62rem] tracking-[0.11em] text-[#7d8789] uppercase hover:text-[#b7c1c0] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
          href={`/dm/characters/${detail.character.id}`}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
          {detail.character.displayName} memories
        </Link>

        <div className="mt-8 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center border border-[#c6a979]/25 bg-[#c6a979]/5 font-serif text-base text-[#e2d5bd]">
              {String(detail.memory.position).padStart(2, "0")}
            </span>
            <div>
              <p className="font-mono text-[0.58rem] tracking-[0.14em] text-[#8ad9cb] uppercase">
                {detail.memory.chapterLabel}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#ece8de]">
                {detail.memory.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#858d91]">
                {detail.memory.excerpt}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link
              className="flex items-center justify-center gap-2 border border-[#c6a979]/25 bg-[#c6a979]/5 px-4 py-2.5 text-[0.62rem] tracking-[0.1em] text-[#d9c8a9] uppercase hover:border-[#c6a979]/45 hover:bg-[#c6a979]/9 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
              href={`/dm/media?characterId=${detail.character.id}`}
            >
              <ImageIcon aria-hidden="true" className="size-3.5" />
              Media library
            </Link>
            <Link
              className="flex items-center justify-center border border-white/10 px-4 py-2.5 text-[0.62rem] tracking-[0.1em] text-[#aeb6b5] uppercase hover:border-[#8ad9cb]/35 hover:text-[#c9ebe4] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
              href={`/dm/preview/${detail.character.id}`}
            >
              Preview character
            </Link>
            <form action={setMemoryVisibility}>
              <input
                name="characterId"
                type="hidden"
                value={detail.character.id}
              />
              <input name="memoryId" type="hidden" value={detail.memory.id} />
              <input
                name="operation"
                type="hidden"
                value={detail.memory.revealed ? "hide" : "reveal"}
              />
              <button
                className="flex h-full items-center justify-center gap-2 border border-white/10 px-4 py-2.5 text-[0.62rem] tracking-[0.1em] text-[#aeb6b5] uppercase hover:border-[#8ad9cb]/35 hover:text-[#c9ebe4] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                type="submit"
              >
                {detail.memory.revealed ? (
                  <EyeOffIcon aria-hidden="true" className="size-3.5" />
                ) : (
                  <EyeIcon aria-hidden="true" className="size-3.5" />
                )}
                {detail.memory.revealed ? "Hide memory" : "Reveal memory"}
              </button>
            </form>
          </div>
        </div>

        {errorMessage ? (
          <p
            className="mt-6 border border-[#c77f72]/30 bg-[#c77f72]/8 px-4 py-3 text-sm text-[#e4b5ac]"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
        {query.updated ? (
          <p
            className="mt-6 border border-[#8ad9cb]/25 bg-[#8ad9cb]/6 px-4 py-3 text-sm text-[#b9ddd6]"
            role="status"
          >
            {query.updated === "media_attached"
              ? "Artwork attached to this memory."
              : query.updated === "media_detached"
                ? "Artwork returned to the media library."
                : "Memory visibility updated."}
          </p>
        ) : null}

        <section aria-labelledby="attached-heading" className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[0.58rem] tracking-[0.14em] text-[#8ad9cb] uppercase">
                This memory
              </p>
              <h2
                className="mt-2 text-xl font-semibold text-[#e8e4da]"
                id="attached-heading"
              >
                Attached artwork
              </h2>
            </div>
            <p className="font-mono text-[0.58rem] tracking-[0.1em] text-[#6f797d] uppercase">
              {detail.attached.length} attached
            </p>
          </div>

          {detail.attached.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {detail.attached.map((asset) => (
                <article
                  className="border border-white/10 bg-[#0e1219] p-3"
                  key={asset.id}
                >
                  <div className="relative aspect-[4/3] overflow-hidden border border-white/8 bg-[#090d13]">
                    <Image
                      alt={asset.file_name}
                      className="object-cover"
                      fill
                      sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
                      src={asset.previewUrl}
                      unoptimized
                    />
                  </div>
                  <p className="mt-3 font-mono text-[0.55rem] tracking-[0.1em] text-[#8ad9cb] uppercase">
                    {purposeLabel(asset.purpose)} · {asset.folder}
                  </p>
                  <p
                    className="mt-2 truncate text-sm leading-5 text-[#aeb6b5]"
                    title={asset.file_name}
                  >
                    {asset.file_name}
                  </p>
                  <form action={detachMediaFromMemory} className="mt-4">
                    <input
                      name="characterId"
                      type="hidden"
                      value={detail.character.id}
                    />
                    <input
                      name="memoryId"
                      type="hidden"
                      value={detail.memory.id}
                    />
                    <input name="assetId" type="hidden" value={asset.id} />
                    <button
                      className="border border-white/10 px-3 py-2 text-[0.58rem] tracking-[0.1em] text-[#aeb6b5] uppercase hover:border-[#c78779]/35 hover:text-[#ddb0a7] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                      type="submit"
                    >
                      Detach
                    </button>
                  </form>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 border-y border-white/10 py-10 text-center text-sm text-[#697277]">
              No artwork is attached to this memory.
            </p>
          )}
        </section>

        <section aria-labelledby="available-heading" className="mt-12">
          <div>
            <p className="font-mono text-[0.58rem] tracking-[0.14em] text-[#8ad9cb] uppercase">
              From the library
            </p>
            <h2
              className="mt-2 text-xl font-semibold text-[#e8e4da]"
              id="available-heading"
            >
              Attach artwork
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7f898d]">
              Choose from unattached {detail.character.displayName} artwork. You
              can attach several images; their order controls how they appear.
            </p>
          </div>

          {detail.available.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {detail.available.map((asset, index) => (
                <article
                  className="border border-white/10 bg-[#0e1219] p-3"
                  key={asset.id}
                >
                  <div className="relative aspect-[4/3] overflow-hidden border border-white/8 bg-[#090d13]">
                    <Image
                      alt={asset.file_name}
                      className="object-cover"
                      fill
                      sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
                      src={asset.previewUrl}
                      unoptimized
                    />
                  </div>
                  <p className="mt-3 font-mono text-[0.55rem] tracking-[0.1em] text-[#8ad9cb] uppercase">
                    {asset.folder}
                  </p>
                  <p
                    className="mt-2 truncate text-sm leading-5 text-[#aeb6b5]"
                    title={asset.file_name}
                  >
                    {asset.file_name}
                  </p>
                  <form
                    action={attachMediaToMemory}
                    className="mt-4 grid gap-2"
                  >
                    <input
                      name="characterId"
                      type="hidden"
                      value={detail.character.id}
                    />
                    <input
                      name="memoryId"
                      type="hidden"
                      value={detail.memory.id}
                    />
                    <input name="assetId" type="hidden" value={asset.id} />
                    <label className="grid gap-1 text-[0.55rem] tracking-[0.08em] text-[#7f898d] uppercase">
                      Role
                      <select
                        className="border border-white/10 bg-[#0b0e14] px-2.5 py-2 text-xs tracking-normal text-[#d9dbd5] normal-case focus:border-[#8ad9cb]/45 focus:outline-none"
                        defaultValue="attachment"
                        name="purpose"
                      >
                        <option value="hero">Primary artwork</option>
                        <option value="card">Card crop</option>
                        <option value="attachment">Supporting image</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-[0.55rem] tracking-[0.08em] text-[#7f898d] uppercase">
                      Order
                      <input
                        className="border border-white/10 bg-[#0b0e14] px-2.5 py-2 text-xs text-[#d9dbd5] focus:border-[#8ad9cb]/45 focus:outline-none"
                        defaultValue={detail.attached.length + index}
                        min="0"
                        name="sortOrder"
                        type="number"
                      />
                    </label>
                    <button
                      className="mt-1 border border-[#8ad9cb]/25 bg-[#8ad9cb]/7 px-3 py-2.5 text-[0.58rem] tracking-[0.1em] text-[#c7e6e0] uppercase hover:border-[#8ad9cb]/45 hover:bg-[#8ad9cb]/10 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                      type="submit"
                    >
                      Attach to memory
                    </button>
                  </form>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 border-y border-white/10 py-10 text-center text-sm text-[#697277]">
              No unattached artwork is available for this character. Add it from
              the media library first.
            </p>
          )}
        </section>

        <Link
          className="mt-10 inline-flex items-center gap-2 text-[0.62rem] tracking-[0.11em] text-[#7d8789] uppercase hover:text-[#b7c1c0] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
          href={`/dm/characters/${detail.character.id}`}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
          Back to memory management
        </Link>
      </div>
    </main>
  );
}

function purposeLabel(purpose: "hero" | "card" | "attachment") {
  return {
    hero: "Primary artwork",
    card: "Card crop",
    attachment: "Supporting image",
  }[purpose];
}
