/**
 * SongRow — canonical, memo'd song row component.
 *
 * Single source of truth for all track list items across:
 *   AlbumPage, PlaylistPage, LikedSongsPage, ArtistPage (songs section).
 *
 * EXCLUDED: Queue rows (QueuePage, FullscreenPlayer next-up) stay lightweight.
 *
 * PERFORMANCE:
 *   Uses fine-grained Zustand selectors (currentTrack?.id, isPlaying) so the
 *   row only re-renders on track switch or play/pause — NOT on progress ticks.
 *   Same pattern as the original AlbumPage TrackRow that fixed the flicker bug.
 *
 * LAZY MENU MOUNT:
 *   TrackMenuSheet is not in the DOM until the first menu open. This avoids
 *   mounting N×fixed full-screen overlay elements on initial render.
 *
 * PROPS:
 *   track          — the Track to display
 *   onPlay         — called when the row is clicked to play
 *   onPlayKeyDown  — optional extra keydown handler
 *
 *   showTrackNumber— show track number in left gutter (album/playlist context)
 *   trackNumber    — explicit number to show (defaults to track.trackNumber)
 *
 *   menuContext    — TrackMenuContext passed to TrackMenuSheet
 *   playlistId     — required when menuContext='playlist'
 *   entryId        — playlist entry ID for removal
 *   onRemoveFromPlaylist — callback for playlist removal
 *
 *   onNavigate     — called before TrackMenuSheet navigation (e.g. collapse player)
 */
import { memo, useState, useCallback } from 'react';
import { usePlayerStore }  from '@/store/playerStore';
import { useLikedStore }   from '@/store/likedStore';
import { trackActions }    from '@/lib/trackActions';
import TrackMenuSheet      from '@/components/ui/TrackMenuSheet';
import type { Track }      from '@/types/music';
import type { TrackMenuContext } from '@/components/ui/TrackMenuSheet';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/></svg>';

// ── PlayingBars ───────────────────────────────────────────────────────────────

const PlayingBars = () => (
  <div className="flex gap-[2px] items-end justify-center h-[14px]" aria-hidden="true">
    {[{ h: '55%', delay: '0s' }, { h: '100%', delay: '0.15s' }, { h: '40%', delay: '0.3s' }].map((b, i) => (
      <span key={i} className="w-[3px] bg-swara-accent rounded-full"
        style={{ height: b.h, animation: `eq 0.9s ease-in-out ${b.delay} infinite`, transformOrigin: 'bottom' }} />
    ))}
  </div>
);

// ── SongRow ───────────────────────────────────────────────────────────────────

export interface SongRowProps {
  track:         Track;
  onPlay:        () => void;

  /** Show the track number gutter (album / playlist context). Default false. */
  showTrackNumber?:  boolean;
  /** Explicit track number to display. Falls back to track.trackNumber. */
  trackNumber?:      number;

  /** TrackMenuContext forwarded to TrackMenuSheet. Default 'default'. */
  menuContext?:  TrackMenuContext;
  playlistId?:   string;
  entryId?:      string;
  onRemoveFromPlaylist?: (entryId: string) => void;
  onNavigate?:   () => void;
}

export const SongRow = memo(({
  track, onPlay,
  showTrackNumber = false,
  trackNumber,
  menuContext = 'default',
  playlistId, entryId, onRemoveFromPlaylist, onNavigate,
}: SongRowProps) => {
  // Fine-grained selectors — no re-render on progress ticks
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);
  const isPlayingStore = usePlayerStore((s) => s.isPlaying);
  const liked          = useLikedStore((s) => s.isLiked(track.id));

  const [menuOpen,    setMenuOpen]    = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);

  const isActive  = currentTrackId === track.id;
  const isPlaying = isPlayingStore && isActive;

  const displayNumber = trackNumber ?? track.trackNumber;

  const handleOpenMenu = useCallback(() => {
    setMenuMounted(true);
    setMenuOpen(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onPlay();
  }, [onPlay]);

  return (
    <>
      <li
        className={[
          'flex items-center gap-3 px-2 py-3 rounded-xl transition-colors duration-150 cursor-pointer hover:bg-swara-card active:scale-[0.98]',
          isActive ? 'bg-swara-card' : '',
        ].join(' ')}
        onClick={onPlay}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label={`Play ${track.title}`}
      >
        {/* Track number / playing bars */}
        {showTrackNumber && (
          <div className="w-7 flex items-center justify-center flex-shrink-0">
            {isActive && isPlaying ? (
              <PlayingBars />
            ) : (
              <span className={[
                'text-[0.82rem] font-medium tabular-nums',
                isActive ? 'text-swara-accent' : 'text-swara-dim',
              ].join(' ')}>
                {displayNumber}
              </span>
            )}
          </div>
        )}

        {/* Cover art — shown when NOT showing track number, or always in playlist */}
        {!showTrackNumber && (
          <img
            src={track.coverUrl || PH}
            alt=""
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = PH; }}
          />
        )}

        {/* Playing bars when active and not in track-number mode */}
        {!showTrackNumber && isActive && isPlaying && (
          <div className="flex-shrink-0 -ml-1 mr-1">
            <PlayingBars />
          </div>
        )}

        {/* Title + artist */}
        <div className="flex-1 min-w-0">
          <p className={[
            'text-[0.88rem] font-medium truncate leading-snug',
            isActive ? 'text-swara-accent' : 'text-swara-text',
          ].join(' ')}>
            {track.title}
          </p>
          <p className="text-[0.72rem] text-swara-muted truncate mt-[1px]">
            {track.artists.length > 0 ? track.artists.join(', ') : track.artist}
          </p>
        </div>

        {/* Like + 3-dots — stop click propagation so play isn't triggered */}
        <div
          className="flex items-center gap-0.5 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => trackActions.toggleLike(track)}
            className={[
              'w-9 h-9 flex items-center justify-center rounded-full transition-colors',
              liked ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted',
            ].join(' ')}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <svg viewBox="0 0 24 24" width="17" height="17"
              fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={handleOpenMenu}
            className="w-9 h-9 flex items-center justify-center rounded-full text-swara-dim hover:text-swara-muted transition-colors"
            aria-label="Track options"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
        </div>
      </li>

      {/* Lazy-mounted menu — not in DOM until first open */}
      {menuMounted && (
        <TrackMenuSheet
          track={track}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          context={menuContext}
          playlistId={playlistId}
          entryId={entryId}
          onRemoveFromPlaylist={onRemoveFromPlaylist}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
});

SongRow.displayName = 'SongRow';

export default SongRow;
