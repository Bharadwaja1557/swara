'use client';

import Image from 'next/image';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';

export function BottomPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const toggleFullPlayer = usePlayerStore((s) => s.toggleFullPlayer);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);

  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);

  return (
    <div
      className="fixed left-0 right-0 z-50 player-enter"
      style={{
        bottom: 'calc(var(--nav-height) + var(--safe-bottom))',
      }}
    >
      {/* Progress bar on top edge */}
      <div className="h-0.5 bg-border">
        <div
          className="h-full bg-accent transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Player bar */}
      <div
        className="h-[var(--player-height)] glass border-t border-border flex items-center px-3 gap-3"
        onClick={toggleFullPlayer}
      >
        {/* Cover */}
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-bg-elevated shadow-card">
          {currentTrack.albumCover ? (
            <Image
              src={currentTrack.albumCover}
              alt={currentTrack.albumTitle || ''}
              width={48}
              height={48}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <DefaultCover />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate leading-tight">
            {currentTrack.title}
          </p>
          <p className="text-xs text-text-secondary truncate leading-tight mt-0.5">
            {currentTrack.artistsDisplay}
          </p>
        </div>

        {/* Controls */}
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Like */}
          <button
            onClick={() => toggleLike(currentTrack.id)}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors active:bg-bg-elevated"
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <HeartIcon filled={liked} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            ) : isPlaying ? (
              <PauseIcon />
            ) : (
              <PlayIcon />
            )}
          </button>

          {/* Next */}
          <button
            onClick={next}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors active:bg-bg-elevated"
            aria-label="Next"
          >
            <NextIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function DefaultCover() {
  return (
    <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="#555" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="9" stroke="#555" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M6 4l14 8-14 8V4z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 18V6l10 6-10 6zM18 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21C12 21 3 15 3 9a4.5 4.5 0 018.94-.89L12 9l.06-.89A4.5 4.5 0 0121 9c0 6-9 12-9 12z"
        fill={filled ? '#ef4444' : 'none'}
        stroke={filled ? '#ef4444' : 'currentColor'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
