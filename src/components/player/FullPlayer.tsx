'use client';

import { useState } from 'react';
import Image from 'next/image';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { Seekbar } from './Seekbar';
import { QueueSheet } from './QueueSheet';

export function FullPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const isShuffled = usePlayerStore((s) => s.isShuffled);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const toggleFullPlayer = usePlayerStore((s) => s.toggleFullPlayer);

  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const [showQueue, setShowQueue] = useState(false);

  const swipeHandlers = useSwipeGesture({
    onSwipeDown: toggleFullPlayer,
    threshold: 60,
  });

  if (!currentTrack) return null;

  const liked = isLiked(currentTrack.id);

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-bg full-player-enter flex flex-col"
        {...swipeHandlers}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 mt-3 pt-safe">
          <button
            onClick={toggleFullPlayer}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-surface"
            aria-label="Minimise player"
          >
            <ChevronDownIcon />
          </button>
          <div className="text-center">
            <p className="text-2xs text-text-muted uppercase tracking-[0.15em] font-medium">Now Playing</p>
            {currentTrack.albumTitle && (
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-1 max-w-[180px]">
                {currentTrack.albumTitle}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowQueue(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-surface"
            aria-label="Show queue"
          >
            <QueueIcon />
          </button>
        </div>

        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* ── Cover Art ─────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center px-10 py-2">
          <div
            className={`
              w-full max-w-[280px] aspect-square rounded-3xl overflow-hidden
              ring-1 ring-white/5 shadow-[0_24px_80px_rgba(0,0,0,0.7)]
              transition-all duration-500 ease-out
              ${isPlaying ? 'scale-100 opacity-100' : 'scale-[0.92] opacity-80'}
            `}
          >
            {currentTrack.albumCover ? (
              <Image
                src={currentTrack.albumCover}
                alt={currentTrack.albumTitle || currentTrack.title}
                width={400}
                height={400}
                className="w-full h-full object-cover"
                priority
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
                <MusicNoteIcon />
              </div>
            )}
          </div>
        </div>

        {/* ── Track info + like ──────────────────────────────────── */}
        <div className="px-7 pb-3 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-[1.35rem] font-bold text-text leading-tight line-clamp-1 tracking-tight">
              {currentTrack.title}
            </h2>
            <p className="text-text-secondary mt-1 text-base leading-tight line-clamp-1">
              {currentTrack.artistsDisplay}
            </p>
          </div>
          <button
            onClick={() => toggleLike(currentTrack.id)}
            className="w-11 h-11 flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-90"
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <HeartIcon filled={liked} size={26} />
          </button>
        </div>

        {/* ── Seekbar ───────────────────────────────────────────── */}
        <div className="px-7 pb-5">
          <Seekbar showTimes />
        </div>

        {/* ── Controls ──────────────────────────────────────────── */}
        <div className="px-7 pb-6 flex items-center justify-between">
          <button
            onClick={toggleShuffle}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-90 ${
              isShuffled ? 'text-accent' : 'text-text-muted'
            }`}
            aria-label={isShuffled ? 'Disable shuffle' : 'Enable shuffle'}
          >
            {isShuffled && (
              <div className="absolute w-1 h-1 rounded-full bg-accent mt-8" />
            )}
            <ShuffleIcon />
          </button>

          <button
            onClick={prev}
            className="w-14 h-14 flex items-center justify-center rounded-full text-text transition-all active:scale-90 active:bg-bg-surface"
            aria-label="Previous track"
          >
            <PrevIcon />
          </button>

          <button
            onClick={togglePlay}
            className="flex items-center justify-center rounded-full bg-accent shadow-accent-glow transition-all active:scale-90"
            style={{ width: 72, height: 72 }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-7 h-7 rounded-full border-[3px] border-white/40 border-t-white animate-spin" />
            ) : isPlaying ? (
              <PauseIcon />
            ) : (
              <PlayIcon />
            )}
          </button>

          <button
            onClick={next}
            className="w-14 h-14 flex items-center justify-center rounded-full text-text transition-all active:scale-90 active:bg-bg-surface"
            aria-label="Next track"
          >
            <NextIcon />
          </button>

          <button
            onClick={cycleRepeat}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-90 relative ${
              repeatMode !== 'off' ? 'text-accent' : 'text-text-muted'
            }`}
            aria-label={`Repeat mode: ${repeatMode}`}
          >
            <RepeatIcon mode={repeatMode} />
          </button>
        </div>

        {/* Safe bottom */}
        <div className="pb-safe" />
      </div>

      {/* Queue sheet */}
      {showQueue && <QueueSheet onClose={() => setShowQueue(false)} />}
    </>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function ChevronDownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h12M4 18h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MusicNoteIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
      <path d="M9 18V5l12-2v13" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" stroke="#2a2a2a" strokeWidth="1.5" />
      <circle cx="18" cy="16" r="3" stroke="#2a2a2a" strokeWidth="1.5" />
    </svg>
  );
}

function HeartIcon({ filled, size = 24 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21C12 21 3 15 3 9a4.5 4.5 0 018.94-.89L12 9l.06-.89A4.5 4.5 0 0121 9c0 6-9 12-9 12z"
        fill={filled ? '#ef4444' : 'none'}
        stroke={filled ? '#ef4444' : '#555'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M7 4l14 8-14 8V4z" fill="white" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="5" height="16" rx="2" fill="white" />
      <rect x="14" y="4" width="5" height="16" rx="2" fill="white" />
    </svg>
  );
}

function PrevIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M19 18V6L9 12l10 6zM5 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M5 18V6l10 6-10 6zM19 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M16 3h5v5M4 20l16-16M16 20h5v-5M4 4l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RepeatIcon({ mode }: { mode: 'off' | 'one' | 'all' }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M17 2l4 4-4 4M7 22l-4-4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 11v-1a4 4 0 014-4h14M21 13v1a4 4 0 01-4 4H3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {mode === 'one' && (
        <text
          x="10.5"
          y="14.5"
          fontSize="6.5"
          fontWeight="700"
          fill="currentColor"
          fontFamily="'JetBrains Mono', monospace"
          textAnchor="middle"
        >
          1
        </text>
      )}
    </svg>
  );
}
