/**
 * playerStore — Background-safe audio engine + Zustand React state.
 *
 * ══ QUEUE INVARIANTS ════════════════════════════════════════════════════════
 *
 * These invariants MUST hold at all times after any queue mutation:
 *
 * I1. _eng.idx is always in [0, activeQueue.length - 1].
 *     If activeQueue is empty, idx = 0 (sentinel, no valid track).
 *
 * I2. _eng.activeQueue[_eng.idx] always equals the currently playing
 *     track (same object reference or same id). If no track is playing,
 *     activeQueue is empty.
 *
 * I3. originalQueue contains the same tracks as activeQueue in their
 *     natural (un-shuffled) order. They may differ in length only if
 *     tracks were removed since the last shuffle toggle — in which case
 *     originalQueue is pruned to match.
 *
 * I4. currentTrack in Zustand state always matches activeQueue[idx]
 *     or is null if the queue is empty. No stale references.
 *
 * I5. After any mutation that changes the active track (remove current,
 *     play new), _loadAndPlay is called to keep the audio engine in sync.
 *
 * I6. Duplicate track IDs in the queue are permitted (same song twice).
 *     When removing, only ONE instance at the given index is removed,
 *     NOT all instances with the same ID.
 *
 * I7. queueVersion is incremented on EVERY structural change to activeQueue.
 *     This is the reactive signal for queue consumers (QueuePage etc.).
 *
 * ══ PERSISTENCE ══════════════════════════════════════════════════════════════
 *
 * Uses src/lib/persistence/ for versioned schema and migration pipeline.
 * Current storage key: swara_playback_v3 (SchemaV3).
 * Migrates from V1/V2 automatically on first load.
 *
 * ══ BACKWARDS COMPAT ═════════════════════════════════════════════════════════
 *
 * playTrack(track, queue?, context?) and playAlbum(tracks, startIndex?, context?)
 * still work — they delegate to playQueue(). QueueSource is a type alias.
 */
import { create } from 'zustand';
import type { Track, RepeatMode, QueueContext } from '@/types/music';
import { loadAndMigratePlaybackState } from '@/lib/persistence/migrations';
import { STORAGE_KEY } from '@/lib/persistence/versions';
import type { SchemaV3 } from '@/lib/persistence/versions';
import { canBrowserPlay }                          from '@/features/media/canBrowserPlay';
import { recomputePreload, checkPreloadTrigger, resetPreloadTrigger, clearPreloader, trySwapBuffer, notifySwapComplete } from '@/lib/audioPreloader';
import { classifyMediaError, MEDIA_ERROR_MESSAGES } from '@/features/media/mediaErrors';
import { mediaLogger }                              from '@/features/media/mediaLogger';

// ─── Volume persistence ───────────────────────────────────────────────────────
// Declared FIRST so they are initialized before usePlayerStore's create()
// callback runs. Moving these to the bottom caused a TDZ crash in production:
// Rollup's scope-hoisting reorders module-scope const declarations, so
// VOLUME_KEY was in TDZ when _readPersistedVolume() was called from the
// Zustand initial state object inside create().
//
// Rule: any const/let referenced inside create()'s synchronous callback
// MUST be declared before the create() call.

const VOLUME_KEY  = 'swara:volume';
const DEFAULT_VOL = 1;

function _readPersistedVolume(): number {
  try {
    if (typeof window === 'undefined') return DEFAULT_VOL;
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return DEFAULT_VOL;
    const v = parseFloat(raw);
    return isFinite(v) ? Math.max(0, Math.min(1, v)) : DEFAULT_VOL;
  } catch { return DEFAULT_VOL; }
}

function _writePersistedVolume(v: number): void {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(VOLUME_KEY, String(v));
  } catch {}
}


/** Backwards-compat alias */
export type QueueSource = QueueContext['type'] | null;

// ─── Persistence ─────────────────────────────────────────────────────────────

