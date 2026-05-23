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

// ─── AlbumPage ────────────────────────────────────────────────────────────────
const AlbumPage = () => {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { albums, loaded, loadAlbumTracks } = useLibraryStore();

  // Fine-grained selectors: AlbumPage only needs these two action refs.
  // Without selectors the page re-renders on every progress tick (~4×/sec),
  // bypassing memo on all 25 TrackRow children unnecessarily.
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [coverErr,   setCoverErr]   = useState(false);

  // Global shuffle state — synchronized across all player surfaces (Issue 7)
  const isShuffle    = usePlayerStore((s) => s.isShuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);

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

  // Dep is `id` (route param), not `album?.id`.
  // Using album?.id required album to be resolved before this hook — which
  // forced const album above the !loaded guard. Using id is semantically
  // identical: the cover error resets whenever the route changes, which is
  // exactly when the displayed album changes. Avoids the pre-guard lookup.
  useEffect(() => { setCoverErr(false); }, [id]);

  // ── Guard 1: library not bootstrapped ──────────────────────────────────────
  // On hard refresh or direct deep-link, `loaded` is false and `albums` is []
  // at the first render. Return a spinner — do NOT attempt albums.find() yet,
  // it would always return undefined and the page would flash "not found"
  // before any data arrives.
  if (!loaded) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-5 h-5 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
    </div>
  );

  // ── Guard 2: album existence ────────────────────────────────────────────────
  // Only reached after loaded === true. If the album genuinely doesn't exist
  // in the catalog it shows "not found". No race with hydration.
  const album = albums.find((a) => a.id === id);

  if (!album) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-swara-muted text-sm">Album not found</p>
      <button type="button" onClick={() => navigate(-1)} className="text-swara-accent text-sm">Go back</button>
    </div>
  );

  const tracks    = album.tracks;
  const coverSrc  = coverErr || !album.coverUrl ? PH : album.coverUrl;
  const composerId = slugify(album.composer);

  const handlePlay = useCallback(() => {
    if (!tracks.length) return;
    if (isShuffle) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      trackActions.playManual(shuffled, shuffled[0]);
    } else {
      trackActions.playAlbum(album, 0);
    }
  }, [tracks, isShuffle, album]);

  const { hasAlbum } = useUserLibraryStore();
  const inLibrary = hasAlbum(album.id);

  const handleToggleLibrary = useCallback(() => {
    trackActions.toggleAlbumLibrary(album, tracks);
  }, [album, tracks]);

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

      {/* ── Desktop hero: cover LEFT + meta RIGHT ── */}
      <div className="px-6 lg:px-10">

        {/* Hero wrapper: stacked on mobile, side-by-side on desktop */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:gap-10 mb-4 lg:mb-8">

          {/* Cover */}
          <div className="flex justify-center lg:justify-start mb-5 lg:mb-0 flex-shrink-0">
            <div className="w-[200px] h-[200px] lg:w-[280px] lg:h-[280px] rounded-2xl overflow-hidden bg-swara-card"
              style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
              <img src={coverSrc} alt={album.title} className="w-full h-full object-cover" loading="eager"
                onError={() => setCoverErr(true)} />
            </div>
          </div>

          {/* Meta — stacks below cover on mobile, beside it on desktop */}
          <div className="lg:flex-1 lg:min-w-0 lg:pb-1">
            {/* Small label on desktop */}
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
    </div>
  );
};

export default AlbumPage;
