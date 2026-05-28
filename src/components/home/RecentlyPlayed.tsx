/**
 * RecentlyPlayed — recently played songs, deduped by album.
 *
 * LAYOUT REDESIGN:
 *   Replaced vertical scroll-card layout with a responsive tile grid.
 *   Each tile: [small square artwork] [song title + artist text]
 *   Artwork height is constrained to NOT exceed the text block height —
 *   keeping tiles compact and premium.
 *
 *   Mobile:  2 columns × 3 rows = exactly 6 items
 *   Desktop: 4 columns × 3 rows = 12 items (lg breakpoint)
 *
 * Deduplication logic (by albumId, max 1 song per album) is UNCHANGED.
 */
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { trackActions } from '@/lib/trackActions';
import type { Track } from '@/types/music';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

interface RecentTileProps { track: Track; albumId: string; }

const RecentTile = ({ track, albumId }: RecentTileProps) => {
  const navigate  = useNavigate();
  const { albums, loadAlbumTracks } = useLibraryStore();

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const album = albums.find((a) => a.id === albumId);
    if (!album) return;
    let albumTracks = album.tracks;
    if (!albumTracks.length) albumTracks = await loadAlbumTracks(albumId);
    if (albumTracks.length) trackActions.playFromAlbum(track, { ...album, tracks: albumTracks });
  };

  return (
    <button
      type="button"
      onClick={() => navigate(`/album/${albumId}`)}
      className="flex items-center gap-2.5 w-full rounded-xl bg-swara-card hover:bg-swara-elevated active:scale-[0.97] transition-all duration-150 overflow-hidden group text-left"
      aria-label={`Open ${track.album}`}
    >
      {/* Artwork — square, fixed 44px (≈ 2-line text block height).
          Constrained so it never towers over the adjacent text. */}
      <div className="relative flex-shrink-0 w-11 h-11 overflow-hidden rounded-l-xl bg-swara-elevated">
        <img
          src={track.coverUrl || PH}
          alt={track.album}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = PH; }}
        />
        {/* Play overlay on hover */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-colors duration-150"
          onClick={handlePlay}
          role="button"
          aria-label={`Play ${track.title}`}
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 w-5 h-5 rounded-full bg-swara-accent flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 16 16" width="8" height="8" fill="#0a0a0a" aria-hidden="true">
              <path d="M4 3l9 5-9 5V3Z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Text block */}
      <div className="flex-1 min-w-0 pr-2 py-1.5">
        <p className="text-[0.78rem] font-semibold text-swara-text truncate leading-tight">{track.title}</p>
        <p className="text-[0.68rem] text-swara-muted truncate mt-0.5 leading-tight">{track.artist}</p>
      </div>
    </button>
  );
};

const RecentlyPlayed = () => {
  const { tracks } = useLibraryStore();
  const recentSongs = usePlayerStore((s) => s.recentSongs);

  // ── Deduplication — UNCHANGED ─────────────────────────────────────────────
  // Keep most-recent entry per albumId. Max 12 for desktop (4 col × 3 row).
  const seen = new Set<string>();
  const recentTracks: Array<{ track: Track; albumId: string }> = [];

  for (const entry of recentSongs) {
    if (seen.has(entry.albumId)) continue;
    seen.add(entry.albumId);
    const track = tracks.find((t) => t.id === entry.trackId);
    if (track) recentTracks.push({ track, albumId: entry.albumId });
    if (recentTracks.length >= 12) break;
  }

  if (!recentTracks.length) return null;

  // Mobile shows 6 (2×3), desktop shows 12 (4×3)
  const mobileTiles  = recentTracks.slice(0, 6);
  const desktopTiles = recentTracks.slice(0, 12);

  return (
    <section className="pt-5 pb-2 px-4" aria-labelledby="recents-heading">
      <h2
        id="recents-heading"
        className="text-[0.8125rem] font-semibold text-swara-muted tracking-widest uppercase mb-3"
      >
        Recently Played
      </h2>

      {/* Mobile grid: 2 col × 3 row, max 6 tiles */}
      <div
        className="grid grid-cols-2 gap-2 lg:hidden"
        role="list"
      >
        {mobileTiles.map(({ track, albumId }) => (
          <div key={albumId} role="listitem">
            <RecentTile track={track} albumId={albumId} />
          </div>
        ))}
      </div>

      {/* Desktop grid: 4 col × 3 row, max 12 tiles */}
      <div
        className="hidden lg:grid lg:grid-cols-4 gap-2"
        role="list"
      >
        {desktopTiles.map(({ track, albumId }) => (
          <div key={albumId} role="listitem">
            <RecentTile track={track} albumId={albumId} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentlyPlayed;
