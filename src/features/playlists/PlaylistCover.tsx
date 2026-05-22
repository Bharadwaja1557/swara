/**
 * src/features/playlists/PlaylistCover.tsx
 *
 * Centralized playlist cover renderer.
 *
 * RESOLUTION ORDER:
 *   1. coverImageUrl  — user-uploaded image (future)
 *   2. coverId        — built-in SVG from /public/playlist-covers/
 *   3. default placeholder
 *
 * All consumers (PlaylistPage, LibraryCard, LibraryPanel, SongInfoPanel)
 * must use this component. No duplicated placeholder logic anywhere else.
 *
 * SIZE HANDLING:
 *   When size > 0, the outer div gets explicit width/height.
 *   When size === 0, the outer div is unsized and className drives layout
 *   (e.g. "w-[200px] h-[200px]" from the parent). This is used by
 *   PlaylistPage and LibraryCard which control sizing via Tailwind.
 */
import { resolveCoverUrl } from './coverRegistry';

interface PlaylistCoverProps {
  coverImageUrl?:  string;   // uploaded image — future
  coverId?:        string;   // built-in cover key
  title?:          string;
  /** Explicit pixel size. Pass 0 to let className control sizing. */
  size:            number;
  className?:      string;
  style?:          React.CSSProperties;
}

const PlaylistCover = ({
  coverImageUrl, coverId, title, size, className = '', style,
}: PlaylistCoverProps) => {
  const content = (() => {
    // Priority 1: uploaded image
    if (coverImageUrl) {
      return (
        <img
          src={coverImageUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      );
    }

    // Priority 2: built-in SVG asset
    const assetUrl = resolveCoverUrl(coverId);
    if (assetUrl) {
      return (
        <img
          src={assetUrl}
          alt={title ?? 'Playlist cover'}
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
        />
      );
    }

    // Priority 3: default placeholder
    return (
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
  })();

  return (
    <div
      className={`overflow-hidden flex-shrink-0 ${className}`}
      style={size > 0 ? { width: size, height: size, ...style } : style}
    >
      {content}
    </div>
  );
};

export default PlaylistCover;
