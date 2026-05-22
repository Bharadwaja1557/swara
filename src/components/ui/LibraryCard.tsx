/**
 * LibraryCard — shared grid card for Albums, Artists, and Playlists.
 *
 * Used by both LibraryPage (full-page) and LibraryPanel (desktop sidebar).
 * Size variants:
 *   compact = panel sidebar (tighter labels, same proportions)
 *   default = full page
 *
 * Cover shapes:
 *   'square'  — album / playlist
 *   'circle'  — artist
 *
 * Playlist gradient fallback rendered internally when coverUrl is undefined.
 */

interface LibraryCardProps {
  title:            string;
  subtitle?:        string;
  coverUrl?:        string;
  /** 'circle' for artists, 'square' for albums/playlists. Default: 'square'. */
  coverShape?:      'square' | 'circle';
  /** Show the music-note gradient placeholder used for playlists. */
  playlistFallback?: boolean;
  /** Highlight title in accent colour (desktop sidebar active route). */
  isActive?:        boolean;
  onClick:          () => void;
  /** compact = sidebar sizing, default = page sizing. */
  compact?:         boolean;
}

const PlaylistPlaceholder = () => (
  <div
    className="w-full h-full flex items-center justify-center"
    style={{ background: 'linear-gradient(135deg, #1a1422 0%, #221830 50%, #1a1220 100%)' }}
  >
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none"
      stroke="rgba(200,169,106,0.35)" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  </div>
);

const GenericPlaceholder = () => (
  <div className="w-full h-full flex items-center justify-center bg-swara-elevated">
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
      stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" aria-hidden="true">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  </div>
);

const LibraryCard = ({
  title, subtitle, coverUrl, coverShape = 'square',
  playlistFallback = false, isActive = false,
  onClick, compact = false,
}: LibraryCardProps) => {
  const isCircle   = coverShape === 'circle';
  const coverClass = isCircle ? 'rounded-full' : 'rounded-lg';

  // Label sizes
  const titleSize    = compact ? 'text-[0.72rem]' : 'text-[0.75rem] lg:text-[0.85rem]';
  const subtitleSize = compact ? 'text-[0.64rem]' : 'text-[0.65rem] lg:text-[0.72rem]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col gap-1 text-left active:scale-95 transition-all min-w-0 w-full overflow-hidden',
        compact ? 'rounded-xl p-1.5 hover:bg-swara-card' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Cover */}
      <div className={[
        'w-full aspect-square overflow-hidden flex-shrink-0',
        coverClass,
        compact ? '' : 'rounded-xl',
      ].filter(Boolean).join(' ')}>
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : playlistFallback ? (
          <PlaylistPlaceholder />
        ) : (
          <GenericPlaceholder />
        )}
      </div>

      {/* Labels */}
      <p className={[
        titleSize, 'font-medium truncate w-full leading-snug mt-0.5',
        isActive ? 'text-swara-accent' : 'text-swara-text',
      ].join(' ')}>
        {title}
      </p>
      {subtitle && (
        <p className={[subtitleSize, 'text-swara-muted truncate w-full'].join(' ')}>
          {subtitle}
        </p>
      )}
    </button>
  );
};

export default LibraryCard;
