"use client";

import Image from "next/image";
import { ImagePlusIcon } from "lucide-react";

import { attachMediaToMemory } from "@/app/dm/media-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DmMediaAsset } from "@/lib/dm-media.server";

const purposeLabels = {
  hero: "Primary artwork",
  card: "Card crop",
  attachment: "Supporting image",
} as const;

export function DmMemoryArtworkPicker({
  characterId,
  memoryId,
  available,
  attachedCount,
}: {
  characterId: string;
  memoryId: string;
  available: DmMediaAsset[];
  attachedCount: number;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="flex items-center justify-center gap-2 border border-[#8ad9cb]/25 bg-[#8ad9cb]/7 px-3 py-2 text-[0.58rem] tracking-[0.1em] text-[#c7e6e0] uppercase hover:border-[#8ad9cb]/45 hover:bg-[#8ad9cb]/10 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={available.length === 0}
          type="button"
        >
          <ImagePlusIcon aria-hidden="true" className="size-3.5" />
          {available.length ? "Attach artwork" : "No unattached artwork"}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] max-w-5xl overflow-y-auto border border-white/15 bg-[#0b0e14] p-5 sm:p-7">
        <DialogTitle className="text-xl font-semibold text-[#e8e4da]">
          Attach artwork
        </DialogTitle>
        <DialogDescription className="max-w-2xl text-sm leading-6 text-[#858d91]">
          Select an image from this character&apos;s library. Choose its role
          and display order before attaching it to the memory.
        </DialogDescription>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((asset, index) => (
            <article
              className="border border-white/10 bg-[#0e1219] p-2.5"
              key={asset.id}
            >
              <div className="relative aspect-[5/4] overflow-hidden border border-white/8 bg-[#090d13]">
                <Image
                  alt={asset.file_name}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 18rem, (min-width: 640px) 40vw, 90vw"
                  src={asset.previewUrl}
                  unoptimized
                />
              </div>
              <p
                className="mt-2 truncate text-sm text-[#d5d8d1]"
                title={asset.file_name}
              >
                {asset.file_name}
              </p>
              <p className="mt-1 font-mono text-[0.52rem] tracking-[0.09em] text-[#6f797d] uppercase">
                {asset.folder}
              </p>
              <form action={attachMediaToMemory} className="mt-3 grid gap-2">
                <input name="characterId" type="hidden" value={characterId} />
                <input name="memoryId" type="hidden" value={memoryId} />
                <input name="assetId" type="hidden" value={asset.id} />
                <label className="grid gap-1 text-[0.52rem] tracking-[0.08em] text-[#7f898d] uppercase">
                  Role
                  <select
                    className="border border-white/10 bg-[#0b0e14] px-2.5 py-2 text-xs tracking-normal text-[#d9dbd5] normal-case focus:border-[#8ad9cb]/45 focus:outline-none"
                    defaultValue="attachment"
                    name="purpose"
                  >
                    <option value="hero">{purposeLabels.hero}</option>
                    <option value="card">{purposeLabels.card}</option>
                    <option value="attachment">
                      {purposeLabels.attachment}
                    </option>
                  </select>
                </label>
                <label className="grid gap-1 text-[0.52rem] tracking-[0.08em] text-[#7f898d] uppercase">
                  Order
                  <input
                    className="border border-white/10 bg-[#0b0e14] px-2.5 py-2 text-xs text-[#d9dbd5] focus:border-[#8ad9cb]/45 focus:outline-none"
                    defaultValue={attachedCount + index}
                    min="0"
                    name="sortOrder"
                    type="number"
                  />
                </label>
                <button
                  className="mt-1 border border-[#8ad9cb]/25 bg-[#8ad9cb]/7 px-3 py-2.5 text-[0.58rem] tracking-[0.1em] text-[#c7e6e0] uppercase hover:border-[#8ad9cb]/45 hover:bg-[#8ad9cb]/10 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                  type="submit"
                >
                  Attach image
                </button>
              </form>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