function _savePlayback(): void {
  if (!_eng.activeQueue.length) return;
  const state: SchemaV3 = {
    schemaVersion:    3,
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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

let _tsSaveTimer = 0;
function _throttledSaveTimestamp(): void {
  clearTimeout(_tsSaveTimer);
  _tsSaveTimer = window.setTimeout(_savePlayback, 5000);
}

/**
 * Restore playback state after library has loaded.
 * Resolves track IDs via canonical trackMap (O(1) per lookup).
 * Gracefully skips missing tracks — the restored queue may be shorter.
 * NEVER autoplays — browser autoplay policy must be respected.
 */
export function restorePlaybackState(trackMap: Map<string, Track>): void {
  try {
    const saved = loadAndMigratePlaybackState();
    if (!saved || !saved.queueIds?.length) return;

    // Resolve IDs against current library — missing tracks are skipped (I3)
    const activeQueue = saved.queueIds
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => t !== undefined);

    // Invariant: need at least one track
    if (!activeQueue.length) {
      console.log('[Playback] Restore: no queue tracks found in library — skipped');
      return;
    }

    // Resolve originalQueue. If all originals are missing, fall back to activeQueue.
    const originalQueue = (saved.originalQueueIds ?? [])
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => t !== undefined);

    // Clamp idx to valid range (I1). After missing-track removal, saved.idx
    // may be out of range.
    const idx   = Math.min(Math.max(0, saved.idx ?? 0), activeQueue.length - 1);
    const track = activeQueue[idx];
    if (!track) return;

    _eng.activeQueue   = activeQueue;
    _eng.originalQueue = originalQueue.length ? originalQueue : [...activeQueue];
    _eng.idx           = idx;
    _eng.shuffle       = saved.shuffle;
    _eng.repeat        = saved.repeat;
    _eng.queueContext  = saved.queueContext;

    const a   = getAudio();
    const vol = Math.max(0, Math.min(1, saved.volume));
    a.src    = track.streamUrl;
    a.volume = vol;
    a.load();

    if (saved.timestamp > 0) {
      a.addEventListener('loadedmetadata', () => {
        if (isFinite(a.duration) && saved.timestamp < a.duration) {
          a.currentTime = saved.timestamp;
          _sync?.({ progress: saved.timestamp / a.duration, duration: a.duration });
        }
      }, { once: true });
    }

    _sync?.({
      currentTrack:  track,
      currentIndex:  idx,
      isPlaying:     false,
      isShuffle:     saved.shuffle,
      repeat:        saved.repeat,
      progress:      0,
      duration:      0,
      queueContext:  saved.queueContext,
      queueLength:   activeQueue.length,
      queueVersion:  ++_queueVersion,
    });

    _updateMediaSession(track);
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'paused'; } catch {}
    }
    _recomputePreload(); // prime cache for the track after the restored one
    console.log(`[Playback] Restored: "${track.title}" (${idx + 1}/${activeQueue.length}) — paused`);
  } catch (err) {
    console.error('[Playback] restorePlaybackState error:', err);
  }
}

// ─── Audio engine ─────────────────────────────────────────────────────────────

let _audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio();
    _audio.preload = 'metadata';
    _audio.volume  = _readPersistedVolume(); // restore before any track loads
    _setupListeners(_audio);
    _initMediaSession(); // register handlers ONCE for the engine's lifetime
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
let _queueVersion = 0;

function _fisher<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * _assertInvariants — dev-only check. Called after every mutation.
 * Verifies I1, I2, I3 hold. No-ops in production.
 */
function _assertInvariants(): void {
  if (!import.meta.env.DEV) return;
  const { activeQueue, originalQueue, idx } = _eng;
  if (activeQueue.length === 0) return; // empty queue is valid
  if (idx < 0 || idx >= activeQueue.length) {
    console.error(`[Invariant I1 violated] idx=${idx} out of range [0,${activeQueue.length - 1}]`);
  }
  // Note: originalQueue can be shorter if tracks were removed while shuffled.
  // What we enforce: any track in activeQueue that was in the original should
  // still be in originalQueue (order may differ). We don't enforce strict equality.
  if (originalQueue.length === 0 && activeQueue.length > 0) {
    console.error('[Invariant I3 violated] originalQueue is empty but activeQueue is not');
  }
}

// ── Toast helper (lazy import to avoid circular dep on useToastStore) ────────
function _showToast(msg: string) {
  if (!msg) return;
  import('@/store/useToastStore').then(({ useToastStore }) => {
    useToastStore.getState().show(msg, 'error');
  }).catch(() => {});
}

// ── Skip to next track after error ───────────────────────────────────────────
// Preserves queue order, shuffle state, repeat state.
// Prevents infinite skip loops: if every track in the queue fails we stop.
let _consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

function _skipToNext(reason: 'error') {
  void reason;
  const { activeQueue, idx, repeat } = _eng;
  if (activeQueue.length === 0) return;

  _consecutiveErrors++;
  if (_consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    // Entire queue seems unplayable — stop and reset error counter
    _consecutiveErrors = 0;
    _sync?.({ isPlaying: false });
    _savePlayback();
    return;
  }

  let nextIdx: number | null = null;
  if (idx < activeQueue.length - 1)               nextIdx = idx + 1;
  else if (repeat === 'all' && activeQueue.length > 0) nextIdx = 0;

  if (nextIdx !== null) {
    _eng.idx = nextIdx;
    mediaLogger.trackSkipped(activeQueue[idx]?.id ?? 'unknown', 'UNKNOWN_ERROR');
    _loadAndPlay(activeQueue[nextIdx]);
  } else {
    _sync?.({ isPlaying: false });
    _savePlayback();
  }
}

