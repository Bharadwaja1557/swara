import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import type { Track, Album } from '@/types/music';

const INITIAL = 5;
const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♫</text></svg>';

const ArtistPage = () => {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { artists, tracks, albums, loaded, loadAlbumTracks } = useLibraryStore();
  const { playTrack } = usePlayerStore();
  const [showAllSongs,   setShowAllSongs]   = useState(false);
  const [showAllAlbums,  setShowAllAlbums]  = useState(false);

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

  // Songs sorted by release year descending (newest first), fallback to alpha
  // Match track.album name → album.year for the sort key
  const artistTracks: Track[] = tracks
    .filter((t) => t.artists.some((a) => a.toLowerCase().replace(/\s+/g, '-') === id || a.toLowerCase() === artist.name.toLowerCase()))
    .sort((a, b) => {
      const yearA = albums.find((alb) => alb.title === a.album)?.year ?? 0;
      const yearB = albums.find((alb) => alb.title === b.album)?.year ?? 0;
      return yearB - yearA || a.title.localeCompare(b.title);
    });

  // Albums where this artist is composer (release order, newest first — unchanged)
  const composerAlbums: Album[] = artist.composerAlbumIds
    .map((aid) => albums.find((a) => a.id === aid))
    .filter(Boolean)
    .sort((a, b) => (b!.year - a!.year)) as Album[];

  const visibleSongs  = showAllSongs  ? artistTracks   : artistTracks.slice(0, INITIAL);
  const visibleAlbums = showAllAlbums ? composerAlbums : composerAlbums.slice(0, INITIAL);

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">
      {/* Back */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 lg:px-8 pt-5 pb-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all" aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      {/* ── Desktop hero: image LEFT + info RIGHT (mirrors album page) ── */}
      <div className="px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:gap-10 mb-6 lg:mb-8">

          {/* Artist image — circular, larger on desktop */}
          <div className="flex justify-center lg:justify-start mb-4 lg:mb-0 flex-shrink-0">
            <div
              className="w-20 h-20 lg:w-[200px] lg:h-[200px] rounded-full overflow-hidden bg-swara-card border border-swara-border"
              style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
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
            <p className="text-[0.8rem] lg:text-[0.92rem] text-swara-muted">
              {artistTracks.length > 0 ? `${artistTracks.length} song${artistTracks.length !== 1 ? 's' : ''}` : ''}
              {composerAlbums.length > 0 ? `${artistTracks.length > 0 ? ' · ' : ''}${composerAlbums.length} album${composerAlbums.length !== 1 ? 's' : ''}` : ''}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-swara-border opacity-50 mb-6" />

        {/* Songs */}
        <div className="mb-8">
          <p className="text-[0.68rem] lg:text-[0.72rem] font-semibold text-swara-muted tracking-widest uppercase mb-3 px-1">
            Songs
            <span className="ml-2 text-swara-dim normal-case tracking-normal font-normal">
              (newest first)
            </span>
          </p>
          {artistTracks.length === 0 ? (
            <p className="text-swara-muted text-sm px-2 py-4">No songs found</p>
          ) : (
            <>
              {visibleSongs.map((track) => (
                <button key={track.id} type="button"
                  onClick={() => playTrack(track, artistTracks)}
                  className="flex items-center gap-3 w-full py-2.5 lg:py-3 px-2 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all text-left">
                  <img src={track.coverUrl || PH} alt="" className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.88rem] lg:text-[0.95rem] font-medium text-swara-text truncate">{track.title}</p>
                    <p className="text-[0.72rem] lg:text-[0.78rem] text-swara-muted truncate">
                      {track.album}
                      {(() => {
                        const yr = albums.find((alb) => alb.title === track.album)?.year;
                        return yr ? ` · ${yr}` : '';
                      })()}
                    </p>
                  </div>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-swara-dim flex-shrink-0" aria-hidden="true">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </button>
              ))}
              {artistTracks.length > INITIAL && (
                <button type="button" onClick={() => setShowAllSongs((v) => !v)}
                  className="mt-1 ml-2 text-[0.82rem] font-medium text-swara-accent hover:text-swara-accent-bright transition-colors">
                  {showAllSongs ? 'Show less' : `Show all ${artistTracks.length} songs`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Albums (only if composer) */}
        {composerAlbums.length > 0 && (
          <div className="pb-8">
            <p className="text-[0.68rem] lg:text-[0.72rem] font-semibold text-swara-muted tracking-widest uppercase mb-3 px-1">Albums</p>
            {visibleAlbums.map((album) => (
              <button key={album.id} type="button" onClick={() => navigate(`/album/${album.id}`)}
                className="flex items-center gap-3 lg:gap-4 w-full py-2.5 lg:py-3 px-2 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all text-left">
                <img src={album.coverUrl || PH} alt="" className="w-12 h-12 lg:w-[72px] lg:h-[72px] rounded-xl object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.88rem] lg:text-[0.95rem] font-medium text-swara-text truncate">{album.title}</p>
                  <p className="text-[0.72rem] lg:text-[0.78rem] text-swara-muted truncate">{album.year}</p>
                </div>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            ))}
            {composerAlbums.length > INITIAL && (
              <button type="button" onClick={() => setShowAllAlbums((v) => !v)}
                className="mt-1 ml-2 text-[0.82rem] font-medium text-swara-accent transition-colors">
                {showAllAlbums ? 'Show less' : `Show all ${composerAlbums.length} albums`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistPage;
