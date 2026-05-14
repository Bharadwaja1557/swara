/**
 * playerStore — Background-safe audio playback engine
 *
 * CRITICAL FIX: The audio engine lives in module-level variables (_eng).
 * The `onended` handler reads directly from _eng — never from Zustand get().
 * This guarantees queue progression even when the tab is backgrounded and
 * browsers throttle JS execution / React state updates.
 */
import { create } from 'zustand';
import type { Track, RepeatMode } from '@/types/music';

// ─── Module-level audio engine (background-safe) ─────────────────────────────

let _audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio();
    _audio.preload = 'metadata';
    _setupListeners(_audio);
  }
  return _audio;
}

// Engine: always current, no React dependency
const _eng = {
  originalQueue: [] as Track[],
  activeQueue:   [] as Track[],   // shuffled when shuffle on
  idx:           0,
  shuffle:       false,
  repeat:        'off' as RepeatMode,
};

// Stable ref to zustand set (never stale)
let _sync: ((partial: Partial<PlayerReactState>) => void) | null = null;

function _fisher<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function _setupListeners(a: HTMLAudioElement) {
  a.ontimeupdate = () => {
    const dur = a.duration || 0;
    const prog = dur > 0 ? a.currentTime / dur : 0;
    _sync?.({ progress: prog, duration: dur });
    if ('mediaSession' in navigator && dur > 0) {
      try {
        navigator.mediaSession.setPositionState({ duration: dur, playbackRate: a.playbackRate, position: a.currentTime });
      } catch { /* not all browsers support this */ }
    }
  };
  a.onloadedmetadata = () => _sync?.({ duration: a.duration });
  a.onplay  = () => {
    _sync?.({ isPlaying: true });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  };
  a.onpause = () => {
    _sync?.({ isPlaying: false });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  };

  // ── onended: reads from _eng only — background-safe ──────────────────────
  a.onended = () => {
    const { activeQueue, idx, repeat } = _eng;
    if (repeat === 'one') {
      a.currentTime = 0;
      a.play().catch(() => {});
      return;
    }
    let nextIdx: number | null = null;
    if (idx < activeQueue.length - 1) nextIdx = idx + 1;
    else if (repeat === 'all' && activeQueue.length > 0) nextIdx = 0;

    if (nextIdx !== null) {
      _eng.idx = nextIdx;
      _loadAndPlay(activeQueue[nextIdx]);
    } else {
      _sync?.({ isPlaying: false, progress: 0 });
    }
  };

  a.onerror = () => console.error('[Swara] Audio error:', a.error?.message ?? 'unknown');
}

function _loadAndPlay(track: Track) {
  const a = getAudio();
  a.src = track.streamUrl;
  a.load();
  a.play().catch((e) => {
    if (e?.name !== 'NotAllowedError') console.warn('[Swara] play() failed:', e?.message);
  });
  _sync?.({ currentTrack: track, currentIndex: _eng.idx, isPlaying: true, progress: 0, duration: 0 });
  _updateMediaSession(track);
  _pushRecent(track.albumId, track.id);
  _sync?.({ recentSongs: _loadRecents() });
}

function _updateMediaSession(track: Track) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title, artist: track.artist, album: track.album,
    artwork: track.coverUrl ? [{ src: track.coverUrl, sizes: '512x512', type: 'image/webp' }] : [],
  });
  // Handlers reference _eng directly — always current
  navigator.mediaSession.setActionHandler('play',          () => { getAudio().play().catch(() => {}); });
  navigator.mediaSession.setActionHandler('pause',         () => { getAudio().pause(); });
  navigator.mediaSession.setActionHandler('nexttrack',     () => _advanceNext());
  navigator.mediaSession.setActionHandler('previoustrack', () => _advancePrev());
  navigator.mediaSession.setActionHandler('seekto', (d) => {
    const a = getAudio();
    if (d.seekTime !== undefined && a.duration) a.currentTime = d.seekTime;
  });
}

function _advanceNext() {
  const { activeQueue, idx, repeat } = _eng;
  if (!activeQueue.length) return;
  let nextIdx = idx < activeQueue.length - 1 ? idx + 1 : repeat === 'all' ? 0 : null;
  if (nextIdx === null) return;
  _eng.idx = nextIdx;
  _loadAndPlay(activeQueue[nextIdx]);
}

function _advancePrev() {
  const a = getAudio();
  if (a.currentTime > 3) { a.currentTime = 0; return; }
  const { activeQueue, idx } = _eng;
  if (!activeQueue.length) return;
  const prevIdx = idx > 0 ? idx - 1 : activeQueue.length - 1;
  _eng.idx = prevIdx;
  _loadAndPlay(activeQueue[prevIdx]);
}

