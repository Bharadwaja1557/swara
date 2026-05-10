/**
 * Swara Audio Engine
 *
 * Singleton HTMLAudioElement abstraction.
 * - Lazy-initialised: never runs during SSR
 * - All state changes emitted as typed events for Zustand stores
 * - iOS-safe: respects autoplay policy, handles AbortError gracefully
 * - Supports .m4a (AAC) natively on all modern browsers
 */

export type AudioEventType =
  | 'timeupdate'
  | 'durationchange'
  | 'play'
  | 'pause'
  | 'ended'
  | 'error'
  | 'waiting'
  | 'canplay';

export interface AudioEventPayload {
  type:      AudioEventType;
  currentTime: number;
  duration:  number;
  isPlaying: boolean;
  isLoading: boolean;
  error?:    string;
}

type EventHandler = (payload: AudioEventPayload) => void;
type EventKey = AudioEventType | '*';

class AudioEngine {
  private audio:    HTMLAudioElement | null = null;
  private handlers: Map<EventKey, Set<EventHandler>> = new Map();
  private _url:     string = '';

  // ─── Lazy element access ────────────────────────────────────────────────

  private get el(): HTMLAudioElement {
    if (typeof window === 'undefined') {
      throw new Error('[AudioEngine] Cannot be used during SSR');
    }
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'metadata';
      // crossOrigin is needed for Media Session artwork; omit to avoid CORS
      // errors on GitHub Releases (they don't send CORS headers for audio)
      // this.audio.crossOrigin = 'anonymous';
      this.bindNativeEvents();
    }
    return this.audio;
  }

  // ─── Event bus ──────────────────────────────────────────────────────────

  private snapshot(extras: Partial<AudioEventPayload> = {}): AudioEventPayload {
    const el = this.audio;
    return {
      type:        'timeupdate', // overridden by caller
      currentTime: el?.currentTime ?? 0,
      duration:    el && !isNaN(el.duration) ? el.duration : 0,
      isPlaying:   el ? !el.paused : false,
      isLoading:   el ? el.readyState < 3 : false,
      ...extras,
    };
  }

  private emit(type: AudioEventType, extras: Partial<AudioEventPayload> = {}) {
    const payload = { ...this.snapshot(extras), type };

    // Specific listeners
    this.handlers.get(type)?.forEach((fn) => fn(payload));
    // Wildcard listeners
    this.handlers.get('*')?.forEach((fn) => fn(payload));
  }

  on(event: EventKey, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  // ─── Native event binding ────────────────────────────────────────────────

  private bindNativeEvents() {
    const el = this.audio!;

    el.addEventListener('timeupdate',    () => this.emit('timeupdate'));
    el.addEventListener('durationchange',() => this.emit('durationchange'));
    el.addEventListener('play',          () => this.emit('play'));
    el.addEventListener('pause',         () => this.emit('pause'));
    el.addEventListener('ended',         () => this.emit('ended'));
    el.addEventListener('waiting',       () => this.emit('waiting',  { isLoading: true }));
    el.addEventListener('canplay',       () => this.emit('canplay',  { isLoading: false }));
    el.addEventListener('loadeddata',    () => this.emit('canplay',  { isLoading: false }));
    el.addEventListener('error', () => {
      const msg =
        el.error?.message ??
        `Audio error code ${el.error?.code ?? 'unknown'}`;
      this.emit('error', { error: msg, isPlaying: false, isLoading: false });
    });
  }

  // ─── Playback control ────────────────────────────────────────────────────

  private loadUrl(url: string) {
    if (this._url === url) return;
    this._url = url;
    this.el.src = url;
    this.el.load();
  }

  async play(url?: string): Promise<void> {
    if (url) this.loadUrl(url);
    // Trigger el getter to init if needed
    void this.el;
    try {
      await this.el.play();
    } catch (err) {
      const name = (err as DOMException).name;
      // AbortError: rapid track switching — safe to ignore
      // NotAllowedError: browser autoplay policy — surface as error
      if (name === 'AbortError') return;
      this.emit('error', {
        error: name === 'NotAllowedError'
          ? 'Tap to start playback (browser autoplay policy)'
          : (err as Error).message,
        isPlaying: false,
        isLoading: false,
      });
    }
  }

  pause(): void {
    this.audio?.pause();
  }

  seek(time: number): void {
    const el = this.el;
    const dur = el.duration;
    if (!isNaN(dur) && dur > 0) {
      el.currentTime = Math.max(0, Math.min(time, dur));
    }
  }

  setVolume(vol: number): void {
    this.el.volume = Math.max(0, Math.min(1, vol));
  }

  // ─── Accessors ───────────────────────────────────────────────────────────

  getCurrentTime(): number { return this.audio?.currentTime ?? 0; }
  getDuration():    number {
    const d = this.audio?.duration;
    return d && !isNaN(d) ? d : 0;
  }
  isPlaying():      boolean { return this.audio ? !this.audio.paused : false; }
  getVolume():      number  { return this.audio?.volume ?? 1; }
  get currentUrl(): string  { return this._url; }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  destroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
      this._url = '';
    }
    this.handlers.clear();
  }
}

// Singleton — module-level, one instance for the entire app lifetime
let _instance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!_instance) _instance = new AudioEngine();
  return _instance;
}
