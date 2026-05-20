/**
 * playerStore — Background-safe audio engine + Zustand React state.
 *
 * QUEUE ARCHITECTURE (v2):
 *
 *   playQueue({ tracks, context, startIndex? })
 *     — primary entry point; replaces playTrack/playAlbum
 *     — called by trackActions, which gets queues from queueBuilders
 *
 *   Queue mutations (all immutable, all call _savePlayback):
 *     appendToQueue(track)
 *     removeFromQueue(index)
 *     moveQueueTrack(from, to)
 *     clearQueue()
 *
 *   Persistence (PLAYBACK_KEY):
 *     - queueIds / originalQueueIds (track IDs only)
 *     - queueContext (full QueueContext object)
 *     - currentIndex, shuffle, repeat, volume, timestamp
 *
 *   NEVER autoplays on restore — browser autoplay policy must be respected.
 *
 * BACKWARDS COMPAT:
 *   playTrack(track, queue?, context?) still works — delegates to playQueue.
 *   playAlbum(tracks, startIndex?, context?) still works — delegates to playQueue.
 *   QueueSource type kept as alias for QueueContext['type'] | null.
 */
import { create } from 'zustand';
import type { Track, RepeatMode, QueueContext } from '@/types/music';

/** Backwards-compat alias — use QueueContext for new code */
export type QueueSource = QueueContext['type'] | null;

// ─── Persistence ─────────────────────────────────────────────────────────────

const PLAYBACK_KEY = 'swara_playback_v2';

interface SavedPlaybackState {
  trackId:          string | null;
  queueIds:         string[];
  originalQueueIds: string[];
  idx:              number;
  shuffle:          boolean;
  repeat:           RepeatMode;
  volume:           number;
  timestamp:        number;
  queueContext:     QueueContext | null;
}

function _savePlayback(): void {
  if (!_eng.activeQueue.length) return;
  const state: SavedPlaybackState = {
    trackId:          _eng.activeQueue[_eng.idx]?.id ?? null,
    queueIds:         _eng.activeQueue.map((t) => t.id),
    originalQueueIds: _eng.originalQueue.map((t) => t.id),
    idx:              _eng.idx,
    shuffle:          _eng.shuffle,
    repeat:           _eng.repeat,
    volume:           _audio?.volume ?? 1,
    timestamp:        _audio?.currentTime ?? 0,
    queueContext:     _eng.queueContext,
  };
  try { localStorage.setItem(PLAYBACK_KEY, JSON.stringify(state)); } catch {}
}

let _tsSaveTimer = 0;
function _throttledSaveTimestamp(): void {
  clearTimeout(_tsSaveTimer);
  _tsSaveTimer = window.setTimeout(_savePlayback, 5000);
}

/**
 * Restore playback state from localStorage.
 * Called by AppLayout AFTER all album tracks are loaded into the store.
 * Resolves track IDs via canonical trackMap. NEVER autoplays.
 */
export function restorePlaybackState(trackMap: Map<string, Track>): void {
  try {
    // Try v2 key first, then fall back to v1 for migration
    const raw = localStorage.getItem(PLAYBACK_KEY)
             ?? localStorage.getItem('swara_playback');
    if (!raw) return;

    const saved = JSON.parse(raw) as SavedPlaybackState;
    if (!saved.queueIds?.length) return;

    const activeQueue = saved.queueIds
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => t !== undefined);

    const originalQueue = (saved.originalQueueIds ?? [])
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => t !== undefined);

    if (!activeQueue.length) {
      console.log('[Playback] Restore: saved queue IDs not found in library — skipped');
      return;
    }

    const idx   = Math.min(Math.max(0, saved.idx ?? 0), activeQueue.length - 1);
    const track = activeQueue[idx];
    if (!track) return;

    _eng.activeQueue   = activeQueue;
    _eng.originalQueue = originalQueue.length ? originalQueue : [...activeQueue];
    _eng.idx           = idx;
    _eng.shuffle       = saved.shuffle  ?? false;
    _eng.repeat        = (saved.repeat  ?? 'off') as RepeatMode;
    _eng.queueContext  = saved.queueContext ?? null;

    const a   = getAudio();
    const vol = Math.max(0, Math.min(1, saved.volume ?? 1));
    a.src    = track.streamUrl;
    a.volume = vol;
    a.load();

    const savedTs = saved.timestamp ?? 0;
    if (savedTs > 0) {
      a.addEventListener('loadedmetadata', () => {
        if (isFinite(a.duration) && savedTs < a.duration) {
          a.currentTime = savedTs;
          _sync?.({ progress: savedTs / a.duration, duration: a.duration });
        }
      }, { once: true });
    }

    _sync?.({
      currentTrack:  track,
      currentIndex:  idx,
      isPlaying:     false,
      isShuffle:     saved.shuffle ?? false,
      repeat:        saved.repeat  ?? 'off',
      progress:      0,
      duration:      0,
      queueContext:  saved.queueContext ?? null,
      queueLength:   activeQueue.length,
    });

    console.log(`[Playback] Restored: "${track.title}" (${idx + 1}/${activeQueue.length}) at ${savedTs.toFixed(1)}s — paused`);
    if (saved.queueContext) {
      console.log(`[Playback] Queue context: ${saved.queueContext.type} — "${saved.queueContext.title ?? ''}"`);
    }
  } catch (err) {
    console.error('[Playback] restorePlaybackState error:', err);
  }
}