// ─── Recents: track-level (deduped by album) ─────────────────────────────────
const RECENTS_KEY = 'swara_recents';

interface RecentEntry { trackId: string; albumId: string; }

function _loadRecents(): RecentEntry[] {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]'); } catch { return []; }
}

function _pushRecent(albumId: string, trackId: string) {
  if (!albumId || !trackId) return;
  // Dedup by albumId (keep most recent per album)
  const list = _loadRecents().filter((r) => r.albumId !== albumId);
  list.unshift({ trackId, albumId });
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, 30)));
}

export function getRecentEntries(): RecentEntry[] { return _loadRecents(); }

// ─── Expose next N tracks (for Now Playing queue display) ─────────────────────
export function getNextTracks(n = 5): Track[] {
  return _eng.activeQueue.slice(_eng.idx + 1, _eng.idx + 1 + n);
}
export function getActiveQueue(): Track[] { return _eng.activeQueue; }
export function getEngineIdx(): number { return _eng.idx; }

// ─── Zustand React State ──────────────────────────────────────────────────────

interface PlayerReactState {
  currentTrack:  Track | null;
  currentIndex:  number;
  isPlaying:     boolean;
  isShuffle:     boolean;
  repeat:        RepeatMode;
  progress:      number;
  duration:      number;
  isExpanded:    boolean;
  recentSongs:   RecentEntry[];
}

interface PlayerState extends PlayerReactState {
  playTrack:      (track: Track, queue?: Track[]) => void;
  playAlbum:      (tracks: Track[], startIndex?: number) => void;
  togglePlay:     () => void;
  next:           () => void;
  prev:           () => void;
  seekTo:         (ratio: number) => void;
  toggleShuffle:  () => void;
  toggleRepeat:   () => void;
  setExpanded:    (v: boolean) => void;
  refreshRecents: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => {
  // Wire up the sync function
  _sync = (partial) => set(partial as Partial<PlayerState>);

  function _setQueue(tracks: Track[], startIdx: number) {
    _eng.originalQueue = tracks;
    _eng.idx = startIdx;
    if (_eng.shuffle) {
      // Shuffle but keep current track first
      const rest = tracks.filter((_, i) => i !== startIdx);
      const shuffledRest = _fisher(rest);
      _eng.activeQueue = [tracks[startIdx], ...shuffledRest];
      _eng.idx = 0;
    } else {
      _eng.activeQueue = [...tracks];
      _eng.idx = startIdx;
    }
  }

  return {
    currentTrack:  null,
    currentIndex:  0,
    isPlaying:     false,
    isShuffle:     false,
    repeat:        'off',
    progress:      0,
    duration:      0,
    isExpanded:    false,
    recentSongs:   _loadRecents(),

    playTrack: (track, queue) => {
      const q = queue ?? [track];
      const startIdx = q.findIndex((t) => t.id === track.id);
      _setQueue(q, Math.max(0, startIdx));
      _loadAndPlay(track);
      set({ isShuffle: _eng.shuffle });
    },

    playAlbum: (tracks, startIndex = 0) => {
      _setQueue(tracks, startIndex);
      _loadAndPlay(_eng.activeQueue[_eng.idx]);
    },

    togglePlay: () => {
      const a = getAudio();
      if (a.paused) a.play().catch(() => {});
      else a.pause();
    },

    next: () => _advanceNext(),
    prev: () => _advancePrev(),

    seekTo: (ratio) => {
      const a = getAudio();
      if (a.duration) { a.currentTime = ratio * a.duration; set({ progress: ratio }); }
    },

    toggleShuffle: () => {
      const newShuffle = !_eng.shuffle;
      _eng.shuffle = newShuffle;
      const currentTrack = _eng.activeQueue[_eng.idx];
      if (newShuffle) {
        const rest = _eng.originalQueue.filter((t) => t.id !== currentTrack?.id);
        _eng.activeQueue = currentTrack ? [currentTrack, ..._fisher(rest)] : _fisher(_eng.originalQueue);
        _eng.idx = 0;
      } else {
        _eng.activeQueue = [..._eng.originalQueue];
        _eng.idx = currentTrack ? _eng.originalQueue.findIndex((t) => t.id === currentTrack.id) : 0;
        if (_eng.idx < 0) _eng.idx = 0;
      }
      set({ isShuffle: newShuffle, currentIndex: _eng.idx });
    },

    toggleRepeat: () => {
      const next: RepeatMode = _eng.repeat === 'off' ? 'all' : _eng.repeat === 'all' ? 'one' : 'off';
      _eng.repeat = next;
      set({ repeat: next });
    },

    setExpanded:    (v) => set({ isExpanded: v }),
    refreshRecents: ()  => set({ recentSongs: _loadRecents() }),
  };
});
