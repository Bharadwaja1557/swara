/**
 * src/features/media/mediaLogger.ts
 *
 * Centralised logger for all media delivery events.
 * Production: concise (one line per event, no stack traces).
 * Development: full diagnostics.
 *
 * Import this instead of calling console.error/warn directly in media code.
 */

import type { MediaErrorCode } from './mediaErrors';

const DEV = import.meta.env.DEV;
const PREFIX = '[Swara/Media]';

export const mediaLogger = {

  /** Audio playback failed */
  playError(trackId: string, code: MediaErrorCode, detail?: string) {
    if (code === 'ABORT_ERROR') return; // user-initiated, not an error
    if (DEV) {
      console.error(`${PREFIX} playError | track=${trackId} | code=${code} | ${detail ?? ''}`);
    } else {
      console.warn(`${PREFIX} ${code} on track ${trackId.slice(0, 20)}`);
    }
  },

  /** Track skipped after failed playback */
  trackSkipped(trackId: string, code: MediaErrorCode) {
    if (DEV) {
      console.info(`${PREFIX} skipping track=${trackId} after ${code}`);
    }
  },

  /** Fetch failed for library.json or album JSON */
  fetchError(url: string, status?: number, blocked?: boolean) {
    if (DEV) {
      if (blocked) {
        console.warn(`${PREFIX} fetch BLOCKED (ad blocker?) — ${url}`);
      } else {
        console.error(`${PREFIX} fetch failed ${status ?? '?'} — ${url}`);
      }
    } else {
      console.warn(`${PREFIX} fetch error${blocked ? ' (blocked)' : ''}`);
    }
  },

  /** Format not supported by this browser */
  formatUnsupported(mimeType: string) {
    if (DEV) {
      console.warn(`${PREFIX} format unsupported: ${mimeType}`);
    }
  },

  /** Playback timeout fired */
  timeout(trackId: string, ms: number) {
    if (DEV) {
      console.warn(`${PREFIX} timeout after ${ms}ms on track=${trackId}`);
    }
  },

  /** General diagnostic — dev only */
  debug(...args: unknown[]) {
    if (DEV) console.log(PREFIX, ...args);
  },
};