// ── Audio focus interruption tracking ────────────────────────────────────────
// Distinguishes user-initiated pauses from system interruptions
// (incoming call, other app taking audio focus, browser tab backgrounding).
// Used to prevent auto-resuming playback incorrectly after an interruption.
// The flag is read by future resume logic — not yet acted on in UI.
let _wasInterrupted = false;

function _setupListeners(a: HTMLAudioElement) {
  const _slTs = () => new Date().toISOString().slice(11, 23);
  const _slVis = () => document.hidden ? 'BG' : 'FG';
  console.log(`[ENG ${_slTs()} ${_slVis()}] _setupListeners called — wiring handlers on element`);
  a.ontimeupdate = () => {
    const dur  = a.duration || 0;
    const prog = dur > 0 ? a.currentTime / dur : 0;
    _sync?.({ progress: prog, duration: dur });
    if ('mediaSession' in navigator && dur > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: dur, playbackRate: a.playbackRate, position: a.currentTime,
        });
      } catch {}
    }
    _throttledSaveTimestamp();

    // Timing-based preload: only start buffering next track when
    // progress > 70% OR remaining time < 25 s — saves bandwidth on skips
    const currentTrack = _eng.activeQueue[_eng.idx];
    if (currentTrack) {
      const { activeQueue, idx, repeat } = _eng;
      let nextIdx: number | null = null;
      if (repeat === 'one')                        nextIdx = idx;
      else if (idx < activeQueue.length - 1)       nextIdx = idx + 1;
      else if (repeat === 'all')                   nextIdx = 0;
      const nextUrl = nextIdx !== null ? activeQueue[nextIdx]?.streamUrl ?? null : null;
      checkPreloadTrigger(currentTrack.id, prog, dur, nextUrl);
    }
  };

  a.onloadedmetadata = () => _sync?.({ duration: a.duration });

  a.onplay  = () => {
    _consecutiveErrors = 0; // successful play — reset error streak
    _wasInterrupted = false; // user (or engine) initiated play — not an interruption
    _sync?.({ isPlaying: true });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  };
  a.onpause = () => {
    _sync?.({ isPlaying: false });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    _savePlayback();
    // Note: _wasInterrupted is set by document visibilitychange (below).
    // A pause from user interaction resets it. This allows future resume
    // logic to distinguish "user paused" from "system interrupted".
  };

  // Interruption detection: browser hides the tab or OS steals audio focus
  // → the browser pauses audio → we mark it as an interruption.
  // We reset the flag on user-initiated play so auto-resume doesn't fire
  // after a deliberate pause.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !a.paused) {
      // Tab going background while playing — may indicate interruption
      _wasInterrupted = true;
    }
  }, { passive: true });

  a.onended = () => {
    const { activeQueue, idx, repeat } = _eng;
    if (activeQueue.length === 0) return;

    // repeat=one: no src change needed — just seek and replay.
    // This always works in background because no network request is made.
    if (repeat === 'one') {
      a.currentTime = 0;
      a.play().catch(() => {});
      return;
    }

    let nextIdx: number | null = null;
    if (idx < activeQueue.length - 1)                    nextIdx = idx + 1;
    else if (repeat === 'all' && activeQueue.length > 0) nextIdx = 0;

    if (nextIdx === null) {
      _sync?.({ isPlaying: false, progress: 0 });
      _savePlayback();
      return;
    }

    _eng.idx = nextIdx;
    const nextTrack = activeQueue[nextIdx];

    // ── Try buffer swap first ─────────────────────────────────────────────
    const _engTs = () => new Date().toISOString().slice(11, 23);
    const _engVis = () => document.hidden ? 'BG' : 'FG';
    console.log(`[ENG ${_engTs()} ${_engVis()}] onended: idx=${_eng.idx} track="${nextTrack.title}" — attempting swap`);
    const swapped = trySwapBuffer(nextTrack.streamUrl, getAudio().volume);
    if (swapped) {
      console.log(`[ENG ${_engTs()} ${_engVis()}] onended: SWAP SUCCEEDED for "${nextTrack.title}"`);
      _audio = swapped;
      _setupListeners(_audio);
      _audio.play().catch((e: Error) => {
        if (e?.name === 'NotAllowedError') return;
        if (e?.name === 'AbortError')      return;
        // Swap play() failed — fall back to _loadAndPlay
        _loadAndPlay(nextTrack);
      });
      _sync?.({
        currentTrack: nextTrack,
        currentIndex: _eng.idx,
        isPlaying:    true,
        progress:     0,
        duration:     _audio.duration || 0,
        queueLength:  _eng.activeQueue.length,
        queueVersion: ++_queueVersion,
      });
      _updateMediaSession(nextTrack);
      _pushRecent(nextTrack.albumId, nextTrack.id);
      _sync?.({ recentSongs: _loadRecents() });
      _savePlayback();

      // Compute the track AFTER next and start buffering it
      const nextNextIdx = nextIdx + 1 < activeQueue.length ? nextIdx + 1
                        : repeat === 'all' ? 0 : null;
      const nextNextUrl = nextNextIdx !== null ? activeQueue[nextNextIdx]?.streamUrl ?? null : null;
      console.log(`[ENG ${_engTs()} ${_engVis()}] calling notifySwapComplete — next-next="${activeQueue[nextNextIdx ?? -1]?.title ?? 'none'}"`);
      notifySwapComplete(nextNextUrl);
      return;
    }

    // ── Fallback: normal load ─────────────────────────────────────────────
    console.log(`[ENG ${_engTs()} ${_engVis()}] onended: SWAP FAILED — falling back to _loadAndPlay for "${nextTrack.title}"`);
    _loadAndPlay(nextTrack);
  };

  a.onerror = () => {
    const code    = classifyMediaError(a.error, a.src);
    const trackId = _eng.activeQueue[_eng.idx]?.id ?? 'unknown';
    mediaLogger.playError(trackId, code, a.error?.message);

    // Abort errors are user-initiated (src change mid-load) — ignore silently
    if (code === 'ABORT_ERROR') return;

    // Show user-facing toast for actionable errors
    const msg = MEDIA_ERROR_MESSAGES[code];
    if (msg) _showToast(msg);

    // Attempt automatic recovery: skip to next track
    // This prevents the queue from freezing on a broken asset.
    _skipToNext('error');
  };
}

