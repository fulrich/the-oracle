export type MemoryArtworkKind =
  "threshold" | "cavern" | "orchard" | "portrait" | "wind" | "lantern";

export type MemoryImage = {
  src: string;
  cardSrc: string;
  alt: string;
  width: number;
  height: number;
  purpose: "hero" | "card" | "attachment";
};

export type Memory = {
  id: string;
  chapter: string;
  title: string;
  excerpt: string;
  body: readonly string[];
  bodyMarkdown?: string;
  quote: string;
  artwork: MemoryArtworkKind;
  artworkAlt: string;
  visualState?: "artwork" | "placeholder";
  image?: MemoryImage;
  images?: readonly MemoryImage[];
  tones: {
    night: string;
    middle: string;
    glow: string;
    ember: string;
  };
};

export type MemorySet = {
  playerName: string;
  playerInitials: string;
  playerSubtitle: string;
  memories: readonly Memory[];
};
