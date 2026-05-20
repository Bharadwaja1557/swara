/**
 * src/lib/selectors.ts — Pure derived selectors over the Zustand stores.
 *
 * Goals:
 *   - Eliminate repeated .filter() / .find() scattered across components.
 *   - Enable O(1) lookups via existing Maps (trackMap, albumMap, artistMap).
 *   - Keep selectors pure — no side effects, no store writes.
 *   - Components call these; selectors call stores via getState() for one-shot
 *     reads, OR are used as inline selector functions inside useXxxStore().
 *
 * Usage patterns:
 *
 *   // Inside a component — reactive (re-renders on store changes):
 *   const album = useLibraryStore(selectAlbumById(id));
 *
 *   // Outside React — one-shot read:
 *   const tracks = getAlbumTracks(albumId);
 */
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore }  from '@/store/playerStore';
import { useLikedStore }   from '@/store/likedStore';
import type { Track, Album, Artist } from '@/types/music';

// ── One-shot reads (use outside React or in event handlers) ──────────────────

/** O(1) — uses albumMap. Returns undefined if not found. */
export function getAlbumById(id: string): Album | undefined {
  return useLibraryStore.getState().albumMap.get(id);
}

/** O(1) — uses trackMap. Returns undefined if not found. */
export function getTrackById(id: string): Track | undefined {
  return useLibraryStore.getState().trackMap.get(id);
}

/** O(1) — uses artistMap. Returns undefined if not found. */
export function getArtistById(id: string): Artist | undefined {
  return useLibraryStore.getState().artistMap.get(id);
}

/** All tracks for an album — O(1) album lookup, then array slice. */
export function getAlbumTracks(albumId: string): Track[] {
  return getAlbumById(albumId)?.tracks ?? [];
}

/** All tracks for an artist (singer) — O(n) but called rarely. */
export function getArtistTracks(artistId: string): Track[] {
  const { tracks, artistMap } = useLibraryStore.getState();
  const artist = artistMap.get(artistId);
  if (!artist) return [];
  return tracks.filter((t) =>
    t.artists.some((a) => a.toLowerCase().replace(/\s+/g, '-') === artistId
      || a.toLowerCase() === artist.name.toLowerCase())
  );
}

/** Current liked tracks snapshot. */
export function getLikedTracks(): Track[] {
  return useLikedStore.getState().getLikedTracks();
}

/** Current playing track (one-shot, not reactive). */
export function getCurrentTrack(): Track | null {
  return usePlayerStore.getState().currentTrack;
}

// ── Selector factory functions (use inside useXxxStore(selector)) ─────────────
// These return stable selector functions for Zustand's subscription system.

/** Reactive O(1) album lookup. Re-renders only when albumMap changes. */
export const selectAlbumById = (id: string) =>
  (s: ReturnType<typeof useLibraryStore.getState>) => s.albumMap.get(id);

/** Reactive O(1) track lookup. */
export const selectTrackById = (id: string) =>
  (s: ReturnType<typeof useLibraryStore.getState>) => s.trackMap.get(id);

/** Reactive O(1) artist lookup. */
export const selectArtistById = (id: string) =>
  (s: ReturnType<typeof useLibraryStore.getState>) => s.artistMap.get(id);

/** Reactive liked state for a single track ID. */
export const selectIsLiked = (trackId: string) =>
  (s: ReturnType<typeof useLikedStore.getState>) => !!s.liked[trackId];