function _loadAndPlay(track: Track) {
  const a = getAudio();
  const _lapTs = () => new Date().toISOString().slice(11, 23);
  const _lapVis = () => document.hidden ? 'BG' : 'FG';
  console.log(`[ENG ${_lapTs()} ${_lapVis()}] _loadAndPlay: "${track.title}" url=${track.streamUrl.slice(-40)}`);
  resetPreloadTrigger();

  // ── Format check before loading ──────────────────────────────────────────
  // Detect unsupported codecs synchronously — no network request.
  // If the browser definitely cannot decode this format, skip immediately.
  if (!canBrowserPlay(track.streamUrl)) {
    const msg = MEDIA_ERROR_MESSAGES['FORMAT_ERROR'];
    _showToast(msg);
    mediaLogger.playError(track.id, 'FORMAT_ERROR', track.streamUrl);
    _skipToNext('error');
    return;
  }

  // ── Load timeout — skip if media doesn't start within 12 seconds ─────────
  // Catches silently blocked URLs where onerror never fires (some extensions
  // silently drop requests without returning a network error).
  let loadTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    loadTimeout = null;
    if (a.readyState < 1) { // HAVE_NOTHING — metadata never arrived
      mediaLogger.timeout(track.id, 12_000);
      _showToast(MEDIA_ERROR_MESSAGES['TIMEOUT_ERROR']);
      _skipToNext('error');
    }
  }, 12_000);

  // Clear timeout if media loads successfully
  const clearLoadTimeout = () => {
    if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null; }
  };
  a.addEventListener('loadedmetadata', clearLoadTimeout, { once: true });
  a.addEventListener('canplay',        clearLoadTimeout, { once: true });

  a.src = track.streamUrl;
  a.load();
  a.play().catch((e: Error) => {
    clearLoadTimeout();
    if (e?.name === 'NotAllowedError') return; // autoplay policy — not an error
    if (e?.name === 'AbortError')      return; // src changed — not an error
    mediaLogger.playError(track.id, 'UNKNOWN_ERROR', e?.message);
    // play() rejection usually means the element errored — onerror will fire
    // and handle recovery, so we don't double-skip here.
  });

  _sync?.({
    currentTrack: track,
    currentIndex: _eng.idx,
    isPlaying:    true,
    progress:     0,
    duration:     0,
    queueLength:  _eng.activeQueue.length,
    queueVersion: ++_queueVersion,
  });
  _updateMediaSession(track);
  _pushRecent(track.albumId, track.id);
  _sync?.({ recentSongs: _loadRecents() });
  _savePlayback();
}
// NOTE: preload for a freshly loaded track is handled by
// checkPreloadTrigger() in ontimeupdate when progress > 70% or ≤25s remain.

