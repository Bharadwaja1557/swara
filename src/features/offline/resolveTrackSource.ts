/**
 * src/features/offline/resolveTrackSource.ts
 *
 * Track source resolver — future offline/download architecture stub.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CURRENT BEHAVIOR: pass-through (always returns remote URL)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * All audio is currently streamed from the CDN (jsDelivr → GitHub Releases).
 * This function is a no-op stub that returns the remote URL unchanged.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * FUTURE IMPLEMENTATION (when offline is ready)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Resolution priority order:
 *   1. cached local file  — if track was downloaded (IndexedDB / Capacitor filesystem)
 *   2. remote CDN URL     — default streaming path
 *
 * Implementation direction:
 *
 *   async function resolveTrackSource(track: Track): Promise<TrackSourceResult> {
 *     const cached = await OfflineStorage.get(track.id);
 *     if (cached) return { type: 'offline', url: cached.localUrl, track };
 *     return { type: 'remote',  url: track.streamUrl, track };
 *   }
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CAPACITOR / INDEXEDDB COMPATIBILITY
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * The resolver is async to support both:
 *   • IndexedDB blob reads (web offline)
 *   • Capacitor Filesystem.readFile (native iOS/Android)
 *
 * Callers should use the resolved URL — they never care whether it's local
 * or remote. All playerStore playback paths should go through this resolver
 * once offline support is added.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DO NOT implement localStorage-based downloads.
 * localStorage is not suited for binary file storage.
 * Use IndexedDB (Dexie.js or native) or Capacitor Filesystem.
 */

import type { Track } from '@/types/music';

export type TrackSourceType = 'remote' | 'offline';

export interface TrackSourceResult {
  type:  TrackSourceType;
  url:   string;
  track: Track;
}

/**
 * Resolve the best available source URL for a track.
 *
 * Currently: always returns the remote CDN URL (pass-through).
 * Future: checks local cache / offline storage first.
 *
 * @param track  Track from the catalog store.
 * @returns      Resolved source with type annotation for logging/analytics.
 */
export async function resolveTrackSource(track: Track): Promise<TrackSourceResult> {
  // TODO: check OfflineStorage.get(track.id) when implemented
  return {
    type:  'remote',
    url:   track.streamUrl,
    track,
  };
}

/**
 * Synchronous variant — for contexts that cannot use async (e.g. legacy audio init).
 * Returns the remote URL immediately. Replace with cache lookup when offline is ready.
 */
export function resolveTrackSourceSync(track: Track): string {
  return track.streamUrl;
}
