/**
 * LibraryCard — shared grid card for Albums, Artists, and Playlists.
 *
 * For playlists: pass the raw `playlist` prop and the cover is rendered
 * by <PlaylistArtwork> which applies the full priority chain
 * (uploaded → preset → collage → single → placeholder).
 *
 * For albums/artists: pass `coverUrl` as before.
 */

import { PlaylistArtwork } from '@/features/artwork';
import FolderArtwork from '@/components/ui/FolderArtwork';
import type { Playlist } from '@/store/usePlaylistStore';
import type { PlaylistFolder } from '@/store/useFolderStore';

interface LibraryCardProps {
  title:        string;
  subtitle?:    string;
  coverUrl?:    string;
  playlist?:    Playlist;
  folder?:      PlaylistFolder;
  coverShape?:  'square' | 'circle';
  isActive?:    boolean;
  onClick:      () => void;
  compact?:     boolean;
}

const LibraryCard = ({
  title, subtitle, coverUrl, playlist, folder, coverShape = 'square',
  isActive = false, onClick, compact = false,
}: LibraryCardProps) => {
  const isCircle   = coverShape === 'circle';
  const coverClass = isCircle ? 'rounded-full' : 'rounded-lg';
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
      <div className={[
        'w-full aspect-square overflow-hidden flex-shrink-0',
        coverClass,
        compact ? '' : 'rounded-xl',
      ].filter(Boolean).join(' ')}>
        {playlist ? (
          <PlaylistArtwork playlist={playlist} size={0} className="w-full h-full" />
        ) : folder ? (
          <FolderArtwork folder={folder} size={0} className="w-full h-full" />
        ) : coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-swara-elevated" />
        )}
      </div>

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
