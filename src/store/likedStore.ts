/**
 * src/store/likedStore.ts
 *
 * Local-first liked songs store:
 * - localStorage is the primary source of truth for instant UI
 * - Cloud (Supabase) is the backup / sync layer
 * - All heart interactions update local state first (optimistic), cloud async
 *
 * syncFromCloud(): called after auth restore. Fetches cloud IDs, resolves
 * them to Track objects from the library (loading all albums if needed for
 * a new device), and merges into local state.
 */
import { create } from 'zustand';
import type { Track } from '@/types/music';
import { LikedSongsRepository } from '@/repositories/likedSongs/LikedSongsRepository';

const KEY = 'swara_liked';

function load(): Record<string, Track> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}
function save(data: Record<string, Track>) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

interface LikedState {
  liked:     Record<string, Track>; // trackId → Track (full object for playback)
  isSyncing: boolean;

  isLiked:        (id: string) => boolean;
  toggleLike:     (track: Track) => boolean; // returns new liked state
  getLikedTracks: () => Track[];
  /** Load from cloud and merge into local state. Safe to call multiple times. */
  syncFromCloud:  () => Promise<void>;
}

export const useLikedStore = create<LikedState>((set, get) => ({
  liked:     load(),
  isSyncing: false,

  isLiked: (id) => !!get().liked[id],

  toggleLike: (track) => {
    const liked    = { ...get().liked };
    const wasLiked = !!liked[track.id];
    if (wasLiked) delete liked[track.id];
    else          liked[track.id] = track;
    save(liked);
    set({ liked });

    // Optimistic update done — fire cloud sync in background
    if (wasLiked) LikedSongsRepository.unlikeTrack(track.id).catch(() => {});
    else          LikedSongsRepository.likeTrack(track.id).catch(() => {});

    return !wasLiked;
  },

  getLikedTracks: () => Object.values(get().liked),

  syncFromCloud: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    try {
      const cloudIds = await LikedSongsRepository.getLikedSongIds();
      if (!cloudIds.length) return;

      const current    = get().liked;
      const localIds   = new Set(Object.keys(current));
      const missingIds = cloudIds.filter((id) => !localIds.has(id));
      if (!missingIds.length) return;

      // Dynamic import breaks circular dep: likedStore <-> libraryStore
      const { useLibraryStore } = await import('@/store/libraryStore');
      const libState = useLibraryStore.getState();

      // On a new device, load all albums to resolve liked track IDs
      const unloaded = libState.albums.filter((a) => a.tracks.length === 0);
      if (unloaded.length > 0) {
        await Promise.all(unloaded.map((a) => libState.loadAlbumTracks(a.id)));
      }

      const { tracks: allTracks } = useLibraryStore.getState();
      const resolved: Record<string, Track> = {};
      for (const id of missingIds) {
        const track = allTracks.find((t) => t.id === id);
        if (track) resolved[id] = track;
      }

      if (Object.keys(resolved).length > 0) {
        const updated = { ...current, ...resolved };
        save(updated);
        set({ liked: updated });
      }
    } catch (err) {
      console.error('[likedStore] syncFromCloud:', err);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
