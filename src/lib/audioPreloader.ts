/**
 * src/lib/audioPreloader.ts — v3 + instrumentation build
 *
 * INSTRUMENTATION LAYER ADDED (remove before shipping).
 * All [BUF] log lines are temporary diagnostic output.
 * Zero logic changes from the previous version.
 */

export type BufferReadyCallback = (el: HTMLAudioElement) => void;

const PRELOAD_PROGRESS  = 0.70;
const PRELOAD_REMAINING = 30;
const DEBOUNCE_MS       = 800;

let _bufferEl:       HTMLAudioElement | null = null;
let _bufferedUrl:    string = '';
let _debounceTimer:  ReturnType<typeof setTimeout> | null = null;
let _triggeredFor:   string = '';

// ── Instrumentation helpers ───────────────────────────────────────────────────

function _ts(): string {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function _vis(): string {
  return document.hidden ? 'BG' : 'FG';
}

/** Snapshot of the buffer element's current network/buffer state. */
function _snapState(el: HTMLAudioElement): string {
  const rs  = el.readyState;   // 0=NOTHING 1=METADATA 2=CURRENT 3=FUTURE 4=ENOUGH
  const ns  = el.networkState; // 0=EMPTY 1=IDLE 2=LOADING 3=NO_SOURCE
  const buf = el.buffered.length > 0
    ? `${el.buffered.start(0).toFixed(1)}–${el.buffered.end(el.buffered.length - 1).toFixed(1)}s`
    : 'none';
  const dur = isFinite(el.duration) ? `${el.duration.toFixed(1)}s` : '?';
  return `readyState=${rs} networkState=${ns} buffered=[${buf}] duration=${dur}`;
}

/** Attach readyState/event monitoring to a buffer element for diagnostics. */
function _instrumentBufferEl(el: HTMLAudioElement, label: string): void {
  // readyState milestones
  el.addEventListener('loadstart',      () => console.log(`[BUF ${_ts()} ${_vis()}] ${label} loadstart       | ${_snapState(el)}`));
  el.addEventListener('durationchange', () => console.log(`[BUF ${_ts()} ${_vis()}] ${label} durationchange  | ${_snapState(el)}`));
  el.addEventListener('loadedmetadata', () => console.log(`[BUF ${_ts()} ${_vis()}] ${label} loadedmetadata  | ${_snapState(el)}`));
  el.addEventListener('loadeddata',     () => console.log(`[BUF ${_ts()} ${_vis()}] ${label} loadeddata      | ${_snapState(el)}`));
  el.addEventListener('progress',       () => console.log(`[BUF ${_ts()} ${_vis()}] ${label} progress        | ${_snapState(el)}`));
  el.addEventListener('canplay',        () => console.log(`[BUF ${_ts()} ${_vis()}] ${label} canplay         | ${_snapState(el)}`));
  el.addEventListener('canplaythrough', () => console.log(`[BUF ${_ts()} ${_vis()}] ${label} canplaythrough  | ${_snapState(el)}`));
  el.addEventListener('stalled',        () => console.log(`[BUF ${_ts()} ${_vis()}] ${label} stalled         | ${_snapState(el)}`));
  el.addEventListener('suspend',        () => console.log(`[BUF ${_ts()} ${_vis()}] ${label} suspend         | ${_snapState(el)}`));
  el.addEventListener('waiting',        () => console.log(`[BUF ${_ts()} ${_vis()}] ${label} waiting         | ${_snapState(el)}`));
  el.addEventListener('error',          () => console.log(`[BUF ${_ts()} ${_vis()}] ${label} error           | code=${el.error?.code} msg=${el.error?.message}`));
  el.addEventListener('abort',          () => console.log(`[BUF ${_ts()} ${_vis()}] ${label} abort           | ${_snapState(el)}`));
}

// Periodic readyState poll while buffering (fires every 2s, stops when ready or aborted).
// Answers: "is readyState advancing at all in background?"
let _pollTimer: ReturnType<typeof setTimeout> | null = null;
function _startPoll(label: string): void {
  _stopPoll();
  let ticks = 0;
  const poll = () => {
    if (!_bufferEl || !_bufferedUrl) { _stopPoll(); return; }
    ticks++;
    console.log(`[BUF ${_ts()} ${_vis()}] POLL[${ticks}] ${label} | ${_snapState(_bufferEl)}`);
    if (_bufferEl.readyState >= 4) {
      console.log(`[BUF ${_ts()} ${_vis()}] POLL done — readyState reached 4 for ${label}`);
      _stopPoll();
      return;
    }
    _pollTimer = setTimeout(poll, 2000);
  };
  _pollTimer = setTimeout(poll, 2000);
}
function _stopPoll(): void {
  if (_pollTimer !== null) { clearTimeout(_pollTimer); _pollTimer = null; }
}

// Visibility log — tells us exactly when the tab goes BG/FG
document.addEventListener('visibilitychange', () => {
  console.log(`[BUF ${_ts()}] *** visibilitychange → ${document.hidden ? 'BACKGROUND' : 'FOREGROUND'} ***`);
  if (_bufferEl && _bufferedUrl) {
    console.log(`[BUF ${_ts()}] buffer state at visibility change: ${_snapState(_bufferEl)}`);
  }
});

// ── Element creation ──────────────────────────────────────────────────────────

let _bufferSeq = 0; // sequential label for each buffer element

function _makeBufferEl(): HTMLAudioElement {
  const seq   = ++_bufferSeq;
  const el    = new Audio();
  el.preload  = 'auto';
  el.volume   = 0;
  el.autoplay = false;
  el.onerror  = null;
  _instrumentBufferEl(el, `buf#${seq}`);
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
  console.log(`[BUF ${_ts()} ${_vis()}] _abortBuffer: aborting ${_bufferedUrl.slice(-30)}`);
  _stopPoll();
  _bufferEl.src = '';
  _bufferEl.load();
  _bufferedUrl = '';
}

function _startBuffer(url: string): void {
  if (!url) return;
  if (_bufferedUrl === url) {
    console.log(`[BUF ${_ts()} ${_vis()}] _startBuffer: already loading, skip (${url.slice(-30)})`);
    return;
  }

  const el = _getOrCreateBufferEl();
  if (!el) return;

  _abortBuffer();

  const shortUrl = url.slice(-40);
  console.log(`[BUF ${_ts()} ${_vis()}] _startBuffer: BEGIN ${shortUrl}`);

  _bufferedUrl = url;
  el.src = url;
  el.load();

  _startPoll(shortUrl);

  console.log(`[BUF ${_ts()} ${_vis()}] _startBuffer: AFTER el.load() | ${_snapState(el)}`);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function recomputePreload(nextUrl: string | null | undefined): void {
  if (_debounceTimer !== null) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
  if (!nextUrl) {
    _abortBuffer();
    return;
  }
  if (_bufferedUrl === nextUrl) return;

  _debounceTimer = setTimeout(() => {
    _debounceTimer = null;
    _startBuffer(nextUrl);
  }, DEBOUNCE_MS);
}

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

  console.log(`[BUF ${_ts()} ${_vis()}] checkPreloadTrigger FIRED track=${trackId.slice(0, 8)} prog=${(progress * 100).toFixed(0)}% rem=${remaining.toFixed(1)}s next=${nextUrl.slice(-30)}`);
  _triggeredFor = trackId;
  _startBuffer(nextUrl);
}

export function resetPreloadTrigger(): void {
  console.log(`[BUF ${_ts()} ${_vis()}] resetPreloadTrigger (_triggeredFor was "${_triggeredFor.slice(0, 8)}")`);
  _triggeredFor = '';
}

export function trySwapBuffer(
  expectedUrl: string,
  volume: number,
): HTMLAudioElement | null {
  const shortUrl = expectedUrl.slice(-40);
  console.log(`[BUF ${_ts()} ${_vis()}] trySwapBuffer: expectedUrl=${shortUrl}`);

  if (!_bufferEl) {
    console.log(`[BUF ${_ts()} ${_vis()}] trySwapBuffer: FAIL — _bufferEl is null`);
    return null;
  }
  if (_bufferedUrl !== expectedUrl) {
    console.log(`[BUF ${_ts()} ${_vis()}] trySwapBuffer: FAIL — URL mismatch. buffered=${_bufferedUrl.slice(-40)}`);
    return null;
  }

  const rs = _bufferEl.readyState;
  console.log(`[BUF ${_ts()} ${_vis()}] trySwapBuffer: readyState=${rs} | ${_snapState(_bufferEl)}`);

  if (rs < 3) {
    console.log(`[BUF ${_ts()} ${_vis()}] trySwapBuffer: FAIL — not enough data (readyState=${rs}, need ≥3)`);
    return null;
  }

  _stopPoll();
  const el = _bufferEl;
  _bufferEl    = null;
  _bufferedUrl = '';

  el.volume      = volume;
  el.muted       = false;
  el.autoplay    = false;
  el.currentTime = 0;

  console.log(`[BUF ${_ts()} ${_vis()}] trySwapBuffer: SUCCESS — element handed to engine`);
  return el;
}

export function notifySwapComplete(nextNextUrl: string | null | undefined): void {
  console.log(`[BUF ${_ts()} ${_vis()}] notifySwapComplete: nextNextUrl=${nextNextUrl ? nextNextUrl.slice(-40) : 'null'}`);
  _bufferEl    = _makeBufferEl();
  _bufferedUrl = '';
  _triggeredFor = '';
  if (nextNextUrl) {
    _startBuffer(nextNextUrl);
  }
}

export function clearPreloader(): void {
  console.log(`[BUF ${_ts()} ${_vis()}] clearPreloader`);
  if (_debounceTimer !== null) { clearTimeout(_debounceTimer); _debounceTimer = null; }
  _stopPoll();
  _abortBuffer();
  if (_bufferEl) { _bufferEl.src = ''; _bufferEl = null; }
  _bufferedUrl  = '';
  _triggeredFor = '';
}
