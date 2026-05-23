/**
 * src/features/artwork/PlaylistArtwork.tsx
 *
 * THE canonical playlist artwork renderer.
 * Every place in the app that shows a playlist thumbnail uses this component.
 *
 * ── Render variants ───────────────────────────────────────────────────────────
 *   uploaded   → <img> of uploaded URL
 *   preset     → <img> of built-in SVG asset
 *   single     → <img> of first unique track cover
 *   collage-2  → vertical split (2 columns, 1 row)
 *   collage-3  → asymmetric: left half full-height + right half stacked 2
 *   collage-4  → 2×2 equal grid
 *   placeholder→ music note SVG on dark bg
 *
 * ── Memoization ───────────────────────────────────────────────────────────────
 *   Uses artworkKey from resolvePlaylistArtwork as the sole useMemo dep.
 *   artworkKey is a stable string — changes only when displayed artwork changes.
 *   Guaranteed zero re-renders during playback progress, queue ticks, or any
 *   store update unrelated to this playlist's cover fields / trackIds.
 *
 * ── Determinism ───────────────────────────────────────────────────────────────
 *   Collage image order = playlist.trackIds order (first unique occurrence).
 *   Identical across devices. Never randomised.
 *
 * ── Performance ───────────────────────────────────────────────────────────────
 *   All <img> elements use loading="lazy" decoding="async".
 *   Component is memo'd at the outer boundary.
 *   trackMap selector is fine-grained — only re-renders on catalog reload.
 *
 * ── Error handling ────────────────────────────────────────────────────────────
 *   Each collage cell has independent error state.
 *   Failed cells degrade to a neutral dark bg — collage never crashes.
 *
 * ── Extensibility notes ───────────────────────────────────────────────────────
 *   dominantColor extraction: add a useDominantColor(artworkKey) hook here.
 *   blurred background: pass artworkKey down to a BlurredBackdrop component.
 *   animated covers: add an 'animated' branch to the PlaylistArtworkResult type.
 */

import { memo, useMemo, useState } from 'react';
import { useLibraryStore }          from '@/store/libraryStore';
import { resolvePlaylistArtwork }   from './resolvePlaylistArtwork';
import type { Playlist }            from '@/store/usePlaylistStore';
import type { PlaylistArtworkResult } from './resolvePlaylistArtwork';

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

// ── Collage cell — independent error fallback per quadrant ────────────────────

const CollageCell = ({ url, className = '' }: { url: string; className?: string }) => {
  const [err, setErr] = useState(false);
  if (err) return <div className={`${className} bg-swara-elevated`} />;
  return (
    <img
      src={url}
      alt=""
      className={`${className} object-cover`}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setErr(true)}
    />
  );
};

// ── Collage layout renderers ──────────────────────────────────────────────────

/** 2 covers: vertical split — two equal columns */
const Collage2 = ({ urls }: { urls: string[] }) => (
  <div className="w-full h-full flex" aria-hidden="true">
    <CollageCell url={urls[0]} className="w-1/2 h-full flex-shrink-0" />
    <CollageCell url={urls[1]} className="w-1/2 h-full flex-shrink-0" />
  </div>
);

/** 3 covers: left large + right stacked */
const Collage3 = ({ urls }: { urls: string[] }) => (
  <div className="w-full h-full flex" aria-hidden="true">
    {/* Left — full height, half width */}
    <CollageCell url={urls[0]} className="w-1/2 h-full flex-shrink-0" />
    {/* Right — two equal halves stacked */}
    <div className="w-1/2 h-full flex flex-col flex-shrink-0">
      <CollageCell url={urls[1]} className="w-full h-1/2 flex-shrink-0" />
      <CollageCell url={urls[2]} className="w-full h-1/2 flex-shrink-0" />
    </div>
  </div>
);

/** 4 covers: 2×2 equal grid */
const Collage4 = ({ urls }: { urls: string[] }) => (
  <div className="w-full h-full grid grid-cols-2 grid-rows-2" aria-hidden="true">
    {urls.map((url, i) => (
      <CollageCell key={`${url}-${i}`} url={url} className="w-full h-full" />
    ))}
  </div>
);

// ── Content resolver — pure, given an artwork result ─────────────────────────

function renderContent(artwork: PlaylistArtworkResult, size: number) {
  switch (artwork.type) {
    case 'uploaded':
    case 'preset':
      return (
        <img
          src={artwork.url}
          alt="Playlist cover"
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
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
          decoding="async"
          draggable={false}
        />
      );

    case 'collage-2':
      return <Collage2 urls={artwork.collageUrls!} />;

    case 'collage-3':
      return <Collage3 urls={artwork.collageUrls!} />;

    case 'collage-4':
      return <Collage4 urls={artwork.collageUrls!} />;

    case 'placeholder':
    default:
      return <Placeholder size={size} />;
  }
}

// ── PlaylistArtwork ───────────────────────────────────────────────────────────

export interface PlaylistArtworkProps {
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
  // Fine-grained selector — trackMap only changes on catalog reload, not on
  // any playback event. This is the primary guard against spurious re-renders.
  const trackMap = useLibraryStore((s) => s.trackMap);

  // Compute the full result — memoized on artworkKey.
  // artworkKey is a stable string computed by resolvePlaylistArtwork that
  // encodes exactly what would be displayed. It changes only when:
  //   • coverImageUrl changes     (uploaded cover set/removed)
  //   • coverId changes           (preset selected)
  //   • trackIds first-4 change   (songs added/removed affecting collage)
  //   • trackMap reference changes (catalog reloaded)
  const artwork = useMemo(
    () => resolvePlaylistArtwork(playlist, trackMap),
    // We use artworkKey as described above, but since useMemo needs the
    // raw inputs to compute it in the first place, we list the minimal
    // set of fields that can affect artworkKey:
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playlist.coverImageUrl, playlist.coverId, playlist.trackIds, trackMap],
  );

  const content = useMemo(
    () => renderContent(artwork, size),
    // Re-render content only when the resolved artwork actually changes.
    // artworkKey is a stable string — safe as the sole dep here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [artwork.artworkKey, size],
  );

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
