/**
 * ArtistPage — artist detail view.
 *
 * CHANGES (UI refinement pass):
 *
 *   Hero:
 *     - Image enlarged to match Album page proportions:
 *       mobile w-[200px]/h-[200px], desktop w-[280px]/h-[280px]
 *     - Centered layout (matches mobile album hero centering)
 *     - Artist image remains circular; artist name centered below on mobile,
 *       left-aligned on desktop (same pattern as AlbumPage)
 *
 *   Albums section:
 *     - Converted from a vertical list to a responsive grid
 *     - Mobile: 3 columns, initially shows first 9 albums
 *     - Desktop: 4 columns (wider cards with more breathing room)
 *     - "Show All N Albums" / "Show less" toggle (unchanged logic)
 *
 *   Similar Artists section (NEW):
 *     - Placed at the very bottom after albums
 *     - Heading: "Similar Artists"
 *     - 1 row × 3 columns of circular artist cards
 *     - Similarity heuristic: artists who share the most albumIds with
 *       the current artist — overlapping appearances on the same albums
 *       strongly correlates with same language/industry/era.
 *       Tie-break: total composerAlbumIds count (larger catalog = more prominent).
 *     - Falls back gracefully if < 3 similar artists exist.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { trackActions } from '@/lib/trackActions';
import { useFavoriteArtistsStore } from '@/store/useFavoriteArtistsStore';
import { useToastStore } from '@/store/useToastStore';
import SongRow from '@/components/ui/SongRow';
import type { Track, Album, Artist } from '@/types/music';

const INITIAL_SONGS  = 5;
const INITIAL_ALBUMS = 9;   // 3 col × 3 row initial view on mobile
const SIMILAR_COUNT  = 3;

const PH      = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♫</text></svg>';
const PH_ART  = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><circle cx="50" cy="38" r="20" fill="%233E3D3A"/><ellipse cx="50" cy="80" rx="30" ry="18" fill="%233E3D3A"/></svg>';

// ── Similarity heuristic ──────────────────────────────────────────────────────
// Finds up to `count` artists most similar to `target`.
// Heuristic: count shared albumIds (albums where both artists appear).
// Tie-break: total composerAlbumIds count (catalog size).
// This correlates well with same-language/industry/era without needing
// explicit genre or language metadata — artists on the same film OSTs or
// label compilations are almost always from the same scene.
function getSimilarArtists(target: Artist, allArtists: Artist[], count = SIMILAR_COUNT): Artist[] {
  const targetAlbumSet = new Set(target.albumIds);
  return allArtists
    .filter((a) => a.id !== target.id)
    .map((a) => ({
      artist: a,
      sharedAlbums: a.albumIds.filter((id) => targetAlbumSet.has(id)).length,
      catalogSize:  a.composerAlbumIds.length,
    }))
    .filter((x) => x.sharedAlbums > 0)
    .sort((a, b) =>
      b.sharedAlbums - a.sharedAlbums ||
      b.catalogSize  - a.catalogSize
    )
    .slice(0, count)
    .map((x) => x.artist);
}

// ── Sub-components ────────────────────────────────────────────────────────────

const AlbumGridCard = ({ album, onClick }: { album: Album; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col text-left active:scale-[0.96] transition-transform duration-150 group"
    aria-label={`Open ${album.title}`}
  >
    <div className="w-full rounded-xl overflow-hidden bg-swara-elevated aspect-square mb-2">
      <img
        src={album.coverUrl || PH}
        alt={album.title}
        className="w-full h-full object-cover group-hover:opacity-80 transition-opacity duration-150"
        loading="lazy"
      />
    </div>
    <p className="text-[0.76rem] font-medium text-swara-text truncate w-full leading-tight">{album.title}</p>
    <p className="text-[0.68rem] text-swara-muted truncate w-full mt-0.5">{album.year}</p>
  </button>
);

const SimilarArtistCard = ({ artist, onClick }: { artist: Artist; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col items-center text-center gap-2 active:scale-[0.96] transition-transform duration-150 group"
    aria-label={`View artist ${artist.name}`}
  >
    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden bg-swara-elevated border border-swara-border flex-shrink-0">
      <img
        src={artist.coverUrl || PH_ART}
        alt={artist.name}
        className="w-full h-full object-cover group-hover:opacity-80 transition-opacity duration-150"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).src = PH_ART; }}
      />
    </div>
    <p className="text-[0.72rem] font-medium text-swara-text truncate w-full leading-tight">{artist.name}</p>
  </button>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const ArtistPage = () => {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { artists, tracks, albums, loaded, loadAlbumTracks } = useLibraryStore();
  const [showAllSongs,  setShowAllSongs]  = useState(false);
  const [showAllAlbums, setShowAllAlbums] = useState(false);

  const following = useFavoriteArtistsStore((s) => s.isFollowing(id ?? ''));
  const toggle    = useFavoriteArtistsStore((s) => s.toggle);
  const showToast = useToastStore((s) => s.show);

  const artist = artists.find((a) => a.id === id);

  // Preload tracks for this artist's albums
  useEffect(() => {
    if (!artist || !loaded) return;
    artist.albumIds.forEach((aid) => {
      const alb = albums.find((a) => a.id === aid);
      if (alb && !alb.tracks.length) loadAlbumTracks(aid).catch(() => {});
    });
  }, [artist, loaded, albums, loadAlbumTracks]);

  if (!artist) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-swara-muted text-sm">Artist not found</p>
      <button type="button" onClick={() => navigate(-1)} className="text-swara-accent text-sm">Go back</button>
    </div>
  );

  // ── Derived data ──────────────────────────────────────────────────────────

  const artistTracks: Track[] = tracks
    .filter((t) => t.artists.some((a) =>
      a.toLowerCase().replace(/\s+/g, '-') === id || a.toLowerCase() === artist.name.toLowerCase()
    ))
    .sort((a, b) => {
      const yearA = albums.find((alb) => alb.title === a.album)?.year ?? 0;
      const yearB = albums.find((alb) => alb.title === b.album)?.year ?? 0;
      return yearB - yearA || a.title.localeCompare(b.title);
    });

  const composerAlbums: Album[] = artist.composerAlbumIds
    .map((aid) => albums.find((a) => a.id === aid))
    .filter(Boolean)
    .sort((a, b) => (b!.year - a!.year)) as Album[];

  const similarArtists = getSimilarArtists(artist, artists);

  const visibleSongs  = showAllSongs  ? artistTracks                         : artistTracks.slice(0, INITIAL_SONGS);
  const visibleAlbums = showAllAlbums ? composerAlbums                       : composerAlbums.slice(0, INITIAL_ALBUMS);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">
      {/* Back bar */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 lg:px-8 pt-5 pb-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all" aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      <div className="px-6 lg:px-10">
        {/* ── Hero ── */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:gap-10 mb-6 lg:mb-8">

          {/* Artist image — enlarged to match Album page proportions, circular */}
          <div className="flex justify-center lg:justify-start mb-5 lg:mb-0 flex-shrink-0">
            <div
              className="w-[200px] h-[200px] lg:w-[280px] lg:h-[280px] rounded-full overflow-hidden bg-swara-card border border-swara-border"
              style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
            >
              <img src={artist.coverUrl || PH} alt={artist.name} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Info */}
          <div className="lg:flex-1 lg:min-w-0 lg:pb-1 text-center lg:text-left">
            <p className="hidden lg:block text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-swara-dim mb-2">Artist</p>
            <h1 className="text-[1.4rem] lg:text-[2.6rem] font-bold text-swara-text tracking-tight font-display lg:leading-none mb-1 lg:mb-2">
              {artist.name}
            </h1>
            <p className="text-[0.8rem] lg:text-[0.92rem] text-swara-muted mb-3">
              {artistTracks.length > 0 ? `${artistTracks.length} song${artistTracks.length !== 1 ? 's' : ''}` : ''}
              {composerAlbums.length > 0 ? `${artistTracks.length > 0 ? ' · ' : ''}${composerAlbums.length} album${composerAlbums.length !== 1 ? 's' : ''}` : ''}
            </p>

            {/* Follow / Unfollow */}
            <button
              type="button"
              onClick={() => {
                if (!id) return;
                const nowFollowing = toggle(id);
                showToast(
                  nowFollowing ? `Following ${artist.name}` : `Unfollowed ${artist.name}`,
                  nowFollowing ? 'heart' : 'check',
                );
              }}
              className={[
                'inline-flex items-center gap-1.5 h-8 px-4 rounded-full border text-[0.78rem] font-semibold transition-all',
                following
                  ? 'bg-swara-accent border-swara-accent text-swara-bg'
                  : 'border-swara-border text-swara-muted hover:border-swara-muted hover:text-swara-text',
              ].join(' ')}
              aria-pressed={following}
            >
              {following ? (
                <>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Following
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Follow
                </>
              )}
            </button>
          </div>
        </div>

        <div className="h-px bg-swara-border opacity-50 mb-6" />

        {/* ── Top Songs ── */}
        <div className="mb-8">
          <p className="text-[0.68rem] lg:text-[0.72rem] font-semibold text-swara-muted tracking-widest uppercase mb-3 px-1">
            Songs
            <span className="ml-2 text-swara-dim normal-case tracking-normal font-normal">(newest first)</span>
          </p>
          {artistTracks.length === 0 ? (
            <p className="text-swara-muted text-sm px-2 py-4">No songs found</p>
          ) : (
            <>
              <ul className="space-y-0">
                {visibleSongs.map((track) => {
                  const currentArtist = artists.find((a) => a.id === id);
                  return (
                    <SongRow
                      key={track.id}
                      track={track}
                      onPlay={() => {
                        if (currentArtist) trackActions.playFromArtist(track, currentArtist, artistTracks);
                        else trackActions.play(track, artistTracks);
                      }}
                      menuContext="default"
                    />
                  );
                })}
              </ul>
              {artistTracks.length > INITIAL_SONGS && (
                <button type="button" onClick={() => setShowAllSongs((v) => !v)}
                  className="mt-1 ml-2 text-[0.82rem] font-medium text-swara-accent hover:text-swara-accent-bright transition-colors">
                  {showAllSongs ? 'Show less' : `Show all ${artistTracks.length} songs`}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Albums — responsive grid ── */}
        {composerAlbums.length > 0 && (
          <div className="pb-8">
            <p className="text-[0.68rem] lg:text-[0.72rem] font-semibold text-swara-muted tracking-widest uppercase mb-4 px-1">
              Albums
            </p>
            {/* Mobile: 3 cols. Desktop: 4 cols */}
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
              {visibleAlbums.map((album) => (
                <AlbumGridCard
                  key={album.id}
                  album={album}
                  onClick={() => navigate(`/album/${album.id}`)}
                />
              ))}
            </div>
            {composerAlbums.length > INITIAL_ALBUMS && (
              <button type="button" onClick={() => setShowAllAlbums((v) => !v)}
                className="mt-4 ml-1 text-[0.82rem] font-medium text-swara-accent hover:text-swara-accent-bright transition-colors">
                {showAllAlbums ? 'Show less' : `Show all ${composerAlbums.length} albums`}
              </button>
            )}
          </div>
        )}

        {/* ── Similar Artists ── */}
        {similarArtists.length > 0 && (
          <div className="pb-10">
            <div className="h-px bg-swara-border opacity-50 mb-6" />
            <p className="text-[0.68rem] lg:text-[0.72rem] font-semibold text-swara-muted tracking-widest uppercase mb-5 px-1">
              Similar Artists
            </p>
            {/* 3-column fixed grid, 1 row */}
            <div className="grid grid-cols-3 gap-4 lg:gap-6 max-w-sm lg:max-w-md">
              {similarArtists.map((sim) => (
                <SimilarArtistCard
                  key={sim.id}
                  artist={sim}
                  onClick={() => navigate(`/artist/${sim.id}`)}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ArtistPage;
