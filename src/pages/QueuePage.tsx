/**
 * QueuePage — full queue management page.
 *
 * Route: /queue  ·  Mobile (full page) + Desktop (center column)
 *
 * SWIPE-DOWN DISMISS — mirrors FullscreenPlayer exactly:
 *
 *   State:  dragOffset (number, px) — drives translateY on the page container
 *   Ref:    touchState — gesture tracking without re-renders (same shape as
 *           FullscreenPlayer's touchState ref)
 *   Transition contract:
 *     - dragOffset > 0  → transition: 'none'  (follows finger 1:1, no lag)
 *     - dragOffset = 0  → transition: 'transform 0.42s cubic-bezier(0.16,1,0.3,1)'
 *                          (spring-back or enter animation)
 *   Dismiss: dragOffset > 80px on release → navigate(-1)
 *            dragOffset ≤ 80px on release → setDragOffset(0) → spring back
 *
 *   Non-passive touchmove listener on the page container prevents
 *   pull-to-refresh during an active dismiss drag (same as FullscreenPlayer).
 *
 *   Axis lock: first 8px of movement determines whether gesture is vertical
 *   or horizontal. Horizontal lock → gesture ignored, normal scroll preserved.
 *
 *   Scroll-vs-dismiss conflict: gesture only activates from the header zone.
 *   The scrollable list area has its own touch handlers untouched — the
 *   header's handlers intercept before bubbling down to the list.
 *
 *   Desktop: dragOffset is always 0, touch handlers are no-ops, no visual change.
 *
 * DRAG AFFORDANCE: always visible at opacity-40 (not hover-only).
 * DRAG INDICATOR: separate positioned <div>, not a CSS border — no color flash.
 */
import { useRef, useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore, getActiveQueue, getEngineIdx } from '@/store/playerStore';
import { trackActions } from '@/lib/trackActions';
import type { QueueContext, Track } from '@/types/music';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

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

// ── Drag state ────────────────────────────────────────────────────────────────
interface DragState { dragging: number | null; over: number | null; }

// ── Queue row ─────────────────────────────────────────────────────────────────
const QueueRow = ({
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
    {/* Insertion indicator — separate element with hardcoded color, no class-toggle flash */}
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
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 rounded-full flex items-center justify-center text-swara-dim opacity-40 hover:opacity-100 hover:text-swara-muted transition-all"
            aria-label="Remove from queue"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  </div>
);

// ── QueuePage ─────────────────────────────────────────────────────────────────
const QueuePage = () => {
  const navigate = useNavigate();

  // Reactive subscriptions
  const queueVersion       = usePlayerStore((s) => s.queueVersion);
  const isPlaying          = usePlayerStore((s) => s.isPlaying);
  const queueContext       = usePlayerStore((s) => s.queueContext);
  const playTrackFromQueue = usePlayerStore((s) => s.playTrackFromQueue);

  // Derive live queue from engine on every render (queueVersion triggers re-render)
  const queue     = getActiveQueue();
  const activeIdx = getEngineIdx();

  const [dragState,   setDragState]   = useState<DragState>({ dragging: null, over: null });
  const [dragOffset,  setDragOffset]  = useState(0);

  // Same shape and semantics as FullscreenPlayer.touchState
  const touchState  = useRef({ startY: 0, startX: 0, dragging: false, locked: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLDivElement>(null);

  // ── Non-passive touchmove on container (mirrors FullscreenPlayer exactly) ──
  // Calls e.preventDefault() during an active dismiss drag so the browser
  // doesn't trigger pull-to-refresh or pass the scroll to the <main> container.
  // Must be non-passive (added imperatively) — React synthetic events are passive.
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

  // ── Header touch handlers — identical logic to FullscreenPlayer ──────────────

  const onHandleTouchStart = useCallback((e: React.TouchEvent) => {
    touchState.current = {
      startY:   e.touches[0].clientY,
      startX:   e.touches[0].clientX,
      dragging: false,
      locked:   false,
    };
    setDragOffset(0);
  }, []);

  const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
    const ts = touchState.current;
    const dy = e.touches[0].clientY - ts.startY;
    const dx = Math.abs(e.touches[0].clientX - ts.startX);

    if (!ts.locked) {
      // Mirror FullscreenPlayer: lock as dragging if downward > 8px and dominant
      if (dy > 8 && dy > dx) { ts.dragging = true; ts.locked = true; }
      // Lock as non-dragging if horizontal or upward
      else if (dx > 8 || dy < -8) { ts.locked = true; return; }
    }

    if (ts.dragging && dy > 0) setDragOffset(dy);
  }, []);

  const onHandleTouchEnd = useCallback(() => {
    // Mirror FullscreenPlayer: threshold 80px → dismiss, else snap back
    if (touchState.current.dragging && dragOffset > 80) {
      navigate(-1);
    }
    setDragOffset(0);
    touchState.current.dragging = false;
    touchState.current.locked   = false;
  }, [dragOffset, navigate]);

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

  const handleClear = () => {
    trackActions.clearQueue();
    navigate(-1);
  };

  const nowPlaying = queue[activeIdx] ?? null;
  const nextUp     = queue.slice(activeIdx + 1);
  const prevTracks = queue.slice(0, activeIdx);
  const isEmpty    = queue.length === 0;

  void queueVersion; // reactive trigger

  return (
    /**
     * Page container — receives the translateY swipe-dismiss animation.
     *
     * Transition contract (mirrors FullscreenPlayer):
     *   dragOffset > 0  → 'none'       (1:1 finger tracking, no lag)
     *   dragOffset = 0  → spring curve  (snap-back or release ease)
     *
     * will-change: transform — promotes to compositor layer for GPU rendering.
     * The subtle opacity fade (min 0.6 at max drag) mirrors the FullscreenPlayer feel.
     */
    <div
      ref={containerRef}
      className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none"
      style={{
        transform:   `translate3d(0, ${dragOffset}px, 0)`,
        transition:  dragOffset > 0 ? 'none' : 'transform 0.42s cubic-bezier(0.16,1,0.3,1)',
        willChange:  'transform',
        opacity:     dragOffset > 0 ? Math.max(0.6, 1 - dragOffset / 400) : 1,
      }}
    >

      {/* Sticky header — drag zone for swipe-down dismiss */}
      <div
        className="sticky top-0 z-10 bg-swara-bg/98 backdrop-blur-sm px-4 lg:px-8 pt-3 pb-3 border-b border-swara-border/30 select-none"
        onTouchStart={onHandleTouchStart}
        onTouchMove={onHandleTouchMove}
        onTouchEnd={onHandleTouchEnd}
      >
        {/* Drag pill — mobile only, same as FullscreenPlayer handle */}
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

          {/* Context artwork + info */}
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
