/**
 * src/features/artwork/playlistArtworkCache.ts
 *
 * Memory cache for resolved PlaylistArtworkResult objects.
 *
 * CACHE KEY: artworkKey from resolvePlaylistArtwork() — already encodes:
 *   - coverImageUrl (uploaded covers)
 *   - coverId (preset covers)
 *   - ordered unique cover URLs from trackIds (collage)
 *   - type prefix (c4:, c3:, c2:, single:, preset:, uploaded:, placeholder)
 *
 * artworkKey changes ONLY when displayed artwork actually changes, so the
 * cache automatically invalidates on:
 *   - Cover change (coverImageUrl / coverId modified)
 *   - Track add / remove (new unique cover URL enters or leaves)
 *   - Reorder (only if a new cover URL becomes the first occurrence)
 *
 * artworkKey does NOT change on:
 *   - Title / description edits
 *   - isPublic toggle
 *   - Playback events
 *   - Any metadata unrelated to artwork
 *
 * SCOPE: in-memory only. Intentionally not persisted to localStorage —
 * the cost of recomputing on cold start is negligible (pure string ops)
 * and avoiding stale serialized blobs is worth the simplicity.
 *
 * INVALIDATION API:
 *   invalidatePlaylistArtwork(playlistId)  — use after cover change
 *   invalidateAllPlaylistArtwork()         — use after library metadata refresh
 *
 * PlaylistArtwork.tsx reads from this cache via getCachedArtwork() before
 * calling resolvePlaylistArtwork(), and writes via setCachedArtwork().
 */

import type { PlaylistArtworkResult } from './resolvePlaylistArtwork';

// Map: artworkKey → result (memory only)
const cache = new Map<string, PlaylistArtworkResult>();

// Secondary index: playlistId → last artworkKey (for invalidation by ID)
const playlistToKey = new Map<string, string>();

export function getCachedArtwork(artworkKey: string): PlaylistArtworkResult | undefined {
  return cache.get(artworkKey);
}

export function setCachedArtwork(playlistId: string, result: PlaylistArtworkResult): void {
  const prev = playlistToKey.get(playlistId);
  if (prev && prev !== result.artworkKey) {
    cache.delete(prev); // evict stale entry for this playlist
  }
  cache.set(result.artworkKey, result);
  playlistToKey.set(playlistId, result.artworkKey);
}

/**
 * Invalidate cache entries for a specific playlist.
 * Call after cover change, track add/remove.
 */
export function invalidatePlaylistArtwork(playlistId: string): void {
  const key = playlistToKey.get(playlistId);
  if (key) {
    cache.delete(key);
    playlistToKey.delete(playlistId);
  }
}

/**
 * Clear the entire cache.
 * Call after library metadata refresh or logout.
 */
export function invalidateAllPlaylistArtwork(): void {
  cache.clear();
  playlistToKey.clear();
}

export function cacheSize(): number {
  return cache.size;
}
