/**
 * src/store/likedStore.ts
 *
 * CLOUD IS SOURCE OF TRUTH.
 * localStorage is a write-through cache — seeded on mount for instant UI,
 * then REPLACED by syncFromCloud() which uses Supabase as the authority.
 *
 * PERFORMANCE: syncFromCloud() now uses the canonical trackMap (Map<id, Track>)
 * for O(1) ID resolution instead of allTracks.find() which is O(n) per ID.
 *
 * Startup contract (enforced by AppLayout):
 *   syncFromCloud() is called ONLY after:
 *     1. auth session confirmed
 *     2. library.load() complete
 *     3. ALL album tracks loaded (trackMap fully populated)
 */
import { create } from 'zustand';
import type { Track } from '@/types/music';
import { LikedSongsRepository } from '@/repositories/likedSongs/LikedSongsRepository';

const CACHE_KEY = 'swara_liked';

function readCache(): Record<string, Track> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}'); } catch { return {}; }
}
function writeCache(data: Record<string, Track>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

interface LikedState {
  liked:     Record<string, Track>;
  isSyncing: boolean;
  /** True once the first cloud sync has completed successfully. */
  hydrated:  boolean;

  isLiked:        (id: string) => boolean;
  toggleLike:     (track: Track) => boolean;
  getLikedTracks: () => Track[];
  /**
   * Replace local state with cloud state.
   * Caller (AppLayout) guarantees library is fully loaded before this runs.
   */
  syncFromCloud: () => Promise<void>;
}

export const useLikedStore = create<LikedState>((set, get) => ({
  liked:     readCache(),  // seeds UI instantly — REPLACED by syncFromCloud
  isSyncing: false,
  hydrated:  false,

  isLiked: (id) => !!get().liked[id],

  toggleLike: (track) => {
    const liked    = { ...get().liked };
    const wasLiked = !!liked[track.id];
    if (wasLiked) delete liked[track.id];
    else          liked[track.id] = track;
    writeCache(liked);
    set({ liked });
    // Optimistic local update complete — cloud write is fire-and-forget
    if (wasLiked) LikedSongsRepository.unlikeTrack(track.id).catch(() => {});
    else          LikedSongsRepository.likeTrack(track.id).catch(() => {});
    return !wasLiked;
  },

  getLikedTracks: () => Object.values(get().liked),

  syncFromCloud: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    console.log('[Liked] ─────────────────────────────────────────────');
    console.log('[Liked] sync started');

    try {
      // ── 1. Fetch canonical liked IDs from Supabase ─────────────────────
      const cloudIds = await LikedSongsRepository.getLikedSongIds();
      console.log(`[Liked] cloud IDs fetched: ${cloudIds.length}`);
      console.log('[Liked] cloud IDs:', cloudIds);

      if (cloudIds.length === 0) {
        writeCache({});
        set({ liked: {}, hydrated: true });
        console.log('[Liked] cloud empty — local cleared, hydration done');
        return;
      }

      // ── 2. Resolve IDs → Track objects via canonical O(1) trackMap ──────
      // Dynamic import keeps likedStore ↔ libraryStore cycle at module level
      // broken (only resolved at runtime when this function executes).
      const { useLibraryStore } = await import('@/store/libraryStore');
      const { trackMap } = useLibraryStore.getState();

      console.log(`[Liked] library trackMap size: ${trackMap.size} tracks`);

      if (trackMap.size === 0) {
        // Should never happen if AppLayout sequencing is correct.
        console.error('[Liked] CRITICAL: trackMap is empty — syncFromCloud called before library loaded!');
        console.error('[Liked] Aborting sync. Check AppLayout startup sequence.');
        return;
      }

      const resolved: Record<string, Track> = {};
      const unresolved: string[] = [];

      for (const id of cloudIds) {
        // O(1) lookup via canonical Map — replaces O(n) allTracks.find()
        const track = trackMap.get(id);
        if (track) {
          resolved[id] = track;
        } else {
          unresolved.push(id);
        }
      }

      console.log(`[Liked] resolved:   ${Object.keys(resolved).length} tracks ✓`);
      console.log(`[Liked] unresolved: ${unresolved.length} IDs (not in library)`);
      if (unresolved.length > 0) {
        console.warn('[Liked] unresolved IDs (track removed from library?):', unresolved);
      }

      // ── 3. REPLACE local state with cloud state ─────────────────────────
      // Cloud is authoritative. This handles likes AND unlikes from other devices.
      // The previous "merge missing only" logic was wrong — stale local entries
      // from unlikes on another device would survive indefinitely.
      writeCache(resolved);
      set({ liked: resolved, hydrated: true });

      console.log(`[Liked] Zustand liked count after hydration: ${Object.keys(resolved).length}`);
      console.log('[Liked] hydration complete ✓');
      console.log('[Liked] ─────────────────────────────────────────────');
    } catch (err) {
      console.error('[Liked] syncFromCloud error:', err);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
