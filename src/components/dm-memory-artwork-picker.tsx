"use client";

import Image from "next/image";
import { ImagePlusIcon } from "lucide-react";

import { attachMediaToMemory } from "@/app/dm/media-actions";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DmMediaAsset } from "@/lib/dm-media.server";

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
      <DialogContent className="max-h-[90svh] w-[min(94vw,1100px)] max-w-none overflow-y-auto border border-white/15 bg-[#0b0e14] p-4 sm:max-w-5xl sm:p-6">
        <DialogTitle className="text-xl font-semibold text-[#e8e4da]">
          Attach artwork
        </DialogTitle>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {available.map((asset, index) => (
            <article
              className="min-w-0 border border-white/10 bg-[#0e1219] p-2"
              key={asset.id}
            >
              <div className="relative aspect-[4/3] overflow-hidden border border-white/8 bg-[#090d13]">
                <Image
                  alt={asset.file_name}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 15rem, (min-width: 640px) 28vw, 45vw"
                  src={asset.previewUrl}
                  unoptimized
                />
              </div>
              <p
                className="mt-2 truncate text-xs text-[#d5d8d1]"
                title={asset.file_name}
              >
                {asset.file_name}
              </p>
              <form action={attachMediaToMemory} className="mt-2">
                <input name="characterId" type="hidden" value={characterId} />
                <input name="memoryId" type="hidden" value={memoryId} />
                <input name="assetId" type="hidden" value={asset.id} />
                <input name="purpose" type="hidden" value="attachment" />
                <input
                  name="sortOrder"
                  type="hidden"
                  value={attachedCount + index}
                />
                <button
                  className="w-full border border-[#8ad9cb]/25 bg-[#8ad9cb]/7 px-2 py-2 text-[0.56rem] tracking-[0.08em] text-[#c7e6e0] uppercase hover:border-[#8ad9cb]/45 hover:bg-[#8ad9cb]/10 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                  type="submit"
                >
                  Attach
                </button>
              </form>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