/**
 * _initMediaSession — called ONCE when the audio engine first initialises.
 *
 * Registers all action handlers permanently. Handlers are closures that
 * delegate to the live _eng state at the moment they fire — so they always
 * reflect the current queue, regardless of when they were registered.
 *
 * Bluetooth earbuds, keyboard media keys, car controls, and Android headset
 * buttons all go through these handlers. Registering them once prevents
 * the accidental handler-stacking that happens when setActionHandler is
 * called on every track change.
 *
 * ARCHITECTURE NOTE:
 *   • _initMediaSession() → registers handlers (once)
 *   • _updateMediaSession(track) → updates metadata only (every track change)
 * These two concerns are intentionally split.
 */
function _initMediaSession(): void {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.setActionHandler('play',  () => { getAudio().play().catch(() => {}); });
    navigator.mediaSession.setActionHandler('pause', () => { getAudio().pause(); });
    navigator.mediaSession.setActionHandler('nexttrack',     () => _advanceNext());
    navigator.mediaSession.setActionHandler('previoustrack', () => _advancePrev());

    // seekto — Android notification scrubber, macOS Now Playing timeline
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      const a = getAudio();
      if (d.seekTime !== undefined && isFinite(a.duration) && a.duration > 0) {
        a.currentTime = d.seekTime;
      }
    });

    // seekbackward/seekforward — iOS lock screen ±10s skip buttons.
    // iOS does NOT show nexttrack/previoustrack on the lock screen without these.
    // Also used by some Bluetooth headsets and car head units.
    navigator.mediaSession.setActionHandler('seekbackward', (d) => {
      const a = getAudio();
      a.currentTime = Math.max(0, a.currentTime - (d.seekOffset ?? 10));
    });
    navigator.mediaSession.setActionHandler('seekforward', (d) => {
      const a = getAudio();
      if (isFinite(a.duration)) {
        a.currentTime = Math.min(a.duration, a.currentTime + (d.seekOffset ?? 10));
      }
    });
    console.log('[MediaSession] action handlers registered');
  } catch {
    // Sandboxed WebViews — fail silently
  }
}

/**
 * _updateMediaSession — called on every track change.
 * Updates ONLY the metadata (title, artist, album, artwork).
 * Does NOT re-register action handlers (those are permanent via _initMediaSession).
 *
 * ARTWORK SIZES:
 *   Android OEM lock screens and media panels request different sizes.
 *   Providing all common sizes lets each device pick the best fit.
 *   image/jpeg declared as the type; actual URL may be JPEG or WebP —
 *   the browser fetches the URL regardless and inspects the actual content-type.
 */
function _updateMediaSession(track: Track) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   track.title,
      artist:  track.artist,
      album:   track.album,
      artwork: track.coverUrl
        ? [
            { src: track.coverUrl, sizes: '96x96',    type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '128x128',   type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '192x192',   type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '256x256',   type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '384x384',   type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '512x512',   type: 'image/jpeg' },
          ]
        : [],
    });
  } catch {
    // Sandboxed WebViews — fail silently
  }
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

/**
 * Compute the URL of the next effective track and pass it to recomputePreload().
 * Called after every queue topology mutation so the preload target is always live.
 *
 * recomputePreload() handles:
 *   - debouncing (1 200 ms settle)
 *   - idempotency (no-op if URL unchanged)
 *   - stale cancellation (aborts in-progress HTTP request if URL changed)
 */
function _recomputePreload(): void {
  const { activeQueue, idx, repeat } = _eng;
  if (activeQueue.length === 0) { recomputePreload(null); return; }

  let nextIdx: number | null = null;
  if (repeat === 'one') {
    nextIdx = idx; // same track loops
  } else if (idx < activeQueue.length - 1) {
    nextIdx = idx + 1;
  } else if (repeat === 'all') {
    nextIdx = 0;
  }

  recomputePreload(nextIdx !== null ? activeQueue[nextIdx]?.streamUrl ?? null : null);
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

/**
 * clearSession — wipes ALL playback state at logout time.
 * Clears: active queue, original queue, recently played, localStorage keys.
 * Safe to call outside React (no hooks), used by useAuthStore.clearUserState().
 */
export function clearSession(): void {
  try { getAudio().pause(); } catch {}
  clearPreloader(); // abort any buffering in progress
  _eng.activeQueue   = [];
  _eng.originalQueue = [];
  _eng.idx           = 0;
  _eng.queueContext  = null;
  _queueVersion++;
  // Wipe persisted playback + recents
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(RECENTS_KEY); } catch {}
  // Sync Zustand state
  _sync?.({
    currentTrack: null,
    currentIndex: 0,
    isPlaying:    false,
    progress:     0,
    duration:     0,
    queueContext: null,
    queueLength:  0,
    queueVersion: _queueVersion,
    recentSongs:  [],
  });
}

