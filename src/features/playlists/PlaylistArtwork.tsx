/**
 * src/features/playlists/PlaylistArtwork.tsx
 *
 * Canonical playlist artwork renderer. The ONLY component that should
 * render playlist cover images anywhere in the app.
 *
 * REPLACES:
 *   • PlaylistCover (deprecated — kept only as re-export for backward-compat)
 *   • PlaylistPlaceholder in LibraryRow
 *   • Inline cover logic in PlaylistPickerSheet
 *   • Direct playlistImageUrl usage in LibraryCard/LibraryRow
 *
 * BEHAVIOUR:
 *   Calls resolvePlaylistArtwork() and renders the appropriate variant:
 *     uploaded    → <img> of the uploaded URL
 *     preset      → <img> of the SVG asset URL
 *     collage     → 2×2 CSS grid of 4 track cover <img> elements
 *     single      → <img> of the first track cover
 *     placeholder → music-note SVG on dark background
 *
 * COLLAGE DESIGN:
 *   • Equal 2×2 grid, no gap, object-cover on each cell
 *   • Images fill their quadrant with aspect-ratio: 1 on the grid container
 *   • Rounded corners inherited from parent (overflow-hidden on wrapper)
 *
 * PROPS:
 *   playlist  — Playlist object from the store (required)
 *   size      — Pixel size. When 0, outer div is unsized (className controls)
 *   className — Applied to the outer wrapper div
 *   style     — Inline styles on the outer wrapper div
 *
 * PERFORMANCE:
 *   Component is memo'd. resolvePlaylistArtwork result is memoized on
 *   [playlist.coverImageUrl, playlist.coverId, playlist.trackIds, trackMap].
 *   No re-renders on playback progress ticks.
 *
 * IMAGE ERRORS:
 *   Individual cell images fall back to a neutral dark bg on error — the
 *   collage degrades gracefully without crashing.
 */

import { memo, useMemo, useState } from 'react';
import { useLibraryStore }          from '@/store/libraryStore';
import { resolvePlaylistArtwork }   from './resolvePlaylistArtwork';
import type { Playlist }            from '@/store/usePlaylistStore';

// ── Placeholder ───────────────────────────────────────────────────────────────

const Placeholder = ({ size }: { size: number }) => (
  <div
    className="w-full h-full flex items-center justify-center"
    style={{ background: 'rgba(200,169,106,0.07)' }}
  >
    <svg
      viewBox="0 0 24 24"
      width={size > 0 ? Math.max(size * 0.38, 16) : 40}
      height={size > 0 ? Math.max(size * 0.38, 16) : 40}
      fill="none"
      stroke="rgba(200,169,106,0.35)"
      strokeWidth="1.25"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6"  cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  </div>
);

// ── Collage cell — individual quadrant with error fallback ────────────────────

const CollageCell = ({ url }: { url: string }) => {
  const [err, setErr] = useState(false);
  if (err) return <div className="w-full h-full bg-swara-elevated" />;
  return (
    <img
      src={url}
      alt=""
      className="w-full h-full object-cover"
      loading="lazy"
      draggable={false}
      onError={() => setErr(true)}
    />
  );
};

// ── PlaylistArtwork ───────────────────────────────────────────────────────────

interface PlaylistArtworkProps {
  playlist:   Playlist;
  /** Explicit pixel size. Pass 0 (default) to let className control sizing. */
  size?:      number;
  className?: string;
  style?:     React.CSSProperties;
}

const PlaylistArtwork = memo(({
  playlist,
  size = 0,
  className = '',
  style,
}: PlaylistArtworkProps) => {
  // Fine-grained selector — only re-renders when trackMap reference changes
  // (which only happens when the library catalog reloads, not on progress ticks)
  const trackMap = useLibraryStore((s) => s.trackMap);

  // Memoize the resolution — deps are exactly the fields that can change
  const artwork = useMemo(
    () => resolvePlaylistArtwork(playlist, trackMap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playlist.coverImageUrl, playlist.coverId, playlist.trackIds, trackMap],
  );

  const content = (() => {
    switch (artwork.type) {
      case 'uploaded':
      case 'preset':
        return (
          <img
            src={artwork.url}
            alt={playlist.title ?? 'Playlist cover'}
            className="w-full h-full object-cover"
            loading="lazy"
            draggable={false}
          />
        );

      case 'single':
        return (
          <img
            src={artwork.url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            draggable={false}
          />
        );

      case 'collage':
        // 2×2 grid — no gap, equal cells, fills the container
        return (
          <div
            className="w-full h-full grid grid-cols-2 grid-rows-2"
            aria-hidden="true"
          >
            {artwork.collageUrls!.map((url, i) => (
              <CollageCell key={`${url}-${i}`} url={url} />
            ))}
          </div>
        );

      case 'placeholder':
      default:
        return <Placeholder size={size} />;
    }
  })();

  return (
    <div
      className={`overflow-hidden flex-shrink-0 ${className}`}
      style={size > 0 ? { width: size, height: size, ...style } : style}
    >
      {content}
    </div>
  );
});

PlaylistArtwork.displayName = 'PlaylistArtwork';

export default PlaylistArtwork;
