/**
 * src/lib/audioPreloader.ts — v4: Foreground-anchored advance buffering
 *
 * ── ROOT CAUSE OF THE v3 REGRESSION ──────────────────────────────────────────
 * v3 had one buffer element (_bufferEl). When A ended (background), it called
 * notifySwapComplete(C.url) which started C's download. That download was
 * initiated from a backgrounded tab for a non-playing element. iOS Safari and
 * Chrome for Android immediately suspend such downloads. C never reached
 * readyState >= 3. trySwapBuffer returned null. _loadAndPlay(C) made another
 * background request — also blocked. Playback stopped after exactly 2 songs,
 * every time.
 *
 * ── v4 ARCHITECTURE: TWO BUFFER ELEMENTS ─────────────────────────────────────
 *
 *   _primaryEl / _primaryUrl   → downloading track N+1 ("next")
 *   _advanceEl / _advanceUrl   → downloading track N+2 ("next-next")
 *
 * _advanceEl starts as soon as _primaryEl fires 'canplay' (readyState >= 3).
 * 'canplay' fires while the current track is still playing in the foreground.
 * So BOTH N+1 and N+2 complete their downloads in the foreground context.
 *
 * Timeline with v4:
 *   [FG] A plays → checkPreloadTrigger → _startPrimary(B.url, C.url as pending)
 *   [FG] B reaches canplay → _handlePrimaryCanPlay → _startAdvance(C.url)
 *   [FG] B and C both fully downloaded
 *   [tab goes BG]
 *   [BG] A ends → trySwapBuffer(B) readyState=4 → SUCCESS
 *              → _audio = B, _primaryEl promoted to _advanceEl (C, already ready)
 *              → notifySwapComplete(D.url) → start advance for D in background
 *   [BG] B plays → B ends → trySwapBuffer(C) readyState=4 → SUCCESS
 *              → _audio = C, promote D buffer
 *   ...and so on, each track transition requires zero new network requests.
 *
 * For tracks beyond C: D's download starts when the A→B swap fires in
 * background. If the mobile browser throttles D, the swap may fall back to
 * _loadAndPlay(D). If the connection is fast enough for D to download while
 * B+C play, unlimited queue progression works. The advance buffer gives us
 * at minimum A→B→C reliably with any mobile connection.
 *
 * ── QUEUE REACTIVITY ─────────────────────────────────────────────────────────
 * Every queue mutation calls _recomputePreload() → recomputePreload(next, nextNext).
 * Both primary and advance buffers are updated atomically. Stale elements are
 * aborted before any new download starts.
 *
 * ── MEMORY ───────────────────────────────────────────────────────────────────
 * Maximum 2 Audio elements at any time.
 * clearPreloader() nulls both on logout/clearQueue.
 *
 * ── visibilitychange LEAK FIX ────────────────────────────────────────────────
 * v3 added a document.addEventListener('visibilitychange') inside
 * _setupListeners, which was called on every swap. Each swap added a permanent
 * listener — a memory and event-handler leak. The visibilitychange listener is
 * now a single module-level listener in audioPreloader, never duplicated.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const PRELOAD_PROGRESS  = 0.70;  // start buffering when track > 70% complete
const PRELOAD_REMAINING = 30;    // ...or when < 30 seconds remain
const DEBOUNCE_MS       = 800;   // settle time after queue mutations

// ── Module state ──────────────────────────────────────────────────────────────

let _primaryEl:  HTMLAudioElement | null = null; // buffering N+1
let _primaryUrl: string = '';
let _advanceEl:  HTMLAudioElement | null = null; // buffering N+2
let _advanceUrl: string = '';
/** URL queued to become advance buffer as soon as primary reaches canplay. */
let _pendingAdvanceUrl: string = '';

let _triggeredFor: string = '';  // per-track guard for checkPreloadTrigger
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

// ── Element factory ───────────────────────────────────────────────────────────

function _makeEl(): HTMLAudioElement {
  const el    = new Audio();
  el.preload  = 'auto';   // full download
  el.volume   = 0;        // silent; NOT .muted (iOS policy differs)
  el.autoplay = false;
  el.onerror  = null;
  return el;
}

