'use client';

import { create } from 'zustand';
import type { Album, AlbumDetail, LibraryState, LibraryActions, Track } from '@/types';
import { fetchAlbums, fetchAlbumDetail } from '@/lib/fetchLibrary';
import { MAX_RECENTLY_PLAYED, STORAGE_KEYS } from '@/lib/constants';
import { storage } from '@/lib/storage';

type FullLibraryStore = LibraryState & LibraryActions;

export const useLibraryStore = create<FullLibraryStore>((set, get) => ({
  // ─── State ────────────────────────────────────────────────────────────────
  albums: [],
  albumDetails: {},
  isLoadingAlbums: false,
  isLoadingDetail: {},
  error: null,
  likedTrackIds: new Set<string>(),
  recentlyPlayed: [],
  searchQuery: '',

  // ─── Bootstrap ────────────────────────────────────────────────────────────

  fetchAlbums: async () => {
    if (get().isLoadingAlbums) return;
    set({ isLoadingAlbums: true, error: null });
    try {
      const albums = await fetchAlbums();
      // Hydrate persisted data on first load
      const likedRaw = storage.get<string[]>(STORAGE_KEYS.LIKED_TRACKS, []);
      const recentRaw = storage.get<Track[]>(STORAGE_KEYS.RECENTLY_PLAYED, []);
      set({
        albums,
        isLoadingAlbums: false,
        likedTrackIds: new Set(likedRaw),
        recentlyPlayed: recentRaw,
      });
    } catch (err) {
      set({
        isLoadingAlbums: false,
        error: err instanceof Error ? err.message : 'Failed to load library',
      });
    }
  },

  fetchAlbumDetail: async (albumId: string): Promise<AlbumDetail> => {
    const { albumDetails, albums } = get();

    // Return cached
    if (albumDetails[albumId]) return albumDetails[albumId];

    const album = albums.find((a) => a.id === albumId);
    if (!album) throw new Error(`Album not found: ${albumId}`);

    set((s) => ({
      isLoadingDetail: { ...s.isLoadingDetail, [albumId]: true },
    }));

    try {
      const detail = await fetchAlbumDetail(album);
      set((s) => ({
        albumDetails: { ...s.albumDetails, [albumId]: detail },
        isLoadingDetail: { ...s.isLoadingDetail, [albumId]: false },
      }));
      return detail;
    } catch (err) {
      set((s) => ({
        isLoadingDetail: { ...s.isLoadingDetail, [albumId]: false },
      }));
      throw err;
    }
  },

  // ─── Liked Songs ──────────────────────────────────────────────────────────

  toggleLike: (trackId: string) => {
    const { likedTrackIds } = get();
    const next = new Set(likedTrackIds);
    if (next.has(trackId)) {
      next.delete(trackId);
    } else {
      next.add(trackId);
    }
    storage.set(STORAGE_KEYS.LIKED_TRACKS, Array.from(next));
    set({ likedTrackIds: next });
  },

  isLiked: (trackId: string): boolean => {
    return get().likedTrackIds.has(trackId);
  },

  // ─── Recently Played ──────────────────────────────────────────────────────

  addRecentlyPlayed: (track: Track) => {
    const { recentlyPlayed } = get();
    const filtered = recentlyPlayed.filter((t) => t.id !== track.id);
    const updated = [track, ...filtered].slice(0, MAX_RECENTLY_PLAYED);
    storage.set(STORAGE_KEYS.RECENTLY_PLAYED, updated);
    set({ recentlyPlayed: updated });
  },

  // ─── Search ──────────────────────────────────────────────────────────────

  setSearchQuery: (q: string) => set({ searchQuery: q }),
}));
