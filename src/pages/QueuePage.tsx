/**
 * QueuePage — full queue management page.
 *
 * Route: /queue
 * Works identically on mobile (full page) and desktop (center column).
 *
 * Features:
 *   - Queue context header ("Playing from Album", etc.)
 *   - NOW PLAYING section (current track, highlighted)
 *   - NEXT UP section (remaining tracks)
 *   - Drag to reorder (HTML5 dnd + touch fallback)
 *   - Remove individual tracks
 *   - Clear entire queue
 *   - Auto-scroll current track into view on mount
 *   - Playing bars animation on active track
 *
 * Architecture:
 *   Reads from _eng via getActiveQueue() + getEngineIdx() — not from
 *   Zustand state — so the display is always in sync with the engine.
 *   Mutations go through playerStore actions (which call _savePlayback).
 */
import { useRef, useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore, getActiveQueue, getEngineIdx } from '@/store/playerStore';
import { trackActions } from '@/lib/trackActions';
import type { QueueContext } from '@/types/music';
import type { Track } from '@/types/music';

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

// ── Context header labels ─────────────────────────────────────────────────────
const CONTEXT_LABELS: Record<string, string> = {
  album:    'Playing from Album',
  artist:   'Playing from Artist',
  liked:    'Playing from Liked Songs',
  library:  'Playing from Library',
  playlist: 'Playing from Playlist',
  search:   'Playing from Search',
  manual:   'Queue',
  unknown:  'Now Playing',
};

function contextLabel(ctx: QueueContext | null): string {
  if (!ctx) return 'Queue';
  return CONTEXT_LABELS[ctx.type] ?? 'Queue';
}

// ── Drag state ────────────────────────────────────────────────────────────────
interface DragState {
  dragging: number | null;
  over:     number | null;
}

