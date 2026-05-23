/**
 * LibraryRow — shared list row for Albums, Artists, and Playlists.
 *
 * For playlists: pass the raw `playlist` prop — cover rendered by
 * <PlaylistArtwork> (uploaded → preset → collage → single → placeholder).
 * For albums/artists: pass `coverUrl` as before.
 */

import { PlaylistArtwork } from '@/features/artwork';
import type { Playlist } from '@/store/usePlaylistStore';

interface LibraryRowProps {
  title:        string;
  subtitle?:    string;
  tertiary?:    string;
  coverUrl?:    string;
  /** Raw playlist — set for playlist items. Drives PlaylistArtwork. */
  playlist?:    Playlist;
  coverShape?:  'square' | 'circle';
  isActive?:    boolean;
  onClick:      () => void;
  compact?:     boolean;
  showChevron?: boolean;
}

const LibraryRow = ({
  title, subtitle, tertiary, coverUrl, playlist,
  coverShape = 'square', isActive = false,
  onClick, compact = false, showChevron,
}: LibraryRowProps) => {
  const isCircle = coverShape === 'circle';

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
      {/* Cover */}
      <div className={[imgSize, roundCls, 'flex-shrink-0 overflow-hidden'].join(' ')}>
        {playlist ? (
          <PlaylistArtwork playlist={playlist} size={0} className="w-full h-full" />
        ) : coverUrl ? (
          <img src={coverUrl} alt=""
            className="w-full h-full object-cover bg-swara-elevated"
            loading="lazy" />
        ) : (
          <div className="w-full h-full bg-swara-elevated" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={[titleSize, 'font-semibold truncate leading-snug',
          isActive ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>
          {title}
        </p>
        {subtitle && (
          <p className={[subSize, 'text-swara-muted truncate mt-0.5'].join(' ')}>{subtitle}</p>
        )}
        {tertiary && (
          <p className={[terSize, 'text-swara-dim truncate mt-0.5'].join(' ')}>{tertiary}</p>
        )}
      </div>

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