// ── canplay hook ──────────────────────────────────────────────────────────────
// Fires once when _primaryEl reaches readyState >= 3.
// Starts _advanceEl immediately — still in foreground if primary completed quickly.

function _handlePrimaryCanPlay(this: HTMLAudioElement): void {
  // Guard: if this element is no longer the primary (was replaced by a queue
  // mutation), do nothing. 'this' is the element that fired the event.
  if (this !== _primaryEl) return;
  if (!_pendingAdvanceUrl) return;
  if (_advanceUrl === _pendingAdvanceUrl) return; // already started
  _startAdvance(_pendingAdvanceUrl);
  _pendingAdvanceUrl = '';
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _startAdvance(url: string): void {
  if (!url) return;
  if (_advanceUrl === url) return; // idempotent

  // Abort any existing advance for a different URL
  if (_advanceEl) {
    _advanceEl.src = '';
    _advanceEl.load();
    _advanceEl = null;
  }
  _advanceUrl = url;
  _advanceEl  = _makeEl();
  _advanceEl.src = url;
  _advanceEl.load();
}

function _startPrimary(url: string, pendingAdvanceUrl?: string | null): void {
  if (!url) return;

  // Optimization: if the requested URL is already the advance buffer,
  // promote it to primary immediately (it has a head start on downloading).
  if (url === _advanceUrl && _advanceEl) {
    // Discard old primary
    if (_primaryEl) { _primaryEl.src = ''; _primaryEl.load(); }
    _primaryEl  = _advanceEl;
    _primaryUrl = _advanceUrl;
    _advanceEl  = null;
    _advanceUrl = '';
    // Wire the advance pending for the promoted element
    if (pendingAdvanceUrl) {
      _pendingAdvanceUrl = pendingAdvanceUrl;
      if (_primaryEl.readyState >= 3) {
        // Already ready → start advance immediately
        _startAdvance(_pendingAdvanceUrl);
        _pendingAdvanceUrl = '';
      } else {
        _primaryEl.addEventListener('canplay', _handlePrimaryCanPlay, { once: true });
      }
    }
    return;
  }

  // Idempotent: same URL, same pending → no-op
  if (_primaryUrl === url && (!pendingAdvanceUrl || _pendingAdvanceUrl === pendingAdvanceUrl)) return;

  // Abort existing primary
  if (_primaryEl) { _primaryEl.src = ''; _primaryEl.load(); _primaryEl = null; }
  _primaryUrl = url;
  _primaryEl  = _makeEl();
  _primaryEl.src = url;
  _primaryEl.load();

  if (pendingAdvanceUrl) {
    _pendingAdvanceUrl = pendingAdvanceUrl;
    _primaryEl.addEventListener('canplay', _handlePrimaryCanPlay, { once: true });
  }
}

function _abortAll(): void {
  if (_primaryEl) { _primaryEl.src = ''; _primaryEl.load(); _primaryEl = null; }
  if (_advanceEl) { _advanceEl.src = ''; _advanceEl.load(); _advanceEl = null; }
  _primaryUrl        = '';
  _advanceUrl        = '';
  _pendingAdvanceUrl = '';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Called after every queue mutation (via _recomputePreload in playerStore).
 * Debounced so burst mutations produce one update.
 * Updates BOTH the primary and advance buffers.
 *
 * @param nextUrl      URL of the next track to buffer (N+1)
 * @param nextNextUrl  URL of the track after that (N+2) — starts when primary is ready
 */
export function recomputePreload(
  nextUrl:     string | null | undefined,
  nextNextUrl?: string | null | undefined,
): void {
  if (_debounceTimer !== null) { clearTimeout(_debounceTimer); _debounceTimer = null; }
  if (!nextUrl) { _abortAll(); return; }

  _debounceTimer = setTimeout(() => {
    _debounceTimer = null;
    _startPrimary(nextUrl, nextNextUrl);
  }, DEBOUNCE_MS);
}

/**
 * Called from ontimeupdate when playback progress crosses the threshold.
 * One-shot per track (guarded by _triggeredFor).
 *
 * @param trackId     current track's ID
 * @param progress    0–1 ratio of current track
 * @param duration    current track duration in seconds
 * @param nextUrl     URL of the next track (N+1)
 * @param nextNextUrl URL of the track after next (N+2) — for advance buffering
 */
export function checkPreloadTrigger(
  trackId:     string,
  progress:    number,
  duration:    number,
  nextUrl:     string | null | undefined,
  nextNextUrl?: string | null | undefined,
): void {
  if (!nextUrl) return;
  if (_triggeredFor === trackId) return;  // already triggered for this track

  const remaining = duration > 0 ? duration * (1 - progress) : Infinity;
  if (progress <= PRELOAD_PROGRESS && remaining > PRELOAD_REMAINING) return;

  _triggeredFor = trackId;
  // Bypass debounce — we're in live playback and need to start immediately
  _startPrimary(nextUrl, nextNextUrl);
}

/** Reset per-track trigger. Called at the start of each new track load. */
export function resetPreloadTrigger(): void {
  _triggeredFor = '';
}

/**
 * Try to swap the primary buffer element into playback position.
 *
 * Returns the primary buffer element if:
 *   • Its URL matches expectedUrl
 *   • Its readyState >= 3 (HAVE_FUTURE_DATA — enough to play)
 *
 * On success:
 *   • Promotes _advanceEl to _primaryEl (C becomes the new primary)
 *   • The caller must call notifySwapComplete(nextNextUrl) to start the
 *     new advance buffer
 *
 * On failure (not ready):
 *   • Returns null — caller falls back to _loadAndPlay
 *   • The partial download in _primaryEl benefits _loadAndPlay via HTTP cache
 */
export function trySwapBuffer(expectedUrl: string, volume: number): HTMLAudioElement | null {
  if (!_primaryEl)                        return null;
  if (_primaryUrl !== expectedUrl)        return null;
  if (_primaryEl.readyState < 3)          return null;

  // Extract the primary element
  const el = _primaryEl;
  _primaryEl  = null;
  _primaryUrl = '';

  // PROMOTE: advance becomes the new primary immediately
  _primaryEl  = _advanceEl;
  _primaryUrl = _advanceUrl;
  _advanceEl  = null;
  _advanceUrl = '';
  // _pendingAdvanceUrl carries over — notifySwapComplete will set the new one

  // Prepare element for playback
  el.volume      = volume;
  el.muted       = false;
  el.autoplay    = false;
  el.currentTime = 0;

  return el;
}

/**
 * Called by playerStore after a successful buffer swap.
 * Sets up the advance buffer for the track-after-next.
 *
 * At this point _primaryEl is the promoted advance (C, already downloading
 * or fully downloaded). We use it to cascade: when C reaches canplay,
 * start D as the new advance.
 *
 * @param nextNextUrl  URL of the track that comes after the currently-playing next track
 */
export function notifySwapComplete(nextNextUrl: string | null | undefined): void {
  if (!nextNextUrl) return;

  _pendingAdvanceUrl = nextNextUrl;

  if (!_primaryEl) {
    // No promoted buffer (advance was null at swap time) — start primary from scratch
    _startPrimary(nextNextUrl);
    _pendingAdvanceUrl = '';
    return;
  }

  if (_primaryEl.readyState >= 3) {
    // Promoted primary already has enough data → start advance immediately
    _startAdvance(nextNextUrl);
    _pendingAdvanceUrl = '';
  } else {
    // Wire canplay hook on the promoted element
    _primaryEl.addEventListener('canplay', _handlePrimaryCanPlay, { once: true });
  }
}

/**
 * Full cleanup. Call on logout, clearQueue, session clear.
 * Destroys both buffer elements to free memory and abort all network requests.
 */
export function clearPreloader(): void {
  if (_debounceTimer !== null) { clearTimeout(_debounceTimer); _debounceTimer = null; }
  _abortAll();
  _triggeredFor = '';
}
