import { create } from 'zustand';
import type { Album, Track, Artist } from '@/types/music';
import { fetchLibrary, fetchAlbumTracks, buildArtistIndex } from '@/utils/library';

interface LibraryState {
  albums: Album[];
  tracks: Track[];
  artists: Artist[];
  loading: boolean;
  error: string | null;
  loaded: boolean;

  // Actions
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

  // ── Initial library load (album stubs only, no tracks) ────────────────────
  load: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: null });
    try {
      const data = await fetchLibrary();
      set({
        albums: data.albums,
        tracks: data.tracks,
        artists: data.artists,
        loading: false,
        loaded: true,
      });
    } catch (err) {
      set({ loading: false, error: 'Unable to load music library' });
    }
  },

  // ── Lazy-load an album's tracks on demand ────────────────────────────────
  loadAlbumTracks: async (albumId: string) => {
    const { albums } = get();
    const album = albums.find((a) => a.id === albumId);

    // Already loaded
    if (album && album.tracks.length > 0) return album.tracks;
    if (!album) return [];

    try {
      const tracks = await fetchAlbumTracks(album);

      // Patch the album in place with its loaded tracks
      const updatedAlbums = albums.map((a) =>
        a.id === albumId
          ? { ...a, tracks, trackCount: tracks.length }
          : a
      );

      // Rebuild the global flat track list and artists
      const allTracks = updatedAlbums.flatMap((a) => a.tracks);
      const updatedArtists = buildArtistIndex(updatedAlbums);

      set({ albums: updatedAlbums, tracks: allTracks, artists: updatedArtists });
      return tracks;
    } catch (err) {
      // Graceful skip — don't crash the app
      console.error(`[Swara] ${(err as Error).message}`);
      return [];
    }
  },

  getAlbumById: (id) => get().albums.find((a) => a.id === id),
  getArtistById: (id) => get().artists.find((a) => a.id === id),
  getTrackById: (id) => get().tracks.find((t) => t.id === id),
}));