// ─── Module-level audio engine ────────────────────────────────────────────────

let _audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio();
    _audio.preload = 'metadata';
    _setupListeners(_audio);
  }
  return _audio;
}

const _eng = {
  originalQueue: [] as Track[],
  activeQueue:   [] as Track[],
  idx:           0,
  shuffle:       false,
  repeat:        'off' as RepeatMode,
  queueContext:  null as QueueContext | null,
};

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
    const dur  = a.duration || 0;
    const prog = dur > 0 ? a.currentTime / dur : 0;
    _sync?.({ progress: prog, duration: dur });
    if ('mediaSession' in navigator && dur > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: dur, playbackRate: a.playbackRate, position: a.currentTime,
        });
      } catch { /* not all browsers support this */ }
    }
    _throttledSaveTimestamp();
  };

  a.onloadedmetadata = () => _sync?.({ duration: a.duration });

  a.onplay  = () => {
    _sync?.({ isPlaying: true });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  };
  a.onpause = () => {
    _sync?.({ isPlaying: false });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    _savePlayback();
  };

  a.onended = () => {
    const { activeQueue, idx, repeat } = _eng;
    if (repeat === 'one') {
      a.currentTime = 0;
      a.play().catch(() => {});
      return;
    }
    let nextIdx: number | null = null;
    if (idx < activeQueue.length - 1)      nextIdx = idx + 1;
    else if (repeat === 'all' && activeQueue.length > 0) nextIdx = 0;

    if (nextIdx !== null) {
      _eng.idx = nextIdx;
      _loadAndPlay(activeQueue[nextIdx]);
    } else {
      _sync?.({ isPlaying: false, progress: 0 });
      _savePlayback();
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
  _sync?.({
    currentTrack: track,
    currentIndex: _eng.idx,
    isPlaying:    true,
    progress:     0,
    duration:     0,
    queueLength:  _eng.activeQueue.length,
  });
  _updateMediaSession(track);
  _pushRecent(track.albumId, track.id);
  _sync?.({ recentSongs: _loadRecents() });
  _savePlayback();
}

function _updateMediaSession(track: Track) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title, artist: track.artist, album: track.album,
    artwork: track.coverUrl ? [{ src: track.coverUrl, sizes: '512x512', type: 'image/webp' }] : [],
  });
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
  const nextIdx = idx < activeQueue.length - 1 ? idx + 1 : repeat === 'all' ? 0 : null;
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

// ─── Recents ─────────────────────────────────────────────────────────────────

const RECENTS_KEY = 'swara_recents';
interface RecentEntry { trackId: string; albumId: string; }

function _loadRecents(): RecentEntry[] {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]'); } catch { return []; }
}
function _pushRecent(albumId: string, trackId: string) {
  if (!albumId || !trackId) return;
  const list = _loadRecents().filter((r) => r.albumId !== albumId);
  list.unshift({ trackId, albumId });
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, 30)));
}

export function getRecentEntries(): RecentEntry[] { return _loadRecents(); }

export function getNextTracks(n = 5): Track[] {
  return _eng.activeQueue.slice(_eng.idx + 1, _eng.idx + 1 + n);
}
export function getActiveQueue(): Track[] { return [..._eng.activeQueue]; }
export function getEngineIdx(): number    { return _eng.idx; }

// ─── Zustand React state ──────────────────────────────────────────────────────

export interface PlayerReactState {
  currentTrack:  Track | null;
  currentIndex:  number;
  isPlaying:     boolean;
  isShuffle:     boolean;
  repeat:        RepeatMode;
  progress:      number;
  duration:      number;
  isExpanded:    boolean;
  recentSongs:   RecentEntry[];
  /** Rich queue context — survives persistence */
  queueContext:  QueueContext | null;
  /** Total tracks in active queue — for display without exposing full array */
  queueLength:   number;
}

