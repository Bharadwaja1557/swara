/**
 * src/store/likedStore.ts
 *
 * CLOUD IS SOURCE OF TRUTH.
 * localStorage is a write-through cache for instant UI — never authoritative.
 *
 * Startup contract (enforced by AppLayout):
 *   syncFromCloud() is only called AFTER:
 *     1. auth session is restored (isAuthenticated = true)
 *     2. library stubs loaded (loaded = true)
 *     3. all album tracks loaded (tracks[] is fully populated)
 *
 * toggleLike() is still local-first + async cloud write for instant feedback.
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

  isLiked:        (id: string) => boolean;
  toggleLike:     (track: Track) => boolean;
  getLikedTracks: () => Track[];
  /**
   * Replace local state with cloud state.
   * MUST be called only after library tracks are fully loaded.
   * Caller (AppLayout) is responsible for that precondition.
   */
  syncFromCloud: () => Promise<void>;
}

export const useLikedStore = create<LikedState>((set, get) => ({
  // Initialise from cache so the UI renders instantly before sync completes.
  // This is REPLACED by cloud state once syncFromCloud() runs.
  liked:     readCache(),
  isSyncing: false,

  isLiked: (id) => !!get().liked[id],

  toggleLike: (track) => {
    const liked    = { ...get().liked };
    const wasLiked = !!liked[track.id];
    if (wasLiked) delete liked[track.id];
    else          liked[track.id] = track;
    writeCache(liked);
    set({ liked });

    // Optimistic update complete. Cloud write is fire-and-forget.
    if (wasLiked) LikedSongsRepository.unlikeTrack(track.id).catch(() => {});
    else          LikedSongsRepository.likeTrack(track.id).catch(() => {});

    return !wasLiked;
  },

  getLikedTracks: () => Object.values(get().liked),

  syncFromCloud: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    console.log('[Liked] ── sync started ──────────────────────────');

    try {
      // ── Step 1: fetch canonical IDs from Supabase ──────────────────────
      const cloudIds = await LikedSongsRepository.getLikedSongIds();
      console.log(`[Liked] Cloud IDs fetched: ${cloudIds.length}`, cloudIds);

      if (cloudIds.length === 0) {
        // Cloud has nothing → local cache must be empty too
        writeCache({});
        set({ liked: {} });
        console.log('[Liked] Cloud empty — local cleared');
        return;
      }

      // ── Step 2: resolve IDs → Track objects ────────────────────────────
      // Library MUST be loaded before this point (AppLayout guarantees it).
      // We use dynamic import to avoid a circular module dependency
      // (likedStore ↔ libraryStore would be circular if static).
      const { useLibraryStore } = await import('@/store/libraryStore');
      const { tracks: allTracks } = useLibraryStore.getState();

      console.log(`[Liked] Resolving against ${allTracks.length} library tracks`);

      const resolved: Record<string, Track> = {};
      const missing: string[] = [];

      for (const id of cloudIds) {
        const track = allTracks.find((t) => t.id === id);
        if (track) {
          resolved[id] = track;
        } else {
          missing.push(id);
        }
      }

      console.log(`[Liked] Resolved: ${Object.keys(resolved).length} ✓`);
      if (missing.length > 0) {
        console.warn(`[Liked] Unresolved (not in library): ${missing.length}`, missing);
      }

      // ── Step 3: REPLACE local state with cloud state ───────────────────
      // Cloud is authoritative. This handles:
      //   - likes added on another device  (new entries appear)
      //   - unlikes done on another device (stale entries removed)
      // Previous "merge only missing" logic was wrong: stale local entries
      // would survive forever and unlikes from other devices were ignored.
      writeCache(resolved);
      set({ liked: resolved });

      console.log('[Liked] ── hydration complete ──', Object.keys(resolved));
    } catch (err) {
      console.error('[Liked] syncFromCloud error:', err);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
