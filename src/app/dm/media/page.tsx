import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ImageIcon,
  LogOutIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { signOut } from "@/app/auth/actions";
import { DmMediaLibrary } from "@/components/dm-media-library";
import { getAuthState } from "@/lib/auth";
import { loadDmMediaLibrary } from "@/lib/dm-media.server";

export const metadata: Metadata = {
  title: "Media library",
};

export default async function DmMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ characterId?: string }>;
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

  const requestedCharacterId = z
    .uuid()
    .safeParse((await searchParams).characterId).data;
  const library = await loadDmMediaLibrary(requestedCharacterId);

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
                DM administration
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
          href="/dm"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
          DM administration
        </Link>

        <div className="mt-8 flex items-end gap-4 border-b border-white/10 pb-8">
          <span className="grid size-12 place-items-center border border-[#c6a979]/25 bg-[#c6a979]/5 text-[#d9c8a9]">
            <ImageIcon aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="font-mono text-[0.58rem] tracking-[0.14em] text-[#8ad9cb] uppercase">
              Private campaign media
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#ece8de]">
              Media library
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#858d91]">
              Upload and organize reviewed artwork here. Attach assets from the
              memory management page when you are ready.
            </p>
          </div>
        </div>

        {library.characters.length ? (
          <DmMediaLibrary
            assets={library.assets}
            characters={library.characters}
            selectedCharacterId={library.selectedCharacterId}
          />
        ) : (
          <p className="mt-8 border-y border-white/10 py-12 text-center text-sm text-[#697277]">
            No characters are available.
          </p>
        )}
      </div>
    </main>
  );
}
