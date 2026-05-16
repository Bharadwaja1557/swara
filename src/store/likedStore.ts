/**
 * src/store/likedStore.ts
 *
 * CLOUD IS SOURCE OF TRUTH.
 * localStorage is a write-through cache used only for instant UI on load.
 * syncFromCloud() REPLACES local state — never merges, never lets stale
 * cache survive.
 *
 * Contract (enforced by AppLayout startup sequencer):
 *   syncFromCloud() is called ONLY after:
 *     1. auth session confirmed
 *     2. library.load() complete
 *     3. ALL album tracks loaded via loadAlbumTracks()
 *
 * toggleLike() remains optimistic-local + async cloud write.
 * It does NOT run during syncFromCloud() (startup is single-threaded).
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
  liked:      Record<string, Track>;
  isSyncing:  boolean;
  hydrated:   boolean;   // true once first cloud sync completes

  isLiked:        (id: string) => boolean;
  toggleLike:     (track: Track) => boolean;
  getLikedTracks: () => Track[];
  syncFromCloud:  () => Promise<void>;
}

export const useLikedStore = create<LikedState>((set, get) => ({
  // Cache seeds the UI instantly before cloud sync — REPLACED by syncFromCloud.
  liked:     readCache(),
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

    // Cloud write is fire-and-forget — local update already applied.
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
      // ── 1. Fetch canonical IDs from Supabase ───────────────────────────
      const cloudIds = await LikedSongsRepository.getLikedSongIds();
      console.log(`[Liked] cloud IDs fetched: ${cloudIds.length}`);
      console.log('[Liked] cloud IDs:', cloudIds);

      if (cloudIds.length === 0) {
        writeCache({});
        set({ liked: {}, hydrated: true });
        console.log('[Liked] cloud empty — local cleared, hydration done');
        return;
      }

      // ── 2. Resolve IDs → Track objects ────────────────────────────────
      // Dynamic import breaks the potential circular dep chain:
      // likedStore → (dynamic) → libraryStore (no cycle at module level)
      const { useLibraryStore } = await import('@/store/libraryStore');
      const allTracks = useLibraryStore.getState().tracks;

      console.log(`[Liked] library track pool available: ${allTracks.length} tracks`);

      if (allTracks.length === 0) {
        // This should never happen if AppLayout sequencing is correct.
        // Log clearly so it's obvious if sequencing breaks again.
        console.error('[Liked] TRACK POOL IS EMPTY — sync called before library loaded!');
        console.error('[Liked] Check AppLayout startup sequence. Aborting sync.');
        return;
      }

      const resolved: Record<string, Track> = {};
      const unresolved: string[] = [];

      for (const id of cloudIds) {
        const track = allTracks.find((t) => t.id === id);
        if (track) {
          resolved[id] = track;
        } else {
          unresolved.push(id);
        }
      }

      console.log(`[Liked] resolved:   ${Object.keys(resolved).length} tracks ✓`);
      console.log(`[Liked] unresolved: ${unresolved.length} IDs (not in library)`);
      if (unresolved.length > 0) {
        console.warn('[Liked] unresolved IDs:', unresolved);
      }

      // ── 3. REPLACE local state with cloud state ────────────────────────
      // This is not a merge — cloud is authoritative.
      // Handles both: likes added on another device (appear here)
      // and unlikes done on another device (disappear here).
      writeCache(resolved);
      set({ liked: resolved, hydrated: true });

      console.log(`[Liked] Zustand liked count after hydration: ${Object.keys(resolved).length}`);
      console.log('[Liked] hydration complete');
      console.log('[Liked] ─────────────────────────────────────────────');
    } catch (err) {
      console.error('[Liked] syncFromCloud error:', err);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
