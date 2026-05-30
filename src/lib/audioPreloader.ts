/**
 * src/lib/audioPreloader.ts — v3: Active Buffer Architecture
 *
 * ── FUNDAMENTAL CHANGE FROM v2 ───────────────────────────────────────────────
 * v1/v2 primed the browser's HTTP cache via a hidden Audio element.
 * The main engine still called a.src=url; a.load(); a.play() at transition
 * time — requiring a new network request at the worst possible moment.
 *
 * v3 uses a TRUE double-buffer model:
 *   _bufferEl  — actively downloads and decodes the next track
 *   Main engine (_audio in playerStore) — plays the current track
 *
 * At transition time (onended), playerStore calls swapBuffer() instead of
 * _loadAndPlay(). swapBuffer() physically replaces _audio with _bufferEl,
 * transferring the already-decoded audio data without any new network request.
 *
 * ── WHY THIS FIXES BACKGROUND PLAYBACK ───────────────────────────────────────
 * The original failure mode:
 *   1. Song A is playing in a backgrounded tab
 *   2. Song A ends → onended fires → _loadAndPlay(songB) is called
 *   3. _loadAndPlay sets a.src = songB.url; a.load(); a.play()
 *   4. This requires a NEW network request for songB
 *   5. iOS Safari and Chrome on Android throttle/block new network requests
 *      initiated by backgrounded tabs that are not currently playing audio
 *   6. The request stalls → no audio → song B never starts
 *
 * Why repeat-one worked:
 *   repeat-one does a.currentTime = 0; a.play() — no src change, no network
 *   request. The audio data is already decoded in the element.
 *
 * v3 solution:
 *   The buffer element is loaded while Song A is still playing (foreground).
 *   By the time Song A ends, Song B is already fully decoded in _bufferEl.
 *   swapBuffer() swaps the elements and calls play() — no new network request.
 *   iOS/Android do not throttle play() calls on already-loaded audio.
 *
 * ── ELEMENT SWAP MECHANICS ───────────────────────────────────────────────────
 * swapBuffer() is called by playerStore's onended handler. It:
 *   1. Takes the _bufferEl (already buffered)
 *   2. Sets volume, attaches the caller-supplied event listeners
 *   3. Returns the element for playerStore to use as its new main engine
 *   4. Creates a fresh _bufferEl for the track after the next one
 *
 * playerStore's getAudio() returns the current main engine element.
 * After a swap, playerStore calls notifyEngineSwapped(newEl) to update the
 * reference held by the rest of the engine.
 *
 * ── QUEUE REACTIVITY ─────────────────────────────────────────────────────────
 * Every queue mutation calls recomputeBuffer(nextUrl).
 *   - If nextUrl matches what's already buffered → no-op (idempotent)
 *   - If different → abort current buffer download, start new one
 *   - If null → abort and release element
 *
 * ── TIMING TRIGGER ───────────────────────────────────────────────────────────
 * Buffer loading begins when:
 *   • progress > 70%, OR
 *   • remaining < 30 seconds
 * This is earlier than v2's 25-second threshold because we need the full
 * file downloaded before track end, not just started.
 *
 * ── MEMORY ───────────────────────────────────────────────────────────────────
 * Maximum 2 Audio elements at any time:
 *   1 playing (main engine in playerStore)
 *   1 buffering (the _bufferEl here)
 *
 * ── iOS SAFARI SPECIFICS ─────────────────────────────────────────────────────
 * iOS 15+ supports Web Audio API in background tabs if audio is actively
 * playing. A muted background Audio element may be suspended by iOS when
 * the tab is backgrounded. The buffer element is set to volume=0, not muted
 * via the .muted property, to avoid iOS treating it as a "silent" element
 * eligible for suspension. Additionally, loading starts early enough that
 * the download completes while the tab is still foreground.
 *
 * ── RANGE REQUEST NOTE ───────────────────────────────────────────────────────
 * jsDelivr (cdn.jsdelivr.net) serves content from GitHub repositories.
 * jsDelivr's CDN supports HTTP Range Requests (Accept-Ranges: bytes) and
 * responds with 206 Partial Content for range requests. This means:
 *   - The browser's audio element can stream audio progressively
 *   - Buffering begins with only the first few KB (headers + codec info)
 *   - The browser downloads the rest in the background
 *   - On cache hit (same URL requested again), full file is served from cache
 * The preload='auto' setting tells the browser to download the full file,
 * which is what we want for background playback — the full file is in memory
 * before the current track ends.
 */

export type BufferReadyCallback = (el: HTMLAudioElement) => void;

const PRELOAD_PROGRESS  = 0.70;
const PRELOAD_REMAINING = 30;    // seconds — earlier than v2 (was 25)
const DEBOUNCE_MS       = 800;   // settle time after queue mutation

let _bufferEl:       HTMLAudioElement | null = null;
let _bufferedUrl:    string = '';
let _debounceTimer:  ReturnType<typeof setTimeout> | null = null;
let _triggeredFor:   string = ''; // per-track guard (trackId)

