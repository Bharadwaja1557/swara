import type { Track } from '@/types/music';
import { formatDuration } from '@/utils/greeting';

interface TrackCardProps {
  track: Track;
}

/**
 * Individual track card in the RecentlyPlayed horizontal list.
 * Compact: cover + title + artist + duration.
 */
const TrackCard = ({ track }: TrackCardProps) => {
  return (
    <button
      className={[
        'flex-shrink-0 w-[140px]',
        'flex flex-col gap-2.5',
        'group cursor-pointer',
        'text-left',
        'active:scale-[0.97] transition-transform duration-150',
      ].join(' ')}
      aria-label={`Play ${track.title} by ${track.artist}`}
      type="button"
    >
      {/* Album artwork */}
      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-swara-elevated shadow-card">
        <img
          src={track.coverUrl}
          alt={`${track.album} cover`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-8 h-8 rounded-full bg-swara-accent flex items-center justify-center shadow-lg">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M5 3.5l8 4.5-8 4.5V3.5Z" fill="#09090C" />
            </svg>
          </div>
        </div>
      </div>

      {/* Track info */}
      <div className="flex flex-col gap-0.5 px-0.5">
        <p className="font-body text-[0.8125rem] font-medium text-swara-text leading-snug truncate">
          {track.title}
        </p>
        <p className="font-body text-[0.6875rem] text-swara-muted truncate leading-snug">
          {track.artist}
        </p>
        <p className="font-body text-[0.625rem] text-swara-dim mt-0.5">
          {formatDuration(track.duration)}
        </p>
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

interface RecentlyPlayedProps {
  tracks: Track[];
}

/**
 * RecentlyPlayed
 *
 * Section header + horizontal scroll list of the last 10 played tracks.
 * Touch-friendly, no scrollbar visible.
 */
const RecentlyPlayed = ({ tracks }: RecentlyPlayedProps) => {
  return (
    <section className="pt-6 pb-2" aria-labelledby="recently-played-heading">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 mb-4">
        <h2
          id="recently-played-heading"
          className="font-body text-base font-semibold text-swara-text tracking-[-0.01em]"
        >
          Recently Played
        </h2>
        <button
          className="font-body text-[0.75rem] text-swara-accent font-medium hover:text-swara-accent-bright transition-colors"
          type="button"
          aria-label="See all recently played"
        >
          See all
        </button>
      </div>

      {/* Horizontal scroll container */}
      <div
        className="flex gap-3.5 px-5 overflow-x-auto scrollbar-none"
        role="list"
        aria-label="Recently played tracks"
      >
        {tracks.map((track) => (
          <div key={track.id} role="listitem">
            <TrackCard track={track} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentlyPlayed;
