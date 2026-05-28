import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibraryStore }     from '@/store/libraryStore';
import { usePlayerStore }      from '@/store/playerStore';
import { useUserLibraryStore } from '@/store/useUserLibraryStore';
import { trackActions }        from '@/lib/trackActions';
import { slugify }             from '@/utils/library';
import SongRow                 from '@/components/ui/SongRow';
import ShuffleIcon             from '@/components/ui/ShuffleIcon';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

// ── More from Composer card ───────────────────────────────────────────────────
// Reuses the AlbumGridCard aesthetic already established on ArtistPage.
const ComposerAlbumCard = ({
  coverUrl, title, year, onClick,
}: { coverUrl: string; title: string; year: number; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col text-left active:scale-[0.96] group"
    aria-label={`Open ${title}`}
  >
    <div className="w-full rounded-xl overflow-hidden bg-swara-elevated aspect-square mb-2">
      <img
        src={coverUrl || PH}
        alt={title}
        className="w-full h-full object-cover group-hover:opacity-80"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).src = PH; }}
      />
    </div>
    <p className="text-[0.76rem] font-medium text-swara-text truncate w-full leading-tight">{title}</p>
    <p className="text-[0.68rem] text-swara-muted truncate w-full mt-0.5">{year}</p>
  </button>
);

