"use client";

import Image from "next/image";
import type { Album } from "@/types";
import { getCoverUrl } from "@/data/mockData";

interface AlbumCardProps {
  album: Album;
}

/**
 * Square album card for the 2×2 Explore Albums grid.
 * Shows: artwork → album title → artist → year.
 */
export function AlbumCard({ album }: AlbumCardProps) {
  return (
    <article
      className={[
        "rounded-2xl overflow-hidden",
        "bg-swara-card border border-swara-border",
        "cursor-pointer",
        "transition-all duration-150 active:scale-[0.97] active:bg-swara-elevated",
      ].join(" ")}
      aria-label={`${album.title} by ${album.artist}`}
    >
      {/* ── Artwork ── */}
      <div className="relative w-full aspect-square overflow-hidden">
        <Image
          src={getCoverUrl(album.coverSeed, 400)}
          alt={`${album.title} album cover`}
          fill
          sizes="(max-width: 640px) 45vw, 200px"
          className="object-cover"
          onLoad={(e) => {
            (e.target as HTMLImageElement).style.opacity = "1";
          }}
          style={{ opacity: 0, transition: "opacity 0.3s ease" }}
        />
      </div>

      {/* ── Info ── */}
      <div className="px-3 py-3">
        <p
          className={[
            "text-[0.8rem] font-semibold leading-snug",
            "text-swara-text-1 line-clamp-1",
          ].join(" ")}
        >
          {album.title}
        </p>
        <p
          className={[
            "mt-0.5",
            "text-[0.7rem] font-normal leading-snug",
            "text-swara-text-2 line-clamp-1",
          ].join(" ")}
        >
          {album.artist}
        </p>
        <p
          className={[
            "mt-1",
            "text-[0.62rem] font-normal",
            "text-swara-text-3",
          ].join(" ")}
        >
          {album.year}
        </p>
      </div>
    </article>
  );
}