// ─── Zustand state ────────────────────────────────────────────────────────────

export interface PlayerReactState {
  currentTrack:  Track | null;
  currentIndex:  number;
  isPlaying:     boolean;
  isShuffle:     boolean;
  repeat:        RepeatMode;
  progress:      number;
  duration:      number;
  volume:        number;  // 0–1; lives in Zustand so ALL sources sync the slider
  isExpanded:    boolean;
  recentSongs:   RecentEntry[];
  queueContext:  QueueContext | null;
  queueLength:   number;
  queueVersion:  number;
}

export interface PlayerState extends PlayerReactState {
  playQueue:         (opts: { tracks: Track[]; context: QueueContext; startIndex?: number }) => void;
  replaceQueue:      (tracks: Track[], context: QueueContext) => void;
  appendToQueue:     (track: Track) => void;
  /** Insert one or more tracks immediately after the currently playing track.
   *  Preserves playback position, shuffle state, and repeat state.
   *  Both activeQueue and originalQueue are updated atomically. */
  insertAfterCurrent: (tracks: Track[]) => void;
  removeFromQueue:   (index: number) => void;
  moveQueueTrack:    (fromIndex: number, toIndex: number) => void;
  clearQueue:        () => void;
  playTrackFromQueue:(index: number) => void;
  playTrack:         (track: Track, queue?: Track[], context?: QueueContext | QueueSource) => void;
  playAlbum:         (tracks: Track[], startIndex?: number, context?: QueueContext | QueueSource) => void;
  togglePlay:        () => void;
  next:              () => void;
  prev:              () => void;
  seekTo:            (ratio: number) => void;
  toggleShuffle:     () => void;
  toggleRepeat:      () => void;
  setExpanded:       (v: boolean) => void;
  openFullscreen:    () => void;
  closeFullscreen:   () => void;
  toggleFullscreen:  () => void;
  setVolume:         (vol: number) => void;
  adjustVolume:      (delta: number) => void;
  setQueueSource:    (source: QueueSource) => void;
  refreshRecents:    () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  _sync = (partial) => set(partial as Partial<PlayerState>);

  /**
   * _setQueue — core queue setup. Handles shuffle internally.
   * Always call this before _loadAndPlay when replacing the whole queue.
   *
   * Invariants enforced:
   *   I1: idx set correctly for both shuffle and non-shuffle modes
   *   I3: originalQueue always mirrors the input tracks in natural order
   */
  function _setQueue(tracks: Track[], startIdx: number) {
    _eng.originalQueue = [...tracks];
    if (_eng.shuffle) {
      // Current track goes to front; rest are shuffled (I2: current track preserved)
      const rest = tracks.filter((_, i) => i !== startIdx);
      _eng.activeQueue = [tracks[startIdx], ..._fisher(rest)];
      _eng.idx         = 0;
    } else {
      _eng.activeQueue = [...tracks];
      _eng.idx         = startIdx;
    }
  }

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
    queueVersion:  0,
    volume:        _readPersistedVolume(),

    // ── playQueue — primary entry point ────────────────────────────────────
    playQueue: ({ tracks, context, startIndex = 0 }) => {
      if (!tracks.length) return;
      const idx = Math.min(Math.max(0, startIndex), tracks.length - 1);
      _eng.queueContext = context;
      _setQueue(tracks, idx);
      _assertInvariants();
      _loadAndPlay(_eng.activeQueue[_eng.idx]);
      set({
        isShuffle:    _eng.shuffle,
        queueContext: context,
        queueLength:  _eng.activeQueue.length,
        queueVersion: ++_queueVersion,
      });
    },

    // ── replaceQueue — replace without starting playback ───────────────────
    replaceQueue: (tracks, context) => {
      if (!tracks.length) return;
      _eng.queueContext = context;
      _setQueue(tracks, 0);
      _assertInvariants();
      set({
        queueContext:  context,
        queueLength:   _eng.activeQueue.length,
        queueVersion:  ++_queueVersion,
      });
      _savePlayback();
      _recomputePreload();
    },

    // ── appendToQueue ─────────────────────────────────────────────────────
    // Fix: append to both queues so unshuffling doesn't lose the new track.
    // Duplicate IDs are allowed per invariant I6 — we don't deduplicate.
    appendToQueue: (track) => {
      _eng.activeQueue   = [..._eng.activeQueue, track];
      _eng.originalQueue = [..._eng.originalQueue, track];
      set({ queueLength: _eng.activeQueue.length, queueVersion: ++_queueVersion });
      _savePlayback();
      _recomputePreload();
    },

