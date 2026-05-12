import { create } from 'zustand';
import type { Album, Track, Artist } from '@/types/music';
import { fetchLibrary } from '@/utils/library';

interface LibraryState {
  albums: Album[];
  tracks: Track[];
  artists: Artist[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  getAlbumById: (id: string) => Album | undefined;
  getArtistById: (id: string) => Artist | undefined;
  getTrackById: (id: string) => Track | undefined;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  albums: [],
  tracks: [],
  artists: [],
  loading: false,
  error: null,
  loaded: false,

  load: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: null });
    try {
      const data = await fetchLibrary();
      set({ ...data, loading: false, loaded: true });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  getAlbumById: (id) => get().albums.find((a) => a.id === id),
  getArtistById: (id) => get().artists.find((a) => a.id === id),
  getTrackById: (id) => get().tracks.find((t) => t.id === id),
}));
