import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, EyeIcon } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { MemoryPage } from "@/components/memory-page";
import { getAuthState } from "@/lib/auth";
import { loadDmCharacterPreview } from "@/lib/dm.server";

export const metadata: Metadata = {
  title: "Preview character",
};

export default async function DmCharacterPreviewPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
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

  const preview = await loadDmCharacterPreview(characterId.data);
  if (!preview) {
    notFound();
  }

  return (
    <>
      <div className="fixed top-20 left-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 border border-[#8ad9cb]/20 bg-[#090d13]/94 px-3 py-2 text-[0.6rem] tracking-[0.1em] text-[#aeb8b6] uppercase shadow-xl backdrop-blur sm:left-8">
        <EyeIcon aria-hidden="true" className="size-3.5 text-[#8ad9cb]" />
        <span className="truncate">
          Previewing {preview.memorySet.playerName}
        </span>
        <span className="h-3 w-px bg-white/12" />
        <Link
          className="flex shrink-0 items-center gap-1.5 text-[#8ad9cb] hover:text-[#c6eee6] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
          href="/dm"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-3" />
          Exit preview
        </Link>
      </div>
      <MemoryPage memorySet={preview.memorySet} />
    </>
  );
}
