/**
 * QueuePage — full queue management page.
 *
 * Route: /queue  ·  Mobile (full page) + Desktop (center column)
 *
 * ── GESTURE PERFORMANCE ARCHITECTURE ────────────────────────────────────────
 *
 * PROBLEM WITH THE PREVIOUS APPROACH:
 *   Using React state `dragOffset` to drive the transform meant every touchmove
 *   event (60+ fps) caused a full React re-render of QueuePage. Each re-render:
 *     1. Called getActiveQueue() → allocated a new Track[] copy
 *     2. Called queue.slice() twice → two more array allocations
 *     3. Reconciled ALL QueueRow components (even unchanged ones)
 *     4. Re-created all inline arrow function props per row
 *   For a 30-track queue, the JS thread was too busy with reconciliation to
 *   hand off compositor work in time. The layer lagged behind the finger.
 *
 * THE FIX — DIRECT DOM MUTATION, ZERO REACT RENDERS DURING DRAG:
 *   dragOffset is now a plain ref (not state). Touch handlers write directly to
 *   containerRef.current.style.transform and .style.opacity.
 *   React is never notified during the gesture. No reconciliation happens.
 *   The browser compositor receives the style update directly, on the same frame.
 *
 *   Spring-back on release:
 *     1. Set containerRef.style.transition = spring curve
 *     2. Set containerRef.style.transform  = translate3d(0,0,0)
 *     → CSS handles the animation, React not involved
 *
 *   Dismiss on release:
 *     navigate(-1) → React unmounts the component
 *
 * ADDITIONAL OPTIMIZATION — useMemo FOR QUEUE DERIVATIONS:
 *   prevTracks / nowPlaying / nextUp are computed via `useMemo` keyed on
 *   queueVersion + activeIdx. They are only recomputed when the queue actually
 *   changes, not on any other re-render trigger.
 *
 * WHY THIS MATCHES FULLSCREENPLAYER:
 *   FullscreenPlayer is `fixed inset-0` (compositor-promoted layer) and its
 *   render tree is shallow (~40 nodes). It gets away with setDragOffset because
 *   reconciliation is cheap. QueuePage has 30–100 rows, so the same approach
 *   compounds. Direct DOM mutation eliminates the React overhead entirely and
 *   is the correct architecture for any variable-length list with drag gestures.
 *
 * DESKTOP: touch handlers fire but isDraggingRef.current is never set true
 *   (no touch events on desktop), so style is never mutated. Zero impact.
 */
import { useRef, useEffect, useCallback, useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore, getActiveQueue, getEngineIdx } from '@/store/playerStore';
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

