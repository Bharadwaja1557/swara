/**
 * src/lib/trackActions.ts — Centralized track-related action helpers.
 *
 * Eliminates logic duplication across AlbumPage, LikedSongsPage,
 * FullscreenPlayer, LibraryPage, SearchPage, etc.
 *
 * Each action calls the relevant store + shows a toast notification.
 * All functions work outside React — they call store.getState() directly.
 *
 * Usage:
 *   import { trackActions } from '@/lib/trackActions';
 *   trackActions.toggleLike(track);
 *   trackActions.play(track, queue);
 */
import type { Track, Album } from '@/types/music';
import { useToastStore }      from '@/store/useToastStore';
import { useLikedStore }      from '@/store/likedStore';
import { usePlayerStore }     from '@/store/playerStore';
import { useUserLibraryStore } from '@/store/useUserLibraryStore';
import type { QueueSource }   from '@/store/playerStore';
import type { ToastIcon }     from '@/store/useToastStore';

// ── Internal helper ───────────────────────────────────────────────────────────

function toast(message: string, icon?: ToastIcon) {
  useToastStore.getState().show(message, icon);
}

// ── Actions ───────────────────────────────────────────────────────────────────

export const trackActions = {
  /**
   * Toggle like on a track. Shows a toast. Returns new liked state.
   */
  toggleLike: (track: Track): boolean => {
    const nowLiked: boolean = useLikedStore.getState().toggleLike(track);
    toast(nowLiked ? 'Added to Liked Songs' : 'Removed from Liked Songs', 'heart');
    return nowLiked;
  },

  /**
   * Play a single track with an optional surrounding queue and source label.
   */
  play: (track: Track, queue?: Track[], source?: QueueSource): void => {
    usePlayerStore.getState().playTrack(track, queue ?? [track], source);
  },

  /**
   * Play an album from a given start index.
   */
  playAlbum: (tracks: Track[], startIndex = 0, source: QueueSource = 'album'): void => {
    usePlayerStore.getState().playAlbum(tracks, startIndex, source);
  },

  /**
   * Add or remove an album from the user's personal library. Shows a toast.
   */
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

  /**
   * Add or remove a single track from the user's library. Shows a toast.
   * Requires the parent album to determine correct track ordering.
   */
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
