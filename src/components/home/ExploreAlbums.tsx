import { useState, useCallback } from 'react';
import type { Album } from '@/types/music';
import { pickRandom } from '@/utils/greeting';

interface AlbumCardProps {
  album: Album;
}

/**
 * Individual album card — cover dominant, info below.
 */
const AlbumCard = ({ album }: AlbumCardProps) => {
  return (
    <button
      className={[
        'flex flex-col gap-2.5 text-left',
        'group cursor-pointer',
        'active:scale-[0.97] transition-transform duration-150',
      ].join(' ')}
      type="button"
      aria-label={`Open ${album.title} by ${album.artist}`}
    >
      {/* Cover */}
      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-swara-elevated shadow-card">
        <img
          src={album.coverUrl}
          alt={`${album.title} by ${album.artist}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        {/* Subtle bottom gradient for text legibility if we ever overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>

      {/* Album info */}
      <div className="flex flex-col gap-0.5 px-0.5">
        <p className="font-body text-[0.8125rem] font-semibold text-swara-text truncate leading-snug">
          {album.title}
        </p>
        <p className="font-body text-[0.6875rem] text-swara-muted truncate">
          {album.artist}
        </p>
        <p className="font-body text-[0.625rem] text-swara-dim mt-0.5">
          {album.year} · {album.trackCount} tracks
        </p>
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

interface ExploreAlbumsProps {
  albumPool: Album[];
}

/**
 * ExploreAlbums
 *
 * Shows 4 randomly selected albums in a 2×2 grid.
 * A refresh button picks a new random set from the pool.
 */
const ExploreAlbums = ({ albumPool }: ExploreAlbumsProps) => {
  const [visible, setVisible] = useState<Album[]>(() =>
    pickRandom(albumPool, 4)
  );
  const [spinning, setSpinning] = useState(false);

  const handleShuffle = useCallback(() => {
    setSpinning(true);
    // Brief delay so the spin animation is visible
    setTimeout(() => {
      setVisible(pickRandom(albumPool, 4));
      setSpinning(false);
    }, 350);
  }, [albumPool]);

  return (
    <section className="px-5 pt-6 pb-8" aria-labelledby="explore-albums-heading">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          id="explore-albums-heading"
          className="font-body text-base font-semibold text-swara-text tracking-[-0.01em]"
        >
          Explore Albums
        </h2>

        {/* Shuffle/Refresh button */}
        <button
          onClick={handleShuffle}
          disabled={spinning}
          className={[
            'flex items-center gap-1.5',
            'font-body text-[0.75rem] font-medium text-swara-muted',
            'hover:text-swara-accent transition-colors duration-200',
            'active:scale-95 transition-transform',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
          type="button"
          aria-label="Shuffle album selection"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className={spinning ? 'animate-spin' : ''}
            style={{ animationDuration: '400ms' }}
            aria-hidden="true"
          >
            <path
              d="M16 3h5v5M8 21H3v-5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 3l-7 7M3 21l7-7"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 16.5V21h-4.5M3 7.5V3h4.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Shuffle
        </button>
      </div>

      {/* 2×2 Album Grid */}
      <div className="grid grid-cols-2 gap-4">
        {visible.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </section>
  );
};

export default ExploreAlbums;
