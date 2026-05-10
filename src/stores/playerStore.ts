'use client';

import { create } from 'zustand';
import type { PlayerState, PlayerActions, Track, RepeatMode } from '@/types';
import { DEFAULT_VOLUME, STORAGE_KEYS } from '@/lib/constants';
import { storage } from '@/lib/storage';
import { getAudioEngine } from '@/lib/audioEngine';

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Play a track immediately via the audio engine. */
function playViaEngine(url: string, volume: number) {
  const engine = getAudioEngine();
  engine.setVolume(volume);
  engine.play(url).catch((err) => {
    if ((err as Error).name !== 'AbortError') {
      console.error('[swara] playback error:', err);
    }
  });
}

type FullStore = PlayerState & PlayerActions;

export const usePlayerStore = create<FullStore>((set, get) => ({
  // ─── Initial state ─────────────────────────────────────────────────────
  currentTrack:   null,
  queue:          [],
  originalQueue:  [],
  queueIndex:     0,
  isPlaying:      false,
  isLoading:      false,
  duration:       0,
  currentTime:    0,
  isShuffled:     false,
  repeatMode:     'off' as RepeatMode,
  isFullPlayerOpen: false,
  volume:         storage.get<number>(STORAGE_KEYS.VOLUME, DEFAULT_VOLUME),

  // ─── Actions ───────────────────────────────────────────────────────────

  playTrack(track: Track, queue?: Track[]) {
    const resolvedQueue = queue ?? get().queue.length > 0 ? get().queue : [track];
    const index = resolvedQueue.findIndex((t) => t.id === track.id);
    const safeIndex = index === -1 ? 0 : index;

    playViaEngine(track.streamUrl, get().volume);

    set({
      currentTrack:  track,
      queue:         resolvedQueue,
      originalQueue: resolvedQueue,
      queueIndex:    safeIndex,
      isPlaying:     true,
      isLoading:     true,
      currentTime:   0,
      duration:      0,
      isShuffled:    false, // reset shuffle when starting fresh
    });
  },

  playAlbum(tracks: Track[], startIndex = 0) {
    if (tracks.length === 0) return;
    const track = tracks[Math.min(startIndex, tracks.length - 1)];
    get().playTrack(track, tracks);
  },

  togglePlay() {
    const { isPlaying, currentTrack } = get();
    if (!currentTrack) return;
    const engine = getAudioEngine();
    if (isPlaying) {
      engine.pause();
    } else {
      engine.play().catch(console.error);
    }
  },

  next() {
    const { queue, queueIndex, repeatMode, volume, currentTrack } = get();
    if (!currentTrack || queue.length === 0) return;

    if (repeatMode === 'one') {
      getAudioEngine().seek(0);
      getAudioEngine().play().catch(console.error);
      return;
    }

    const nextIndex = queueIndex + 1;

    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        const track = queue[0];
        playViaEngine(track.streamUrl, volume);
        set({ currentTrack: track, queueIndex: 0, isPlaying: true, isLoading: true, currentTime: 0, duration: 0 });
      }
      // repeatMode === 'off': stop at end, don't advance
      return;
    }

    const track = queue[nextIndex];
    playViaEngine(track.streamUrl, volume);
    set({ currentTrack: track, queueIndex: nextIndex, isPlaying: true, isLoading: true, currentTime: 0, duration: 0 });
  },

  prev() {
    const { queue, queueIndex, currentTime, volume } = get();

    // Restart current track if more than 3 seconds in
    if (currentTime > 3) {
      getAudioEngine().seek(0);
      return;
    }

    const prevIndex = Math.max(0, queueIndex - 1);
    if (prevIndex === queueIndex) return;

    const track = queue[prevIndex];
    playViaEngine(track.streamUrl, volume);
    set({ currentTrack: track, queueIndex: prevIndex, isPlaying: true, isLoading: true, currentTime: 0, duration: 0 });
  },

  seek(time: number) {
    getAudioEngine().seek(time);
    set({ currentTime: time });
  },

  setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    getAudioEngine().setVolume(clamped);
    storage.set(STORAGE_KEYS.VOLUME, clamped);
    set({ volume: clamped });
  },

  toggleShuffle() {
    const { isShuffled, queue, originalQueue, currentTrack } = get();

    if (!isShuffled) {
      // Shuffle: place current track first, shuffle the rest
      const others = queue.filter((t) => t.id !== currentTrack?.id);
      const shuffled = currentTrack
        ? [currentTrack, ...shuffleArray(others)]
        : shuffleArray(queue);
      set({ isShuffled: true, queue: shuffled, queueIndex: 0 });
    } else {
      // Un-shuffle: restore original order, keep current track position
      const currentId = currentTrack?.id;
      const restoredIndex = currentId
        ? originalQueue.findIndex((t) => t.id === currentId)
        : 0;
      set({
        isShuffled:  false,
        queue:       originalQueue,
        queueIndex:  Math.max(0, restoredIndex),
      });
    }
  },

  cycleRepeat() {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const { repeatMode } = get();
    const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    set({ repeatMode: next });
  },

  toggleFullPlayer() {
    set((s) => ({ isFullPlayerOpen: !s.isFullPlayerOpen }));
  },

  // ── Audio engine sync (called by useAudio hook) ────────────────────────
  setDuration:    (d) => set({ duration: d }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setIsPlaying:   (v) => set({ isPlaying: v }),
  setIsLoading:   (v) => set({ isLoading: v }),
}));
