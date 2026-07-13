import { useId } from "react";

import type { Memory } from "@/lib/memory";
import { cn } from "@/lib/utils";

type MemoryArtworkProps = {
  memory: Memory;
  alt?: string;
  className?: string;
  crop?: "wide" | "left" | "right";
  decorative?: boolean;
};

const cropViewBoxes = {
  wide: "0 0 800 1000",
  left: "40 210 470 470",
  right: "300 100 450 450",
} as const;

function Stars({ color }: { color: string }) {
  return (
    <g fill={color} opacity="0.72">
      <circle cx="92" cy="122" r="2" />
      <circle cx="164" cy="214" r="1.5" />
      <circle cx="247" cy="92" r="2.5" />
      <circle cx="351" cy="174" r="1.5" />
      <circle cx="457" cy="84" r="2" />
      <circle cx="582" cy="187" r="2.5" />
      <circle cx="687" cy="118" r="1.5" />
      <circle cx="735" cy="263" r="2" />
    </g>
  );
}

function ThresholdArtwork({ memory }: { memory: Memory }) {
  return (
    <>
      <Stars color={memory.tones.glow} />
      <circle
        cx="612"
        cy="214"
        r="104"
        fill={memory.tones.glow}
        opacity="0.12"
      />
      <path
        d="M0 610 118 438 216 566 351 360 501 577 620 414 800 598V1000H0Z"
        fill="#07101b"
        opacity="0.86"
      />
      <path
        d="M0 700 142 552 272 642 408 498 573 642 708 516 800 600V1000H0Z"
        fill={memory.tones.middle}
        opacity="0.54"
      />
      <g stroke={memory.tones.glow} strokeLinecap="round" opacity="0.24">
        <path d="m74 250-82 235" />
        <path d="m178 182-95 274" />
        <path d="m286 164-104 300" />
        <path d="m412 120-122 352" />
        <path d="m535 146-115 332" />
        <path d="m664 162-110 319" />
        <path d="m782 182-102 295" />
      </g>
      <path
        d="M235 1000c76-178 138-298 178-360 20-31 37-48 51-53 11-4 26 0 45 11 25 15 62 55 111 121 39 53 83 147 132 281Z"
        fill={memory.tones.ember}
        opacity="0.08"
      />
      <g transform="translate(330 448)">
        <rect
          x="0"
          y="0"
          width="170"
          height="296"
          rx="4"
          fill="#050b12"
          stroke={memory.tones.ember}
          strokeWidth="5"
        />
        <rect
          x="15"
          y="16"
          width="140"
          height="264"
          fill={memory.tones.middle}
          stroke={memory.tones.glow}
          strokeOpacity="0.4"
          strokeWidth="2"
        />
        <path
          d="M84 17v263M15 142h140"
          stroke={memory.tones.glow}
          strokeOpacity="0.18"
        />
        <circle cx="128" cy="158" r="5" fill={memory.tones.ember} />
        <path
          d="M14 280h142l62 178H-54Z"
          fill={memory.tones.ember}
          opacity="0.13"
        />
      </g>
    </>
  );
}

function CavernArtwork({ memory }: { memory: Memory }) {
  return (
    <>
      <Stars color={memory.tones.glow} />
      {[0, 1, 2, 3].map((ring) => (
        <path
          key={ring}
          d={`M${84 + ring * 58} 1000V${430 - ring * 28}C${84 + ring * 58} ${170 + ring * 24} ${716 - ring * 58} ${170 + ring * 24} ${716 - ring * 58} ${430 - ring * 28}V1000`}
          fill="none"
          stroke={ring % 2 === 0 ? memory.tones.glow : memory.tones.ember}
          strokeOpacity={0.2 + ring * 0.07}
          strokeWidth={18 - ring * 3}
        />
      ))}
      <path
        d="M0 680c126-52 214-51 299 2 95 60 190 63 286 6 77-45 149-51 215-18v330H0Z"
        fill="#090b18"
      />
      <path
        d="M75 741c134-44 232-36 307 25 77 63 190 70 343 22"
        fill="none"
        stroke={memory.tones.glow}
        strokeOpacity="0.22"
        strokeWidth="3"
      />
      <g transform="translate(390 648)">
        <circle cx="10" cy="0" r="17" fill={memory.tones.ember} />
        <path
          d="M-11 114 0 30h22l13 84Z"
          fill="#05060b"
          stroke={memory.tones.ember}
          strokeOpacity="0.55"
        />
      </g>
      <path
        d="M148 625c114-48 211-38 290 30 92 79 183 73 273-18"
        fill="none"
        stroke={memory.tones.glow}
        strokeDasharray="4 18"
        strokeLinecap="round"
        strokeWidth="5"
      />
    </>
  );
}

