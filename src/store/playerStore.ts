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

// ─── Recently played albums (localStorage) ───────────────────────────────────
const RECENTS_KEY = 'swara_recent_albums';
const MAX_RECENTS  = 12;

function loadRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function pushRecent(albumId: string) {
  if (!albumId) return;
  const list = loadRecents().filter((id) => id !== albumId);
  list.unshift(albumId);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
}

export function getRecentAlbumIds(): string[] {
  return loadRecents();
}

// ─── Media Session helper ─────────────────────────────────────────────────────
function updateMediaSession(track: Track, handlers: {
  next: () => void;
  prev: () => void;
  togglePlay: () => void;
}) {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title:  track.title,
    artist: track.artist,
    album:  track.album,
    artwork: track.coverUrl
      ? [{ src: track.coverUrl, sizes: '512x512', type: 'image/webp' }]
      : [],
  });

  navigator.mediaSession.setActionHandler('play',          () => handlers.togglePlay());
  navigator.mediaSession.setActionHandler('pause',         () => handlers.togglePlay());
  navigator.mediaSession.setActionHandler('nexttrack',     () => handlers.next());
  navigator.mediaSession.setActionHandler('previoustrack', () => handlers.prev());
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    const a = getAudio();
    if (details.seekTime !== undefined && a.duration) {
      a.currentTime = details.seekTime;
    }
  });
}

// ─── Player State ─────────────────────────────────────────────────────────────
interface PlayerState {
  queue: Track[];
  currentIndex: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  isShuffle: boolean;
  repeat: RepeatMode;
  progress: number;    // 0–1
  duration: number;    // seconds
  volume: number;      // 0–1
  isExpanded: boolean;
  recentAlbumIds: string[];

  // actions
  playTrack:    (track: Track, queue?: Track[]) => void;
  playAlbum:    (tracks: Track[], startIndex?: number) => void;
  togglePlay:   () => void;
  pause:        () => void;
  seekTo:       (ratio: number) => void;
  next:         () => void;
  prev:         () => void;
  toggleShuffle: () => void;
  toggleRepeat:  () => void;
  setExpanded:  (val: boolean) => void;
  setProgress:  (progress: number) => void;
  setDuration:  (duration: number) => void;
  setIsPlaying: (val: boolean) => void;
  refreshRecents: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  // ── Wire up audio element events (called once) ──────────────────────────
  function setupAudioListeners(a: HTMLAudioElement) {
    a.ontimeupdate = () => {
      const dur  = a.duration || 0;
      const prog = dur > 0 ? a.currentTime / dur : 0;
      set({ progress: prog, duration: dur });

      // Keep MediaSession position in sync (needed for lock-screen scrubber)
      if ('mediaSession' in navigator && dur > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration:     dur,
            playbackRate: a.playbackRate,
            position:     a.currentTime,
          });
        } catch { /* some browsers don't support this yet */ }
      }
    };

    a.onloadedmetadata = () => set({ duration: a.duration });

    a.onplay  = () => {
      set({ isPlaying: true });
      if ('mediaSession' in navigator)
        navigator.mediaSession.playbackState = 'playing';
    };

    a.onpause = () => {
      set({ isPlaying: false });
      if ('mediaSession' in navigator)
        navigator.mediaSession.playbackState = 'paused';
    };

    a.onended = () => {
      const { repeat, queue, currentIndex } = get();
      if (repeat === 'one') {
        a.currentTime = 0;
        a.play().catch(() => {});
        return;
      }
      if (currentIndex < queue.length - 1 || repeat === 'all') {
        get().next();
      } else {
        set({ isPlaying: false, progress: 0 });
      }
    };

    a.onerror = () => {
      console.error('[Swara] Audio error:', a.error?.message ?? 'unknown');
    };
  }

  // ── Load a track and start playing ─────────────────────────────────────
  function loadAndPlay(track: Track) {
    const a = getAudio();
    if (!a.ontimeupdate) setupAudioListeners(a);

    a.src  = track.streamUrl;
    a.load();

    // play() must be called after load(); the promise rejection is handled
    const playPromise = a.play();
    if (playPromise) {
      playPromise.catch((err) => {
        // NotAllowedError → autoplay blocked (first page load), ignore.
        // Everything else is a real error.
        if (err?.name !== 'NotAllowedError') {
          console.warn('[Swara] play() failed:', err?.message ?? err);
        }
      });
    }

    set({ currentTrack: track, isPlaying: true, progress: 0, duration: 0 });

    // Update OS lock-screen / notification controls — FIX for item 1
    updateMediaSession(track, {
      next:       get().next,
      prev:       get().prev,
      togglePlay: get().togglePlay,
    });

    // Record recently played album
    if (track.albumId) {
      pushRecent(track.albumId);
      set({ recentAlbumIds: loadRecents() });
    }
  }

  function getNextIndex(queue: Track[], idx: number, isShuffle: boolean): number {
    if (isShuffle) {
      const next = Math.floor(Math.random() * queue.length);
      return next === idx && queue.length > 1 ? (next + 1) % queue.length : next;
    }
    return (idx + 1) % queue.length;
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
    recentAlbumIds: loadRecents(),

    playTrack: (track, queue) => {
      const newQueue = queue ?? [track];
      const idx = newQueue.findIndex((t) => t.id === track.id);
      set({ queue: newQueue, currentIndex: idx < 0 ? 0 : idx });
      loadAndPlay(track);
    },

    playAlbum: (tracks, startIndex = 0) => {
      set({ queue: tracks, currentIndex: startIndex });
      loadAndPlay(tracks[startIndex]);
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

    pause: () => { getAudio().pause(); },

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
      const nextIdx = repeat === 'one'
        ? currentIndex
        : getNextIndex(queue, currentIndex, isShuffle);
      set({ currentIndex: nextIdx });
      loadAndPlay(queue[nextIdx]);
    },

    prev: () => {
      const a = getAudio();
      if (a.currentTime > 3) { a.currentTime = 0; return; }
      const { queue, currentIndex } = get();
      if (!queue.length) return;
      const prevIdx = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
      set({ currentIndex: prevIdx });
      loadAndPlay(queue[prevIdx]);
    },

    toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),

    toggleRepeat: () =>
      set((s) => ({
        repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
      })),

    setExpanded:  (val)  => set({ isExpanded: val }),
    setProgress:  (prog) => set({ progress: prog }),
    setDuration:  (dur)  => set({ duration: dur }),
    setIsPlaying: (val)  => set({ isPlaying: val }),
    refreshRecents: ()   => set({ recentAlbumIds: loadRecents() }),
  };
});
