/**
 * QueuePage — full queue management page.
 *
 * Route: /queue
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE: WHY PREVIOUS APPROACH COULD NEVER MATCH FULLSCREENPLAYER
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * FullscreenPlayer render tree:
 *   <div fixed inset-0 z-[60]>          ← THE TRANSFORM LAYER
 *     transform: translateY(dragOffset)
 *     position: fixed — outside ALL scroll containers
 *     owns its own compositor layer unconditionally
 *     ├── handle + header (flex-shrink-0, drag targets)
 *     └── <div flex-1 overflow-y-auto>  ← scroll lives INSIDE transform
 *
 * Previous QueuePage render tree:
 *   <main overflow-y-auto>              ← ROUTER SCROLL CONTAINER (AppLayout)
 *     └── <div willChange:transform>   ← attempted transform layer
 *           ├── <div sticky top-0>     ← PROBLEM: sticky is relative to <main>,
 *           │    not to the transform layer. When the container translates down,
 *           │    sticky fights back upward to stay at top:0 of <main>.
 *           │    Header and content move in OPPOSITE DIRECTIONS → visual detach.
 *           └── queue list
 *
 * The second problem: transform on a child of a scroll container applies within
 * the SCROLL VIEWPORT, not the fixed viewport. translateY(80px) means "80px down
 * from current scroll position", not "80px down from top of screen". At any
 * non-zero scroll position the visual displacement is wrong, producing the
 * laggy/stuck sensation that isn't a gesture math issue at all.
 *
 * THE FIX — MATCH FULLSCREENPLAYER EXACTLY ON MOBILE:
 *   On mobile: render as `fixed inset-0 z-[59]` (just below FullscreenPlayer).
 *     - Outside all scroll containers → transforms apply to the viewport
 *     - No sticky elements → header is flex-shrink-0 in a flex column
 *     - Own compositor layer → GPU-driven, zero layout interaction
 *     - Scroll lives inside the fixed layer (flex-1 overflow-y-auto)
 *     - Gesture architecture is identical to FullscreenPlayer
 *   On desktop: normal routed page inside the grid, no fixed positioning,
 *     no gesture, no touch handlers → desktop unchanged.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * GESTURE ARCHITECTURE (mobile only, mirrors FullscreenPlayer exactly):
 *
 *   dragOffset (state) → drives translateY on the fixed container
 *   touchState (ref)   → gesture tracking without re-renders
 *   transition:
 *     dragOffset > 0  → 'none'   (1:1 finger tracking)
 *     dragOffset = 0  → spring   (snap-back or enter animation)
 *   Non-passive touchmove on container → e.preventDefault during drag
 *   Dismiss threshold: 80px
 *   Bidirectional: offset = Math.max(0, dy) — finger can reverse upward
 *
 * NOTE ON setDragOffset vs direct DOM mutation:
 *   FullscreenPlayer uses setDragOffset (state). It gets away with it because
 *   its render tree is ~40 nodes. QueuePage uses direct DOM mutation in
 *   touchMove (zero React renders during drag), then setDragOffset(0) only on
 *   touchEnd to trigger the spring-back transition via React reconciliation.
 *   This gives us the same spring-back without per-frame React overhead.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
import { useRef, useEffect, useCallback, useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore, getActiveQueue, getEngineIdx } from '@/store/playerStore';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { trackActions } from '@/lib/trackActions';
import type { QueueContext, Track } from '@/types/music';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';
const SPRING = 'transform 0.42s cubic-bezier(0.16,1,0.3,1)';
const DISMISS_THRESHOLD = 80;

// ── Playing bars ──────────────────────────────────────────────────────────────
const PlayingBars = () => (
  <div className="flex gap-[2px] items-end justify-center h-[13px] w-4 flex-shrink-0" aria-hidden="true">
    {[{ h: '55%', d: '0s' }, { h: '100%', d: '0.15s' }, { h: '40%', d: '0.3s' }].map((b, i) => (
      <span key={i} className="w-[3px] bg-swara-accent rounded-full"
        style={{ height: b.h, animation: `eq 0.9s ease-in-out ${b.d} infinite`, transformOrigin: 'bottom' }} />
    ))}
  </div>
);

// ── Context label ─────────────────────────────────────────────────────────────
const CONTEXT_LABELS: Record<string, string> = {
  album: 'Playing from Album', artist: 'Playing from Artist',
  liked: 'Playing from Liked Songs', library: 'Playing from Library',
  playlist: 'Playing from Playlist', search: 'Playing from Search',
  manual: 'Queue', unknown: 'Now Playing',
};
function contextLabel(ctx: QueueContext | null): string {
  if (!ctx) return 'Queue';
  return CONTEXT_LABELS[ctx.type] ?? 'Queue';
}

// ── Drag-to-reorder state ─────────────────────────────────────────────────────
interface DragState { dragging: number | null; over: number | null; }

// ── Queue row ─────────────────────────────────────────────────────────────────
const QueueRow = memo(({
  track, isActive, isPlaying,
  onPlay, onRemove, onDragStart, onDragEnter, onDragEnd,
  isDragging, isOver,
}: {
  track: Track; isActive: boolean; isPlaying: boolean;
  onPlay: () => void; onRemove: () => void;
  onDragStart: () => void; onDragEnter: () => void; onDragEnd: () => void;
  isDragging: boolean; isOver: boolean;
}) => (
  <div className="relative">
    {/* Insertion indicator — separate element, inline color, no CSS class flash */}
    {isOver && (
      <div className="absolute top-0 left-3 right-3 h-[2px] rounded-full pointer-events-none z-10"
        style={{ background: '#c8a96e' }} aria-hidden="true" />
    )}
    <div
      className={[
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-100 cursor-pointer',
        isActive ? 'bg-swara-card' : 'hover:bg-swara-card/60',
        isDragging ? 'opacity-40 scale-[0.98]' : '',
      ].filter(Boolean).join(' ')}
      onClick={onPlay}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
      onDragEnter={(e) => { e.preventDefault(); onDragEnter(); }}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onPlay(); }}
      aria-label={`${track.title} — ${track.artist}`}
    >
      {/* Drag handle — always visible */}
      <div className="flex-shrink-0 text-swara-dim opacity-40 hover:opacity-70 transition-opacity cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="8" y1="6" x2="16" y2="6"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
          <line x1="8" y1="18" x2="16" y2="18"/>
        </svg>
      </div>

      <img src={track.coverUrl || PH} alt=""
        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-swara-elevated" loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).src = PH; }} />

      <div className="flex-1 min-w-0">
        <p className={['text-[0.87rem] font-medium truncate leading-snug',
          isActive ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>
          {track.title}
        </p>
        <p className="text-[0.72rem] text-swara-muted truncate mt-[1px]">{track.artist}</p>
      </div>

      {/* Remove button — always visible */}
      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {isActive && isPlaying ? (
          <PlayingBars />
        ) : (
          <button type="button" onClick={onRemove}
            className="w-7 h-7 rounded-full flex items-center justify-center text-swara-dim opacity-40 hover:opacity-100 hover:text-swara-muted transition-all"
            aria-label="Remove from queue">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  </div>
));

// ── Queue content — same JSX for both mobile and desktop ──────────────────────
const QueueContent = memo(({
  prevTracks, nowPlaying, nextUp, isEmpty, activeIdx, isPlaying,
  dragState, currentRowRef,
  handlePlay, handleRemove, handleDragStart, handleDragEnter, handleDragEnd,
  navigate, queueContext,
}: {
  prevTracks: Track[]; nowPlaying: Track | null; nextUp: Track[];
  isEmpty: boolean; activeIdx: number; isPlaying: boolean;
  dragState: DragState; currentRowRef: React.RefObject<HTMLDivElement>;
  handlePlay: (i: number) => void; handleRemove: (i: number) => void;
  handleDragStart: (i: number) => void; handleDragEnter: (i: number) => void;
  handleDragEnd: () => void;
  navigate: ReturnType<typeof useNavigate>; queueContext: QueueContext | null;
}) => (
  <>
    {isEmpty && (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-6">
        <div className="w-16 h-16 rounded-2xl bg-swara-elevated flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none"
            stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </div>
        <p className="text-[0.9rem] font-semibold text-swara-muted">Queue is empty</p>
        <p className="text-[0.78rem] text-swara-dim text-center max-w-[220px] leading-relaxed">
          Play a song or album to add tracks to your queue.
        </p>
        <button type="button" onClick={() => navigate('/search')}
          className="mt-2 px-5 py-2 rounded-full bg-swara-accent text-swara-bg text-[0.82rem] font-semibold active:scale-95 transition-transform">
          Browse Music
        </button>
      </div>
    )}

    {!isEmpty && (
      <div className="px-3 lg:px-6 pb-8 pt-2">
        {/* Context artwork */}
        {queueContext?.artwork && (
          <div className="flex items-center gap-3 px-2 py-3 mb-2 rounded-xl">
            <img src={queueContext.artwork} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />
            <div className="flex-1 min-w-0">
              <p className="text-[0.82rem] font-semibold text-swara-text truncate">{queueContext.title}</p>
              {queueContext.subtitle && (
                <p className="text-[0.7rem] text-swara-muted truncate">{queueContext.subtitle}</p>
              )}
            </div>
          </div>
        )}

        {/* Previously played */}
        {prevTracks.length > 0 && (
          <div className="mb-4">
            <p className="text-[0.65rem] font-semibold text-swara-muted/50 tracking-widest uppercase px-2 mb-1.5">
              Previously played
            </p>
            <div className="opacity-40">
              {prevTracks.map((track, i) => (
                <QueueRow key={`prev-${track.id}-${i}`}
                  track={track} isActive={false} isPlaying={false}
                  onPlay={() => handlePlay(i)} onRemove={() => handleRemove(i)}
                  onDragStart={() => handleDragStart(i)} onDragEnter={() => handleDragEnter(i)}
                  onDragEnd={handleDragEnd}
                  isDragging={dragState.dragging === i} isOver={dragState.over === i}
                />
              ))}
            </div>
          </div>
        )}

        {/* Now playing */}
        {nowPlaying && (
          <div className="mb-4">
            <p className="text-[0.65rem] font-semibold text-swara-accent/70 tracking-widest uppercase px-2 mb-1.5">
              Now playing
            </p>
            <div ref={currentRowRef}>
              <QueueRow
                track={nowPlaying} isActive={true} isPlaying={isPlaying}
                onPlay={() => handlePlay(activeIdx)} onRemove={() => handleRemove(activeIdx)}
                onDragStart={() => handleDragStart(activeIdx)} onDragEnter={() => handleDragEnter(activeIdx)}
                onDragEnd={handleDragEnd}
                isDragging={dragState.dragging === activeIdx} isOver={dragState.over === activeIdx}
              />
            </div>
          </div>
        )}

        {/* Next up */}
        {nextUp.length > 0 && (
          <div>
            <p className="text-[0.65rem] font-semibold text-swara-muted tracking-widest uppercase px-2 mb-1.5">
              Next up · {nextUp.length} track{nextUp.length !== 1 ? 's' : ''}
            </p>
            {nextUp.map((track, i) => {
              const absIdx = activeIdx + 1 + i;
              return (
                <QueueRow key={`next-${track.id}-${absIdx}`}
                  track={track} isActive={false} isPlaying={false}
                  onPlay={() => handlePlay(absIdx)} onRemove={() => handleRemove(absIdx)}
                  onDragStart={() => handleDragStart(absIdx)} onDragEnter={() => handleDragEnter(absIdx)}
                  onDragEnd={handleDragEnd}
                  isDragging={dragState.dragging === absIdx} isOver={dragState.over === absIdx}
                />
              );
            })}
          </div>
        )}
      </div>
    )}
  </>
));

// ── QueuePage ─────────────────────────────────────────────────────────────────
const QueuePage = () => {
  const navigate   = useNavigate();
  const isDesktop  = useIsDesktop();

  // Reactive store subscriptions
  const queueVersion       = usePlayerStore((s) => s.queueVersion);
  const isPlaying          = usePlayerStore((s) => s.isPlaying);
  const queueContext       = usePlayerStore((s) => s.queueContext);
  const playTrackFromQueue = usePlayerStore((s) => s.playTrackFromQueue);

  // Drag-to-reorder state
  const [dragState, setDragState] = useState<DragState>({ dragging: null, over: null });

  // ── Gesture state (mobile only) ───────────────────────────────────────────
  // dragOffset drives the translateY on the fixed container.
  // Only ever set to a non-zero value during the spring-back animation.
  // During active dragging, we mutate DOM directly (zero React renders).
  const [dragOffset, setDragOffset] = useState(0);

  // Same shape as FullscreenPlayer.touchState
  const touchState = useRef({
    startY:   0,
    startX:   0,
    dragging: false,
    locked:   false,
    offsetY:  0,
  });

  // Refs
  const containerRef  = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLDivElement>(null);

  // ── Non-passive touchmove guard (mobile only) ─────────────────────────────
  // Prevents pull-to-refresh during an active dismiss drag.
  // Must be imperative — React synthetic events are passive.
  useEffect(() => {
    if (isDesktop) return;
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => {
      if (touchState.current.dragging) e.preventDefault();
    };
    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, [isDesktop]);

  // Auto-scroll current track into view on mount
  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // ── Direct DOM transform helpers ─────────────────────────────────────────
  // Called during touchMove — bypasses React entirely for zero-overhead updates.
  const applyTransform = useCallback((dy: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform  = `translateY(${dy}px)`;
    el.style.opacity    = String(Math.max(0.6, 1 - dy / 400));
  }, []);

  // ── Touch handlers (header zone only — same targets as FullscreenPlayer) ──
  const onHandleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isDesktop) return;
    touchState.current = {
      startY:   e.touches[0].clientY,
      startX:   e.touches[0].clientX,
      dragging: false,
      locked:   false,
      offsetY:  0,
    };
    const el = containerRef.current;
    if (el) el.style.transition = 'none'; // pre-clear so first frame has no delay
  }, [isDesktop]);

  const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDesktop) return;
    const ts = touchState.current;
    const dy = e.touches[0].clientY - ts.startY;
    const dx = Math.abs(e.touches[0].clientX - ts.startX);

    if (!ts.locked) {
      if (dy > 8 && dy > dx)      { ts.dragging = true; ts.locked = true; }
      else if (dx > 8 || dy < -8) { ts.locked = true; return; }
      else return;
    }

    if (!ts.dragging) return;

    // Math.max(0, dy) — bidirectional: finger can reverse upward back to 0
    const offset = Math.max(0, dy);
    ts.offsetY = offset;
    applyTransform(offset); // direct DOM mutation — zero React renders
  }, [isDesktop, applyTransform]);

  const onHandleTouchEnd = useCallback(() => {
    if (isDesktop) return;
    const ts = touchState.current;
    if (!ts.dragging) return;

    if (ts.offsetY > DISMISS_THRESHOLD) {
      navigate(-1);
    } else {
      // Spring back: set React state to 0, which triggers reconciliation
      // that writes the spring transition + transform:0 back to the element.
      setDragOffset(0);
    }

    ts.dragging = false;
    ts.locked   = false;
    ts.offsetY  = 0;
  }, [isDesktop, navigate]);

  // ── Drag-to-reorder handlers ──────────────────────────────────────────────
  const handlePlay = useCallback((index: number) => {
    playTrackFromQueue(index);
  }, [playTrackFromQueue]);

  const handleRemove = useCallback((index: number) => {
    trackActions.removeFromQueue(index);
  }, []);

  const handleDragStart = useCallback((index: number) => {
    setDragState({ dragging: index, over: null });
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    setDragState((prev) => ({ ...prev, over: index }));
  }, []);

  const handleDragEnd = useCallback(() => {
    const { dragging, over } = dragState;
    if (dragging !== null && over !== null && dragging !== over) {
      usePlayerStore.getState().moveQueueTrack(dragging, over);
    }
    setDragState({ dragging: null, over: null });
  }, [dragState]);

  const handleClear = useCallback(() => {
    trackActions.clearQueue();
    navigate(-1);
  }, [navigate]);

  // ── Queue derivations — memoized by queueVersion ──────────────────────────
  const activeIdx = getEngineIdx();
  const { prevTracks, nowPlaying, nextUp, isEmpty } = useMemo(() => {
    const q   = getActiveQueue();
    const idx = getEngineIdx();
    return {
      prevTracks: q.slice(0, idx),
      nowPlaying: q[idx] ?? null,
      nextUp:     q.slice(idx + 1),
      isEmpty:    q.length === 0,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueVersion]);

  void queueVersion;

  // ── Shared header JSX ─────────────────────────────────────────────────────
  const headerContent = (
    <>
      {/* Drag pill — mobile only */}
      <div className="flex justify-center mb-2.5 lg:hidden" aria-hidden="true">
        <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all flex-shrink-0"
          aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[1.05rem] font-bold text-swara-text tracking-tight font-display">Queue</h1>
          {queueContext && (
            <p className="text-[0.7rem] text-swara-dim truncate">
              {contextLabel(queueContext)}
              {queueContext.title ? ` · ${queueContext.title}` : ''}
            </p>
          )}
        </div>
        {!isEmpty && (
          <button type="button" onClick={handleClear}
            className="flex-shrink-0 text-[0.78rem] font-medium text-swara-dim hover:text-swara-muted transition-colors px-2 py-1">
            Clear
          </button>
        )}
      </div>
    </>
  );

  const sharedContentProps = {
    prevTracks, nowPlaying, nextUp, isEmpty, activeIdx, isPlaying,
    dragState, currentRowRef,
    handlePlay, handleRemove, handleDragStart, handleDragEnter, handleDragEnd,
    navigate, queueContext,
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MOBILE — fixed inset-0, own scroll container, identical to FullscreenPlayer
  // ════════════════════════════════════════════════════════════════════════════
  if (!isDesktop) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-[59] flex flex-col bg-swara-bg"
        style={{
          // When dragOffset state is 0 (normal or spring-back), React renders
          // this transform, applying the spring transition.
          // During active dragging, applyTransform() overrides these via direct
          // DOM mutation — the same way FullscreenPlayer works.
          transform:  `translateY(${dragOffset}px)`,
          transition: SPRING,
          willChange: 'transform',
          overscrollBehavior: 'none',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Queue"
      >
        {/* Handle + header — drag target zone (flex-shrink-0, NOT sticky) */}
        <div
          className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-swara-border/30 select-none bg-swara-bg"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          {headerContent}
        </div>

        {/* Scrollable queue list — inside the fixed layer, overscroll contained */}
        <div className="flex-1 overflow-y-auto scrollbar-none" style={{ overscrollBehavior: 'contain' }}>
          <QueueContent {...sharedContentProps} />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DESKTOP — normal routed page, no gesture, no fixed positioning
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">
      <div className="sticky top-0 z-10 bg-swara-bg/98 backdrop-blur-sm px-4 lg:px-8 pt-5 pb-3 border-b border-swara-border/30">
        {headerContent}
      </div>
      <QueueContent {...sharedContentProps} />
    </div>
  );
};

export default QueuePage;
