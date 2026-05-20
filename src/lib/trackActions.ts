/**
 * src/lib/trackActions.ts — Centralized track-related action helpers.
 *
 * All user-triggered playback goes through here:
 *   1. Component calls trackActions.playXxx(...)
 *   2. trackActions calls the right queueBuilder
 *   3. Builder returns { tracks, context, startIndex }
 *   4. trackActions calls playerStore.playQueue(built)
 *
 * This is the ONLY place that bridges builders → playerStore.
 * UI components never call playTrack/playAlbum/playQueue directly.
 */
import type { Track, Album, Artist } from '@/types/music';
import { useToastStore }       from '@/store/useToastStore';
import { useLikedStore }       from '@/store/likedStore';
import { usePlayerStore }      from '@/store/playerStore';
import { useUserLibraryStore } from '@/store/useUserLibraryStore';
import type { ToastIcon }      from '@/store/useToastStore';
import {
  buildAlbumQueue,
  buildArtistQueue,
  buildLikedQueue,
  buildLibraryQueue,
  buildSearchQueue,
  buildManualQueue,
} from '@/lib/queueBuilders';

// ── Internal helper ───────────────────────────────────────────────────────────

function toast(message: string, icon?: ToastIcon) {
  useToastStore.getState().show(message, icon);
}

// ── Actions ───────────────────────────────────────────────────────────────────

export const trackActions = {

  // ── Like ──────────────────────────────────────────────────────────────────

  toggleLike: (track: Track): boolean => {
    const nowLiked = useLikedStore.getState().toggleLike(track);
    toast(nowLiked ? 'Added to Liked Songs' : 'Removed from Liked Songs', 'heart');
    return nowLiked;
  },

  // ── Playback ──────────────────────────────────────────────────────────────

  /** Play a track from an album — builds full album queue */
  playFromAlbum: (track: Track, album: Album): void => {
    const built = buildAlbumQueue(album, track);
    usePlayerStore.getState().playQueue(built);
  },

  /** Play an entire album (from start or given index) */
  playAlbum: (album: Album, startIndex = 0): void => {
    const built = buildAlbumQueue(album, album.tracks[startIndex]);
    usePlayerStore.getState().playQueue(built);
  },

  /** Play a track from an artist's track list */
  playFromArtist: (track: Track, artist: Artist, allTracks: Track[]): void => {
    const built = buildArtistQueue(artist, allTracks, track);
    usePlayerStore.getState().playQueue(built);
  },

  /** Play from liked songs */
  playFromLiked: (track: Track): void => {
    const built = buildLikedQueue(track);
    usePlayerStore.getState().playQueue(built);
  },

  /** Play liked songs from beginning */
  playLiked: (): void => {
    const built = buildLikedQueue();
    if (!built.tracks.length) return;
    usePlayerStore.getState().playQueue(built);
  },

  /** Play from library */
  playFromLibrary: (track: Track): void => {
    const built = buildLibraryQueue(track);
    usePlayerStore.getState().playQueue(built);
  },

  /** Play from search results */
  playFromSearch: (track: Track, results: Track[], query: string): void => {
    const built = buildSearchQueue(results, query, track);
    usePlayerStore.getState().playQueue(built);
  },

  /** Play an ad-hoc track list (shuffle play, etc.) */
  playManual: (tracks: Track[], startTrack?: Track): void => {
    const built = buildManualQueue(tracks, startTrack);
    if (!built.tracks.length) return;
    usePlayerStore.getState().playQueue(built);
  },

  // ── Backwards-compat shim — prefer the typed methods above ───────────────

  /**
   * @deprecated Use playFromAlbum / playFromArtist / playFromLiked etc.
   * Kept for migration; uses 'unknown' context.
   */
  play: (track: Track, queue?: Track[]): void => {
    const built = buildManualQueue(queue ?? [track], track);
    usePlayerStore.getState().playQueue(built);
  },

  // ── Queue mutations ───────────────────────────────────────────────────────

  addToQueue: (track: Track): void => {
    usePlayerStore.getState().appendToQueue(track);
    toast('Added to queue', 'queue');
  },

  removeFromQueue: (index: number): void => {
    usePlayerStore.getState().removeFromQueue(index);
    toast('Removed from queue', 'queue');
  },

  clearQueue: (): void => {
    usePlayerStore.getState().clearQueue();
    toast('Queue cleared', 'queue');
  },

  // ── Library ───────────────────────────────────────────────────────────────

  toggleAlbumLibrary: (album: Album, tracks: Track[]): void => {
    const store = useUserLibraryStore.getState();
    const inLib = store.hasAlbum(album.id);
    if (inLib) {
      store.removeAlbum(album.id);
      toast('Removed from Library', 'library');
    } else {
      store.addAlbum(album.id, tracks.map((t) => t.id));
      toast('Added to Library', 'library');
    }
  },

  toggleTrackLibrary: (track: Track, album: Album): void => {
    const store  = useUserLibraryStore.getState();
    const inLib  = store.hasTrack(album.id, track.id);
    const allIds = album.tracks.length > 0
      ? album.tracks.map((t) => t.id)
      : [track.id];
    if (inLib) {
      store.removeTrack(album.id, track.id);
      toast('Removed from Library', 'library');
    } else {
      store.addTrack(album.id, track.id, allIds);
      toast('Added to Library', 'library');
    }
  },

} as const;
