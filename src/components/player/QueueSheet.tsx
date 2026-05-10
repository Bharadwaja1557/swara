'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import type { Track } from '@/types';

interface QueueSheetProps {
  onClose: () => void;
}

export function QueueSheet({ onClose }: QueueSheetProps) {
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const isShuffled = usePlayerStore((s) => s.isShuffled);

  const currentRef = useRef<HTMLDivElement>(null);

  const swipe = useSwipeGesture({ onSwipeDown: onClose, threshold: 60 });

  // Scroll current track into view on open
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, []);

  const upcoming = queue.slice(queueIndex + 1);
  const played = queue.slice(0, queueIndex);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[90] bg-bg-modal rounded-t-3xl shadow-player max-h-[80vh] flex flex-col"
        style={{ animation: 'slideUp 0.32s cubic-bezier(0.4,0,0.2,1)' }}
        {...swipe}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <h2 className="text-base font-semibold text-text">
            Queue {isShuffled && <span className="text-accent text-xs ml-1">· Shuffled</span>}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-elevated text-text-muted"
            aria-label="Close queue"
          >
            <XIcon />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
          {/* Now playing */}
          {currentTrack && (
            <div ref={currentRef}>
              <SectionLabel>Now playing</SectionLabel>
              <QueueTrackRow
                track={currentTrack}
                isActive
                onPlay={() => playTrack(currentTrack, queue)}
              />
            </div>
          )}

          {/* Up next */}
          {upcoming.length > 0 && (
            <>
              <SectionLabel>Up next</SectionLabel>
              {upcoming.map((track) => (
                <QueueTrackRow
                  key={track.id}
                  track={track}
                  isActive={false}
                  onPlay={() => playTrack(track, queue)}
                />
              ))}
            </>
          )}

          {/* Previously played */}
          {played.length > 0 && (
            <>
              <SectionLabel>Previously played</SectionLabel>
              {played.map((track) => (
                <QueueTrackRow
                  key={track.id}
                  track={track}
                  isActive={false}
                  dimmed
                  onPlay={() => playTrack(track, queue)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Section label ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 pt-4 pb-1 text-2xs text-text-muted font-semibold uppercase tracking-widest">
      {children}
    </p>
  );
}

// ─── Queue track row ──────────────────────────────────────────────────────

interface QueueTrackRowProps {
  track: Track;
  isActive: boolean;
  dimmed?: boolean;
  onPlay: () => void;
}

function QueueTrackRow({ track, isActive, dimmed, onPlay }: QueueTrackRowProps) {
  return (
    <div
      className={`
        flex items-center gap-3 px-5 py-3 cursor-pointer
        active:bg-bg-elevated transition-colors
        ${dimmed ? 'opacity-40' : ''}
      `}
      onClick={onPlay}
      role="button"
    >
      {/* Playing indicator or dot */}
      <div className="w-4 flex-shrink-0 flex items-center justify-center">
        {isActive ? (
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
        ) : (
          <div className="w-1 h-1 rounded-full bg-border" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight line-clamp-1 ${isActive ? 'text-accent' : 'text-text'}`}>
          {track.title}
        </p>
        <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{track.artistsDisplay}</p>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