    // ── insertAfterCurrent ────────────────────────────────────────────────
    // Inserts one or more tracks immediately after the current playing index.
    // Preserves I1–I7 invariants:
    //   - idx is unchanged (still points to the same playing track)
    //   - tracks are inserted at idx+1 in both activeQueue and originalQueue
    //   - if queue is empty we just append (graceful fallback)
    //   - duplicate IDs allowed per I6
    insertAfterCurrent: (tracks) => {
      if (!tracks.length) return;
      const insertAt = _eng.activeQueue.length === 0 ? 0 : _eng.idx + 1;
      const aq = [..._eng.activeQueue];
      aq.splice(insertAt, 0, ...tracks);
      _eng.activeQueue = aq;
      // For originalQueue: insert after current track's position in orig.
      // If the current track exists in originalQueue, insert after it;
      // otherwise append to end (shuffle-on edge case).
      const ct = _eng.activeQueue[_eng.idx]; // identity is unchanged
      const origIdx = ct ? _eng.originalQueue.findIndex((t) => t.id === ct.id) : -1;
      const oq = [..._eng.originalQueue];
      oq.splice(origIdx >= 0 ? origIdx + 1 : oq.length, 0, ...tracks);
      _eng.originalQueue = oq;
      set({ queueLength: _eng.activeQueue.length, queueVersion: ++_queueVersion });
      _savePlayback();
      _recomputePreload();
    },

    // ── removeFromQueue ────────────────────────────────────────────────────
    // Fix 1 (I6): remove ONLY the item at the given index, not all items
    //   with the same ID. Use index-based filter instead of id-based filter
    //   for activeQueue. originalQueue is pruned by ID once — this is
    //   acceptable because we treat originalQueue as an unordered pool for
    //   the unshuffle operation.
    //
    // Fix 2 (I4): when removing the current track and the queue becomes
    //   empty, explicitly set currentTrack to null in Zustand.
    //
    // Fix 3 (I1/I5): when removing current track and queue has remaining
    //   tracks, idx stays the same (next track shifts up). If removing
    //   the last item, idx is clamped to new length-1.
    removeFromQueue: (index) => {
      if (index < 0 || index >= _eng.activeQueue.length) return;
      const removingCurrent = index === _eng.idx;
      const removedTrack    = _eng.activeQueue[index];

      // Remove from activeQueue by index (I6: only one instance)
      _eng.activeQueue = _eng.activeQueue.filter((_, i) => i !== index);

      // Remove from originalQueue by ID — removes first occurrence only
      // to avoid over-pruning when the same track appears multiple times.
      let removedFromOrig = false;
      _eng.originalQueue = _eng.originalQueue.filter((t) => {
        if (!removedFromOrig && t.id === removedTrack.id) {
          removedFromOrig = true;
          return false;
        }
        return true;
      });

      if (_eng.activeQueue.length === 0) {
        // Queue is now empty (I4: currentTrack must be null)
        _eng.idx = 0;
        getAudio().pause();
        set({
          currentTrack: null,
          currentIndex: 0,
          isPlaying:    false,
          queueLength:  0,
          queueVersion: ++_queueVersion,
        });
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        return;
      }

      if (removingCurrent) {
        // I1: idx stays the same (next track shifts into this slot).
        // If we removed the last item, clamp to new end.
        _eng.idx = Math.min(_eng.idx, _eng.activeQueue.length - 1);
        _loadAndPlay(_eng.activeQueue[_eng.idx]); // I5: sync audio engine
      } else if (index < _eng.idx) {
        // A track before current was removed — adjust idx to keep pointing
        // to the same track (I2).
        _eng.idx = Math.max(0, _eng.idx - 1);
      }
      // If removed item was after current, idx is still valid — no adjustment.

      _assertInvariants();
      set({
        currentIndex: _eng.idx,
        queueLength:  _eng.activeQueue.length,
        queueVersion: ++_queueVersion,
      });
      _savePlayback();
      _recomputePreload();
    },

    // ── moveQueueTrack ────────────────────────────────────────────────────
    // Fix: also update originalQueue to reflect the manual reorder.
    // Without this, toggling shuffle off after a reorder loses the reorder.
    moveQueueTrack: (fromIndex, toIndex) => {
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || toIndex < 0) return;
      if (fromIndex >= _eng.activeQueue.length || toIndex >= _eng.activeQueue.length) return;

      // Reorder activeQueue
      const aq = [..._eng.activeQueue];
      const [movedActive] = aq.splice(fromIndex, 1);
      aq.splice(toIndex, 0, movedActive);
      _eng.activeQueue = aq;

