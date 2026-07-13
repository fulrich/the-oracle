import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MemoryHand } from "@/components/memory-hand";
import { MemoryPage } from "@/components/memory-page";
import type { Memory, MemorySet } from "@/lib/memory";

vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn() }));

const titles = [
  "The Echo of the Forge",
  "The Warrior and the Smith",
  "Hymns and Iron",
  "Sparks in the Stone",
  "The Unforgiving Schematic",
  "The Uncalculated Variable",
] as const;

const testMemories: readonly Memory[] = titles.map((title, index) => ({
  id: `memory-${index + 1}`,
  chapter: `Fragment ${index + 1}`,
  title,
  revealed: "Recovered Jul 12, 2026",
  excerpt:
    index === 0
      ? "The heat was a living thing—biting, breathing, unrelenting."
      : `Excerpt for ${title}.`,
  body: [
    index === 0
      ? "The heat was a living thing—biting, breathing, unrelenting."
      : `Full text for ${title}.`,
  ],
  quote: "",
  artwork: "threshold",
  artworkAlt: `An abstract echo of ${title.toLowerCase()}`,
  visualState: "placeholder",
  tones: {
    night: "#0b1525",
    middle: "#244865",
    glow: "#96e3db",
    ember: "#f0bd73",
  },
}));

const memorySet: MemorySet = {
  playerName: "Kaelen Ironheart",
  playerInitials: "KI",
  playerSubtitle: "Player character",
  archiveNote: "The archive is quiet tonight",
  memories: testMemories,
};

function Home() {
  return <MemoryPage memorySet={memorySet} />;
}

describe("player memory viewer", () => {
  it("presents the recovered memories as an accessible hand", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: "Some things return in fragments.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /recovered memories/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /fragment \d+:/i }),
    ).toHaveLength(6);
  });

  it("supports a complete ten-memory hand", () => {
    const fullSet = Array.from({ length: 10 }, (_, index) => ({
      ...testMemories[index % testMemories.length],
      id: `full-set-memory-${index + 1}`,
      chapter: `Fragment ${index + 1}`,
      title: `Full set memory ${index + 1}`,
    }));

    render(<MemoryHand memories={fullSet} />);

    const hand = screen.getByRole("group", { name: /recovered memories/i });
    expect(within(hand).getAllByRole("button")).toHaveLength(10);
  });

  it("uses attached artwork in an opened memory", () => {
    const illustratedMemory = {
      ...testMemories[0],
      image: {
        src: "/test/forge.webp",
        cardSrc: "/test/forge-thumbnail.webp",
        alt: "A recovered forge scene.",
        width: 1200,
        height: 800,
      },
    };

    render(<MemoryHand memories={[illustratedMemory]} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: `${illustratedMemory.chapter}: ${illustratedMemory.title}`,
      }),
    );

    expect(
      within(screen.getByRole("dialog")).getByRole("img", {
        name: illustratedMemory.image.alt,
      }),
    ).toHaveAttribute("src", illustratedMemory.image.src);
  });

  it("sanitizes database Markdown before rendering a memory", () => {
    const markdownMemory = {
      ...testMemories[0],
      bodyMarkdown:
        "Safe **memory**.\n\n[unsafe link](javascript:alert('x'))\n\n<script>window.bad = true</script>",
    };

    render(<MemoryHand memories={[markdownMemory]} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: `${markdownMemory.chapter}: ${markdownMemory.title}`,
      }),
    );

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("memory")).toBeInTheDocument();
    expect(within(dialog).getByText("unsafe link")).not.toHaveAttribute("href");
    expect(dialog.querySelector("script")).toBeNull();
  });

  it("opens a selected card as a full memory", () => {
    render(<Home />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Fragment 1: The Echo of the Forge",
      }),
    );

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "The Echo of the Forge" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/The heat was a living thing/, {
        selector: "[data-slot='dialog-description']",
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Close memory" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("region", {
        name: "Full text of The Echo of the Forge",
      }),
    ).toBeInTheDocument();
  });

  it("supports moving through the hand with arrow keys", () => {
    render(<Home />);

    const firstMemory = screen.getByRole("button", {
      name: "Fragment 1: The Echo of the Forge",
    });
    const secondMemory = screen.getByRole("button", {
      name: "Fragment 2: The Warrior and the Smith",
    });

    fireEvent.focus(firstMemory);
    fireEvent.keyDown(firstMemory, { key: "ArrowRight" });

    expect(secondMemory).toHaveFocus();
  });

  it("keeps focus on the dialog navigation while changing memories", () => {
    render(<Home />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Fragment 1: The Echo of the Forge",
      }),
    );

    const dialog = screen.getByRole("dialog");
    const nextMemory = within(dialog).getByRole("button", {
      name: /next.*the warrior and the smith/i,
    });
    nextMemory.focus();
    fireEvent.click(nextMemory);

    expect(nextMemory).toHaveFocus();
    expect(
      within(dialog).getByRole("heading", {
        name: "The Warrior and the Smith",
      }),
    ).toBeInTheDocument();
  });
});