function OrchardArtwork({ memory }: { memory: Memory }) {
  const trees = [94, 224, 360, 518, 680];

  return (
    <>
      <circle
        cx="398"
        cy="266"
        r="155"
        fill={memory.tones.glow}
        opacity="0.09"
      />
      <Stars color={memory.tones.glow} />
      <path
        d="M0 713c207-60 362-70 522-28 98 26 191 29 278 8v307H0Z"
        fill="#081217"
      />
      {trees.map((x, index) => {
        const central = index === 2;
        const canopy = central ? "#071013" : memory.tones.glow;
        return (
          <g key={x} transform={`translate(${x} ${central ? 278 : 350})`}>
            <path
              d={central ? "M0 434 25 81 53 434Z" : "M0 360 20 98 43 360Z"}
              fill={central ? "#050a0c" : memory.tones.middle}
              stroke={central ? memory.tones.ember : memory.tones.glow}
              strokeOpacity={central ? 0.52 : 0.25}
              strokeWidth="3"
            />
            <path
              d={
                central
                  ? "m26 188-87-31 63-46-60-58 84 5L54-34l25 92 86-7-65 61 63 53-84 23-27 91Z"
                  : "m20 123-59-23 45-36-39-43 54 7 21-62 16 62 56-7-42 43 45 36-59 23-17 63Z"
              }
              fill={canopy}
              opacity={central ? 1 : 0.62}
              stroke={central ? memory.tones.ember : memory.tones.glow}
              strokeOpacity="0.6"
              strokeWidth="3"
            />
          </g>
        );
      })}
      <path
        d="M0 837c180-81 321-109 423-84 101 25 227 16 377-29"
        fill="none"
        stroke={memory.tones.glow}
        strokeOpacity="0.17"
        strokeWidth="3"
      />
    </>
  );
}

function PortraitArtwork({ memory }: { memory: Memory }) {
  return (
    <>
      <Stars color={memory.tones.glow} />
      <circle
        cx="437"
        cy="333"
        r="219"
        fill={memory.tones.glow}
        opacity="0.12"
      />
      <circle
        cx="501"
        cy="298"
        r="189"
        fill={memory.tones.night}
        opacity="0.92"
      />
      <path
        d="M91 1000c30-205 113-338 250-399-26-41-35-91-25-150 17-99 87-165 177-153 92 12 126 99 97 176-17 45-49 81-97 110 121 72 196 211 224 416Z"
        fill="#080912"
      />
      <path
        d="M338 417c85-91 203-87 278 6-36-176-222-198-278-6Z"
        fill={memory.tones.middle}
        opacity="0.73"
      />
      <path
        d="M276 691c111-84 251-92 391-6M230 753c155-79 320-76 493 8M196 821c200-73 385-58 556 31"
        fill="none"
        stroke={memory.tones.glow}
        strokeOpacity="0.16"
        strokeWidth="3"
      />
      <circle cx="529" cy="478" r="5" fill={memory.tones.ember} />
    </>
  );
}

function WindArtwork({ memory }: { memory: Memory }) {
  return (
    <>
      <Stars color={memory.tones.glow} />
      <circle
        cx="178"
        cy="222"
        r="121"
        fill={memory.tones.ember}
        opacity="0.12"
      />
      <path
        d="M0 664 179 403 291 553 424 310 558 525 666 388 800 587v413H0Z"
        fill="#101820"
      />
      <path
        d="m179 403 36 148 76 2M424 310l48 183 86 32M666 388l31 138 103 61"
        fill="none"
        stroke={memory.tones.glow}
        strokeOpacity="0.48"
        strokeWidth="7"
      />
      <path
        d="M0 761c142-62 267-52 376 29 129 95 270 94 424-4v214H0Z"
        fill={memory.tones.middle}
        opacity="0.52"
      />
      <g
        fill="none"
        stroke={memory.tones.ember}
        strokeLinecap="round"
        strokeWidth="4"
      >
        <path
          d="M52 634c144-39 270-15 377 72 98 81 211 99 339 55"
          opacity="0.45"
        />
        <path
          d="M-20 546c126-51 226-47 300 12 86 68 187 78 303 29"
          opacity="0.28"
        />
        <path
          d="M146 471c88-34 160-27 218 21 67 55 145 59 234 12"
          opacity="0.2"
        />
      </g>
      <g fill={memory.tones.ember} opacity="0.7">
        <circle cx="251" cy="526" r="4" />
        <circle cx="381" cy="613" r="3" />
        <circle cx="498" cy="551" r="5" />
        <circle cx="632" cy="669" r="3" />
      </g>
    </>
  );
}

