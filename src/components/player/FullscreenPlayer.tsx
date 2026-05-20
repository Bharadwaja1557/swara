import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore, getNextTracks } from '@/store/playerStore';
import { useLikedStore } from '@/store/likedStore';
import { useUserLibraryStore } from '@/store/useUserLibraryStore';
import { useLibraryStore } from '@/store/libraryStore';
import { trackActions } from '@/lib/trackActions';
import { formatDuration } from '@/utils/greeting';
import { slugify } from '@/utils/library';
import BottomSheet from '@/components/ui/BottomSheet';
import ArtistPickerSheet from '@/components/ui/ArtistPickerSheet';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

// ─── Track menu (bottom sheet) ────────────────────────────────────────────────
interface TrackMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const TrackMenu = ({ isOpen, onClose }: TrackMenuProps) => {
  const { currentTrack } = usePlayerStore();
  const liked  = useLikedStore((s) => currentTrack ? s.isLiked(currentTrack.id) : false);
  const { albums } = useLibraryStore();
  const navigate = useNavigate();

  const [artistPickerOpen, setArtistPickerOpen] = useState(false);

  if (!currentTrack) return null;

  const albumFull = albums.find((a) => a.id === currentTrack.albumId);
  const inLib     = useUserLibraryStore.getState().hasTrack(
    currentTrack.albumId, currentTrack.id
  );

  const hasMultipleArtists =
    currentTrack.artists.length > 1 ||
    (currentTrack.composer && currentTrack.composer !== currentTrack.artists[0]);

  const MenuItem = ({ icon, label, onClick, accent }: {
    icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-4 w-full px-5 py-3.5',
        'text-[0.9rem] font-medium text-left',
        'hover:bg-white/5 active:bg-white/10 transition-colors duration-150',
        accent ? 'text-swara-accent' : 'text-swara-text',
      ].join(' ')}
    >
      <span className="w-5 flex items-center justify-center flex-shrink-0 text-swara-muted">
        {icon}
      </span>
      {label}
    </button>
  );

  const handleViewArtists = () => {
    if (hasMultipleArtists) {
      setArtistPickerOpen(true);
    } else {
      onClose();
      usePlayerStore.getState().setExpanded(false);
      const id = slugify(currentTrack.artists[0] ?? currentTrack.artist);
      setTimeout(() => navigate(`/artist/${id}`), 300);
    }
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        {/* Song + album name header */}
        <div className="px-5 pt-1 pb-3 border-b border-swara-border">
          <p className="text-[0.95rem] font-semibold text-swara-text truncate">{currentTrack.title}</p>
          <p className="text-[0.78rem] text-swara-muted mt-0.5 truncate">{currentTrack.album}</p>
        </div>

        {/* Menu items */}
        <div className="py-1">
          <MenuItem
            icon={
              <svg viewBox="0 0 24 24" width="18" height="18"
                fill={liked ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            }
            label={liked ? 'Added to Liked Songs' : 'Add to Liked Songs'}
            accent={liked}
            onClick={() => { trackActions.toggleLike(currentTrack); }}
          />

          <MenuItem
            icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
            label="Add to Playlist"
            onClick={() => { onClose(); alert('Coming Soon'); }}
          />

          <MenuItem
            icon={
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
              </svg>
            }
            label={inLib ? 'Remove from Library' : 'Add to Library'}
            onClick={() => {
              if (!albumFull) return;
              trackActions.toggleTrackLibrary(currentTrack, albumFull);
            }}
          />

          <div className="mx-5 my-1 h-px bg-swara-border" />

          <MenuItem
            icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>}
            label="Stash this Song"
            onClick={() => { onClose(); alert('Coming Soon'); }}
          />

          <MenuItem
            icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>}
            label="Go to Album"
            onClick={() => {
              onClose();
              usePlayerStore.getState().setExpanded(false);
              setTimeout(() => navigate(`/album/${currentTrack.albumId}`), 300);
            }}
          />

          <MenuItem
            icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
            label="View Artists"
            onClick={handleViewArtists}
          />
        </div>
      </BottomSheet>

      {/* Artist picker sub-sheet */}
      <ArtistPickerSheet
        isOpen={artistPickerOpen}
        onClose={() => setArtistPickerOpen(false)}
        onNavigate={() => {
          setArtistPickerOpen(false);
          onClose();
          usePlayerStore.getState().setExpanded(false);
        }}
        singers={currentTrack.artists}
        composer={currentTrack.composer || undefined}
      />
    </>
  );
};

// ─── FullscreenPlayer ─────────────────────────────────────────────────────────