// ── Element creation ──────────────────────────────────────────────────────────

function _makeBufferEl(): HTMLAudioElement {
  const el    = new Audio();
  el.preload  = 'auto';   // download full file — needed for background playback
  el.volume   = 0;        // silent but NOT .muted (iOS treats .muted differently)
  el.autoplay = false;
  el.onerror  = null;     // silence errors — handled at swap time
  return el;
}

function _getOrCreateBufferEl(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!_bufferEl) _bufferEl = _makeBufferEl();
  return _bufferEl;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _abortBuffer(): void {
  if (!_bufferEl || !_bufferedUrl) return;
  _bufferEl.src = '';
  _bufferEl.load();
  _bufferedUrl = '';
}

function _startBuffer(url: string): void {
  if (!url) return;
  if (_bufferedUrl === url) return; // already loading this URL

  const el = _getOrCreateBufferEl();
  if (!el) return;

  _abortBuffer();
  _bufferedUrl = url;
  el.src = url;
  el.load(); // begins download, does NOT play
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Called after every queue mutation.
 * Debounced so burst mutations (e.g. rapid reorder) produce one buffer load.
 */
export function recomputePreload(nextUrl: string | null | undefined): void {
  if (_debounceTimer !== null) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
  if (!nextUrl) {
    _abortBuffer();
    return;
  }
  if (_bufferedUrl === nextUrl) return; // idempotent

  _debounceTimer = setTimeout(() => {
    _debounceTimer = null;
    _startBuffer(nextUrl);
  }, DEBOUNCE_MS);
}

/**
 * Called from ontimeupdate when progress crosses the threshold.
 * One-shot per track (guarded by _triggeredFor).
 */
export function checkPreloadTrigger(
  trackId:  string,
  progress: number,
  duration: number,
  nextUrl:  string | null | undefined,
): void {
  if (!nextUrl) return;
  if (_triggeredFor === trackId) return;

  const remaining = duration > 0 ? duration * (1 - progress) : Infinity;
  if (progress <= PRELOAD_PROGRESS && remaining > PRELOAD_REMAINING) return;

  _triggeredFor = trackId;
  // Bypass debounce — we're in playback and need to start immediately
  _startBuffer(nextUrl);
}

/**
 * Reset per-track trigger. Call at the start of each new track.
 */
export function resetPreloadTrigger(): void {
  _triggeredFor = '';
}

/**
 * Try to swap the buffer element into playback position.
 *
 * Called by playerStore's onended handler instead of _loadAndPlay.
 * Returns the buffer element if it has the correct URL buffered,
 * or null if the buffer isn't ready (fallback: _loadAndPlay is called).
 *
 * After a successful swap, the caller must:
 *   1. Attach event listeners (onended, onerror, ontimeupdate, etc.)
 *   2. Set volume to the current player volume
 *   3. Call el.play()
 *   4. Call notifySwapComplete() to create a fresh buffer element
 *
 * @param expectedUrl  the streamUrl of the next track
 * @param volume       current player volume (0–1)
 */
export function trySwapBuffer(
  expectedUrl: string,
  volume: number,
): HTMLAudioElement | null {
  if (!_bufferEl) return null;
  if (_bufferedUrl !== expectedUrl) return null;

  // Check that the element has actually buffered enough data to play.
  // readyState >= 3 (HAVE_FUTURE_DATA) means the browser has data beyond
  // the current position — safe to call play() without a network stall.
  if (_bufferEl.readyState < 3) {
    // Not enough data yet — let the caller fall back to _loadAndPlay.
    // _loadAndPlay will benefit from the partial buffer via HTTP cache.
    console.log('[Preloader] buffer not ready (readyState:', _bufferEl.readyState, ')');
    return null;
  }

  const el = _bufferEl;
  // Disconnect from preloader management
  _bufferEl    = null;
  _bufferedUrl = '';

  // Prepare element for playback
  el.volume   = volume;
  el.muted    = false;
  el.autoplay = false;
  el.currentTime = 0;

  return el;
}

/**
 * Called by playerStore after a successful swap, with the URL of the
 * track-after-next, to start buffering it immediately.
 */
export function notifySwapComplete(nextNextUrl: string | null | undefined): void {
  // Fresh buffer element for the next-next track
  _bufferEl    = _makeBufferEl();
  _bufferedUrl = '';
  _triggeredFor = '';
  if (nextNextUrl) {
    _startBuffer(nextNextUrl);
  }
}

/**
 * Full cleanup. Call on logout, clearQueue, session clear.
 */
export function clearPreloader(): void {
  if (_debounceTimer !== null) { clearTimeout(_debounceTimer); _debounceTimer = null; }
  _abortBuffer();
  if (_bufferEl) { _bufferEl.src = ''; _bufferEl = null; }
  _bufferedUrl  = '';
  _triggeredFor = '';
}
