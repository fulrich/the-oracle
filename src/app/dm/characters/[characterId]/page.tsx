import type { Metadata } from "next";
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
import { setMemoryVisibility } from "@/app/dm/actions";
import { CharacterAvatar } from "@/components/character-avatar";
import { getAuthState } from "@/lib/auth";
import { loadDmCharacterMemories } from "@/lib/dm.server";

export const metadata: Metadata = {
  title: "Manage character memories",
};

export default async function DmCharacterMemoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ characterId: string }>;
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

  const characterId = z.uuid().safeParse((await params).characterId);
  if (!characterId.success) {
    notFound();
  }

  const [archive, query] = await Promise.all([
    loadDmCharacterMemories(characterId.data),
    searchParams,
  ]);
  if (!archive) {
    notFound();
  }

  const revealedCount = archive.memories.filter(
    (memory) => memory.revealed,
  ).length;

  return (
    <main className="min-h-svh bg-[#0b0e14] text-[#dedbd2]">
      <header className="border-b border-white/10 bg-[#0e1219]">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon
              aria-hidden="true"
              className="size-5 text-[#8ad9cb]"
            />
            <div>
              <p className="text-sm font-semibold">Forgotten Oracle</p>
              <p className="text-[0.62rem] tracking-[0.13em] text-[#717a80] uppercase">
                Memory access
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

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <Link
          className="inline-flex items-center gap-2 text-[0.62rem] tracking-[0.11em] text-[#7d8789] uppercase hover:text-[#b7c1c0] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
          href="/dm"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
          All characters
        </Link>

        <div className="mt-8 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end">
          <div className="flex items-center gap-4">
            <CharacterAvatar
              className="size-14 shrink-0 border border-[#c6a979]/25 bg-[#c6a979]/5 font-serif text-base text-[#e2d5bd]"
              displayName={archive.character.displayName}
              initials={archive.character.initials}
              profileCrop={archive.character.profileCrop}
              profileMediaId={archive.character.profileMediaId}
              sizes="3.5rem"
            />
            <div>
              <p className="font-mono text-[0.58rem] tracking-[0.14em] text-[#8ad9cb] uppercase">
                Character memories
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#ece8de]">
                {archive.character.displayName}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              className="flex items-center justify-center gap-2 border border-[#c6a979]/25 bg-[#c6a979]/5 px-4 py-2.5 text-[0.62rem] tracking-[0.1em] text-[#d9c8a9] uppercase hover:border-[#c6a979]/45 hover:bg-[#c6a979]/9 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
              href={`/dm/media?characterId=${archive.character.id}`}
            >
              <ImageIcon aria-hidden="true" className="size-3.5" />
              Media library
            </Link>
            <Link
              className="flex items-center justify-center gap-2 border border-white/10 px-4 py-2.5 text-[0.62rem] tracking-[0.1em] text-[#aeb6b5] uppercase hover:border-[#8ad9cb]/35 hover:text-[#c9ebe4] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
              href={`/dm/preview/${archive.character.id}`}
            >
              <EyeIcon aria-hidden="true" className="size-3.5" />
              Preview character
            </Link>
          </div>
        </div>

        {query.error ? (
          <p
            className="mt-6 border border-[#c77f72]/30 bg-[#c77f72]/8 px-4 py-3 text-sm text-[#e4b5ac]"
            role="alert"
          >
            The memory visibility could not be updated.
          </p>
        ) : null}
        {query.updated ? (
          <p
            className="mt-6 border border-[#8ad9cb]/25 bg-[#8ad9cb]/6 px-4 py-3 text-sm text-[#b9ddd6]"
            role="status"
          >
            Memory visibility updated.
          </p>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-[#dedbd2]">Memories</h2>
          <p className="font-mono text-[0.6rem] tracking-[0.11em] text-[#6f797d] uppercase">
            {revealedCount} of {archive.memories.length} revealed
          </p>
        </div>

        {archive.memories.length ? (
          <section
            aria-label={`${archive.character.displayName} memories`}
            className="mt-4 divide-y divide-white/8 border-y border-white/10"
          >
            {archive.memories.map((memory) => (
              <article
                className="grid gap-5 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                key={memory.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={
                        memory.revealed
                          ? "flex items-center gap-1.5 font-mono text-[0.56rem] tracking-[0.11em] text-[#86c9bc] uppercase"
                          : "flex items-center gap-1.5 font-mono text-[0.56rem] tracking-[0.11em] text-[#777f82] uppercase"
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${memory.revealed ? "bg-[#8ad9cb]" : "bg-[#596166]"}`}
                      />
                      {memory.revealed ? "Revealed" : "Hidden"}
                    </span>
                    <span className="text-white/15">·</span>
                    <span className="font-mono text-[0.56rem] tracking-[0.11em] text-[#626c72] uppercase">
                      {memory.chapterLabel}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-[#e5e1d7]">
                    {memory.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7d8588]">
                    {memory.excerpt}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:min-w-40">
                  <Link
                    className="flex items-center justify-center border border-[#c6a979]/25 bg-[#c6a979]/5 px-4 py-2.5 text-[0.6rem] tracking-[0.1em] text-[#d9c8a9] uppercase hover:border-[#c6a979]/45 hover:bg-[#c6a979]/9 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                    href={`/dm/characters/${archive.character.id}/memories/${memory.id}`}
                  >
                    Open memory
                  </Link>
                  <form action={setMemoryVisibility}>
                    <input
                      name="characterId"
                      type="hidden"
                      value={archive.character.id}
                    />
                    <input name="memoryId" type="hidden" value={memory.id} />
                    <input
                      name="operation"
                      type="hidden"
                      value={memory.revealed ? "hide" : "reveal"}
                    />
                    <button
                      className={
                        memory.revealed
                          ? "flex w-full items-center justify-center gap-2 border border-white/10 px-4 py-2.5 text-[0.6rem] tracking-[0.1em] text-[#90999a] uppercase hover:border-[#c78779]/35 hover:text-[#ddb0a7] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                          : "flex w-full items-center justify-center gap-2 border border-[#8ad9cb]/25 bg-[#8ad9cb]/7 px-4 py-2.5 text-[0.6rem] tracking-[0.1em] text-[#c7e6e0] uppercase hover:border-[#8ad9cb]/45 hover:bg-[#8ad9cb]/10 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                      }
                      type="submit"
                    >
                      {memory.revealed ? (
                        <EyeOffIcon aria-hidden="true" className="size-3.5" />
                      ) : (
                        <EyeIcon aria-hidden="true" className="size-3.5" />
                      )}
                      {memory.revealed ? "Hide" : "Reveal"}
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <p className="mt-4 border-y border-white/10 py-10 text-center text-sm text-[#697277]">
            No memories are ready for this character yet.
          </p>
        )}
      </div>
    </main>
  );
}
