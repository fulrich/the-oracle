import type { Metadata } from "next";
import { UserRoundXIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { MemoryPage } from "@/components/memory-page";
import { getAuthState } from "@/lib/auth";
import { loadPlayerMemoryArchive } from "@/lib/memory-archive.server";

export const metadata: Metadata = {
  title: "Memories",
  description: "Your memories from the Forgotten Shadows campaign.",
};

function MissingCharacterAssignment() {
  return (
    <main className="oracle-shell relative isolate grid min-h-svh place-items-center overflow-hidden px-5 py-12">
      <div className="oracle-glow" aria-hidden="true" />
      <section className="relative w-full max-w-lg border border-white/10 bg-[#0b0f17]/88 px-8 py-10 text-center shadow-[0_2rem_8rem_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-12">
        <UserRoundXIcon
          aria-hidden="true"
          className="mx-auto size-8 text-[#c6a979]"
          strokeWidth={1.35}
        />
        <p className="mt-5 font-mono text-[0.6rem] tracking-[0.18em] text-[#c6a979] uppercase">
          Assignment required
        </p>
        <h1 className="font-heading mt-4 text-5xl leading-none tracking-[-0.04em] text-[#ebe5d8]">
          No character assigned
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-[#8c9498]">
          Your account is approved, but it has not yet been connected to one of
          the campaign&apos;s characters. Ask your Dungeon Master to complete
          the assignment.
        </p>
        <form action={signOut} className="mt-8">
          <button
            className="border border-white/12 px-5 py-3 text-xs tracking-[0.14em] text-[#c9ccca] uppercase hover:border-white/22 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}

export default async function Home() {
  const authState = await getAuthState();
  if (authState.status === "anonymous") {
    redirect("/sign-in");
  }
  if (authState.status === "denied") {
    redirect("/access-denied");
  }
  if (authState.viewer.role === "admin") {
    redirect("/dm");
  }

  const archive = await loadPlayerMemoryArchive(authState.viewer);
  if (archive.status === "unassigned") {
    return <MissingCharacterAssignment />;
  }

  return <MemoryPage memorySet={archive.memorySet} />;
}