      // Mirror the reorder in originalQueue (same relative move by ID).
      // Find the first occurrence of the moved track in originalQueue and
      // move it to the equivalent relative position.
      const oq        = [..._eng.originalQueue];
      const origFrom  = oq.findIndex((t) => t.id === movedActive.id);
      if (origFrom >= 0) {
        const [movedOrig] = oq.splice(origFrom, 1);
        // Calculate proportional position in originalQueue
        const ratio     = toIndex / Math.max(1, _eng.activeQueue.length - 1);
        const origTo    = Math.round(ratio * Math.max(0, oq.length));
        oq.splice(Math.min(origTo, oq.length), 0, movedOrig);
        _eng.originalQueue = oq;
      }

      // Re-find current track to update idx (I2)
      const ct = get().currentTrack;
      if (ct) {
        _eng.idx = aq.findIndex((t) => t.id === ct.id);
        if (_eng.idx < 0) _eng.idx = Math.min(toIndex, aq.length - 1);
      }

      _assertInvariants();
      set({
        currentIndex: _eng.idx,
        queueLength:  aq.length,
        queueVersion: ++_queueVersion,
      });
      _savePlayback();
      _recomputePreload();
    },

    // ── clearQueue ────────────────────────────────────────────────────────
    clearQueue: () => {
      getAudio().pause();
      recomputePreload(null); // abort buffering
      _eng.activeQueue   = [];
      _eng.originalQueue = [];
      _eng.idx           = 0;
      _eng.queueContext  = null;
      _queueVersion++;
      set({
        currentTrack: null,
        currentIndex: 0,
        isPlaying:    false,
        progress:     0,
        duration:     0,
        queueContext: null,
        queueLength:  0,
        queueVersion: _queueVersion,
      });
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    },

    // ── playTrackFromQueue ────────────────────────────────────────────────
    playTrackFromQueue: (index) => {
      if (index < 0 || index >= _eng.activeQueue.length) return;
      _eng.idx = index;
      _loadAndPlay(_eng.activeQueue[index]);
    },

    // ── Backwards-compat wrappers ─────────────────────────────────────────
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

    // ── Transport ─────────────────────────────────────────────────────────
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

    // ── toggleShuffle ─────────────────────────────────────────────────────
    // Invariant preserved: the currently playing track is ALWAYS index 0
    // after shuffle-on, and always at its natural position after shuffle-off.
    // The active track identity never changes.
    toggleShuffle: () => {
      const newShuffle = !_eng.shuffle;
      _eng.shuffle     = newShuffle;
      const ct = _eng.activeQueue[_eng.idx]; // I2: save current track identity

      if (newShuffle) {
        // Put current track at front, shuffle the rest
        const rest = _eng.originalQueue.filter((t) => t.id !== ct?.id);
        _eng.activeQueue = ct ? [ct, ..._fisher(rest)] : _fisher(_eng.originalQueue);
        _eng.idx         = 0;
      } else {
        // Restore natural order; find current track in originalQueue (I2)
        _eng.activeQueue = [..._eng.originalQueue];
        _eng.idx         = ct ? _eng.originalQueue.findIndex((t) => t.id === ct.id) : 0;
        if (_eng.idx < 0) _eng.idx = 0; // guard: track removed from orig
      }

      _assertInvariants();
      set({
        isShuffle:    newShuffle,
        currentIndex: _eng.idx,
        queueLength:  _eng.activeQueue.length,
        queueVersion: ++_queueVersion,
      });
      _savePlayback();
      _recomputePreload(); // shuffle changes the next track
    },

    toggleRepeat: () => {
      const next: RepeatMode = _eng.repeat === 'off' ? 'all' : _eng.repeat === 'all' ? 'one' : 'off';
      _eng.repeat = next;
      set({ repeat: next });
      _savePlayback();
      _recomputePreload(); // repeat mode changes which track is "next"
    },

    setExpanded:     (v) => set({ isExpanded: v }),
    openFullscreen:  ()  => set({ isExpanded: true }),
    closeFullscreen: ()  => set({ isExpanded: false }),
    toggleFullscreen:()  => set((s) => ({ isExpanded: !s.isExpanded })),
    setVolume: (vol) => {
      setAudioVolume(vol); // updates engine + persist + _sync({volume})
    },

    adjustVolume: (delta) => {
      setAudioVolume(getAudioVolume() + delta);
    },

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
  getAudio().volume = clamped;
  _writePersistedVolume(clamped);
  // Sync Zustand so ALL consumers (slider, keyboard HUD, etc.) update
  _sync?.({ volume: clamped });
  _savePlayback();
}

export function getAudioVolume(): number {
  return _audio?.volume ?? _readPersistedVolume();
}


/** Whether the last pause was caused by a system interruption (not user action). */
export function wasInterrupted(): boolean { return _wasInterrupted; }
