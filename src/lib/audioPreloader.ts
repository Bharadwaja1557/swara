/**
 * src/lib/audioPreloader.ts
 *
 * Intelligent next-track preloader — v2.
 *
 * ── SINGLE HIDDEN AUDIO ELEMENT ──────────────────────────────────────────────
 * Manages exactly ONE hidden Audio element globally. Never plays audio.
 * Its sole purpose: prime the browser's HTTP cache with the next track's URL
 * so the main engine's transition is near-instant.
 *
 * ── TIMING-BASED TRIGGER ─────────────────────────────────────────────────────
 * Preloading does NOT start immediately after a track loads. Instead
 * playerStore calls checkPreloadTrigger() from ontimeupdate. Preloading
 * begins only when:
 *   • remaining time < 25 seconds, OR
 *   • progress > 70%
 * This avoids wasting bandwidth on long tracks the user might skip early.
 * A per-track flag (_preloadTriggeredForTrack) prevents re-triggering.
 *
 * ── QUEUE-REACTIVE RECOMPUTATION ─────────────────────────────────────────────
 * _recomputePreload() is the single entry point for all queue mutations.
 * It reads the LIVE queue state at call time:
 *   1. Computes the effective next track URL
 *   2. Cancels pending debounce (stale target abandoned)
 *   3. Aborts any in-progress preload for a different URL
 *   4. Schedules the new preload with DEBOUNCE_MS delay
 * This means rapid mutations (e.g. insert + remove in quick succession)
 * produce exactly ONE preload for the final queue state.
 *
 * ── STALE PRELOAD CANCELLATION ───────────────────────────────────────────────
 * Stale cancellation is two-step:
 *   Step 1: Cancel debounce timer → pending URL is forgotten
 *   Step 2: If an element is already loading a different URL:
 *           el.src = '' then el.load() → browser aborts the HTTP request
 *
 * ── AUDIO FOCUS INTERRUPTION ─────────────────────────────────────────────────
 * The preload element is always muted and never plays. It does NOT
 * participate in the browser's audio focus arbitration. Incoming calls,
 * other apps taking focus, or interruptions affect ONLY the main engine.
 *
 * ── MEMORY / iOS SAFARI ──────────────────────────────────────────────────────
 * clearPreloader() destroys the element reference entirely.
 * Called on logout, clearQueue, and session clear.
 * This is important for iOS Safari which counts Audio elements toward
 * its per-tab media memory budget.
 */

const DEBOUNCE_MS        = 1_200; // settle time after last queue mutation
const PRELOAD_PROGRESS   = 0.70;  // trigger at 70% progress
const PRELOAD_REMAINING  = 25;    // OR when ≤25 seconds remain

let _preloadEl:     HTMLAudioElement | null = null;
let _preloadedUrl:  string = '';
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Per-track flag — prevents re-triggering preload for the same track
let _preloadTriggeredForTrack: string = '';

function _getEl(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null; // SSR / test
  if (!_preloadEl) {
    _preloadEl          = new Audio();
    _preloadEl.preload  = 'auto';
    _preloadEl.muted    = true;
    _preloadEl.volume   = 0;
    _preloadEl.autoplay = false;
    _preloadEl.onerror  = null; // silence errors — best-effort only
  }
  return _preloadEl;
}

function _abortCurrent(): void {
  const el = _getEl();
  if (!el || !_preloadedUrl) return;
  el.src = '';
  el.load(); // browser aborts the in-progress HTTP request
  _preloadedUrl = '';
}

function _doPreload(url: string): void {
  if (!url) return;
  if (_preloadedUrl === url) return; // idempotent
  const el = _getEl();
  if (!el) return;
  _abortCurrent();
  _preloadedUrl = url;
  el.src = url;
  el.load();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Called by playerStore after every queue mutation.
 * Reads the effective next URL and schedules a debounced preload.
 * Passing null/undefined cancels any pending preload.
 */
export function recomputePreload(nextUrl: string | null | undefined): void {
  if (_debounceTimer !== null) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
  if (!nextUrl) {
    _abortCurrent();
    return;
  }
  // Don't re-schedule if we're already loading exactly this URL
  if (_preloadedUrl === nextUrl) return;

  _debounceTimer = setTimeout(() => {
    _debounceTimer = null;
    _doPreload(nextUrl);
  }, DEBOUNCE_MS);
}

/**
 * Called from ontimeupdate. Fires the preload trigger once per track
 * when progress exceeds the threshold. Subsequent calls for the same
 * trackId are no-ops.
 *
 * @param trackId    current track ID (used for the per-track guard)
 * @param progress   0–1 ratio
 * @param duration   seconds
 * @param nextUrl    the URL to preload (computed from live queue)
 */
export function checkPreloadTrigger(
  trackId:  string,
  progress: number,
  duration: number,
  nextUrl:  string | null | undefined,
): void {
  if (!nextUrl) return;
  if (_preloadTriggeredForTrack === trackId) return; // already triggered this track

  const remaining = duration > 0 ? duration * (1 - progress) : Infinity;
  const shouldFire = progress > PRELOAD_PROGRESS || remaining < PRELOAD_REMAINING;
  if (!shouldFire) return;

  _preloadTriggeredForTrack = trackId;
  recomputePreload(nextUrl);
}

/**
 * Reset the per-track trigger flag. Call when a new track starts.
 */
export function resetPreloadTrigger(): void {
  _preloadTriggeredForTrack = '';
}

/**
 * Full cleanup — destroys element, cancels timers, clears all state.
 * Call on logout, clearQueue, and session clear.
 */
export function clearPreloader(): void {
  if (_debounceTimer !== null) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
  _abortCurrent();
  _preloadEl    = null;
  _preloadedUrl = '';
  _preloadTriggeredForTrack = '';
}
