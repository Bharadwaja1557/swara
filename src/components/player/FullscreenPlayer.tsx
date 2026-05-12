import { useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { formatDuration } from '@/utils/greeting';

// ─── Icons ───────────────────────────────────────────────────────────────────

const PrevIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 4h2v16H6zM17.58 4.19a1 1 0 0 0-1.09.09l-8 6a1 1 0 0 0 0 1.64l8 6A1 1 0 0 0 18 17V7a1 1 0 0 0-.42-.81Z" />
  </svg>
);

const NextIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 4h2v16h-2zM6.42 4.19A1 1 0 0 0 6 5v12a1 1 0 0 0 1.58.81l8-6a1 1 0 0 0 0-1.64l-8-6a1 1 0 0 0-.49-.14A1 1 0 0 0 6.42 4.19Z" />
  </svg>
);

const ShuffleIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 3h5v5M4 20 21 3M16 21h5v-5M4 4l5 5M15 15l6 6" />
    {active && <circle cx="22" cy="22" r="0" fill="currentColor" />}
  </svg>
);

const RepeatIcon = ({ mode }: { mode: 'off' | 'all' | 'one' }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    {mode === 'one' && <text x="10" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="Inter" fontWeight="600">1</text>}
  </svg>
);

const HeartIcon = ({ liked }: { liked: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
  </svg>
);

// ─── FullscreenPlayer ─────────────────────────────────────────────────────────

const FullscreenPlayer = () => {
  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    isShuffle,
    repeat,
    progress,
    duration,
    isExpanded,
    togglePlay,
    next,
    prev,
    toggleShuffle,
    toggleRepeat,
    seekTo,
    setExpanded,
  } = usePlayerStore();

  const [liked, setLiked] = useState(false);
  const dragRef = useRef<{ startY: number; isDragging: boolean }>({ startY: 0, isDragging: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // ── Swipe-down to dismiss ────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragRef.current = { startY: e.touches[0].clientY, isDragging: true };
    setDragOffset(0);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.isDragging) return;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    if (dy > 0) setDragOffset(dy);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (dragOffset > 120) {
      setExpanded(false);
    }
    setDragOffset(0);
    dragRef.current.isDragging = false;
  }, [dragOffset, setExpanded]);

  if (!currentTrack) return null;

  const nextTracks = queue.slice(currentIndex + 1).slice(0, 5);

  // const translateY = isExpanded ? dragOffset : '100%';

  return (
    <div
      ref={containerRef}
      className={[
        'fixed inset-0 z-[60] flex flex-col',
        'bg-swara-bg',
        'overflow-hidden',
      ].join(' ')}
      style={{
        transform: isExpanded ? `translateY(${dragOffset}px)` : 'translateY(100%)',
        transition: dragOffset > 0 ? 'none' : 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'transform',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-label="Now playing"
      role="dialog"
      aria-modal="true"
    >
      {/* Background tint from cover */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top, rgba(200,169,106,0.15) 0%, transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1 flex-shrink-0" aria-hidden="true">
        <div className="w-9 h-1 rounded-full bg-swara-border" />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-2 flex-shrink-0">
        <button
          onClick={() => setExpanded(false)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all duration-100"
          aria-label="Minimize player"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <p className="text-[0.6875rem] text-swara-muted font-medium tracking-widest uppercase">Now Playing</p>
        </div>

        <button
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all duration-100"
          aria-label="More options"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-6 pb-6">
        {/* Artwork */}
        <div className="mt-4 mb-6">
          <div className="aspect-square w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)] bg-swara-card">
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.album}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        </div>

        {/* Track info + like */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-swara-text tracking-tight leading-snug truncate">
              {currentTrack.title}
            </h2>
            <p className="text-sm text-swara-muted mt-0.5 truncate">
              {currentTrack.artist}
            </p>
            <p className="text-[0.6875rem] text-swara-dim mt-0.5 truncate">
              {currentTrack.album} · {currentTrack.year}
            </p>
          </div>
          <button
            onClick={() => setLiked((l) => !l)}
            className={[
              'flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full',
              'transition-colors duration-200',
              liked ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted',
            ].join(' ')}
            aria-label={liked ? 'Unlike track' : 'Like track'}
            type="button"
          >
            <HeartIcon liked={liked} />
          </button>
        </div>

        {/* Seek bar */}
        <div className="mb-4">
          <div className="relative h-1 bg-swara-border rounded-full mb-2">
            <div
              className="absolute top-0 left-0 h-full bg-swara-accent rounded-full pointer-events-none"
              style={{ width: `${progress * 100}%` }}
            />
            <input
              type="range"
              className="seek-bar absolute inset-0 w-full opacity-0 cursor-pointer h-full"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              aria-label="Seek"
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[0.6875rem] text-swara-dim font-medium tabular-nums">
              {formatDuration(progress * duration)}
            </span>
            <span className="text-[0.6875rem] text-swara-dim font-medium tabular-nums">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-between mb-6">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={[
              'w-10 h-10 flex items-center justify-center rounded-full',
              'transition-colors duration-200',
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
            className="w-12 h-12 flex items-center justify-center text-swara-text active:scale-90 transition-transform duration-100 hover:text-swara-accent"
            aria-label="Previous track"
            type="button"
          >
            <PrevIcon />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className={[
              'w-16 h-16 rounded-full flex items-center justify-center',
              'bg-swara-text text-swara-bg',
              'active:scale-90 transition-transform duration-100',
              'shadow-card',
            ].join(' ')}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            type="button"
          >
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 4.75v14.5a.75.75 0 0 0 1.14.64l11.5-7.25a.75.75 0 0 0 0-1.28L7.14 4.11A.75.75 0 0 0 6 4.75Z" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button
            onClick={next}
            className="w-12 h-12 flex items-center justify-center text-swara-text active:scale-90 transition-transform duration-100 hover:text-swara-accent"
            aria-label="Next track"
            type="button"
          >
            <NextIcon />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            className={[
              'w-10 h-10 flex items-center justify-center rounded-full',
              'transition-colors duration-200',
              repeat !== 'off' ? 'text-swara-accent' : 'text-swara-muted hover:text-swara-text',
            ].join(' ')}
            aria-label={`Repeat: ${repeat}`}
            type="button"
          >
            <RepeatIcon mode={repeat} />
          </button>
        </div>

        {/* Next Playing Queue */}
        {nextTracks.length > 0 && (
          <div className="mt-2">
            <p className="text-[0.6875rem] font-semibold text-swara-muted tracking-widest uppercase mb-3">
              Next Playing
            </p>
            <div className="flex flex-col gap-1">
              {nextTracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-swara-card transition-colors duration-150"
                >
                  <img
                    src={track.coverUrl}
                    alt={track.album}
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] font-medium text-swara-text leading-snug truncate tracking-tight">
                      {track.title}
                    </p>
                    <p className="text-[0.6875rem] text-swara-muted truncate">
                      {track.artist}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullscreenPlayer;
