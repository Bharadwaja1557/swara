import { create } from 'zustand';
import type { Album, Track, Artist } from '@/types/music';
import { fetchLibrary, fetchAlbumTracks, buildArtistIndex } from '@/utils/library';

interface LibraryState {
  albums:  Album[];
  tracks:  Track[];
  artists: Artist[];
  loading: boolean;
  error:   string | null;
  loaded:  boolean;

  load:           () => Promise<void>;
  loadAlbumTracks: (albumId: string) => Promise<Track[]>;
  getAlbumById:   (id: string) => Album | undefined;
  getArtistById:  (id: string) => Artist | undefined;
  getTrackById:   (id: string) => Track | undefined;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  albums:  [],
  tracks:  [],
  artists: [],
  loading: false,
  error:   null,
  loaded:  false,

  // ── Initial load: album stubs only, no individual track lists ─────────────
  load: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: null });
    try {
      const data = await fetchLibrary();
      set({
        albums:  data.albums,
        tracks:  data.tracks,
        artists: data.artists,
        loading: false,
        loaded:  true,
      });
    } catch {
      set({ loading: false, error: 'Unable to load music library' });
    }
  },

  // ── Lazy-load a single album's track list ─────────────────────────────────
  //
  // CRITICAL FIX — functional set() form:
  //
  // The original code captured `albums` BEFORE the `await fetchAlbumTracks()`
  // call. When many albums load concurrently (Promise.all in AppLayout), every
  // call holds the same stale empty snapshot. After each fetch resolves, it
  // patches only its own album into that stale array and calls set(). The LAST
  // call to complete overwrites `tracks` with only its album's tracks — all
  // other albums' tracks are discarded from the store.
  //
  // Using set((state) => ...) passes the CURRENT live state to the updater at
  // the moment set() executes (synchronous in Zustand). Concurrent calls now
  // each read the freshest state — accumulated tracks from every call that
  // already finished — and add their own on top. All albums' tracks survive.
  loadAlbumTracks: async (albumId: string) => {
    // Read once here to get the album metadata needed for fetchAlbumTracks.
    const album = get().albums.find((a) => a.id === albumId);
    if (!album) return [];
    if (album.tracks.length > 0) {
      console.log(`[Library] "${albumId}" already loaded (${album.tracks.length} tracks)`);
      return album.tracks;
    }

    try {
      const tracks = await fetchAlbumTracks(album);

      // Functional form: `state` is the LIVE store at call time, not a stale
      // closure. This is the fix for concurrent loadAlbumTracks overwriting
      // each other when called with Promise.all.
      set((state) => {
        const updatedAlbums = state.albums.map((a) =>
          a.id === albumId ? { ...a, tracks, trackCount: tracks.length } : a
        );
        const allTracks    = updatedAlbums.flatMap((a) => a.tracks);
        const updatedArtists = buildArtistIndex(updatedAlbums);
        return { albums: updatedAlbums, tracks: allTracks, artists: updatedArtists };
      });

      console.log(`[Library] "${albumId}" loaded: ${tracks.length} tracks | pool now: ${get().tracks.length}`);
      return tracks;
    } catch (err) {
      console.error(`[Library] Failed to load "${albumId}":`, (err as Error).message);
      return [];
    }
  },

  getAlbumById:  (id) => get().albums.find((a) => a.id === id),
  getArtistById: (id) => get().artists.find((a) => a.id === id),
  getTrackById:  (id) => get().tracks.find((t) => t.id === id),
}));
