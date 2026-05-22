import { memo, useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibraryStore }     from '@/store/libraryStore';
import { usePlayerStore }      from '@/store/playerStore';
import { useLikedStore }       from '@/store/likedStore';
import { useUserLibraryStore } from '@/store/useUserLibraryStore';
import { trackActions }        from '@/lib/trackActions';
import { slugify }             from '@/utils/library';
import TrackMenuSheet          from '@/components/ui/TrackMenuSheet';
import ShuffleIcon             from '@/components/ui/ShuffleIcon';
import type { Track, Album }   from '@/types/music';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

// ─── Playing bars ─────────────────────────────────────────────────────────────
const PlayingBars = () => (
  // items-end anchors bars to bottom of container.
  // transformOrigin: 'bottom' on each bar ensures scaleY shrinks/grows
  // from the bottom edge upward — correct music equalizer behavior.
  // Without it, scaleY uses center origin and bars expand both up AND down.
  <div className="flex gap-[2px] items-end justify-center h-[14px]" aria-hidden="true">
    {[{ h: '55%', delay: '0s' }, { h: '100%', delay: '0.15s' }, { h: '40%', delay: '0.3s' }].map((b, i) => (
      <span key={i} className="w-[3px] bg-swara-accent rounded-full"
        style={{ height: b.h, animation: `eq 0.9s ease-in-out ${b.delay} infinite`, transformOrigin: 'bottom' }} />
    ))}
  </div>
);

// ─── Track row ────────────────────────────────────────────────────────────────
// memo: prevents re-renders when parent re-renders with same props.
// Fine-grained selectors inside are the PRIMARY flickering fix — see comments.
const TrackRow = memo(({ track, album }: { track: Track; album: Album }) => {
  // ── ROOT CAUSE FIX ──────────────────────────────────────────────────────────
  // usePlayerStore() WITHOUT a selector subscribes this component to the ENTIRE
  // store. playerStore emits progress+duration ~4×/sec via ontimeupdate.
  // With 25 tracks: 25 rows × 4 ticks/sec = 100 re-renders/sec → black flicker.
  //
  // Solution: subscribe only to the three values actually used.
  // currentTrackId changes only on track switch (not on progress).
  // isPlayingStore changes only on play/pause.
  // playTrack is a stable action reference — never changes.
  // Result: zero re-renders during normal playback. Flicker eliminated.
  const currentTrackId  = usePlayerStore((s) => s.currentTrack?.id);
  const isPlayingStore  = usePlayerStore((s) => s.isPlaying);

  const liked = useLikedStore((s) => s.isLiked(track.id));

  const [menuOpen,    setMenuOpen]    = useState(false);
  // Lazy mount: BottomSheet (fixed inset-0 z-[90]) is NOT in the DOM until
  // the menu is first opened. Without this, 25 fixed full-screen overlay
  // elements exist on initial paint — a massive compositor burden on mobile.
  const [menuMounted, setMenuMounted] = useState(false);

  const isActive   = currentTrackId === track.id;
  const isPlaying  = isPlayingStore && isActive;

  const handleOpenMenu = useCallback(() => {
    setMenuMounted(true); // mount once, keep mounted for close animation
    setMenuOpen(true);
  }, []);

  const handlePlay = useCallback(() => {
    trackActions.playFromAlbum(track, album);
  }, [track, album]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') trackActions.playFromAlbum(track, album);
  }, [track, album]);

  return (
    <>
      <li
        className={['flex items-center gap-3 px-2 py-3 rounded-xl transition-colors duration-150 cursor-pointer hover:bg-swara-card active:scale-[0.98]', isActive ? 'bg-swara-card' : ''].join(' ')}
        onClick={handlePlay}
        role="button" tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Track number / playing bars */}
        <div className="w-7 flex items-center justify-center flex-shrink-0">
          {isActive && isPlaying ? <PlayingBars /> : (
            <span className={['text-[0.82rem] font-medium tabular-nums', isActive ? 'text-swara-accent' : 'text-swara-dim'].join(' ')}>
              {track.trackNumber}
            </span>
          )}
        </div>

        {/* Title + artists */}
        <div className="flex-1 min-w-0">
          <p className={['text-[0.88rem] font-medium truncate leading-snug', isActive ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>
            {track.title}
          </p>
          {track.artists.length > 0 && (
            <p className="text-[0.72rem] text-swara-muted truncate mt-[1px]">
              {track.artists.join(', ')}
            </p>
          )}
        </div>

        {/* Heart + 3 dots */}
        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => trackActions.toggleLike(track)}
            className={['w-9 h-9 flex items-center justify-center rounded-full transition-colors', liked ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={handleOpenMenu}
            className="w-9 h-9 flex items-center justify-center rounded-full text-swara-dim hover:text-swara-muted transition-colors"
            aria-label="Track options"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
        </div>
      </li>

      {/* Only mounted after first open — keeps close animation, removes 25×
          fixed overlays from initial DOM paint */}
      {menuMounted && (
        <TrackMenuSheet
          track={track}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          context="default"
        />
      )}
    </>
  );
});

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
  const [isShuffle,  setIsShuffle]  = useState(false);

  const album = albums.find((a) => a.id === id);

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

  useEffect(() => { setCoverErr(false); }, [album?.id]);

  // ── Loading guard: library not yet bootstrapped ───────────────────────────
  // On hard refresh / direct deep-link, `loaded` is false and `albums` is []
  // so album is always undefined at first render. Show a spinner instead of
  // the permanent "not found" state — the album may exist once data arrives.
  if (!loaded) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-5 h-5 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
    </div>
  );

  if (!album) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-swara-muted text-sm">Album not found</p>
      <button type="button" onClick={() => navigate(-1)} className="text-swara-accent text-sm">Go back</button>
    </div>
  );

  const tracks    = album.tracks;
  const coverSrc  = coverErr || !album.coverUrl ? PH : album.coverUrl;
  const composerId = slugify(album.composer);

  // useCallback keeps handlePlay reference stable between renders so memo'd
  // TrackRow children (which receive it indirectly via album) aren't invalidated
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

            {/* Shuffle toggle */}
            <button type="button" onClick={() => setIsShuffle((s) => !s)}
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
              <TrackRow key={track.id} track={track} album={album} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AlbumPage;