export interface PlayerState extends PlayerReactState {
  // ── Primary API (new) ────────────────────────────────────────────────────
  /** Replace entire queue and start playing at startIndex. */
  playQueue:         (opts: { tracks: Track[]; context: QueueContext; startIndex?: number }) => void;
  /** Replace queue without starting from a specific track. */
  replaceQueue:      (tracks: Track[], context: QueueContext) => void;

  // ── Queue mutations ──────────────────────────────────────────────────────
  appendToQueue:     (track: Track) => void;
  removeFromQueue:   (index: number) => void;
  moveQueueTrack:    (fromIndex: number, toIndex: number) => void;
  clearQueue:        () => void;
  /** Play a specific index in the current queue */
  playTrackFromQueue:(index: number) => void;

  // ── Backwards-compat (delegates to playQueue) ────────────────────────────
  playTrack:         (track: Track, queue?: Track[], context?: QueueContext | QueueSource) => void;
  playAlbum:         (tracks: Track[], startIndex?: number, context?: QueueContext | QueueSource) => void;

  // ── Transport ────────────────────────────────────────────────────────────
  togglePlay:        () => void;
  next:              () => void;
  prev:              () => void;
  seekTo:            (ratio: number) => void;
  toggleShuffle:     () => void;
  toggleRepeat:      () => void;
  setExpanded:       (v: boolean) => void;
  /** Deprecated — prefer passing context to playQueue directly */
  setQueueSource:    (source: QueueSource) => void;
  refreshRecents:    () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  _sync = (partial) => set(partial as Partial<PlayerState>);

  function _setQueue(tracks: Track[], startIdx: number) {
    _eng.originalQueue = [...tracks];
    _eng.idx           = startIdx;
    if (_eng.shuffle) {
      const rest = tracks.filter((_, i) => i !== startIdx);
      _eng.activeQueue = [tracks[startIdx], ..._fisher(rest)];
      _eng.idx         = 0;
    } else {
      _eng.activeQueue = [...tracks];
      _eng.idx         = startIdx;
    }
  }

  /** Normalize a QueueSource string into a minimal QueueContext */
  function _contextFromSource(src: QueueSource): QueueContext {
    return { type: src ?? 'unknown' };
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
    queueContext:  null,
    queueLength:   0,

    // ── Primary new API ────────────────────────────────────────────────────
    playQueue: ({ tracks, context, startIndex = 0 }) => {
      if (!tracks.length) return;
      const idx = Math.min(Math.max(0, startIndex), tracks.length - 1);
      _eng.queueContext = context;
      _setQueue(tracks, idx);
      _loadAndPlay(_eng.activeQueue[_eng.idx]);
      set({ isShuffle: _eng.shuffle, queueContext: context, queueLength: _eng.activeQueue.length });
    },

    replaceQueue: (tracks, context) => {
      if (!tracks.length) return;
      _eng.queueContext = context;
      _setQueue(tracks, 0);
      set({ queueContext: context, queueLength: _eng.activeQueue.length });
      _savePlayback();
    },

    // ── Queue mutations ────────────────────────────────────────────────────
    appendToQueue: (track) => {
      _eng.activeQueue   = [..._eng.activeQueue, track];
      _eng.originalQueue = [..._eng.originalQueue, track];
      set({ queueLength: _eng.activeQueue.length });
      _savePlayback();
    },

    removeFromQueue: (index) => {
      if (index < 0 || index >= _eng.activeQueue.length) return;
      const removingCurrent = index === _eng.idx;
      _eng.activeQueue = _eng.activeQueue.filter((_, i) => i !== index);
      // Also remove from originalQueue by track ID
      const removedId = _eng.activeQueue[index]?.id;
      if (removedId) {
        _eng.originalQueue = _eng.originalQueue.filter((t) => t.id !== removedId);
      }
      if (removingCurrent && _eng.activeQueue.length > 0) {
        // Stay at same index (next track shifts up), unless we were at end
        _eng.idx = Math.min(_eng.idx, _eng.activeQueue.length - 1);
        _loadAndPlay(_eng.activeQueue[_eng.idx]);
      } else if (index < _eng.idx) {
        _eng.idx = Math.max(0, _eng.idx - 1);
      }
      set({ currentIndex: _eng.idx, queueLength: _eng.activeQueue.length });
      _savePlayback();
    },

    moveQueueTrack: (fromIndex, toIndex) => {
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || toIndex < 0) return;
      if (fromIndex >= _eng.activeQueue.length || toIndex >= _eng.activeQueue.length) return;

      const q = [..._eng.activeQueue];
      const [moved] = q.splice(fromIndex, 1);
      q.splice(toIndex, 0, moved);
      _eng.activeQueue = q;

      // Adjust current index to follow the playing track
      const currentTrack = get().currentTrack;
      if (currentTrack) {
        _eng.idx = q.findIndex((t) => t.id === currentTrack.id);
        if (_eng.idx < 0) _eng.idx = toIndex;
      }

      set({ currentIndex: _eng.idx, queueLength: q.length });
      _savePlayback();
    },

