import { create } from 'zustand';
import type { Track, RepeatMode } from '@/types/music';

// ─── Singleton audio element ──────────────────────────────────────────────────
let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'metadata';
  }
  return audio;
}

// ─── Player State ─────────────────────────────────────────────────────────────
interface PlayerState {
  queue: Track[];
  currentIndex: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  isShuffle: boolean;
  repeat: RepeatMode;
  progress: number;   // 0–1
  duration: number;   // seconds
  volume: number;     // 0–1
  isExpanded: boolean;

  // actions
  playTrack: (track: Track, queue?: Track[]) => void;
  playAlbum: (tracks: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  pause: () => void;
  seekTo: (ratio: number) => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setExpanded: (val: boolean) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (val: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  // ── Internal: wire up the audio element events ──────────────────────────
  function setupAudioListeners(a: HTMLAudioElement) {
    a.ontimeupdate = () => {
      const dur = a.duration || 0;
      const prog = dur > 0 ? a.currentTime / dur : 0;
      set({ progress: prog, duration: dur });
    };
    a.onloadedmetadata = () => {
      set({ duration: a.duration });
    };
    a.onended = () => {
      // const { repeat, queue, currentIndex, isShuffle } = get();
      const { repeat, queue, currentIndex } = get();
      if (repeat === 'one') {
        a.currentTime = 0;
        a.play().catch(() => {});
      } else if (repeat === 'all' || currentIndex < queue.length - 1) {
        get().next();
      } else {
        set({ isPlaying: false, progress: 0 });
      }
    };
    a.onplay = () => set({ isPlaying: true });
    a.onpause = () => set({ isPlaying: false });
  }

  function loadAndPlay(track: Track) {
    const a = getAudio();
    if (!a.ontimeupdate) setupAudioListeners(a);
    a.src = track.streamUrl;
    a.load();
    const playPromise = a.play();
    if (playPromise) playPromise.catch(() => {});
    set({ currentTrack: track, isPlaying: true, progress: 0, duration: 0 });
  }

  function getNextIndex(queue: Track[], currentIndex: number, isShuffle: boolean): number {
    if (isShuffle) {
      const next = Math.floor(Math.random() * queue.length);
      return next === currentIndex && queue.length > 1
        ? (next + 1) % queue.length
        : next;
    }
    return (currentIndex + 1) % queue.length;
  }

  return {
    queue: [],
    currentIndex: 0,
    currentTrack: null,
    isPlaying: false,
    isShuffle: false,
    repeat: 'off',
    progress: 0,
    duration: 0,
    volume: 1,
    isExpanded: false,

    playTrack: (track, queue) => {
      const newQueue = queue ?? [track];
      const idx = newQueue.findIndex((t) => t.id === track.id);
      set({ queue: newQueue, currentIndex: idx < 0 ? 0 : idx });
      loadAndPlay(track);
    },

    playAlbum: (tracks, startIndex = 0) => {
      const track = tracks[startIndex];
      set({ queue: tracks, currentIndex: startIndex });
      loadAndPlay(track);
    },

    togglePlay: () => {
      const a = getAudio();
      const { isPlaying, currentTrack } = get();
      if (!currentTrack) return;
      if (isPlaying) {
        a.pause();
      } else {
        a.play().catch(() => {});
      }
    },

    pause: () => {
      getAudio().pause();
    },

    seekTo: (ratio) => {
      const a = getAudio();
      if (a.duration) {
        a.currentTime = ratio * a.duration;
        set({ progress: ratio });
      }
    },

    next: () => {
      const { queue, currentIndex, isShuffle, repeat } = get();
      if (!queue.length) return;
      let nextIdx: number;
      if (repeat === 'one') {
        nextIdx = currentIndex;
      } else {
        nextIdx = getNextIndex(queue, currentIndex, isShuffle);
      }
      set({ currentIndex: nextIdx });
      loadAndPlay(queue[nextIdx]);
    },

    prev: () => {
      const a = getAudio();
      // If more than 3 seconds in, restart current track
      if (a.currentTime > 3) {
        a.currentTime = 0;
        return;
      }
      const { queue, currentIndex } = get();
      if (!queue.length) return;
      const prevIdx = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
      set({ currentIndex: prevIdx });
      loadAndPlay(queue[prevIdx]);
    },

    toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),

    toggleRepeat: () =>
      set((s) => ({
        repeat:
          s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
      })),

    setExpanded: (val) => set({ isExpanded: val }),
    setProgress: (progress) => set({ progress }),
    setDuration: (duration) => set({ duration }),
    setIsPlaying: (val) => set({ isPlaying: val }),
  };
});