// ─── AlbumPage ────────────────────────────────────────────────────────────────
const AlbumPage = () => {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { albums, loaded, loadAlbumTracks } = useLibraryStore();

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [coverErr, setCoverErr] = useState(false);

  // Global shuffle state — synchronized across all player surfaces.
  // usePlayerStore selector: fine-grained, no re-render on progress ticks.
  const isShuffle    = usePlayerStore((s) => s.isShuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);

  // Zustand subscription — must be unconditional regardless of album/loaded state.
  const hasAlbum = useUserLibraryStore((s) => s.hasAlbum);

  // ── Effects — all unconditional ────────────────────────────────────────────

  useEffect(() => {
    if (!id || !loaded) return;
    const a = albums.find((x) => x.id === id);
    if (!a || a.tracks.length > 0) return;
    setLoading(true); setError(null);
    loadAlbumTracks(id)
      .then((t) => { if (!t.length) setError('No tracks available.'); })
      .catch(() => setError('Unable to load tracks.'))
      .finally(() => setLoading(false));
  }, [id, loaded]); // eslint-disable-line

  useEffect(() => { setCoverErr(false); }, [id]);

  // ── Derived state — computed after all hooks, before guards ───────────────
  // album may be undefined at this point (before loaded or genuinely missing).
  // All callbacks below guard against this with early returns inside them.
  const album      = loaded ? albums.find((a) => a.id === id) : undefined;
  const tracks     = album?.tracks ?? [];
  const coverSrc   = coverErr || !album?.coverUrl ? PH : album.coverUrl;
  const composerId = album ? slugify(album.composer) : '';
  const inLibrary  = album ? hasAlbum(album.id) : false;

  // ── Callbacks — always declared, guard internally ─────────────────────────
  // These MUST come before any conditional return. Their deps (album, tracks,
  // isShuffle) may be undefined/empty on the loading render — the internal
  // guards handle that safely.
  const handlePlay = useCallback(() => {
    if (!album || !tracks.length) return;
    if (isShuffle) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      trackActions.playManual(shuffled, shuffled[0]);
    } else {
      trackActions.playAlbum(album, 0);
    }
  }, [tracks, isShuffle, album]);

  const handleToggleLibrary = useCallback(() => {
    if (!album) return;
    trackActions.toggleAlbumLibrary(album, tracks);
  }, [album, tracks]);

  // ── Guard 1: library not bootstrapped ──────────────────────────────────────
  // ALL hooks have now executed unconditionally above. Safe to return early.
  if (!loaded) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-5 h-5 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
    </div>
  );

  // ── Guard 2: album existence ────────────────────────────────────────────────
  if (!album) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-swara-muted text-sm">Album not found</p>
      <button type="button" onClick={() => navigate(-1)} className="text-swara-accent text-sm">Go back</button>
    </div>
  );

  // ── More from Composer ───────────────────────────────────────────────────
  // Heuristic: same composer, exclude current album, released within ±2 years.
  // The ±2 year window surfaces albums from the same creative era (e.g. the same
  // film/TV cycle or release run) rather than the full catalog.
  // Sorted by year proximity ascending (closest year first); ties broken newest-first.
  // Mobile shows 3 max, desktop shows 5 max — sliced per breakpoint in the render.
  const moreAlbums = album
    ? albums
        .filter((a) =>
          a.id !== album.id &&
          a.composer === album.composer &&
          Math.abs(a.year - album.year) <= 2,
        )
        .sort((a, b) => {
          const distA = Math.abs(a.year - album.year);
          const distB = Math.abs(b.year - album.year);
          return distA - distB || b.year - a.year;
        })
    : [];

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">
      {/* Back bar */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 lg:px-8 pt-5 pb-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all"
          aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      <div className="px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:gap-10 mb-4 lg:mb-8">

          {/* Cover */}
          <div className="flex justify-center lg:justify-start mb-5 lg:mb-0 flex-shrink-0">
            <div className="w-[200px] h-[200px] lg:w-[280px] lg:h-[280px] rounded-2xl overflow-hidden bg-swara-card"
              style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
              <img src={coverSrc} alt={album.title} className="w-full h-full object-cover" loading="eager"
                onError={() => setCoverErr(true)} />
            </div>
          </div>

          {/* Meta */}
          <div className="lg:flex-1 lg:min-w-0 lg:pb-1">
            <p className="hidden lg:block text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-swara-dim mb-2">Album</p>
            <h1 className="text-[1.3rem] lg:text-[2.6rem] font-bold text-swara-text tracking-tight font-display mb-0.5 lg:mb-2 lg:leading-none">
              {album.title}
            </h1>
            <button type="button" onClick={() => navigate(`/artist/${composerId}`)}
              className="text-[0.88rem] lg:text-[1.1rem] text-swara-accent font-medium hover:text-swara-accent-bright transition-colors block">
              {album.composer}
            </button>
            <p className="text-xs lg:text-[0.92rem] text-swara-muted mt-0.5 lg:mt-1.5">{album.year}</p>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-between mb-4 py-2 border-t border-b border-swara-border">
          <span className="text-[0.82rem] text-swara-muted font-medium">
            Tracks {tracks.length > 0 ? tracks.length : '…'}
          </span>
          <div className="flex items-center gap-2">
            {/* Add to Library */}
            <button type="button" onClick={handleToggleLibrary}
              className={['w-9 h-9 flex items-center justify-center rounded-full transition-colors', inLibrary ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
              aria-label={inLibrary ? 'Remove from library' : 'Add to library'}
              title={inLibrary ? 'Remove from library' : 'Add album to library'}>
              {inLibrary ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                  <line x1="9" y1="10" x2="15" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                  <line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/>
                </svg>
              )}
            </button>

            {/* Shuffle toggle — global state, synced across all player surfaces */}
            <button type="button" onClick={toggleShuffle}
              className={['w-9 h-9 flex items-center justify-center rounded-full transition-colors', isShuffle ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
              aria-label={isShuffle ? 'Shuffle on' : 'Shuffle off'}>
              <ShuffleIcon active={isShuffle} size={18} />
            </button>

            {/* Play */}
            <button type="button" onClick={handlePlay} disabled={loading || !tracks.length}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-swara-accent text-swara-bg disabled:opacity-50 active:scale-95 transition-transform"
              aria-label="Play">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="px-4 lg:px-8 pb-8">
        {loading && <div className="flex justify-center py-10"><div className="w-5 h-5 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" /></div>}
        {error && !loading && <p className="text-swara-muted text-sm text-center py-10">{error}</p>}
        {!loading && !error && (
          <ul className="space-y-0">
            {tracks.map((track) => (
              <SongRow
                key={track.id}
                track={track}
                onPlay={() => trackActions.playFromAlbum(track, album)}
                showTrackNumber
                menuContext="default"
              />
            ))}
          </ul>
        )}
      </div>

      {/* ── More from Composer ── */}
      {moreAlbums.length > 0 && (
        <div className="px-4 lg:px-8 pb-10">
          <div className="h-px bg-swara-border opacity-50 mb-5" />
          <p className="text-[0.68rem] lg:text-[0.72rem] font-semibold text-swara-muted tracking-widest uppercase mb-4">
            More from {album.composer}
          </p>

          {/* Mobile: 3 cols max */}
          <div className="grid grid-cols-3 gap-3 lg:hidden">
            {moreAlbums.slice(0, 3).map((a) => (
              <ComposerAlbumCard
                key={a.id}
                coverUrl={a.coverUrl}
                title={a.title}
                year={a.year}
                onClick={() => navigate(`/album/${a.id}`)}
              />
            ))}
          </div>

          {/* Desktop: 5 cols max */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-4">
            {moreAlbums.slice(0, 5).map((a) => (
              <ComposerAlbumCard
                key={a.id}
                coverUrl={a.coverUrl}
                title={a.title}
                year={a.year}
                onClick={() => navigate(`/album/${a.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumPage;