    clearQueue: () => {
      getAudio().pause();
      _eng.activeQueue   = [];
      _eng.originalQueue = [];
      _eng.idx           = 0;
      _eng.queueContext  = null;
      set({ currentTrack: null, currentIndex: 0, isPlaying: false, progress: 0, duration: 0, queueContext: null, queueLength: 0 });
      try { localStorage.removeItem(PLAYBACK_KEY); } catch {}
    },

    playTrackFromQueue: (index) => {
      if (index < 0 || index >= _eng.activeQueue.length) return;
      _eng.idx = index;
      _loadAndPlay(_eng.activeQueue[index]);
    },

    // ── Backwards-compat wrappers ──────────────────────────────────────────
    playTrack: (track, queue, contextOrSource) => {
      const q = queue ?? [track];
      const startIdx = Math.max(0, q.findIndex((t) => t.id === track.id));
      const context: QueueContext = (contextOrSource && typeof contextOrSource === 'object')
        ? contextOrSource as QueueContext
        : _contextFromSource(contextOrSource as QueueSource ?? null);
      get().playQueue({ tracks: q, context, startIndex: startIdx });
    },

    playAlbum: (tracks, startIndex = 0, contextOrSource) => {
      const context: QueueContext = (contextOrSource && typeof contextOrSource === 'object')
        ? contextOrSource as QueueContext
        : _contextFromSource(contextOrSource as QueueSource ?? 'album');
      get().playQueue({ tracks, context, startIndex });
    },

    // ── Transport ──────────────────────────────────────────────────────────
    togglePlay: () => {
      const a = getAudio();
      if (a.paused) a.play().catch(() => {});
      else          a.pause();
    },

    next: () => _advanceNext(),
    prev: () => _advancePrev(),

    seekTo: (ratio) => {
      const a = getAudio();
      if (a.duration) {
        a.currentTime = ratio * a.duration;
        set({ progress: ratio });
        _savePlayback();
      }
    },

    toggleShuffle: () => {
      const newShuffle  = !_eng.shuffle;
      _eng.shuffle      = newShuffle;
      const ct = _eng.activeQueue[_eng.idx];
      if (newShuffle) {
        const rest = _eng.originalQueue.filter((t) => t.id !== ct?.id);
        _eng.activeQueue = ct ? [ct, ..._fisher(rest)] : _fisher(_eng.originalQueue);
        _eng.idx         = 0;
      } else {
        _eng.activeQueue = [..._eng.originalQueue];
        _eng.idx         = ct ? _eng.originalQueue.findIndex((t) => t.id === ct.id) : 0;
        if (_eng.idx < 0) _eng.idx = 0;
      }
      set({ isShuffle: newShuffle, currentIndex: _eng.idx, queueLength: _eng.activeQueue.length });
      _savePlayback();
    },

    toggleRepeat: () => {
      const next: RepeatMode = _eng.repeat === 'off' ? 'all' : _eng.repeat === 'all' ? 'one' : 'off';
      _eng.repeat = next;
      set({ repeat: next });
      _savePlayback();
    },

    setExpanded:    (v) => set({ isExpanded: v }),
    setQueueSource: (source) => {
      const ctx: QueueContext = { type: source ?? 'unknown' };
      _eng.queueContext = ctx;
      set({ queueContext: ctx });
    },
    refreshRecents: () => set({ recentSongs: _loadRecents() }),
  };
});

// ─── Volume ───────────────────────────────────────────────────────────────────

export function setAudioVolume(vol: number) {
  const clamped = Math.max(0, Math.min(1, vol));
  const a       = getAudio();
  a.volume      = clamped;
  _savePlayback();
}

export function getAudioVolume(): number {
  return _audio?.volume ?? 1;
}
