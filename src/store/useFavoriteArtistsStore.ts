/**
 * src/store/useFavoriteArtistsStore.ts
 *
 * Explicitly-followed artists.
 *
 * DESIGN DECISION:
 *   Previously, artists appeared in "My Library" automatically whenever an
 *   album from that artist was added. This created a poor UX — the Artists
 *   section was polluted with composers the user never consciously followed.
 *
 *   New behavior:
 *   • Artists tab in Library = ONLY explicitly favorited artists.
 *   • Users follow/unfollow from the ArtistPage header.
 *   • libraryRenderables.ts reads this store instead of deriving from album entries.
 *
 * SYNC ARCHITECTURE (added in refinement pass 3):
 *   Matches the pattern used by likedStore, playlistStore, and folderStore:
 *   1. localStorage seeds the UI instantly on app start (no flash)
 *   2. syncFromCloud() replaces local state with Supabase-authoritative data
 *   3. All mutations (follow/unfollow) are optimistic: local state updates
 *      immediately, cloud write fires-and-forgets
 *   4. reset() on logout clears Zustand + localStorage
 *
 *   AppLayout calls syncFromCloud() in the startup sequence (Step 5 group),
 *   in parallel with liked songs, user library, and playlists.
 *
 *   Before this change: followed artists were localStorage-only — following
 *   an artist on one device would NOT appear on other devices, and clearing
 *   the browser would silently lose all follows.
 *
 * PERSISTENCE: localStorage (instant seed) + Supabase (authoritative sync).
 *
 * DATA MODEL:
 *   FavoriteArtist { artistId: string; followedAt: string }  (ISO timestamp)
 */
import { create } from 'zustand';

const CACHE_KEY = 'swara:favorite_artists_v1';

export interface FavoriteArtist {
  artistId:   string;
  followedAt: string;  // ISO timestamp — preserved from cloud on sync
}

function readCache(): FavoriteArtist[] {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]'); } catch { return []; }
}
function writeCache(list: FavoriteArtist[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch {}
}

interface FavoriteArtistsState {
  favorites:  FavoriteArtist[];
  isSyncing:  boolean;
  /** True once the first cloud sync has completed successfully. */
  hydrated:   boolean;

  follow:      (artistId: string) => void;
  unfollow:    (artistId: string) => void;
  toggle:      (artistId: string) => boolean;  // returns true if now following
  isFollowing: (artistId: string) => boolean;

  /**
   * Replace local state with Supabase-authoritative followed-artist list.
   * Called by AppLayout after auth + library are confirmed ready, in parallel
   * with liked songs, user library, and playlists syncs.
   */
  syncFromCloud: () => Promise<void>;

  /**
   * Clear all user-specific state on logout.
   * Clears both Zustand state and the localStorage cache.
   * Called by useAuthStore.clearUserState() before Supabase signOut().
   */
  reset: () => void;
}

export const useFavoriteArtistsStore = create<FavoriteArtistsState>((set, get) => ({
  favorites: readCache(),  // seeds UI instantly — replaced by syncFromCloud()
  isSyncing: false,
  hydrated:  false,

  follow: (artistId) => {
    if (get().isFollowing(artistId)) return;
    const updated: FavoriteArtist[] = [
      ...get().favorites,
      { artistId, followedAt: new Date().toISOString() },
    ];
    writeCache(updated);
    set({ favorites: updated });
    // Optimistic local update done — fire-and-forget cloud write
    import('@/repositories/favoriteArtists/FavoriteArtistsRepository')
      .then(({ FavoriteArtistsRepository }) => FavoriteArtistsRepository.followArtist(artistId))
      .catch((e) => console.warn('[FavoriteArtists] follow cloud write failed', e));
  },

  unfollow: (artistId) => {
    const updated = get().favorites.filter((f) => f.artistId !== artistId);
    writeCache(updated);
    set({ favorites: updated });
    // Optimistic local update done — fire-and-forget cloud write
    import('@/repositories/favoriteArtists/FavoriteArtistsRepository')
      .then(({ FavoriteArtistsRepository }) => FavoriteArtistsRepository.unfollowArtist(artistId))
      .catch((e) => console.warn('[FavoriteArtists] unfollow cloud write failed', e));
  },

  toggle: (artistId) => {
    if (get().isFollowing(artistId)) {
      get().unfollow(artistId);
      return false;
    } else {
      get().follow(artistId);
      return true;
    }
  },

  isFollowing: (artistId) =>
    get().favorites.some((f) => f.artistId === artistId),

  syncFromCloud: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    console.log('[FavoriteArtists] ─────────────────────────────────────────');
    console.log('[FavoriteArtists] syncFromCloud started');

    try {
      const { FavoriteArtistsRepository } = await import(
        '@/repositories/favoriteArtists/FavoriteArtistsRepository'
      );
      const cloudEntries = await FavoriteArtistsRepository.getFollowedArtists();
      console.log(`[FavoriteArtists] cloud entries fetched: ${cloudEntries.length}`);

      if (cloudEntries.length === 0) {
        writeCache([]);
        set({ favorites: [], hydrated: true });
        console.log('[FavoriteArtists] cloud empty — local cleared, hydration done');
        return;
      }

      // Cloud is authoritative — replace local state entirely.
      // This handles follows AND unfollows from other devices.
      const favorites: FavoriteArtist[] = cloudEntries.map((e) => ({
        artistId:   e.artistId,
        followedAt: e.followedAt,
      }));

      writeCache(favorites);
      set({ favorites, hydrated: true });
      console.log(`[FavoriteArtists] hydration complete — ${favorites.length} artists ✓`);
    } catch (err) {
      console.error('[FavoriteArtists] syncFromCloud error:', err);
      set({ hydrated: true }); // unblock UI even on failure
    } finally {
      set({ isSyncing: false });
    }
  },

  reset: () => {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
    set({ favorites: [], isSyncing: false, hydrated: false });
    console.log('[FavoriteArtists] reset on logout ✓');
  },
}));
