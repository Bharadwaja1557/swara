/**
 * LibraryRow — shared list row for Albums, Artists, and Playlists.
 *
 * Used by both LibraryPage (full-page) and LibraryPanel (desktop sidebar).
 * Size variants:
 *   compact = panel sidebar (56px cover, smaller text)
 *   default = full page (72px mobile, 100px lg)
 *
 * Cover shapes: 'square' (album/playlist) | 'circle' (artist).
 * Playlist gradient fallback rendered internally when coverUrl is undefined.
 */

interface LibraryRowProps {
  title:             string;
  subtitle?:         string;
  tertiary?:         string;
  coverUrl?:         string;
  /** 'circle' for artists. Default 'square'. */
  coverShape?:       'square' | 'circle';
  /** Playlist-style gradient placeholder when no cover. */
  playlistFallback?: boolean;
  /** Highlight title in accent colour (active route). */
  isActive?:         boolean;
  onClick:           () => void;
  /** compact = sidebar sizing, default = page sizing. */
  compact?:          boolean;
  /** Show trailing chevron. Default true for page, false for panel. */
  showChevron?:      boolean;
}

const PlaylistPlaceholder = ({ size }: { size: string }) => (
  <div
    className={`${size} flex items-center justify-center flex-shrink-0`}
    style={{ background: 'linear-gradient(135deg, #1a1422 0%, #221830 50%, #1a1220 100%)' }}
  >
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
      stroke="rgba(200,169,106,0.35)" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  </div>
);

const LibraryRow = ({
  title, subtitle, tertiary, coverUrl,
  coverShape = 'square', playlistFallback = false,
  isActive = false, onClick, compact = false, showChevron,
}: LibraryRowProps) => {
  const isCircle = coverShape === 'circle';

  // Sizing
  const imgSize   = compact ? 'w-14 h-14' : 'w-[72px] h-[72px] lg:w-[100px] lg:h-[100px]';
  const roundCls  = isCircle ? 'rounded-full' : 'rounded-xl';
  const titleSize = compact ? 'text-[0.88rem]' : 'text-[0.95rem] lg:text-[1.05rem]';
  const subSize   = compact ? 'text-[0.76rem]' : 'text-[0.8rem] lg:text-[0.88rem]';
  const terSize   = 'text-[0.72rem] lg:text-[0.78rem]';

  const showArrow = showChevron ?? !compact;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center w-full text-left transition-all',
        compact
          ? 'gap-3 px-2 py-3 rounded-xl hover:bg-swara-card'
          : 'gap-4 lg:gap-5 py-3 lg:py-3.5 px-2 rounded-xl hover:bg-swara-card active:scale-[0.98]',
        isActive ? 'bg-swara-card' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Cover / avatar */}
      {coverUrl ? (
        <img
          src={coverUrl} alt=""
          className={[imgSize, roundCls, 'object-cover flex-shrink-0 bg-swara-elevated'].join(' ')}
          loading="lazy"
        />
      ) : playlistFallback ? (
        <PlaylistPlaceholder size={[imgSize, roundCls].join(' ')} />
      ) : (
        <div className={[imgSize, roundCls, 'bg-swara-elevated flex-shrink-0'].join(' ')} />
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={[
          titleSize, 'font-semibold truncate leading-snug',
          isActive ? 'text-swara-accent' : 'text-swara-text',
        ].join(' ')}>
          {title}
        </p>
        {subtitle && (
          <p className={[subSize, 'text-swara-muted truncate mt-0.5'].join(' ')}>
            {subtitle}
          </p>
        )}
        {tertiary && (
          <p className={[terSize, 'text-swara-dim truncate mt-0.5'].join(' ')}>
            {tertiary}
          </p>
        )}
      </div>

      {/* Trailing chevron */}
      {showArrow && (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-swara-dim flex-shrink-0" aria-hidden="true">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      )}
    </button>
  );
};

export default LibraryRow;
