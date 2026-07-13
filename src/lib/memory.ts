export type MemoryArtworkKind =
  "threshold" | "cavern" | "orchard" | "portrait" | "wind" | "lantern";

export type Memory = {
  id: string;
  chapter: string;
  title: string;
  revealed: string;
  excerpt: string;
  body: readonly string[];
  bodyMarkdown?: string;
  quote: string;
  artwork: MemoryArtworkKind;
  artworkAlt: string;
  visualState?: "artwork" | "placeholder";
  image?: {
    src: string;
    cardSrc: string;
    alt: string;
    width: number;
    height: number;
  };
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
  archiveNote: string;
  memories: readonly Memory[];
};