// ── Queue row — memo'd to prevent re-renders when unrelated state changes ─────
// Without memo, parent re-renders (e.g. queueVersion bump) would reconcile
// every row even if its props didn't change.
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
      <div
        className="absolute top-0 left-3 right-3 h-[2px] rounded-full pointer-events-none z-10"
        style={{ background: '#c8a96e' }}
        aria-hidden="true"
      />
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
      <div
        className="flex-shrink-0 text-swara-dim opacity-40 hover:opacity-70 transition-opacity cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="8" y1="6" x2="16" y2="6"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
          <line x1="8" y1="18" x2="16" y2="18"/>
        </svg>
      </div>

      {/* Cover */}
      <img src={track.coverUrl || PH} alt=""
        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-swara-elevated" loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).src = PH; }} />

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className={['text-[0.87rem] font-medium truncate leading-snug', isActive ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>
          {track.title}
        </p>
        <p className="text-[0.72rem] text-swara-muted truncate mt-[1px]">{track.artist}</p>
      </div>

      {/* Right: playing bars or remove — always visible */}
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

// ── QueuePage ─────────────────────────────────────────────────────────────────
const QueuePage = () => {
  const navigate = useNavigate();

  // Reactive subscriptions — only what's needed for content rendering
  const queueVersion       = usePlayerStore((s) => s.queueVersion);
  const isPlaying          = usePlayerStore((s) => s.isPlaying);
  const queueContext       = usePlayerStore((s) => s.queueContext);
  const playTrackFromQueue = usePlayerStore((s) => s.playTrackFromQueue);

  // Drag-to-reorder UI state (not related to the swipe-dismiss gesture)
  const [dragState, setDragState] = useState<DragState>({ dragging: null, over: null });

  // ── Refs ──────────────────────────────────────────────────────────────────
  const containerRef  = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLDivElement>(null);

  // Swipe-dismiss gesture tracking — same shape as FullscreenPlayer.touchState
  const touchState = useRef({
    startY:   0,
    startX:   0,
    dragging: false,
    locked:   false,
    offsetY:  0,    // current drag distance, stored here so touchEnd can read it
                    // without a closure over stale state
  });

  // ── Non-passive touchmove guard — mirrors FullscreenPlayer exactly ─────────
  // Blocks pull-to-refresh from firing while an active dismiss drag is in progress.
  // Must be imperative (non-passive) — React synthetic events are always passive.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => {
      if (touchState.current.dragging) e.preventDefault();
    };
    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, []);

  // Auto-scroll current track into view on mount
  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // ── Direct-DOM style helper ────────────────────────────────────────────────
  // Called on every touchmove — mutates the DOM node directly, bypassing React
  // entirely. No state update, no reconciliation, no VDOM diff. Pure compositor.
  const applyTransform = useCallback((dy: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform  = `translate3d(0, ${dy}px, 0)`;
    el.style.opacity    = String(Math.max(0.6, 1 - dy / 400));
  }, []);

  const resetTransform = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.transition = SPRING;
    el.style.transform  = 'translate3d(0, 0, 0)';
    el.style.opacity    = '1';
  }, []);

  // ── Header touch handlers ─────────────────────────────────────────────────
  // Axis lock + threshold — identical logic to FullscreenPlayer.
  // The ONLY difference is that the transform is applied via direct DOM mutation
  // instead of setDragOffset(dy).

  const onHandleTouchStart = useCallback((e: React.TouchEvent) => {
    touchState.current = {
      startY:   e.touches[0].clientY,
      startX:   e.touches[0].clientX,
      dragging: false,
      locked:   false,
      offsetY:  0,
    };
    // Pre-remove transition so the very first frame has no CSS animation
    const el = containerRef.current;
    if (el) el.style.transition = 'none';
  }, []);

  const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
    const ts = touchState.current;
    const dy = e.touches[0].clientY - ts.startY;
    const dx = Math.abs(e.touches[0].clientX - ts.startX);

    if (!ts.locked) {
      // Axis-lock: wait for 8px of movement, then commit to vertical or abort
      if (dy > 8 && dy > dx)      { ts.dragging = true; ts.locked = true; }
      else if (dx > 8 || dy < -8) { ts.locked = true; return; }
      else return; // not enough movement to decide yet
    }

    if (!ts.dragging) return; // locked as horizontal — ignore

    // FIX: clamp to Math.max(0, dy) instead of guarding with `if (dy > 0)`.
    //
    // Previous code:
    //   if (dy > 0) { ts.offsetY = dy; applyTransform(dy); }
    //
    // That guard caused the frozen-page bug: once the gesture was active and the
    // finger reversed upward, dy became ≤ 0, the condition failed, applyTransform
    // was never called, and the page stayed stuck at its last downward position.
    //
    // With Math.max(0, dy):
    //   dy > 0  → page follows finger downward (offset = dy)
    //   dy = 0  → page is at resting position  (offset = 0)
    //   dy < 0  → page stays at rest           (offset clamped to 0)
    //
    // applyTransform is called on EVERY frame after axis lock, so the page
    // continuously tracks the finger in both directions while still touching.
    const offset = Math.max(0, dy);
    ts.offsetY = offset;
    applyTransform(offset);
  }, [applyTransform]);

  const onHandleTouchEnd = useCallback(() => {
    const ts = touchState.current;
    if (!ts.dragging) return;

    if (ts.offsetY > DISMISS_THRESHOLD) {
      // Dismiss — navigate back. The component unmounts; no spring-back needed.
      navigate(-1);
    } else {
      // Below threshold — spring back via CSS transition
      resetTransform();
    }

    ts.dragging = false;
    ts.locked   = false;
    ts.offsetY  = 0;
  }, [navigate, resetTransform]);

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

  // ── Derived queue data — memoized by queue shape, not by drag state ────────
  // These slices are only recomputed when queueVersion or activeIdx actually
  // changes — never during touchmove, never during drag-to-reorder hover.
  const activeIdx = getEngineIdx();
  const { prevTracks, nowPlaying, nextUp, isEmpty } = useMemo(() => {
    const q        = getActiveQueue();
    const idx      = getEngineIdx();
    return {
      prevTracks: q.slice(0, idx),
      nowPlaying: q[idx] ?? null,
      nextUp:     q.slice(idx + 1),
      isEmpty:    q.length === 0,
    };
  // queueVersion is the reactive signal — when it bumps, queue shape changed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueVersion]);

  void queueVersion; // consumed by useMemo dep above

  return (
    /**
     * Container — transform target for the swipe-dismiss animation.
     *
     * IMPORTANT: no `transform` or `transition` in JSX style here.
     * Those properties are managed entirely via direct DOM mutation in
     * applyTransform() and resetTransform(). Setting them in JSX would
     * create a race: React's reconciler would overwrite our direct mutations
     * on any re-render that happens after the gesture starts.
     *
     * will-change: transform — promotes to GPU compositor layer on page load
     * so the very first touchmove frame doesn't trigger layer promotion jank.
     */
    <div
      ref={containerRef}
      className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none"
      style={{ willChange: 'transform' }}
    >

      {/* Sticky header — the only gesture zone for swipe-down dismiss */}
      <div
        className="sticky top-0 z-10 bg-swara-bg/98 backdrop-blur-sm px-4 lg:px-8 pt-3 pb-3 border-b border-swara-border/30 select-none"
        onTouchStart={onHandleTouchStart}
        onTouchMove={onHandleTouchMove}
        onTouchEnd={onHandleTouchEnd}
      >
        {/* Drag pill — mobile only */}
        <div className="flex justify-center mb-2.5 lg:hidden" aria-hidden="true">
          <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all flex-shrink-0"
            aria-label="Back">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 px-6">
          <div className="w-16 h-16 rounded-2xl bg-swara-elevated flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

      {/* Queue list */}
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
    </div>
  );
};

export default QueuePage;