function LanternArtwork({ memory }: { memory: Memory }) {
  return (
    <>
      <Stars color={memory.tones.glow} />
      <circle
        cx="405"
        cy="484"
        r="210"
        fill={memory.tones.ember}
        opacity="0.11"
      />
      {[36, 135, 647, 742].map((x, index) => (
        <g key={x} transform={`translate(${x} ${180 + (index % 2) * 70})`}>
          <path
            d="M0 820 22 100 58 820Z"
            fill="#050b0c"
            stroke={memory.tones.glow}
            strokeOpacity="0.1"
          />
          <path
            d="m26 95-91 170 76-31-93 155 101-38-62 135 77-33 68 33-58-134 96 37-91-155 75 31Z"
            fill="#07100f"
          />
        </g>
      ))}
      <path
        d="M0 795c150-40 266-43 349-9 116 47 266 48 451 2v212H0Z"
        fill="#070d0d"
      />
      <g transform="translate(326 366)">
        <path
          d="M47 85c0-50 25-74 72-74s72 24 72 74"
          fill="none"
          stroke={memory.tones.ember}
          strokeWidth="11"
        />
        <path
          d="M35 100h166l-18 238H54Z"
          fill="#101a17"
          stroke={memory.tones.ember}
          strokeWidth="8"
        />
        <path
          d="M65 131h106l-12 169H78Z"
          fill={memory.tones.ember}
          opacity="0.86"
        />
        <path d="m118 151 25 64-25 68-25-68Z" fill="#fff4cf" opacity="0.82" />
        <path
          d="M28 339h181M62 373h113"
          stroke={memory.tones.ember}
          strokeWidth="10"
        />
      </g>
      <path
        d="M398 665c-77 107-131 219-163 335h337c-35-130-89-241-174-335Z"
        fill={memory.tones.ember}
        opacity="0.08"
      />
    </>
  );
}

function PlaceholderArtwork({ memory }: { memory: Memory }) {
  return (
    <>
      <Stars color={memory.tones.glow} />
      <circle
        cx="400"
        cy="380"
        r="228"
        fill="none"
        stroke={memory.tones.glow}
        strokeDasharray="3 18"
        strokeOpacity="0.24"
        strokeWidth="3"
      />
      <circle
        cx="400"
        cy="380"
        r="158"
        fill={memory.tones.glow}
        opacity="0.06"
        stroke={memory.tones.ember}
        strokeOpacity="0.24"
        strokeWidth="2"
      />
      <g fill="none" stroke={memory.tones.glow} strokeOpacity="0.13">
        <path d="M80 188h640M80 286h640M80 474h640M80 572h640" />
        <path d="M207 88v650M305 88v650M495 88v650M593 88v650" />
      </g>
      <path
        d="m400 210 117 170-117 170-117-170Z"
        fill={memory.tones.night}
        stroke={memory.tones.ember}
        strokeOpacity="0.65"
        strokeWidth="4"
      />
      <path
        d="m400 281 68 99-68 99-68-99Z"
        fill={memory.tones.middle}
        opacity="0.72"
        stroke={memory.tones.glow}
        strokeOpacity="0.6"
        strokeWidth="3"
      />
      <circle cx="400" cy="380" r="9" fill={memory.tones.ember} />
      <path
        d="M96 796c122-71 235-92 338-62 98 29 188 18 270-32"
        fill="none"
        stroke={memory.tones.glow}
        strokeDasharray="2 14"
        strokeLinecap="round"
        strokeOpacity="0.28"
        strokeWidth="4"
      />
      <path
        d="M180 1000c48-132 104-229 167-290h106c64 61 120 158 167 290Z"
        fill={memory.tones.ember}
        opacity="0.035"
      />
    </>
  );
}

export function MemoryArtwork({
  memory,
  alt,
  className,
  crop = "wide",
  decorative = false,
}: MemoryArtworkProps) {
  const rawId = useId();
  const gradientId = `memory-gradient-${rawId.replaceAll(":", "")}`;
  const textureId = `memory-texture-${rawId.replaceAll(":", "")}`;

  return (
    <svg
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : (alt ?? memory.artworkAlt)}
      className={cn("block size-full", className)}
      preserveAspectRatio="xMidYMid slice"
      role={decorative ? undefined : "img"}
      viewBox={cropViewBoxes[crop]}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={memory.tones.night} />
          <stop offset="0.55" stopColor={memory.tones.middle} />
          <stop offset="1" stopColor={memory.tones.night} />
        </linearGradient>
        <filter id={textureId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            baseFrequency="0.72"
            numOctaves="3"
            result="noise"
            seed="7"
            type="fractalNoise"
          />
          <feColorMatrix in="noise" type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.09" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="800" height="1000" fill={`url(#${gradientId})`} />
      {memory.visualState === "placeholder" ? (
        <PlaceholderArtwork memory={memory} />
      ) : (
        <>
          {memory.artwork === "threshold" && (
            <ThresholdArtwork memory={memory} />
          )}
          {memory.artwork === "cavern" && <CavernArtwork memory={memory} />}
          {memory.artwork === "orchard" && <OrchardArtwork memory={memory} />}
          {memory.artwork === "portrait" && <PortraitArtwork memory={memory} />}
          {memory.artwork === "wind" && <WindArtwork memory={memory} />}
          {memory.artwork === "lantern" && <LanternArtwork memory={memory} />}
        </>
      )}
      <rect
        width="800"
        height="1000"
        fill="#ffffff"
        filter={`url(#${textureId})`}
        opacity="0.55"
      />
      <rect
        x="18"
        y="18"
        width="764"
        height="964"
        fill="none"
        stroke={memory.tones.glow}
        strokeOpacity="0.13"
        strokeWidth="2"
      />
    </svg>
  );
}
