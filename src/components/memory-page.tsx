import { MemoryArchive } from "@/components/memory-archive";
import type { MemorySet } from "@/lib/memory";

export function MemoryPage({ memorySet }: { memorySet: MemorySet }) {
  return <MemoryArchive memorySet={memorySet} />;
}
