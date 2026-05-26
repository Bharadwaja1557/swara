/**
 * src/components/ui/FolderArtwork.tsx
 *
 * Canonical folder artwork renderer.
 * Used in LibraryCard, LibraryRow, and FolderPage hero.
 *
 * RESOLUTION:
 *   4+ playlists with covers → 2×2 collage of first 4 covers
 *   1–3 playlists with covers → first cover full-size
 *   0 playlists or no covers → folder icon placeholder
 *
 * Same design language as PlaylistArtwork collage.
 */
import { useMemo } from 'react';
import { usePlaylistStore } from '@/store/usePlaylistStore';
import type { PlaylistFolder } from '@/store/useFolderStore';

interface FolderArtworkProps {
  folder:     PlaylistFolder;
  size?:      number;   // explicit px size; 0 = let className control
  className?: string;
  style?:     React.CSSProperties;
}

const FolderArtwork = ({ folder, size = 0, className = '', style }: FolderArtworkProps) => {
  const playlists = usePlaylistStore((s) => s.playlists);

  // Collect cover URLs from the folder's playlists, in order, deduped
  const covers = useMemo(() => {
    const seen  = new Set<string>();
    const result: string[] = [];
    for (const pid of folder.playlistIds) {
      const pl = playlists.find((p) => p.id === pid);
      const url = pl?.coverImageUrl;
      if (url && !seen.has(url)) {
        seen.add(url);
        result.push(url);
        if (result.length === 4) break;
      }
    }
    return result;
  }, [folder.playlistIds, playlists]);

  const content = (() => {
    if (covers.length >= 4) {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2" aria-hidden="true">
          {covers.map((url, i) => (
            <img key={`${url}-${i}`} src={url} alt=""
              className="w-full h-full object-cover bg-swara-elevated"
              loading="lazy" decoding="async" />
          ))}
        </div>
      );
    }
    if (covers.length >= 1) {
      return (
        <img src={covers[0]} alt=""
          className="w-full h-full object-cover"
          loading="lazy" decoding="async" />
      );
    }
    // Placeholder — folder glyph on dark bg
    return (
      <div className="w-full h-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #10151e 0%, #0d121a 100%)' }}>
        <svg viewBox="0 0 24 24"
          width={size > 0 ? Math.max(size * 0.35, 18) : 40}
          height={size > 0 ? Math.max(size * 0.35, 18) : 40}
          fill="none" stroke="rgba(200,169,106,0.35)"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
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

export default FolderArtwork;