// ── Queue row ─────────────────────────────────────────────────────────────────
const QueueRow = ({
  track,
  index: _index,
  isActive,
  isPlaying,
  onPlay,
  onRemove,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragging,
  isOver,
}: {
  track:        Track;
  index:        number;
  isActive:     boolean;
  isPlaying:    boolean;
  onPlay:       () => void;
  onRemove:     () => void;
  onDragStart:  () => void;
  onDragEnter:  () => void;
  onDragEnd:    () => void;
  isDragging:   boolean;
  isOver:       boolean;
}) => (
  <div
    className={[
      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-100 cursor-pointer group',
      isActive ? 'bg-swara-card' : 'hover:bg-swara-card/60',
      isDragging ? 'opacity-40 scale-[0.98]' : '',
      isOver ? 'border-t-2 border-swara-accent' : '',
    ].filter(Boolean).join(' ')}
    onClick={onPlay}
    draggable
    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
    onDragEnter={(e) => { e.preventDefault(); onDragEnter(); }}
    onDragOver={(e) => e.preventDefault()}
    onDragEnd={onDragEnd}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter') onPlay(); }}
    aria-label={`${track.title} — ${track.artist}`}
  >
    {/* Drag handle */}
    <div className="flex-shrink-0 text-swara-dim opacity-0 group-hover:opacity-50 transition-opacity cursor-grab active:cursor-grabbing"
      onClick={(e) => e.stopPropagation()}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <line x1="8" y1="6" x2="16" y2="6"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
        <line x1="8" y1="18" x2="16" y2="18"/>
      </svg>
    </div>

    {/* Cover */}
    <img
      src={track.coverUrl || PH}
      alt=""
      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
      loading="lazy"
      onError={(e) => { (e.target as HTMLImageElement).src = PH; }}
    />

    {/* Track info */}
    <div className="flex-1 min-w-0">
      <p className={['text-[0.87rem] font-medium truncate leading-snug', isActive ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>
        {track.title}
      </p>
      <p className="text-[0.72rem] text-swara-muted truncate mt-[1px]">{track.artist}</p>
    </div>

    {/* Right side: playing bars or remove */}
    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      {isActive && isPlaying ? (
        <PlayingBars />
      ) : (
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 rounded-full flex items-center justify-center text-swara-dim opacity-0 group-hover:opacity-100 hover:text-swara-muted transition-all"
          aria-label="Remove from queue"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  </div>
);

// ── QueuePage ─────────────────────────────────────────────────────────────────
const QueuePage = () => {
  const navigate    = useNavigate();
  const { isPlaying, queueContext, currentTrack, playTrackFromQueue } = usePlayerStore();

  // Read live engine queue (not Zustand state) for accurate order
  const [queue,      setQueue]      = useState<Track[]>(() => getActiveQueue());
  const [activeIdx,  setActiveIdx]  = useState(() => getEngineIdx());
  const [dragState,  setDragState]  = useState<DragState>({ dragging: null, over: null });

  const currentRowRef = useRef<HTMLDivElement>(null);

  // Re-sync from engine when currentTrack changes (track advance, etc.)
  useEffect(() => {
    setQueue(getActiveQueue());
    setActiveIdx(getEngineIdx());
  }, [currentTrack]);

  // Auto-scroll current track into view on mount
  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handlePlay = useCallback((index: number) => {
    playTrackFromQueue(index);
    // Sync local state immediately
    setActiveIdx(index);
  }, [playTrackFromQueue]);

  const handleRemove = useCallback((index: number) => {
    trackActions.removeFromQueue(index);
    setQueue(getActiveQueue());
    setActiveIdx(getEngineIdx());
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
      setQueue(getActiveQueue());
      setActiveIdx(getEngineIdx());
    }
    setDragState({ dragging: null, over: null });
  }, [dragState]);

  const handleClear = () => {
    trackActions.clearQueue();
    navigate(-1);
  };

  const nowPlaying  = activeIdx >= 0 && activeIdx < queue.length ? queue[activeIdx] : null;
  const nextUp      = queue.slice(activeIdx + 1);
  const prevTracks  = queue.slice(0, activeIdx);

  const isEmpty = queue.length === 0;

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-swara-bg/98 backdrop-blur-sm px-4 lg:px-8 pt-5 pb-3 border-b border-swara-border/30">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all flex-shrink-0"
            aria-label="Back">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-[1.05rem] font-bold text-swara-text tracking-tight font-display">
              Queue
            </h1>
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

          {/* Context artwork + info block */}
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

          {/* Previously played (faded) */}
          {prevTracks.length > 0 && (
            <div className="mb-4">
              <p className="text-[0.65rem] font-semibold text-swara-muted/50 tracking-widest uppercase px-2 mb-1.5">
                Previously played
              </p>
              <div className="opacity-40">
                {prevTracks.map((track, i) => (
                  <div key={`prev-${track.id}-${i}`}>
                    <QueueRow
                      track={track}
                      index={i}
                      isActive={false}
                      isPlaying={false}
                      onPlay={() => handlePlay(i)}
                      onRemove={() => handleRemove(i)}
                      onDragStart={() => handleDragStart(i)}
                      onDragEnter={() => handleDragEnter(i)}
                      onDragEnd={handleDragEnd}
                      isDragging={dragState.dragging === i}
                      isOver={dragState.over === i}
                    />
                  </div>
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
                  track={nowPlaying}
                  index={activeIdx}
                  isActive={true}
                  isPlaying={isPlaying}
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
                const absoluteIndex = activeIdx + 1 + i;
                return (
                  <QueueRow
                    key={`next-${track.id}-${absoluteIndex}`}
                    track={track}
                    index={absoluteIndex}
                    isActive={false}
                    isPlaying={false}
                    onPlay={() => handlePlay(absoluteIndex)}
                    onRemove={() => handleRemove(absoluteIndex)}
                    onDragStart={() => handleDragStart(absoluteIndex)}
                    onDragEnter={() => handleDragEnter(absoluteIndex)}
                    onDragEnd={handleDragEnd}
                    isDragging={dragState.dragging === absoluteIndex}
                    isOver={dragState.over === absoluteIndex}
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
