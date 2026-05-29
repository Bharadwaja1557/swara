/**
 * src/lib/audioPreloader.ts
 *
 * Intelligent next-track preloader.
 *
 * ── ARCHITECTURE ─────────────────────────────────────────────────────────────
 * There is exactly ONE authoritative playback engine: the _audio element in
 * playerStore.ts.  This module manages a SECOND, hidden Audio element used
 * solely for buffering — it never plays audio, only downloads it.
 *
 * The preload element is completely independent from the main engine:
 *   - It has no event handlers that affect playback state
 *   - It is paused and muted at all times
 *   - Its src is set to the next track to prime the browser HTTP cache
 *   - When the main engine loads that same URL, the browser serves it from
 *     cache → significantly reduced buffering delay at transition time
 *
 * ── LIFECYCLE ─────────────────────────────────────────────────────────────────
 * 1. After any queue mutation or track change, schedulePreload() is called
 *    with the URL of the NEXT effective track.
 * 2. A 1 500ms debounce fires — this avoids thrashing on rapid skips or
 *    burst queue mutations. The most recent call wins.
 * 3. If the URL matches what is already loaded → no-op (idempotent).
 * 4. Otherwise the preload element src is set and load() is called.
 *    The browser starts buffering in the background.
 *
 * ── STALE PRELOAD CANCELLATION ───────────────────────────────────────────────
 * Every call to schedulePreload() cancels the pending debounce timer.
 * If the queue changes between the debounce fires:
 *   - The NEW next track's URL is used (stale target discarded)
 *   - If a preload is already in progress for the old URL:
 *     - src is set to '' — browser aborts the in-progress request
 *     - No memory leak from a half-buffered audio segment
 *
 * ── RACE CONDITIONS ──────────────────────────────────────────────────────────
 * The debounce timer ensures only the MOST RECENT next-track URL is ever
 * loaded. Rapid skip → skip → skip produces one preload for the final
 * destination, not three queued preload requests.
 *
 * ── BROWSER SUPPORT ──────────────────────────────────────────────────────────
 * All modern browsers. Mobile Safari (iOS 15+) supports background audio
 * buffering in a PWA context. Standard browser tab is fine on all platforms.
 * If Audio() is unavailable (SSR/test), the module is a no-op.
 *
 * ── MEMORY ────────────────────────────────────────────────────────────────────
 * One Audio element, one URL string, one timer handle.
 * clearPreloader() nulls the element and is called on session clear.
 */

const DEBOUNCE_MS = 1_500; // wait this long after last queue change before preloading

let _preloadEl:     HTMLAudioElement | null = null;
let _preloadedUrl:  string = '';
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

function getPreloadEl(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;   // SSR / test guard
  if (!_preloadEl) {
    _preloadEl          = new Audio();
    _preloadEl.preload  = 'auto';
    _preloadEl.muted    = true;
    _preloadEl.volume   = 0;
    // Never let it advance to play — we just want buffering
    _preloadEl.autoplay = false;
    // Silence all errors — this is best-effort buffering
    _preloadEl.onerror  = null;
  }
  return _preloadEl;
}

/**
 * Schedule preloading of the given URL.
 * Calling with null/'' cancels any pending preload.
 * Calling multiple times: only the last URL is preloaded (debounced).
 */
export function schedulePreload(url: string | null | undefined): void {
  // Cancel any pending debounce (stale-cancel step 1)
  if (_debounceTimer !== null) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }

  if (!url) {
    // Explicit cancel — abort any in-progress preload
    _abortCurrentPreload();
    return;
  }

  // Debounce: wait for queue to settle before starting network request
  _debounceTimer = setTimeout(() => {
    _debounceTimer = null;
    _doPreload(url);
  }, DEBOUNCE_MS);
}

function _doPreload(url: string): void {
  if (!url) return;

  // Idempotent — already buffering this exact URL
  if (_preloadedUrl === url) return;

  const el = getPreloadEl();
  if (!el) return;

  // Abort any in-progress preload for a different URL (stale-cancel step 2)
  _abortCurrentPreload();

  _preloadedUrl = url;
  el.src = url;
  el.load();
  // Do NOT call el.play() — we only want the browser to buffer, not decode+play
}

function _abortCurrentPreload(): void {
  const el = getPreloadEl();
  if (!el) return;
  if (_preloadedUrl) {
    el.src = '';  // Tells browser to abort any in-progress request
    el.load();    // Reset element state
    _preloadedUrl = '';
  }
}

/**
 * Called when the session is cleared (logout).
 * Destroys the preload element to free memory.
 */
export function clearPreloader(): void {
  if (_debounceTimer !== null) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
  _abortCurrentPreload();
  _preloadEl    = null;
  _preloadedUrl = '';
}
