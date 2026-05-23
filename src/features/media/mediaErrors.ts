/**
 * src/features/media/mediaErrors.ts
 *
 * Typed error taxonomy for all media delivery failures.
 * Used by the logger, playerStore, and UI error surfaces.
 */

export type MediaErrorCode =
  | 'NETWORK_ERROR'   // fetch/XHR failed — DNS, connection refused
  | 'FORMAT_ERROR'    // browser cannot decode this codec/container
  | 'BLOCKED_ERROR'   // ERR_BLOCKED_BY_CLIENT — ad blocker / privacy shield
  | 'ABORT_ERROR'     // playback aborted by user or navigation
  | 'TIMEOUT_ERROR'   // media did not start loading within timeout window
  | 'UNKNOWN_ERROR';  // MediaError with unrecognised code

export class MediaPlaybackError extends Error {
  constructor(
    public readonly code:    MediaErrorCode,
    public readonly trackId: string,
    message: string,
    public readonly cause?:  unknown,
  ) {
    super(message);
    this.name = 'MediaPlaybackError';
  }
}

/**
 * Map a native HTMLMediaElement MediaError code to our taxonomy.
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaError/code
 */
export function classifyMediaError(
  err: MediaError | null | undefined,
  src?: string,
): MediaErrorCode {
  if (!err) return 'UNKNOWN_ERROR';

  switch (err.code) {
    case MediaError.MEDIA_ERR_NETWORK:
      // ERR_BLOCKED_BY_CLIENT sets MEDIA_ERR_NETWORK with a specific message
      if (err.message?.includes('DEMUXER_ERROR') ||
          err.message?.includes('PIPELINE_ERROR') ||
          err.message?.includes('Format error') ||
          err.message?.includes('MEDIA_ELEMENT_ERROR: Format')) {
        return 'FORMAT_ERROR';
      }
      // Heuristic: GitHub URLs blocked by extensions
      if (src && (src.includes('githubusercontent.com') || src.includes('github.com/releases'))) {
        return 'BLOCKED_ERROR';
      }
      return 'NETWORK_ERROR';
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return 'FORMAT_ERROR';
    case MediaError.MEDIA_ERR_DECODE:
      return 'FORMAT_ERROR';
    case MediaError.MEDIA_ERR_ABORTED:
      return 'ABORT_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/** Human-readable messages shown in toasts */
export const MEDIA_ERROR_MESSAGES: Record<MediaErrorCode, string> = {
  NETWORK_ERROR:  'Unable to load track — check your connection',
  FORMAT_ERROR:   'This audio format is not supported on your browser',
  BLOCKED_ERROR:  'Track blocked — try disabling your ad blocker',
  ABORT_ERROR:    '',  // silent — user-initiated
  TIMEOUT_ERROR:  'Track took too long to load — skipping',
  UNKNOWN_ERROR:  'Playback error — skipping track',
};
