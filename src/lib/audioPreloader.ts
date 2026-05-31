/**
 * src/lib/audioPreloader.ts
 *
 * Simple single-slot next-track preloader.
 *
 * Architecture:
 *   One hidden Audio element downloads the next track while the current
 *   track is playing. When the current track ends and the engine needs
 *   the next track, it checks whether the preloaded element is ready
 *   (readyState >= 3). If yes, that element becomes the new _audio
 *   directly — no network request at transition time. If not ready,
 *   playback falls back to a normal load.
 *
 * State:
 *   _el            one Audio element or null
 *   _url           the URL currently loaded into _el
 *   _triggeredFor  per-track guard so the trigger fires at most once per track
 *   _debounce      timer to settle burst queue mutations
 *
 * Trigger threshold: 50% progress. Start buffering once the user is
 * halfway through the current track. This is earlier than the old 70%
 * threshold and gives more time on slow connections.
 *
 * Queue reactivity: every queue mutation calls schedulePreload(nextUrl).
 * If the URL changes, the in-flight download is aborted and a new one starts.
 *
 * Cleanup: clearPreloader() aborts the download and destroys the element.
 * Call on logout, queue clear, and session clear.
 */

const TRIGGER_PROGRESS = 0.50;   // start buffering at 50% of current track
const DEBOUNCE_MS      = 600;    // wait this long after last queue mutation

let _el:           HTMLAudioElement | null = null;
let _url:          string = '';
let _triggeredFor: string = '';
let _debounce:     ReturnType<typeof setTimeout> | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function _abort(): void {
  if (!_el) return;
  _el.src = '';
  _el.load();   // tells browser to cancel the in-progress HTTP request
  _el  = null;
  _url = '';
}

function _startLoad(url: string): void {
  if (_url === url) return;   // already loading this — idempotent
  _abort();
  _url = url;
  _el  = new Audio();
  _el.preload  = 'auto';
  _el.volume   = 0;
  _el.autoplay = false;
  _el.src      = url;
  _el.load();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Schedule preloading of the next track URL.
 * Debounced so rapid queue mutations produce one download, not many.
 * Passing null/undefined cancels any pending or in-progress preload.
 */
export function schedulePreload(url: string | null | undefined): void {
  if (_debounce !== null) { clearTimeout(_debounce); _debounce = null; }
  if (!url) { _abort(); return; }
  if (_url === url) return;
  _debounce = setTimeout(() => { _debounce = null; _startLoad(url); }, DEBOUNCE_MS);
}

/**
 * Called from ontimeupdate. Fires the preload at most once per track
 * (guarded by trackId). Bypasses the debounce because we're in live playback.
 */
export function checkPreloadTrigger(
  trackId:  string,
  progress: number,
  nextUrl:  string | null | undefined,
): void {
  if (!nextUrl)                          return;
  if (_triggeredFor === trackId)         return;
  if (progress < TRIGGER_PROGRESS)       return;
  _triggeredFor = trackId;
  _startLoad(nextUrl);   // direct, no debounce
}

/** Reset per-track guard. Call when a new track starts loading. */
export function resetPreloadTrigger(): void {
  _triggeredFor = '';
}

/**
 * Try to use the preloaded element as the next playing element.
 * Returns the element if its URL matches and it has enough data (readyState >= 3).
 * Returns null if not ready — caller falls back to a normal load.
 * On success the element is prepared for playback (volume set, currentTime = 0).
 */
export function trySwapBuffer(expectedUrl: string, volume: number): HTMLAudioElement | null {
  if (!_el || _url !== expectedUrl || _el.readyState < 3) return null;
  const el = _el;
  _el  = null;
  _url = '';
  el.volume      = volume;
  el.muted       = false;
  el.autoplay    = false;
  el.currentTime = 0;
  return el;
}

/**
 * Destroy the preload element and cancel any pending download.
 * Call on logout, queue clear, and session clear.
 */
export function clearPreloader(): void {
  if (_debounce !== null) { clearTimeout(_debounce); _debounce = null; }
  _abort();
  _triggeredFor = '';
}
