"use client";

import { ALBUMS } from "@/data/mockData";
import { useUIStore } from "@/store/uiStore";
import { AlbumCard } from "@/components/ui/AlbumCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

// ─── Shuffle Icon ─────────────────────────────────────────────────────────────

function ShuffleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Shuffle album selection"
      className={[
        // Touch target
        "touch-target flex items-center gap-1.5",
        "px-2.5 py-1",
        // Appearance
        "rounded-xl",
        "bg-swara-card border border-swara-border",
        "text-swara-text-2",
        "text-[0.7rem] font-medium",
        // Interaction
        "transition-all duration-150",
        "hover:border-swara-border-light hover:text-swara-text-1",
        "active:scale-95",
      ].join(" ")}
    >
      {/* Refresh / dice icon */}
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="1 4 1 10 7 10" stroke="currentColor" strokeWidth="2" />
        <path
          d="M3.51 15a9 9 0 1 0 .49-3"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      Refresh
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * "Explore Albums" section – shows 4 randomly selected albums in a 2×2 grid.
 * Clicking "Refresh" picks a new set of 4 from the full album pool via Zustand.
 *
 * This is a Client Component because it reads from and updates Zustand state.
 */
export function ExploreAlbums() {
  const albumIndices  = useUIStore((s) => s.albumIndices);
  const shuffleAlbums = useUIStore((s) => s.shuffleAlbums);

  // Map stored indices to Album objects
  const displayedAlbums = albumIndices.map((i) => ALBUMS[i]);

  return (
    <section aria-label="Explore Albums" className="mb-8">
      <SectionHeader
        title="Explore Albums"
        action={<ShuffleButton onClick={shuffleAlbums} />}
      />

      {/* 2×2 grid */}
      <div
        className={[
          "grid grid-cols-2 gap-3",
          "px-5",
        ].join(" ")}
      >
        {displayedAlbums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </section>
  );
}
