/**
 * src/pages/LikedSongsPage.tsx
 *
 * Liked Songs collection — like an album page but for the user's cloud-backed
 * liked tracks. Heart buttons and menus work identically to AlbumPage.
 *
 * Uses the same memo + fine-grained selector pattern as AlbumPage to prevent
 * re-render loops on progress ticks.
 */
import { memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '@/store/playerStore';
import { useLikedStore } from '@/store/likedStore';
import type { Track } from '@/types/music';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/></svg>';

// ── Heart artwork cover ────────────────────────────────────────────────────────
const HeartCover = ({ size }: { size: 'sm' | 'lg' }) => {
  const px = size === 'lg' ? 280 : 200;
  return (
    <div
      className="rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{
        width: px, height: px,
        background: 'linear-gradient(135deg, #1e0b0b 0%, #2d1212 45%, #1a0808 100%)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.65)',
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 24 24" width={px * 0.42} height={px * 0.42}
        fill="#c8a96e" stroke="#c8a96e" strokeWidth="0.5"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    </div>
  );
};

// ── PlayingBars (mirrors AlbumPage) ───────────────────────────────────────────
const PlayingBars = () => (
  <div className="flex gap-[2px] items-end justify-center h-[14px]" aria-hidden="true">
    {[{ h: '55%', delay: '0s' }, { h: '100%', delay: '0.15s' }, { h: '40%', delay: '0.3s' }].map((b, i) => (
      <span key={i} className="w-[3px] bg-swara-accent rounded-full"
        style={{ height: b.h, animation: `eq 0.9s ease-in-out ${b.delay} infinite`, transformOrigin: 'bottom' }} />
    ))}
  </div>
);

// ── Track row ─────────────────────────────────────────────────────────────────
const LikedTrackRow = memo(({ track, queue }: { track: Track; queue: Track[] }) => {
  const playTrack      = usePlayerStore((s) => s.playTrack);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);
  const isPlayingStore = usePlayerStore((s) => s.isPlaying);
  const { isLiked, toggleLike } = useLikedStore();

  const [menuMounted, setMenuMounted] = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);

  const isActive  = currentTrackId === track.id;
  const isPlaying = isPlayingStore && isActive;
  const liked     = isLiked(track.id);

  const handlePlay      = useCallback(() => playTrack(track, queue), [playTrack, track, queue]);
  const handleKeyDown   = useCallback((e: React.KeyboardEvent) => { if (e.key === 'Enter') playTrack(track, queue); }, [playTrack, track, queue]);
  const handleOpenMenu  = useCallback(() => { setMenuMounted(true); setMenuOpen(true); }, []);

  return (
    <li
      className={['flex items-center gap-3 px-2 py-3 rounded-xl transition-colors duration-150 cursor-pointer hover:bg-swara-card active:scale-[0.98]', isActive ? 'bg-swara-card' : ''].join(' ')}
      onClick={handlePlay}
      role="button" tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Cover */}
      <img src={track.coverUrl || PH} alt=""
        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />

      {/* Title + artist */}
      <div className="flex-1 min-w-0">
        <p className={['text-[0.88rem] font-medium truncate leading-snug', isActive ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>
          {track.title}
        </p>
        <p className="text-[0.72rem] text-swara-muted truncate mt-[1px]">
          {track.artist}{track.album ? ` · ${track.album}` : ''}
        </p>
      </div>

      {/* Playing bars (active track) */}
      {isActive && isPlaying && (
        <div className="flex-shrink-0 mr-1">
          <PlayingBars />
        </div>
      )}

      {/* Heart + menu */}
      <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => toggleLike(track)}
          className={['w-9 h-9 flex items-center justify-center rounded-full transition-colors', liked ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
          aria-label={liked ? 'Unlike' : 'Like'}>
          <svg viewBox="0 0 24 24" width="17" height="17"
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>
        <button type="button" onClick={handleOpenMenu}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-dim hover:text-swara-muted transition-colors"
          aria-label="Track options">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </div>

      {/* Lazy-mounted track menu (same pattern as AlbumPage) */}
      {menuMounted && (
        <div
          className="fixed inset-0 z-[90]"
          style={{ pointerEvents: menuOpen ? 'auto' : 'none' }}
        >
          <div
            className="absolute inset-0 bg-black/50 transition-opacity duration-300"
            style={{ opacity: menuOpen ? 1 : 0 }}
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl p-4 flex flex-col gap-1"
            style={{
              background: '#1a1a24',
              transform: menuOpen ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            <div className="flex items-center gap-3 pb-3 mb-2 border-b border-swara-border">
              <img src={track.coverUrl || PH} alt="" className="w-10 h-10 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[0.88rem] font-semibold text-swara-text truncate">{track.title}</p>
                <p className="text-[0.72rem] text-swara-muted truncate">{track.artist}</p>
              </div>
            </div>
            <button type="button" onClick={() => { toggleLike(track); setMenuOpen(false); }}
              className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-swara-card text-left transition-colors">
              <svg viewBox="0 0 24 24" width="18" height="18" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={liked ? 'text-swara-accent' : 'text-swara-muted'} aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
              <span className="text-[0.88rem] text-swara-text">{liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</span>
            </button>
            <button type="button" onClick={() => setMenuOpen(false)}
              className="mt-1 py-2.5 text-center text-[0.85rem] text-swara-muted">
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
});

// ── LikedSongsPage ────────────────────────────────────────────────────────────
const LikedSongsPage = () => {
  const navigate      = useNavigate();
  const getLikedTracks = useLikedStore((s) => s.getLikedTracks);
  const playTrack      = usePlayerStore((s) => s.playTrack);
  const [isShuffle, setIsShuffle] = useState(false);

  const tracks = getLikedTracks();

  const handlePlay = useCallback(() => {
    if (!tracks.length) return;
    const queue = isShuffle
      ? [...tracks].sort(() => Math.random() - 0.5)
      : tracks;
    playTrack(queue[0], queue);
  }, [tracks, isShuffle, playTrack]);

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* Back */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 lg:px-8 pt-5 pb-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all"
          aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      {/* Hero — same side-by-side layout as AlbumPage on desktop */}
      <div className="px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:gap-10 mb-4 lg:mb-8">

          {/* Cover */}
          <div className="flex justify-center lg:justify-start mb-5 lg:mb-0">
            <HeartCover size="sm" />
          </div>

          {/* Meta */}
          <div className="lg:flex-1 lg:min-w-0 lg:pb-1">
            <p className="hidden lg:block text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-swara-dim mb-2">Playlist</p>
            <h1 className="text-[1.3rem] lg:text-[2.6rem] font-bold text-swara-text tracking-tight font-display mb-0.5 lg:mb-2 lg:leading-none">
              Liked Songs
            </h1>
            <p className="text-xs lg:text-[0.92rem] text-swara-muted mt-0.5 lg:mt-1.5">
              {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4 py-2 border-t border-b border-swara-border">
          <span className="text-[0.82rem] text-swara-muted font-medium">
            {tracks.length > 0 ? `${tracks.length} tracks` : 'No liked songs yet'}
          </span>
          {tracks.length > 0 && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setIsShuffle((s) => !s)}
                className={['w-9 h-9 flex items-center justify-center rounded-full transition-colors', isShuffle ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
                aria-label={isShuffle ? 'Shuffle on' : 'Shuffle off'}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  style={{ opacity: isShuffle ? 1 : 0.5 }}>
                  <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                  <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                </svg>
              </button>
              <button type="button" onClick={handlePlay}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-swara-accent text-swara-bg active:scale-95 transition-transform"
                aria-label="Play liked songs">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Track list */}
      <div className="px-4 lg:px-8 pb-8">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e0b0b, #2d1212)' }}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </div>
            <p className="text-[0.88rem] font-semibold text-swara-muted">No liked songs yet</p>
            <p className="text-[0.76rem] text-swara-dim text-center max-w-[220px]">
              Tap the heart icon on any track to save it here.
            </p>
          </div>
        ) : (
          <ul className="space-y-0">
            {tracks.map((track) => (
              <LikedTrackRow key={track.id} track={track} queue={tracks} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LikedSongsPage;
