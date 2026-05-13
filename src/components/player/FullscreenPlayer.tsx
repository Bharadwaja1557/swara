import { useRef, useState, useCallback, useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { formatDuration } from '@/utils/greeting';

// ─── Inline SVG Icons ────────────────────────────────────────────────────────

const ShuffleIcon  = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={{ opacity: active ? 1 : 0.5 }}>
    <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
  </svg>
);

const RepeatIcon = ({ mode }: { mode: 'off' | 'all' | 'one' }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={{ opacity: mode !== 'off' ? 1 : 0.5 }}>
    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" />
    <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" />
    {mode === 'one' && (
      <text x="9.5" y="14.5" fontSize="7" fill="currentColor" stroke="none" fontFamily="DM Sans" fontWeight="700">1</text>
    )}
  </svg>
);

const HeartIcon = ({ liked }: { liked: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24"
    fill={liked ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

// ─── Fallback cover ───────────────────────────────────────────────────────────
const PLACEHOLDER_COVER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

// ─── FullscreenPlayer ─────────────────────────────────────────────────────────

const FullscreenPlayer = () => {
  const {
    currentTrack, queue, currentIndex,
    isPlaying, isShuffle, repeat,
    progress, duration,
    isExpanded,
    togglePlay, next, prev,
    toggleShuffle, toggleRepeat,
    seekTo, setExpanded,
  } = usePlayerStore();

  const [liked,       setLiked]       = useState(false);
  const [dragOffset,  setDragOffset]  = useState(0);
  const [coverError,  setCoverError]  = useState(false);
  const dragRef    = useRef<{ startY: number; dragging: boolean }>({ startY: 0, dragging: false });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset cover error when track changes
  useEffect(() => { setCoverError(false); }, [currentTrack?.id]);

  // ── Fix: prevent pull-to-refresh on fullscreen player ────────────────────
  // Must use non-passive native event listener so we can call preventDefault()
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      // Only block when actually dragging downward from top (dismiss gesture)
      if (dragRef.current.dragging) {
        // Let the gesture continue but stop browser from interpreting as pull-to-refresh
        e.preventDefault();
      } else if (e.touches[0].clientY > dragRef.current.startY) {
        // Block downward scroll inside expanded player to prevent page reload
        e.preventDefault();
      }
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [isExpanded]);

  // ── Swipe-down to dismiss ────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragRef.current = { startY: e.touches[0].clientY, dragging: true };
    setDragOffset(0);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.dragging) return;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    if (dy > 0) setDragOffset(dy);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (dragOffset > 100) setExpanded(false);
    setDragOffset(0);
    dragRef.current.dragging = false;
  }, [dragOffset, setExpanded]);

  if (!currentTrack) return null;

  const coverSrc = (coverError || !currentTrack.coverUrl)
    ? PLACEHOLDER_COVER
    : currentTrack.coverUrl;

  const nextTrack = queue[currentIndex + 1] ?? null;

  const currentSecs = progress * duration;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
      style={{
        background: 'var(--tw-bg, #09090C)',
        backgroundColor: '#09090C',
        transform: isExpanded ? `translateY(${dragOffset}px)` : 'translateY(100%)',
        transition: dragOffset > 0 ? 'none' : 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
        willChange: 'transform',
        /* Prevent ANY overscroll/pull-to-refresh inside the player */
        overscrollBehavior: 'none',
        touchAction: 'none',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
    >
      {/* Subtle radial glow from top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(200,169,106,0.07), transparent)',
        }}
        aria-hidden="true"
      />

      {/* ── Handle bar ── */}
      <div
        className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-pointer"
        onClick={() => setExpanded(false)}
        aria-hidden="true"
      >
        <div className="w-9 h-1 rounded-full bg-swara-border" />
      </div>

      {/* ── Header row: collapse + album name + more ── */}
      <div className="flex items-center justify-between px-5 py-2 flex-shrink-0">
        <button
          onClick={() => setExpanded(false)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all duration-100"
          aria-label="Minimise player"
          type="button"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className="flex-1 text-center px-2">
          <p className="text-[0.6875rem] text-swara-muted font-medium tracking-[0.12em] uppercase truncate">
            {currentTrack.album}
          </p>
        </div>

        <button
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all duration-100"
          aria-label="More options"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5"  r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div
        className="flex-1 overflow-y-auto scrollbar-none"
        style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
      >
        <div className="px-7 pb-8">
          {/* ── Album cover ── */}
          <div className="mt-3 mb-6">
            <div
              className="aspect-square w-full rounded-2xl overflow-hidden bg-swara-card"
              style={{
                boxShadow: isPlaying
                  ? '0 8px 48px rgba(0,0,0,0.7), 0 0 80px rgba(200,169,106,0.08)'
                  : '0 8px 40px rgba(0,0,0,0.6)',
                transition: 'box-shadow 0.7s ease',
              }}
            >
              <img
                key={currentTrack.id}       /* remount on track change */
                src={coverSrc}
                alt={currentTrack.album || 'Album art'}
                className={[
                  'w-full h-full object-cover',
                  isPlaying ? 'animate-cover-breathe' : '',
                ].join(' ')}
                loading="eager"
                onError={() => setCoverError(true)}
              />
            </div>
          </div>

          {/* ── Track info + like ── */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-[1.15rem] font-bold text-swara-text tracking-tight leading-snug truncate font-display">
                {currentTrack.title}
              </h2>
              <p className="text-[0.8125rem] text-swara-muted mt-1 truncate">
                {currentTrack.artist}
              </p>
            </div>
            <button
              onClick={() => setLiked((l) => !l)}
              className={[
                'flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full',
                'transition-colors duration-200 mt-0.5',
                liked ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted',
              ].join(' ')}
              aria-label={liked ? 'Unlike' : 'Like'}
              type="button"
            >
              <HeartIcon liked={liked} />
            </button>
          </div>

          {/* ── Seek bar ── */}
          <div className="mb-6">
            <div className="relative h-1 bg-swara-border rounded-full mb-2.5 group cursor-pointer">
              {/* Fill */}
              <div
                className="absolute top-0 left-0 h-full bg-swara-accent rounded-full pointer-events-none"
                style={{ width: `${progress * 100}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-swara-text rounded-full shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progress * 100}% - 7px)` }}
              />
              <input
                type="range" min={0} max={1} step={0.001} value={progress}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="seek-bar absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Seek"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[0.6875rem] text-swara-dim font-medium tabular-nums">
                {formatDuration(currentSecs)}
              </span>
              <span className="text-[0.6875rem] text-swara-dim font-medium tabular-nums">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* ── Playback controls ── */}
          <div className="flex items-center justify-between mb-6">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={[
                'w-11 h-11 flex items-center justify-center rounded-full transition-colors duration-200',
                isShuffle ? 'text-swara-accent' : 'text-swara-muted hover:text-swara-text',
              ].join(' ')}
              aria-label={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
              type="button"
            >
              <ShuffleIcon active={isShuffle} />
            </button>

            {/* Prev */}
            <button
              onClick={prev}
              className="w-12 h-12 flex items-center justify-center text-swara-text active:scale-90 hover:text-swara-accent transition-all duration-100"
              aria-label="Previous"
              type="button"
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="19 20 9 12 19 4 19 20" />
                <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="w-[68px] h-[68px] rounded-full bg-swara-text text-swara-bg flex items-center justify-center active:scale-90 transition-transform duration-100 shadow-player"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              type="button"
            >
              {isPlaying ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6"  y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={next}
              className="w-12 h-12 flex items-center justify-center text-swara-text active:scale-90 hover:text-swara-accent transition-all duration-100"
              aria-label="Next"
              type="button"
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Repeat */}
            <button
              onClick={toggleRepeat}
              className={[
                'w-11 h-11 flex items-center justify-center rounded-full transition-colors duration-200',
                repeat !== 'off' ? 'text-swara-accent' : 'text-swara-muted hover:text-swara-text',
              ].join(' ')}
              aria-label={`Repeat: ${repeat}`}
              type="button"
            >
              <RepeatIcon mode={repeat} />
            </button>
          </div>

          {/* ── Next up ── */}
          {nextTrack && (
            <div className="border-t border-swara-border pt-4 mt-2">
              <p className="text-[0.6875rem] font-semibold text-swara-muted tracking-widest uppercase mb-2">
                Next Up
              </p>
              <div className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-swara-card transition-colors duration-150">
                <img
                  src={nextTrack.coverUrl || PLACEHOLDER_COVER}
                  alt={nextTrack.album}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_COVER; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8125rem] font-medium text-swara-text leading-snug truncate tracking-tight">
                    {nextTrack.title}
                  </p>
                  <p className="text-[0.6875rem] text-swara-muted truncate">{nextTrack.artist}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullscreenPlayer;
