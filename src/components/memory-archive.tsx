"use client";

import { EyeIcon, LogOutIcon, SparklesIcon } from "lucide-react";

import { signOut } from "@/app/auth/actions";
import { MemoryHand } from "@/components/memory-hand";
import type { MemorySet } from "@/lib/memory";

export function MemoryArchive({ memorySet }: { memorySet: MemorySet }) {
  return (
    <main className="memory-shell relative isolate min-h-svh overflow-x-hidden overscroll-y-none text-[#e8e4d9]">
      <div className="memory-aurora" aria-hidden="true" />
      <header className="relative z-20 mx-auto flex h-[4.75rem] w-full max-w-[94rem] items-center justify-between border-b border-white/8 px-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className="grid size-9 rotate-45 place-items-center border border-[#8ad9cb]/38 bg-[#8ad9cb]/[0.035] text-[#8ad9cb] shadow-[0_0_2rem_rgba(107,213,194,0.08)]"
          >
            <span className="-rotate-45 text-sm">◇</span>
          </span>
          <p className="text-[0.7rem] font-semibold tracking-[0.19em] text-[#e8e4d9] uppercase">
            The Forgotten Oracle
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-[0.64rem] font-medium tracking-[0.12em] text-[#c8c8c1] uppercase">
              {memorySet.playerName}
            </p>
            <p className="mt-0.5 text-[0.56rem] tracking-[0.08em] text-[#697279] uppercase">
              {memorySet.playerSubtitle}
            </p>
          </div>
          <span className="grid size-9 place-items-center rounded-full border border-[#c6a979]/25 bg-[radial-gradient(circle_at_36%_28%,#6c695d,#292d31_54%,#101419)] font-serif text-xs text-[#ede5d0] shadow-[0_0_1.5rem_rgba(198,169,121,0.08)]">
            {memorySet.playerInitials}
          </span>
          <form action={signOut}>
            <button
              aria-label="Sign out"
              className="grid size-9 place-items-center text-[#697279] transition hover:text-[#c8ebe4] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
              title="Sign out"
              type="submit"
            >
              <LogOutIcon aria-hidden="true" className="size-3.5" />
            </button>
          </form>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-[94rem] px-5 pt-10 sm:px-8 sm:pt-14 lg:px-12 lg:pt-16">
        <div className="max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            <EyeIcon
              aria-hidden="true"
              className="size-4 text-[#8ad9cb]"
              strokeWidth={1.35}
            />
            <p className="font-mono text-[0.62rem] font-semibold tracking-[0.23em] text-[#8ad9cb] uppercase">
              Your memories
            </p>
            <span className="h-px w-12 bg-[#8ad9cb]/24" />
          </div>
          <h1 className="font-heading max-w-3xl text-5xl leading-[0.88] font-normal tracking-[-0.052em] text-balance text-[#f0eadc] sm:text-6xl lg:text-7xl xl:text-[5.1rem]">
            Some things return in <em className="text-[#b6dbd4]">fragments.</em>
          </h1>
        </div>

        <div className="mt-6 sm:mt-4">
          {memorySet.memories.length > 0 ? (
            <MemoryHand
              key={memorySet.playerName}
              memories={memorySet.memories}
            />
          ) : (
            <div className="mx-auto mt-16 max-w-xl border-y border-white/8 px-6 py-12 text-center">
              <SparklesIcon
                aria-hidden="true"
                className="mx-auto size-5 text-[#8ad9cb]/65"
              />
              <h2 className="font-heading mt-4 text-3xl tracking-[-0.03em] text-[#ded9cc]">
                No memories yet
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#737c81]">
                When a memory becomes available to this character, it will
                appear here.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
