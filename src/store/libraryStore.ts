import { create } from 'zustand';
import type { Album, Artist, Track } from '@/types/music';
import { buildArtistIndex, fetchAlbumTracks, fetchLibrary } from '@/services/musicApi';

interface LibraryState {
  albums: Album[];
  tracks: Track[];
  artists: Artist[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  loadAlbumTracks: (albumId: string) => Promise<Track[]>;
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
      const albums = await fetchLibrary();
      const artists = buildArtistIndex(albums);

      set({ albums, artists, tracks: [], loading: false, loaded: true });
    } catch (error) {
      set({ loading: false, error: (error as Error).message || 'Unable to load music library' });
    }
  },

  loadAlbumTracks: async (albumId: string) => {
    const album = get().albums.find((item) => item.id === albumId);

    if (!album) {
      return [];
    }

    if (album.tracks.length > 0) {
      return album.tracks;
    }

    const tracks = await fetchAlbumTracks(album);

    set((state) => ({
      albums: state.albums.map((item) => (
        item.id === albumId
          ? { ...item, tracks, trackCount: tracks.length }
          : item
      )),
      tracks: [...state.tracks.filter((track) => track.albumId !== albumId), ...tracks],
    }));

    return tracks;
  },

  getAlbumById: (id) => get().albums.find((album) => album.id === id),
  getArtistById: (id) => get().artists.find((artist) => artist.id === id),
  getTrackById: (id) => get().tracks.find((track) => track.id === id),
}));
