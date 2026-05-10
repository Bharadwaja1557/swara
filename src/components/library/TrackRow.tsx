'use client';

import type { Track } from '@/types';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';

interface TrackRowProps {
  track: Track;
  queue: Track[];
  index?: number;
  showAlbum?: boolean;
}

export function TrackRow({ track, queue, index, showAlbum = false }: TrackRowProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const isActive = currentTrack?.id === track.id;
  const liked = isLiked(track.id);

  function handlePlay() {
    playTrack(track, queue);
  }

  return (
    <div
      className="track-row flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer active:bg-bg-elevated"
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handlePlay()}
      aria-label={`Play ${track.title}`}
    >
      {/* Track number / playing indicator */}
      <div className="w-7 flex-shrink-0 flex items-center justify-center">
        {isActive && isPlaying ? (
          <PlayingBars />
        ) : (
          <span className="text-sm font-mono text-text-muted tabular-nums">
            {track.trackNumber > 0 ? track.trackNumber : (index !== undefined ? index + 1 : '·')}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium leading-tight line-clamp-1 ${
            isActive ? 'text-accent' : 'text-text'
          }`}
        >
          {track.title}
        </p>
        <p className="text-xs text-text-secondary leading-tight mt-0.5 line-clamp-1">
          {track.artistsDisplay}
          {showAlbum && track.albumTitle && (
            <span className="text-text-muted"> · {track.albumTitle}</span>
          )}
        </p>
      </div>

      {/* Like button */}
      <button
        className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-full transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          toggleLike(track.id);
        }}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21C12 21 3 15 3 9a4.5 4.5 0 018.94-.89L12 9l.06-.89A4.5 4.5 0 0121 9c0 6-9 12-9 12z"
            fill={liked ? '#ef4444' : 'none'}
            stroke={liked ? '#ef4444' : '#444'}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

function PlayingBars() {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[0, 100, 200].map((delay) => (
        <div
          key={delay}
          className="w-0.5 bg-accent rounded-full"
          style={{
            height: '60%',
            animation: `playingBar 0.8s ease-in-out infinite alternate`,
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