const FullscreenPlayer = () => {
  const {
    currentTrack, isPlaying, isShuffle, repeat,
    progress, duration, isExpanded, queueSource,
    togglePlay, next, prev, toggleShuffle, toggleRepeat,
    seekTo, setExpanded,
  } = usePlayerStore();
  const { isLiked } = useLikedStore();
  const navigate = useNavigate();

  const [menuOpen,   setMenuOpen]   = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchState = useRef({ startY: 0, startX: 0, dragging: false, locked: false });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setCoverError(false); }, [currentTrack?.id]);

  // Non-passive touchmove to prevent pull-to-refresh only during dismiss drag
  useEffect(() => {
    if (!isExpanded) return;
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => { if (touchState.current.dragging) e.preventDefault(); };
    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, [isExpanded]);

  const onHandleTouchStart = useCallback((e: React.TouchEvent) => {
    touchState.current = { startY: e.touches[0].clientY, startX: e.touches[0].clientX, dragging: false, locked: false };
    setDragOffset(0);
  }, []);

  const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
    const ts = touchState.current;
    const dy = e.touches[0].clientY - ts.startY;
    const dx = Math.abs(e.touches[0].clientX - ts.startX);
    if (!ts.locked) {
      if (dy > 8 && dy > dx) { ts.dragging = true; ts.locked = true; }
      else if (dx > 8 || dy < -8) { ts.locked = true; return; }
    }
    if (ts.dragging && dy > 0) setDragOffset(dy);
  }, []);

  const onHandleTouchEnd = useCallback(() => {
    if (touchState.current.dragging && dragOffset > 80) setExpanded(false);
    setDragOffset(0);
    touchState.current.dragging = false;
    touchState.current.locked   = false;
  }, [dragOffset, setExpanded]);

  if (!currentTrack) return null;

  const liked       = isLiked(currentTrack.id);
  const coverSrc    = coverError || !currentTrack.coverUrl ? PH : currentTrack.coverUrl;
  const nextTracks  = getNextTracks(5);

  const RepeatIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ opacity: repeat !== 'off' ? 1 : 0.45 }}>
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
      <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
      {repeat === 'one' && <text x="9.5" y="14.5" fontSize="7" fill="currentColor" stroke="none" fontFamily="DM Sans" fontWeight="700">1</text>}
    </svg>
  );

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 z-[60] flex flex-col"
        style={{
          backgroundColor: '#0d0c0b',
          pointerEvents:   isExpanded ? 'auto' : 'none',
          transform:       isExpanded ? `translateY(${dragOffset}px)` : 'translateY(100%)',
          transition:      dragOffset > 0 ? 'none' : 'transform 0.42s cubic-bezier(0.16,1,0.3,1)',
          willChange:      'transform',
          overscrollBehavior: 'none',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Now playing"
      >
        {/* Background radial glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200,169,110,0.08), transparent)' }}
          aria-hidden="true" />

        {/* ── Handle + drag zone ── */}
        <div
          className="flex justify-center pt-[14px] pb-1 flex-shrink-0 cursor-pointer select-none"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
          onClick={() => setExpanded(false)}
          aria-hidden="true"
        >
          <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* ── Header: back | album name | dots ── */}
        <div
          className="flex items-center justify-between px-5 py-2 flex-shrink-0 select-none"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <button type="button" onClick={() => setExpanded(false)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all"
            aria-label="Minimise">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          <div className="flex-1 text-center px-2 min-w-0">
            {queueSource ? (
              <p className="text-[0.65rem] text-swara-dim font-medium tracking-[0.12em] uppercase truncate">
                {({ album: 'Playing from Album', liked: 'Liked Songs', library: 'Library', search: 'Search', artist: 'Artist', queue: 'Queue' } as const)[queueSource]}
              </p>
            ) : (
              <p className="text-[0.72rem] text-swara-muted font-medium tracking-[0.1em] uppercase truncate"
                style={{ fontSize: 'clamp(0.6rem, 2vw, 0.78rem)' }}>
                {currentTrack.album}
              </p>
            )}
          </div>

          <button type="button" onClick={() => setMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all"
            aria-label="More options">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto scrollbar-none" style={{ overscrollBehavior: 'contain' }}>
          <div className="px-8 pb-10">

            {/* Cover */}
            <div className="mt-3 mb-6">
              <div className="aspect-square w-full rounded-[28px] overflow-hidden"
                style={{
                  boxShadow: isPlaying
                    ? '0 0 0 1px rgba(255,255,255,0.05), 0 32px 80px rgba(0,0,0,0.8), 0 0 80px rgba(200,169,110,0.06)'
                    : '0 0 0 1px rgba(255,255,255,0.05), 0 24px 60px rgba(0,0,0,0.7)',
                  transition: 'box-shadow 0.7s ease',
                }}>
                <img
                  key={currentTrack.id}
                  src={coverSrc}
                  alt={currentTrack.album || 'Album art'}
                  className={['w-full h-full object-cover bg-swara-card', isPlaying ? 'animate-cover-breathe' : ''].join(' ')}
                  loading="eager"
                  onError={() => setCoverError(true)}
                />
              </div>
            </div>

            {/* Track title + heart */}
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-[1.3rem] font-bold text-swara-text tracking-tight leading-snug truncate font-display flex-1">
                {currentTrack.title}
              </h2>
              <button
                type="button"
                onClick={() => trackActions.toggleLike(currentTrack)}
                className={['w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 transition-colors duration-200',
                  liked ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
                aria-label={liked ? 'Unlike' : 'Like'}
              >
                <svg viewBox="0 0 24 24" width="22" height="22"
                  fill={liked ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </button>
            </div>
            <p className="text-[0.88rem] text-swara-muted mb-5 truncate">{currentTrack.artist}</p>

            {/* Seek bar */}
            <div className="mb-5">
              <div className="relative h-1 rounded-full cursor-pointer group"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
                  style={{ width: `${progress * 100}%`, background: '#c8a96e', transition: 'width 0.25s linear' }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${progress * 100}% - 7px)`, background: '#c8a96e', boxShadow: '0 0 0 4px rgba(200,169,110,0.2)' }} />
                <input type="range" min={0} max={1} step={0.001} value={progress}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  className="seek-bar absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Seek" />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[0.75rem] tabular-nums" style={{ color: '#5c5650' }}>{formatDuration(progress * duration)}</span>
                <span className="text-[0.75rem] tabular-nums" style={{ color: '#5c5650' }}>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Controls — exact git-play layout */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {/* Shuffle */}
              <button type="button" onClick={toggleShuffle}
                className="flex items-center justify-center w-11 h-11 rounded-full transition-colors duration-200"
                style={{ color: isShuffle ? '#c8a96e' : '#5c5650' }} aria-label="Shuffle">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                  strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  style={{ opacity: isShuffle ? 1 : 0.45 }}>
                  <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 1.9-1.7 3.3-1.7H22"/>
                  <path d="m18 2 4 4-4 4"/>
                  <path d="M2 6h1.9c1.5 0 2.9.9 3.5 2.2"/>
                  <path d="m18 14 4 4-4 4"/>
                  <path d="M21.7 16.4c-.3.5-.8.8-1.3 1.1l-.9.5"/>
                </svg>
              </button>

              {/* Prev */}
              <button type="button" onClick={prev}
                className="flex items-center justify-center w-12 h-12 text-swara-text active:scale-90 transition-all" aria-label="Previous">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
                  <polygon points="19 20 9 12 19 4 19 20"/>
                  <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Play/Pause */}
              <button type="button" onClick={togglePlay}
                className="flex items-center justify-center w-[68px] h-[68px] rounded-full active:scale-[0.93] transition-transform"
                style={{ background: '#c8a96e', color: '#0a0a0a', boxShadow: '0 4px 24px rgba(200,169,110,0.4)' }}
                aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                )}
              </button>

              {/* Next */}
              <button type="button" onClick={next}
                className="flex items-center justify-center w-12 h-12 text-swara-text active:scale-90 transition-all" aria-label="Next">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
                  <polygon points="5 4 15 12 5 20 5 4"/>
                  <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Repeat */}
              <button type="button" onClick={toggleRepeat}
                className="flex items-center justify-center w-11 h-11 rounded-full transition-colors duration-200"
                style={{ color: repeat !== 'off' ? '#c8a96e' : '#5c5650' }} aria-label={`Repeat: ${repeat}`}>
                <RepeatIcon />
              </button>
            </div>

            {/* Artists section */}
            {(currentTrack.artists.length > 0 || currentTrack.composer) && (
              <div className="border-t pt-5 mb-5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <p className="text-[0.7rem] font-semibold tracking-widest uppercase mb-3" style={{ color: '#5c5650' }}>
                  Artists
                </p>
                {currentTrack.artists.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[0.72rem] text-swara-muted mb-1.5 font-medium">Singers</p>
                    <div className="flex flex-col gap-0.5">
                      {currentTrack.artists.map((name) => (
                        <button key={name} type="button"
                          onClick={() => { setExpanded(false); setTimeout(() => navigate(`/artist/${slugify(name)}`), 300); }}
                          className="text-[0.88rem] font-medium text-swara-text hover:text-swara-accent text-left transition-colors w-fit">
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {currentTrack.composer && (
                  <div>
                    <p className="text-[0.72rem] text-swara-muted mb-1.5 font-medium">Composer</p>
                    <button type="button"
                      onClick={() => { setExpanded(false); setTimeout(() => navigate(`/artist/${slugify(currentTrack.composer)}`), 300); }}
                      className="text-[0.88rem] font-medium text-swara-text hover:text-swara-accent text-left transition-colors">
                      {currentTrack.composer}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Next Playing */}
            {nextTracks.length > 0 && (
              <div className="border-t pt-5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <p className="text-[0.7rem] font-semibold tracking-widest uppercase mb-3" style={{ color: '#5c5650' }}>
                  Next Playing
                </p>
                <div className="flex flex-col gap-0">
                  {nextTracks.map((track, i) => (
                    <div key={track.id} className="flex items-center gap-3 py-2.5 px-1 rounded-xl"
                      style={{ background: i === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                      <img src={track.coverUrl || PH} alt=""
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = PH; }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.82rem] font-medium text-swara-text truncate">{track.title}</p>
                        <p className="text-[0.7rem] text-swara-muted truncate">{track.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 3-dot menu */}
      <TrackMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
};

export default FullscreenPlayer;
