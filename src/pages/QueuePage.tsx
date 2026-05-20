/**
 * QueuePage — full queue management page.
 *
 * Route: /queue  ·  Mobile (full page) + Desktop (center column)
 *
 * FIXES IN THIS VERSION:
 *
 * 1. DRAG AFFORDANCE VISIBILITY
 *    Drag handle and remove button are always visible (no opacity-0/group-hover).
 *    Touch devices have no hover state, so hiding on !hover made them invisible.
 *
 * 2. DRAG INDICATOR COLOR BUG
 *    Root cause: using Tailwind's `border-t-2 border-swara-accent` on the row
 *    element itself. When `isOver` flips false, the class removal goes through
 *    two React render→commit cycles: border-width and border-color are cleared
 *    on separate microtask frames. For one frame the element has `border-t-2`
 *    (inherits white from browser default) but not yet `border-swara-accent`.
 *    Fix: render the indicator as a separate absolutely-positioned <div> with
 *    explicit inline `background: #c8a96e`. No CSS class toggling, no Tailwind
 *    class splits, no inter-frame color inheritance. The indicator element simply
 *    renders or doesn't render — no style flash possible.
 *
 * 3. SWIPE-DOWN DISMISS (mobile)
 *    Touch gesture on the header area. Threshold: 72px downward drag.
 *    Lock-axis guard prevents accidental dismissal during normal list scroll.
 *    Header has `touch-action: pan-x` so vertical swipes are not stolen from
 *    the scroll container; we handle them manually in the header only.
 *
 * 4. REACTIVITY
 *    Subscribes to queueVersion — bumped on every structural queue mutation.
 *    Queue is read fresh from engine on every render. No stale local state.
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
// FIX 1: drag handle + remove button are always visible (opacity-100, not opacity-0).
// FIX 2: insertion indicator is a separate positioned <div>, not a CSS border.
//        This eliminates the white-flash caused by Tailwind border-color/border-width
//        applying on different render frames during class removal.
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
  // Use `relative` so the insertion indicator can be positioned absolutely
  <div className="relative">
    {/* Insertion indicator — separate element, always accent-colored.
        Never touches the row's own border so there's no class-removal flash. */}
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
      {/* Drag handle — always visible (opacity-40 at rest, opacity-70 on hover) */}
      <div
        className="flex-shrink-0 text-swara-dim opacity-40 hover:opacity-70 transition-opacity cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
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

      {/* Right: playing bars or remove button — remove is always visible */}
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

  // Derive live queue from engine on every render
  const queue     = getActiveQueue();
  const activeIdx = getEngineIdx();

  const [dragState, setDragState] = useState<DragState>({ dragging: null, over: null });
  const currentRowRef = useRef<HTMLDivElement>(null);

  // ── Swipe-down dismiss (FIX 4) ──────────────────────────────────────────────
  // Gesture is captured only in the header. A downward drag of ≥72px navigates
  // back. Lock-axis detection prevents false triggers during horizontal scroll
  // or upward swipes. We use a ref (not state) for the gesture tracking so that
  // touch handler closures are always reading fresh values without re-creating.
  const swipeRef = useRef({
    startY:    0,
    startX:    0,
    dragging:  false,
    locked:    false,   // true once axis has been determined
    axisH:     false,   // locked to horizontal — ignore
  });
  const DISMISS_THRESHOLD = 72; // px of downward travel required

  const onHeaderTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeRef.current = { startY: t.clientY, startX: t.clientX, dragging: false, locked: false, axisH: false };
  }, []);

  const onHeaderTouchMove = useCallback((e: React.TouchEvent) => {
    const s = swipeRef.current;
    const dy = e.touches[0].clientY - s.startY;
    const dx = Math.abs(e.touches[0].clientX - s.startX);

    // Determine axis on first significant movement
    if (!s.locked) {
      if (Math.abs(dy) < 5 && dx < 5) return; // not yet moved enough to decide
      s.locked = true;
      s.axisH  = dx > Math.abs(dy);            // horizontal dominant → ignore
    }

    if (s.axisH) return; // horizontal gesture — don't steal
    if (dy <= 0) return;  // upward drag — don't dismiss

    s.dragging = true;
    // Prevent page scroll while we're handling the dismiss gesture
    e.preventDefault();
  }, []);

  const onHeaderTouchEnd = useCallback((e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (!s.dragging) return;
    const dy = e.changedTouches[0].clientY - s.startY;
    if (dy >= DISMISS_THRESHOLD) {
      navigate(-1);
    }
  }, [navigate]);

  // Auto-scroll current track into view on mount
  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

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

  void queueVersion; // reactive trigger — used via render, not directly

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* Sticky header — gesture zone for swipe-down dismiss on mobile */}
      <div
        className="sticky top-0 z-10 bg-swara-bg/98 backdrop-blur-sm px-4 lg:px-8 pt-5 pb-3 border-b border-swara-border/30"
        onTouchStart={onHeaderTouchStart}
        onTouchMove={onHeaderTouchMove}
        onTouchEnd={onHeaderTouchEnd}
        // Allow horizontal pan (for any nested scrollables) but handle vertical manually
        style={{ touchAction: 'pan-x' }}
      >
        {/* Swipe indicator pill — visible on mobile to hint at dismiss gesture */}
        <div className="flex justify-center mb-2 lg:hidden" aria-hidden="true">
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
                    onPlay={() => handlePlay(i)}
                    onRemove={() => handleRemove(i)}
                    onDragStart={() => handleDragStart(i)}
                    onDragEnter={() => handleDragEnter(i)}
                    onDragEnd={handleDragEnd}
                    isDragging={dragState.dragging === i}
                    isOver={dragState.over === i}
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
                  onPlay={() => handlePlay(activeIdx)}
                  onRemove={() => handleRemove(activeIdx)}
                  onDragStart={() => handleDragStart(activeIdx)}
                  onDragEnter={() => handleDragEnter(activeIdx)}
                  onDragEnd={handleDragEnd}
                  isDragging={dragState.dragging === activeIdx}
                  isOver={dragState.over === activeIdx}
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
                    onPlay={() => handlePlay(absIdx)}
                    onRemove={() => handleRemove(absIdx)}
                    onDragStart={() => handleDragStart(absIdx)}
                    onDragEnter={() => handleDragEnter(absIdx)}
                    onDragEnd={handleDragEnd}
                    isDragging={dragState.dragging === absIdx}
                    isOver={dragState.over === absIdx}
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
