import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenTextIcon,
  EyeIcon,
  LogOutIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { assignPlayerToCharacter } from "@/app/dm/actions";
import { getAuthState } from "@/lib/auth";
import { loadCharacterAssignments } from "@/lib/dm.server";

export const metadata: Metadata = {
  title: "DM administration",
};

const errorMessages: Record<string, string> = {
  invalid_assignment: "Enter a valid player email address.",
  assignment_failed: "The assignment could not be saved.",
};

export default async function DmPage({
  searchParams,
}: {
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

  const [characters, params] = await Promise.all([
    loadCharacterAssignments(),
    searchParams,
  ]);
  const errorMessage = params.error ? errorMessages[params.error] : undefined;

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
          <div className="flex items-center gap-2">
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
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[0.6rem] tracking-[0.16em] text-[#8ad9cb] uppercase">
              Campaign access
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#ece8de]">
              Characters and players
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#858d91]">
              Assign one player email to each character. Preview any character
              whether or not an email has been assigned.
            </p>
          </div>
          <p className="font-mono text-[0.62rem] tracking-[0.12em] text-[#687278] uppercase">
            {characters.filter((character) => character.assignment).length} of{" "}
            {characters.length} assigned
          </p>
        </div>

        {errorMessage ? (
          <p
            className="mt-7 border border-[#c77f72]/30 bg-[#c77f72]/8 px-4 py-3 text-sm text-[#e4b5ac]"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
        {params.updated ? (
          <p
            className="mt-7 border border-[#8ad9cb]/25 bg-[#8ad9cb]/6 px-4 py-3 text-sm text-[#b9ddd6]"
            role="status"
          >
            Character access updated.
          </p>
        ) : null}

        <section
          aria-label="Static character assignments"
          className="mt-8 divide-y divide-white/8 border-y border-white/10"
        >
          {characters.map((character) => (
            <article
              className="grid gap-5 py-6 lg:grid-cols-[minmax(13rem,0.8fr)_minmax(20rem,1.5fr)] lg:items-center"
              key={character.id}
            >
              <div className="flex items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center border border-[#c6a979]/25 bg-[#c6a979]/5 font-serif text-sm text-[#e2d5bd]">
                  {character.initials}
                </span>
                <div>
                  <h2 className="text-base font-semibold text-[#e5e1d7]">
                    {character.displayName}
                  </h2>
                  <p className="mt-1 font-mono text-[0.55rem] tracking-[0.1em] text-[#626c72] uppercase">
                    {character.slug}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <form
                  action={assignPlayerToCharacter}
                  className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row"
                >
                  <input
                    name="characterId"
                    type="hidden"
                    value={character.id}
                  />
                  <label className="sr-only" htmlFor={`email-${character.id}`}>
                    Player email for {character.displayName}
                  </label>
                  <input
                    autoComplete="email"
                    className="min-w-0 flex-1 border border-white/10 bg-[#0e1219] px-3.5 py-2.5 text-sm text-[#d8d9d4] placeholder:text-[#535d63] focus:border-[#8ad9cb]/45 focus:ring-2 focus:ring-[#8ad9cb]/20 focus:outline-none"
                    defaultValue={character.assignment?.email ?? ""}
                    id={`email-${character.id}`}
                    name="email"
                    placeholder="Player email"
                    required
                    type="email"
                  />
                  <button
                    className="border border-[#8ad9cb]/25 bg-[#8ad9cb]/7 px-4 py-2.5 text-[0.62rem] font-semibold tracking-[0.11em] text-[#c7e6e0] uppercase hover:border-[#8ad9cb]/45 hover:bg-[#8ad9cb]/10 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                    type="submit"
                  >
                    Save email
                  </button>
                </form>
                <Link
                  className="flex shrink-0 items-center justify-center gap-2 border border-[#c6a979]/25 bg-[#c6a979]/5 px-3 py-2.5 text-[0.6rem] tracking-[0.1em] text-[#d9c8a9] uppercase hover:border-[#c6a979]/45 hover:bg-[#c6a979]/9 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                  href={`/dm/characters/${character.id}`}
                >
                  <BookOpenTextIcon aria-hidden="true" className="size-3.5" />
                  Memories
                </Link>
                <Link
                  className="flex shrink-0 items-center justify-center gap-2 border border-white/10 px-3 py-2.5 text-[0.6rem] tracking-[0.1em] text-[#aeb6b5] uppercase hover:border-[#8ad9cb]/35 hover:text-[#c9ebe4] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                  href={`/dm/preview/${character.id}`}
                >
                  <EyeIcon aria-hidden="true" className="size-3.5" />
                  Preview
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
