/**
 * src/features/media/canBrowserPlay.ts
 *
 * Detect whether the current browser can decode a given audio format
 * before attempting playback. Uses the standard HTMLMediaElement
 * canPlayType() API — synchronous, no network requests.
 *
 * canPlayType() returns:
 *   ''          → definitely NOT supported
 *   'maybe'     → might work (container recognised, codec unverified)
 *   'probably'  → almost certainly works
 *
 * We treat 'maybe' as playable — it's the best we can get for m4a/aac
 * without actually loading the file. Returning false only on ''.
 */

import { mediaLogger } from './mediaLogger';

// Singleton probe element — never attached to DOM, never plays anything
let _probe: HTMLAudioElement | null = null;
function getProbe(): HTMLAudioElement {
  if (!_probe) _probe = new Audio();
  return _probe;
}

/**
 * Map a URL to its most likely MIME + codec string.
 * Covers the formats used in the Swara asset DB.
 */
function mimeFromUrl(url: string): string {
  const lower = url.toLowerCase().split('?')[0]; // strip query params
  if (lower.endsWith('.m4a'))  return 'audio/mp4; codecs="mp4a.40.2"';
  if (lower.endsWith('.aac'))  return 'audio/aac';
  if (lower.endsWith('.mp4'))  return 'audio/mp4; codecs="mp4a.40.2"';
  if (lower.endsWith('.mp3'))  return 'audio/mpeg';
  if (lower.endsWith('.ogg'))  return 'audio/ogg; codecs="vorbis"';
  if (lower.endsWith('.opus')) return 'audio/ogg; codecs="opus"';
  if (lower.endsWith('.flac')) return 'audio/flac';
  if (lower.endsWith('.wav'))  return 'audio/wav';
  // GitHub release URLs don't always have an extension in the path
  // Default to mp4/aac which is what the asset DB uses
  return 'audio/mp4; codecs="mp4a.40.2"';
}

/**
 * Returns true if the browser reports it can play this URL's format.
 * @param url      The audio stream URL (used to infer MIME type).
 * @param mimeType Optional explicit MIME override.
 */
export function canBrowserPlay(url: string, mimeType?: string): boolean {
  try {
    const probe = getProbe();
    const mime  = mimeType ?? mimeFromUrl(url);
    const result = probe.canPlayType(mime);
    if (result === '') {
      mediaLogger.formatUnsupported(mime);
      return false;
    }
    return true;
  } catch {
    // canPlayType should never throw, but guard defensively
    return true; // assume playable if probe fails
  }
}
