"use client";

import Image from "next/image";
import { Maximize2Icon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DmImageLightbox({
  src,
  alt,
  sizes,
  className = "",
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger aria-label={`View ${alt} fullscreen`} asChild>
        <button
          className={`group relative block h-full w-full overflow-hidden text-left focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e14] focus-visible:outline-none ${className}`}
          type="button"
        >
          <Image
            alt={alt}
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            fill
            sizes={sizes}
            src={src}
            unoptimized
          />
          <span className="absolute right-2 bottom-2 grid size-7 place-items-center bg-[#090d13]/75 text-[#e4e1d8] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            <Maximize2Icon aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Open fullscreen</span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="flex h-[min(92svh,900px)] w-[min(96vw,1400px)] max-w-none flex-col border border-white/15 bg-[#080b11]/98 p-4 shadow-2xl shadow-black/60 sm:p-6"
        overlayClassName="bg-black/80 supports-backdrop-filter:backdrop-blur-sm"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogDescription className="sr-only">
          Full-size view of {alt}. Close the dialog to return to the library.
        </DialogDescription>
        <div className="relative min-h-0 flex-1">
          <Image
            alt={alt}
            className="object-contain"
            fill
            sizes="96vw"
            src={src}
            unoptimized
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
