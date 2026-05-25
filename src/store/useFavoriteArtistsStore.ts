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
 * PERSISTENCE: localStorage (local-first, Supabase-ready).
 *
 * DATA MODEL:
 *   FavoriteArtist { artistId: string; followedAt: string }
 */
import { create } from 'zustand';

const CACHE_KEY = 'swara:favorite_artists_v1';

export interface FavoriteArtist {
  artistId:   string;
  followedAt: string;  // ISO timestamp
}

function readCache(): FavoriteArtist[] {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]'); } catch { return []; }
}
function writeCache(list: FavoriteArtist[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch {}
}

interface FavoriteArtistsState {
  favorites: FavoriteArtist[];

  follow:      (artistId: string) => void;
  unfollow:    (artistId: string) => void;
  toggle:      (artistId: string) => boolean;  // returns true if now following
  isFollowing: (artistId: string) => boolean;

  reset: () => void;
}

export const useFavoriteArtistsStore = create<FavoriteArtistsState>((set, get) => ({
  favorites: readCache(),

  follow: (artistId) => {
    if (get().isFollowing(artistId)) return;
    const updated = [
      ...get().favorites,
      { artistId, followedAt: new Date().toISOString() },
    ];
    writeCache(updated);
    set({ favorites: updated });
  },

  unfollow: (artistId) => {
    const updated = get().favorites.filter((f) => f.artistId !== artistId);
    writeCache(updated);
    set({ favorites: updated });
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

  reset: () => {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
    set({ favorites: [] });
  },
}));
