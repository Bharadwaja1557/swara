/**
 * RecentlyPlayed — recently played songs, deduped by album.
 *
 * LAYOUT (refinement pass 2):
 *   Responsive tile grid with SPLIT interaction model.
 *
 *   Interaction (corrected from pass 1):
 *     Cover artwork  → navigate to album page   (tapping art = browse)
 *     Text block     → play the song            (tapping text = play)
 *   The whole tile is NOT a single button — two independent interactive zones.
 *
 *   Columns / rows:
 *     Mobile (default)  : 1 col × 5 rows = 5 items
 *     Medium md (768px+): 2 col × 3 rows = 6 items
 *     Large  lg (1024px): 3 col × 3 rows = 9 items
 *
 * Deduplication logic (unique albumId, most recent per album) is UNCHANGED.
 */
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { trackActions } from '@/lib/trackActions';
import type { Track } from '@/types/music';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

interface RecentTileProps { track: Track; albumId: string; }

const RecentTile = ({ track, albumId }: RecentTileProps) => {
  const navigate = useNavigate();
  const { albums, loadAlbumTracks } = useLibraryStore();

  const handlePlay = async () => {
    const album = albums.find((a) => a.id === albumId);
    if (!album) return;
    let albumTracks = album.tracks;
    if (!albumTracks.length) albumTracks = await loadAlbumTracks(albumId);
    if (albumTracks.length) trackActions.playFromAlbum(track, { ...album, tracks: albumTracks });
  };

  return (
    /* Container: flex row, no outer button — events split between two zones */
    <div className="flex items-center rounded-xl bg-swara-card overflow-hidden h-11">

      {/* ── Zone 1: Cover → navigate to album ── */}
      <button
        type="button"
        onClick={() => navigate(`/album/${albumId}`)}
        className="flex-shrink-0 w-11 h-11 relative overflow-hidden focus-visible:ring-1 focus-visible:ring-swara-accent"
        aria-label={`Open album ${track.album}`}
        tabIndex={0}
      >
        <img
          src={track.coverUrl || PH}
          alt={track.album}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = PH; }}
        />
      </button>

      {/* ── Zone 2: Text → play the song ── */}
      <button
        type="button"
        onClick={handlePlay}
        className="flex-1 min-w-0 px-2.5 h-full flex flex-col justify-center text-left hover:bg-swara-elevated active:bg-white/5"
        aria-label={`Play ${track.title}`}
        tabIndex={0}
      >
        <p className="text-[0.78rem] font-semibold text-swara-text truncate leading-tight">
          {track.title}
        </p>
        <p className="text-[0.67rem] text-swara-muted truncate mt-0.5 leading-tight">
          {track.artist}
        </p>
      </button>

    </div>
  );
};

const RecentlyPlayed = () => {
  const { tracks } = useLibraryStore();
  const recentSongs = usePlayerStore((s) => s.recentSongs);

  // ── Deduplication — UNCHANGED ─────────────────────────────────────────────
  // Keep most-recent entry per albumId.
  // Max 9 for large desktop (3 col × 3 row).
  const seen = new Set<string>();
  const recentTracks: Array<{ track: Track; albumId: string }> = [];

  for (const entry of recentSongs) {
    if (seen.has(entry.albumId)) continue;
    seen.add(entry.albumId);
    const track = tracks.find((t) => t.id === entry.trackId);
    if (track) recentTracks.push({ track, albumId: entry.albumId });
    if (recentTracks.length >= 9) break;
  }

  if (!recentTracks.length) return null;

  // Slice per breakpoint:
  //   mobile (1 col × 5):  5 items
  //   md     (2 col × 3):  6 items
  //   lg     (3 col × 3):  9 items
  const mobileTiles = recentTracks.slice(0, 5);
  const mdTiles     = recentTracks.slice(0, 6);
  const lgTiles     = recentTracks.slice(0, 9);

  return (
    <section className="pt-5 pb-2 px-4" aria-labelledby="recents-heading">
      <h2
        id="recents-heading"
        className="text-[0.8125rem] font-semibold text-swara-muted tracking-widest uppercase mb-3"
      >
        Recently Played
      </h2>

      {/* Mobile: 1 col, 5 rows */}
      <div className="flex flex-col gap-2 md:hidden" role="list">
        {mobileTiles.map(({ track, albumId }) => (
          <div key={albumId} role="listitem">
            <RecentTile track={track} albumId={albumId} />
          </div>
        ))}
      </div>

      {/* Medium: 2 col, 3 rows */}
      <div className="hidden md:grid md:grid-cols-2 lg:hidden gap-2" role="list">
        {mdTiles.map(({ track, albumId }) => (
          <div key={albumId} role="listitem">
            <RecentTile track={track} albumId={albumId} />
          </div>
        ))}
      </div>

      {/* Large desktop: 3 col, 3 rows */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-2" role="list">
        {lgTiles.map(({ track, albumId }) => (
          <div key={albumId} role="listitem">
            <RecentTile track={track} albumId={albumId} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentlyPlayed;
