"use client";

import Image from "next/image";
import type { Song } from "@/types";
import { getCoverUrl } from "@/data/mockData";

interface SongCardProps {
  song: Song;
}

/**
 * Compact song card used in the "Recently Played" horizontal scroll strip.
 * Shows: artwork square → song title → artist name.
 *
 * Width: 136px fixed (feels compact without being cramped on mobile).
 */
export function SongCard({ song }: SongCardProps) {
  return (
    <article
      className={[
        // Fixed width for horizontal scroll
        "w-[136px] flex-shrink-0",
        // Card appearance
        "rounded-2xl overflow-hidden",
        "bg-swara-card",
        "border border-swara-border",
        // Interaction
        "cursor-pointer",
        "transition-colors duration-150 active:bg-swara-elevated",
      ].join(" ")}
      aria-label={`${song.title} by ${song.artist}`}
    >
      {/* ── Artwork ── */}
      <div className="relative w-full aspect-square overflow-hidden">
        <Image
          src={getCoverUrl(song.coverSeed, 300)}
          alt={`${song.album} album art`}
          fill
          sizes="136px"
          className="object-cover"
          // Fade in once loaded
          onLoad={(e) => {
            (e.target as HTMLImageElement).style.opacity = "1";
          }}
          style={{ opacity: 0, transition: "opacity 0.3s ease" }}
        />
      </div>

      {/* ── Info ── */}
      <div className="px-2.5 py-2.5">
        <p
          className={[
            "text-[0.78rem] font-medium leading-snug",
            "text-swara-text-1 line-clamp-1",
          ].join(" ")}
        >
          {song.title}
        </p>
        <p
          className={[
            "mt-0.5",
            "text-[0.68rem] font-normal leading-snug",
            "text-swara-text-2 line-clamp-1",
          ].join(" ")}
        >
          {song.artist}
        </p>
      </div>
    </article>
  );
}
