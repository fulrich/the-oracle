"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  MoveHorizontalIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type UIEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { MemoryArtwork } from "@/components/memory-artwork";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Memory } from "@/lib/memory";

import styles from "./memory-hand.module.css";

const romanNumerals = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
] as const;

function getCardStyle(
  memories: readonly Memory[],
  index: number,
  activeIndex: number,
): CSSProperties {
  const center = (memories.length - 1) / 2;
  const relative = index - center;
  const distanceFromActive = Math.abs(index - activeIndex);
  const scanDirection =
    index === activeIndex ? 0 : index < activeIndex ? -1 : 1;

  return {
    "--arc": `${Math.pow(Math.abs(relative), 1.55) * 10}px`,
    "--card-accent": memories[index].tones.glow,
    "--card-z": memories.length - Math.round(Math.abs(relative)),
    "--relative": relative,
    "--rotation": `${relative * 4.1}deg`,
    "--scan-shift": `${scanDirection * Math.max(0, 28 - distanceFromActive * 5)}px`,
  } as CSSProperties;
}

export function MemoryHand({ memories }: { memories: readonly Memory[] }) {
  if (memories.length === 0) {
    throw new Error("The memory hand requires at least one memory.");
  }

  const initialMemoryIndex = Math.floor((memories.length - 1) / 2);
  const [activeIndex, setActiveIndex] = useState(initialMemoryIndex);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const handStageRef = useRef<HTMLDivElement | null>(null);
  const readerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const isMobile = window.matchMedia?.("(max-width: 767px)").matches;
    const initialCard = cardRefs.current[initialMemoryIndex];

    if (isMobile && typeof initialCard?.scrollIntoView === "function") {
      initialCard.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "center",
      });
    }
  }, [initialMemoryIndex]);

  const selectedMemory =
    memories[selectedIndex ?? activeIndex] ?? memories[initialMemoryIndex];

  function focusCard(index: number) {
    const boundedIndex = Math.min(memories.length - 1, Math.max(0, index));
    setActiveIndex(boundedIndex);
    cardRefs.current[boundedIndex]?.focus();
  }

  function handleCardKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCard(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCard(index + 1);
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusCard(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      focusCard(memories.length - 1);
    }
  }

  function handleCardPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType && event.pointerType !== "mouse") return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--tilt-x", `${horizontal * 7}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${vertical * -5}deg`);
  }

  function resetCardTilt(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  }

  function handleHandScroll(event: UIEvent<HTMLDivElement>) {
    const viewport = event.currentTarget;
    if (viewport.scrollWidth <= viewport.clientWidth) return;

    const viewportBounds = viewport.getBoundingClientRect();
    const viewportCenter = viewportBounds.left + viewportBounds.width / 2;
    let nearestIndex = activeIndex;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const cardBounds = card.getBoundingClientRect();
      const cardCenter = cardBounds.left + cardBounds.width / 2;
      const distance = Math.abs(cardCenter - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestIndex !== activeIndex) setActiveIndex(nearestIndex);
  }

  function openMemory(index: number) {
    setActiveIndex(index);
    setSelectedIndex(index);
  }

  function scrollBehavior(): ScrollBehavior {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
  }

  function beginReading() {
    readerRef.current?.focus({ preventScroll: true });
    readerRef.current?.scrollIntoView({
      behavior: scrollBehavior(),
      block: "start",
    });
  }

  function returnToCover() {
    detailScrollRef.current?.scrollTo({
      top: 0,
      behavior: scrollBehavior(),
    });
  }

  function moveToMemory(direction: -1 | 1) {
    if (selectedIndex === null) return;

    const nextIndex =
      (selectedIndex + direction + memories.length) % memories.length;
    setActiveIndex(nextIndex);
    setSelectedIndex(nextIndex);

    if (typeof detailScrollRef.current?.scrollTo === "function") {
      detailScrollRef.current.scrollTo({
        top: 0,
        behavior: scrollBehavior(),
      });
    }
  }

  return (
    <>
      <div
        className={styles.handStage}
        onScroll={handleHandScroll}
        ref={handStageRef}
      >
        <div
          aria-label="Recovered memories. Use the left and right arrow keys to move through the hand."
          className={styles.handRail}
          role="group"
        >
          {memories.map((memory, index) => (
            <button
              aria-haspopup="dialog"
              aria-label={`${memory.chapter}: ${memory.title}`}
              className={styles.handCard}
              data-active={activeIndex === index}
              key={memory.id}
              onClick={() => openMemory(index)}
              onFocus={() => setActiveIndex(index)}
              onKeyDown={(event) => handleCardKeyDown(event, index)}
              onPointerEnter={() => setActiveIndex(index)}
              onPointerLeave={resetCardTilt}
              onPointerMove={handleCardPointerMove}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              style={getCardStyle(memories, index, activeIndex)}
              type="button"
            >
              <span className={styles.cardSurface}>
                <span className={styles.cardArtwork}>
                  {memory.image ? (
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="object-cover"
                      fill
                      sizes="(min-width: 768px) 15vw, 12rem"
                      src={memory.image.cardSrc}
                      unoptimized
                    />
                  ) : (
                    <MemoryArtwork decorative memory={memory} />
                  )}
                </span>
                <span className={styles.cardVellum} />
                <span className={styles.cardTopline}>
                  <span>Recovered</span>
                  <span className={styles.cardIndex}>
                    {romanNumerals[index] ?? index + 1}
                  </span>
                </span>
                <span className={styles.cardCopy}>
                  <span className={styles.cardChapter}>{memory.chapter}</span>
                  <span className={styles.cardTitle}>{memory.title}</span>
                </span>
                <SparklesIcon
                  aria-hidden="true"
                  className={styles.cardRule}
                  strokeWidth={1.25}
                />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        Memory in focus: {memories[activeIndex].title}
      </div>

      <div className="mt-1 flex items-center justify-center gap-2 text-[0.64rem] tracking-[0.15em] text-[#aab0b5] uppercase md:hidden">
        <MoveHorizontalIcon aria-hidden="true" className="size-3.5" />
        Swipe to move through the hand
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setSelectedIndex(null);
        }}
        open={selectedIndex !== null}
      >
        <DialogContent
          aria-describedby={`memory-description-${selectedMemory.id}`}
          className={styles.detailPanel}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            cardRefs.current[activeIndex]?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") moveToMemory(-1);
            if (event.key === "ArrowRight") moveToMemory(1);
          }}
          overlayClassName="bg-[#020407]/80 duration-500 backdrop-blur-md"
          showCloseButton={false}
          style={
            {
              "--detail-wash": `${selectedMemory.tones.glow}18`,
            } as CSSProperties
          }
        >
          <div className={styles.detailScroll} ref={detailScrollRef}>
            <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-[#090d13]/78 px-4 backdrop-blur-xl sm:px-7">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-8 rotate-45 place-items-center border border-[#8ad9cb]/35 text-[#8ad9cb]"
                >
                  <span className="-rotate-45 text-xs">◇</span>
                </span>
                <span className="hidden text-[0.66rem] font-semibold tracking-[0.18em] text-[#d9d7cd] uppercase sm:inline">
                  The Forgotten Oracle
                </span>
              </div>

              <div
                className="flex items-center gap-1.5"
                aria-label="Memory position"
              >
                {memories.map((memory, index) => (
                  <span
                    aria-hidden="true"
                    className={`h-px transition-all ${
                      index === selectedIndex
                        ? "w-7 bg-[#b5e6dc]"
                        : "w-2 bg-white/20"
                    }`}
                    key={memory.id}
                  />
                ))}
                <span className="ml-2 font-mono text-[0.6rem] tracking-[0.12em] text-white/46 uppercase">
                  {String((selectedIndex ?? 0) + 1).padStart(2, "0")} /{" "}
                  {String(memories.length).padStart(2, "0")}
                </span>
              </div>

              <DialogClose asChild>
                <Button
                  aria-label="Close memory"
                  className="rounded-full border border-white/10 bg-white/4 text-white/70 hover:bg-white/10 hover:text-white"
                  size="icon"
                  variant="ghost"
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </DialogClose>
            </div>

            <article>
              <div className="grid min-h-[calc(100svh-5.5rem)] lg:grid-cols-[minmax(0,1.18fr)_minmax(27rem,0.82fr)]">
                <figure className={styles.detailHeroArtwork}>
                  {selectedMemory.image ? (
                    <Image
                      alt={selectedMemory.image.alt}
                      className="object-cover"
                      fill
                      sizes="(min-width: 1024px) 59vw, 100vw"
                      src={selectedMemory.image.src}
                      unoptimized
                    />
                  ) : (
                    <MemoryArtwork memory={selectedMemory} />
                  )}
                  <figcaption className="absolute right-6 bottom-6 left-6 z-10 flex items-end justify-between gap-6 text-[0.6rem] tracking-[0.16em] text-white/52 uppercase sm:right-9 sm:bottom-8 sm:left-9">
                    <span>
                      {selectedMemory.image
                        ? "Recovered impression"
                        : selectedMemory.visualState === "placeholder"
                          ? "Ambient memory study"
                          : "Recovered impression"}
                    </span>
                    <span>
                      {selectedMemory.image
                        ? "Image 01"
                        : selectedMemory.visualState === "placeholder"
                          ? "Image pending"
                          : "Image 01"}
                    </span>
                  </figcaption>
                </figure>

                <div className="relative flex flex-col justify-center px-6 py-14 sm:px-10 lg:px-12 xl:px-16">
                  <div
                    aria-hidden="true"
                    className="absolute top-10 right-8 font-serif text-[8rem] leading-none text-white/[0.025]"
                  >
                    {romanNumerals[selectedIndex ?? activeIndex] ??
                      (selectedIndex ?? activeIndex) + 1}
                  </div>
                  <div className="relative max-w-xl">
                    <div className="mb-7 flex items-center gap-3">
                      <EyeIcon
                        aria-hidden="true"
                        className="size-4"
                        color={selectedMemory.tones.glow}
                        strokeWidth={1.4}
                      />
                      <p
                        className="font-mono text-[0.62rem] font-semibold tracking-[0.2em] uppercase"
                        style={{ color: selectedMemory.tones.glow }}
                      >
                        {selectedMemory.chapter}
                      </p>
                      <span className="h-px w-10 bg-white/15" />
                      <p className="text-[0.62rem] tracking-[0.1em] text-white/55 uppercase">
                        {selectedMemory.revealed}
                      </p>
                    </div>

                    <DialogTitle className="font-heading max-w-lg text-5xl leading-[0.88] font-normal tracking-[-0.045em] text-[#f2eddf] sm:text-6xl xl:text-7xl">
                      {selectedMemory.title}
                    </DialogTitle>
                    <DialogDescription
                      className="mt-7 max-w-lg font-serif text-lg leading-7 text-[#b9b8b2] italic sm:text-xl sm:leading-8"
                      id={`memory-description-${selectedMemory.id}`}
                    >
                      {selectedMemory.excerpt}
                    </DialogDescription>

                    <Button
                      className="mt-9 h-auto gap-3 border border-white/10 bg-white/[0.025] px-5 py-3 text-[0.62rem] tracking-[0.14em] text-white/70 uppercase hover:bg-white/[0.06] hover:text-white"
                      onClick={beginReading}
                      variant="ghost"
                    >
                      Read the memory
                      <ArrowDownIcon aria-hidden="true" className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <section
                aria-labelledby={`memory-reader-${selectedMemory.id}`}
                className="border-t border-white/8 px-6 py-16 outline-none sm:px-10 lg:px-16 lg:py-24"
                ref={readerRef}
                tabIndex={-1}
              >
                <div className="mx-auto grid max-w-6xl items-start gap-14 lg:grid-cols-[16rem_minmax(0,44rem)] lg:justify-center lg:gap-20">
                  <aside className="hidden self-stretch lg:block">
                    <div className="sticky top-24">
                      <button
                        aria-label={`Return to the full artwork for ${selectedMemory.title}`}
                        className="group block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#090d13]"
                        onClick={returnToCover}
                        type="button"
                      >
                        <span className="relative block aspect-[3/2] overflow-hidden border border-white/10 bg-[#0a1018]">
                          {selectedMemory.image ? (
                            <Image
                              alt=""
                              aria-hidden="true"
                              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                              fill
                              sizes="16rem"
                              src={selectedMemory.image.cardSrc}
                              unoptimized
                            />
                          ) : (
                            <MemoryArtwork decorative memory={selectedMemory} />
                          )}
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-10 pb-3 text-[0.56rem] tracking-[0.13em] text-white/65 uppercase">
                            View full artwork
                          </span>
                        </span>
                      </button>

                      <p
                        className="mt-5 font-mono text-[0.58rem] font-semibold tracking-[0.18em] uppercase"
                        style={{ color: selectedMemory.tones.glow }}
                      >
                        {selectedMemory.chapter}
                      </p>
                      <p className="font-heading mt-2 text-2xl leading-tight tracking-[-0.025em] text-[#dfd9cc]">
                        {selectedMemory.title}
                      </p>
                      <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4 font-mono text-[0.55rem] tracking-[0.12em] text-white/55 uppercase">
                        <span>Recovered</span>
                        <span>
                          {String((selectedIndex ?? 0) + 1).padStart(2, "0")} /{" "}
                          {String(memories.length).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </aside>

                  <div className="max-w-3xl">
                    <p
                      className="font-mono text-[0.62rem] font-semibold tracking-[0.2em] uppercase"
                      style={{ color: selectedMemory.tones.glow }}
                    >
                      Recovered memory
                    </p>
                    <h2
                      className="sr-only"
                      id={`memory-reader-${selectedMemory.id}`}
                    >
                      Full text of {selectedMemory.title}
                    </h2>
                    <div className="mt-7 h-px w-16 bg-white/12" />

                    <p className="mt-10 font-serif text-xl leading-8 text-[#d0ccc2] italic">
                      {selectedMemory.excerpt}
                    </p>

                    <div className="mt-7 space-y-6 text-base leading-8 text-[#b9bab5] sm:text-[1.05rem] sm:leading-8 [&_a]:text-[#a9dcd3] [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l [&_blockquote]:border-white/15 [&_blockquote]:pl-5 [&_blockquote]:italic [&_li]:ml-5 [&_li]:list-disc">
                      {selectedMemory.bodyMarkdown ? (
                        <ReactMarkdown
                          rehypePlugins={[rehypeSanitize]}
                          remarkPlugins={[remarkGfm]}
                        >
                          {selectedMemory.bodyMarkdown}
                        </ReactMarkdown>
                      ) : (
                        selectedMemory.body.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))
                      )}
                    </div>

                    <div className="mt-14 flex items-center gap-2 border-t border-white/8 pt-6 text-[0.62rem] tracking-[0.14em] text-white/55 uppercase">
                      <SparklesIcon aria-hidden="true" className="size-3.5" />
                      Memory complete
                    </div>
                  </div>
                </div>
              </section>

              <footer className="border-t border-white/8 px-4 py-6 sm:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                  <Button
                    className="h-auto min-w-0 justify-start gap-3 px-2 py-3 text-left text-white/65 hover:bg-white/5 hover:text-white sm:px-4"
                    onClick={() => moveToMemory(-1)}
                    variant="ghost"
                  >
                    <ArrowLeftIcon aria-hidden="true" className="size-4" />
                    <span className="min-w-0">
                      <span className="block text-[0.55rem] tracking-[0.12em] uppercase opacity-55">
                        Previous
                      </span>
                      <span className="hidden max-w-48 truncate font-serif text-sm sm:block">
                        {
                          memories[
                            ((selectedIndex ?? 0) - 1 + memories.length) %
                              memories.length
                          ].title
                        }
                      </span>
                    </span>
                  </Button>

                  <DialogClose asChild>
                    <Button
                      className="border-white/12 bg-transparent px-5 text-[0.62rem] tracking-[0.13em] text-white/66 uppercase hover:bg-white/5"
                      variant="outline"
                    >
                      Return to the hand
                    </Button>
                  </DialogClose>

                  <Button
                    className="h-auto min-w-0 justify-end gap-3 px-2 py-3 text-right text-white/65 hover:bg-white/5 hover:text-white sm:px-4"
                    onClick={() => moveToMemory(1)}
                    variant="ghost"
                  >
                    <span className="min-w-0">
                      <span className="block text-[0.55rem] tracking-[0.12em] uppercase opacity-55">
                        Next
                      </span>
                      <span className="hidden max-w-48 truncate font-serif text-sm sm:block">
                        {
                          memories[((selectedIndex ?? 0) + 1) % memories.length]
                            .title
                        }
                      </span>
                    </span>
                    <ArrowRightIcon aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </footer>
            </article>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
