/**
 * playerStore — Background-safe audio engine + Zustand React state.
 *
 * ADDED: Queue + playback persistence (Spotify-style session continuity).
 *
 *   _savePlayback()          — writes engine state to localStorage as IDs only
 *   restorePlaybackState()   — exported; resolves IDs via canonical trackMap,
 *                              restores engine + audio, NEVER autoplays
 *   _throttledSaveTimestamp()— throttled (5s) save during playback
 *
 * What is persisted:
 *   - current track ID
 *   - full active queue (as track IDs)
 *   - original queue (for shuffle toggle correctness)
 *   - current index
 *   - shuffle + repeat mode
 *   - audio volume
 *   - playback timestamp (throttled to every 5 s)
 *
 * What is NOT persisted: isPlaying — restore is always paused to respect
 * browser autoplay restrictions.
 *
 * EXISTING: The audio engine lives in module-level _eng / _audio variables.
 * The onended handler reads from _eng only — background-safe.
 */
import { create } from 'zustand';
import type { Track, RepeatMode } from '@/types/music';

// ─── Persistence ─────────────────────────────────────────────────────────────

const PLAYBACK_KEY = 'swara_playback';

interface SavedPlaybackState {
  trackId:          string | null;
  queueIds:         string[];
  originalQueueIds: string[];
  idx:              number;
  shuffle:          boolean;
  repeat:           RepeatMode;
  volume:           number;
  timestamp:        number;
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
  };
  try { localStorage.setItem(PLAYBACK_KEY, JSON.stringify(state)); } catch {}
}

let _tsSaveTimer = 0;
function _throttledSaveTimestamp(): void {
  // Debounce: only actually saves 5 s after the last ontimeupdate
  clearTimeout(_tsSaveTimer);
  _tsSaveTimer = window.setTimeout(_savePlayback, 5000);
}

/**
 * Restore playback state from localStorage.
 * Called by AppLayout AFTER all album tracks are loaded into the store,
 * guaranteeing that the canonical trackMap has the full pool to resolve IDs.
 *
 * @param trackMap — canonical Map<trackId, Track> from libraryStore
 */
export function restorePlaybackState(trackMap: Map<string, Track>): void {
  try {
    const raw = localStorage.getItem(PLAYBACK_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw) as SavedPlaybackState;
    if (!saved.queueIds?.length) return;

    // Resolve IDs → Track objects via O(1) canonical map
    const activeQueue = saved.queueIds
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => t !== undefined);

    const originalQueue = (saved.originalQueueIds ?? [])
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => t !== undefined);

    if (!activeQueue.length) {
      console.log('[Playback] Restore: saved queue IDs not found in current library — skipped');
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

    const a   = getAudio();
    const vol = Math.max(0, Math.min(1, saved.volume ?? 1));
    a.src    = track.streamUrl;
    a.volume = vol;
    a.load();

    const savedTs = saved.timestamp ?? 0;
    if (savedTs > 0) {
      // Seek once metadata is available (duration must be known)
      a.addEventListener('loadedmetadata', () => {
        if (isFinite(a.duration) && savedTs < a.duration) {
          a.currentTime = savedTs;
          // Sync progress to Zustand after seek
          _sync?.({ progress: savedTs / a.duration, duration: a.duration });
        }
      }, { once: true });
    }

    // NEVER autoplay on restore — browser autoplay policy must be respected
    _sync?.({
      currentTrack: track,
      currentIndex: idx,
      isPlaying:    false,
      isShuffle:    saved.shuffle ?? false,
      repeat:       saved.repeat  ?? 'off',
      progress:     0,
      duration:     0,
    });

    console.log(`[Playback] Restored: "${track.title}" (${idx + 1}/${activeQueue.length}) at ${savedTs.toFixed(1)}s — paused`);
  } catch (err) {
    console.error('[Playback] restorePlaybackState error:', err);
  }
}

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

const _eng = {
  originalQueue: [] as Track[],
  activeQueue:   [] as Track[],
  idx:           0,
  shuffle:       false,
  repeat:        'off' as RepeatMode,
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
    _throttledSaveTimestamp(); // throttled — saves at most every 5 s
  };

  a.onloadedmetadata = () => _sync?.({ duration: a.duration });

  a.onplay  = () => {
    _sync?.({ isPlaying: true });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  };
  a.onpause = () => {
    _sync?.({ isPlaying: false });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    _savePlayback(); // save immediately on pause so timestamp is accurate
  };

  // onended: reads from _eng only — safe when tab is backgrounded
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
  _sync?.({ currentTrack: track, currentIndex: _eng.idx, isPlaying: true, progress: 0, duration: 0 });
  _updateMediaSession(track);
  _pushRecent(track.albumId, track.id);
  _sync?.({ recentSongs: _loadRecents() });
  _savePlayback(); // persist immediately when track changes
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
export function getActiveQueue(): Track[] { return _eng.activeQueue; }
export function getEngineIdx(): number   { return _eng.idx; }

// ─── Zustand React state ──────────────────────────────────────────────────────

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
  _sync = (partial) => set(partial as Partial<PlayerState>);

  function _setQueue(tracks: Track[], startIdx: number) {
    _eng.originalQueue = tracks;
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
      const q        = queue ?? [track];
      const startIdx = Math.max(0, q.findIndex((t) => t.id === track.id));
      _setQueue(q, startIdx);
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
      else          a.pause();
    },

    next: () => _advanceNext(),
    prev: () => _advancePrev(),

    seekTo: (ratio) => {
      const a = getAudio();
      if (a.duration) {
        a.currentTime = ratio * a.duration;
        set({ progress: ratio });
        _savePlayback(); // save seek position
      }
    },

    toggleShuffle: () => {
      const newShuffle  = !_eng.shuffle;
      _eng.shuffle      = newShuffle;
      const currentTrack = _eng.activeQueue[_eng.idx];
      if (newShuffle) {
        const rest = _eng.originalQueue.filter((t) => t.id !== currentTrack?.id);
        _eng.activeQueue = currentTrack ? [currentTrack, ..._fisher(rest)] : _fisher(_eng.originalQueue);
        _eng.idx         = 0;
      } else {
        _eng.activeQueue = [..._eng.originalQueue];
        _eng.idx         = currentTrack
          ? _eng.originalQueue.findIndex((t) => t.id === currentTrack.id)
          : 0;
        if (_eng.idx < 0) _eng.idx = 0;
      }
      set({ isShuffle: newShuffle, currentIndex: _eng.idx });
      _savePlayback(); // persist new queue order
    },

    toggleRepeat: () => {
      const next: RepeatMode = _eng.repeat === 'off' ? 'all' : _eng.repeat === 'all' ? 'one' : 'off';
      _eng.repeat = next;
      set({ repeat: next });
      _savePlayback(); // persist repeat mode
    },

    setExpanded:    (v) => set({ isExpanded: v }),
    refreshRecents: ()  => set({ recentSongs: _loadRecents() }),
  };
});

// ─── Volume (desktop player) ──────────────────────────────────────────────────

export function setAudioVolume(vol: number) {
  const clamped = Math.max(0, Math.min(1, vol));
  const a       = getAudio();
  a.volume      = clamped;
  _sync?.({ volume: clamped } as any);
  _savePlayback(); // persist new volume
}

export function getAudioVolume(): number {
  return _audio?.volume ?? 1;
}
