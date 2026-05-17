/**
 * src/store/libraryStore.ts
 *
 * Central music library state.
 *
 * KEY ARCHITECTURE CHANGE — Canonical Metadata Indexes:
 *   trackMap:  Map<string, Track>   — O(1) ID → Track lookup
 *   albumMap:  Map<string, Album>   — O(1) ID → Album lookup
 *   artistMap: Map<string, Artist>  — O(1) ID → Artist lookup
 *
 *   These replace repeated .find() calls across the app and are kept
 *   in sync with every state update.
 *
 * Track IDs are deterministic: `${albumId}--${trackNumber}` — e.g.
 *   "dear-comrade-ost--3". They are stable across reloads and safe
 *   to store in Supabase (liked_songs.track_id).
 *
 * CONCURRENT LOAD FIX:
 *   loadAlbumTracks() uses the functional set((state) => ...) form.
 *   This prevents the stale-closure race condition where parallel calls
 *   via Promise.all would overwrite each other's track data.
 */
import { create } from 'zustand';
import type { Album, Track, Artist } from '@/types/music';
import { fetchLibrary, fetchAlbumTracks, buildArtistIndex } from '@/utils/library';

// ── Map builders ──────────────────────────────────────────────────────────────

function buildTrackMap(tracks: Track[]): Map<string, Track> {
  return new Map(tracks.map((t) => [t.id, t]));
}
function buildAlbumMap(albums: Album[]): Map<string, Album> {
  return new Map(albums.map((a) => [a.id, a]));
}
function buildArtistMap(artists: Artist[]): Map<string, Artist> {
  return new Map(artists.map((a) => [a.id, a]));
}

// ── State ─────────────────────────────────────────────────────────────────────

interface LibraryState {
  // Source arrays (for components that need to iterate)
  albums:  Album[];
  tracks:  Track[];
  artists: Artist[];

  // Canonical indexes — O(1) lookup by ID
  trackMap:  Map<string, Track>;
  albumMap:  Map<string, Album>;
  artistMap: Map<string, Artist>;

  loading: boolean;
  error:   string | null;
  loaded:  boolean;

  load:            () => Promise<void>;
  loadAlbumTracks: (albumId: string) => Promise<Track[]>;

  // O(1) lookup API — use these instead of .find()
  getTrackById:  (id: string) => Track | undefined;
  getAlbumById:  (id: string) => Album | undefined;
  getArtistById: (id: string) => Artist | undefined;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  albums:    [],
  tracks:    [],
  artists:   [],
  trackMap:  new Map(),
  albumMap:  new Map(),
  artistMap: new Map(),
  loading:   false,
  error:     null,
  loaded:    false,

  // ── Initial load: fetches album stubs (tracks:[]) ─────────────────────────
  load: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: null });
    try {
      const data = await fetchLibrary();
      const artists = buildArtistIndex(data.albums);
      set({
        albums:    data.albums,
        tracks:    data.tracks,   // [] on first load — populated by loadAlbumTracks
        artists,
        trackMap:  buildTrackMap(data.tracks),
        albumMap:  buildAlbumMap(data.albums),
        artistMap: buildArtistMap(artists),
        loading:   false,
        loaded:    true,
      });
    } catch {
      set({ loading: false, error: 'Unable to load music library' });
    }
  },

  // ── Lazy-load a single album's track list ─────────────────────────────────
  //
  // CRITICAL: uses functional set((state) => ...) form.
  //
  // Without this, concurrent loadAlbumTracks() calls via Promise.all each
  // capture the same stale `albums` snapshot before any fetch completes.
  // Each then rebuilds the world from that empty snapshot, and the LAST
  // call to finish overwrites the store with only its own album's tracks.
  //
  // The functional form passes the LIVE current state to the updater at the
  // moment set() executes. Since JS is single-threaded, by the time call N's
  // updater runs, all previously-resolved calls have already applied their
  // patches. Every call accumulates correctly — all albums' tracks survive.
  loadAlbumTracks: async (albumId: string) => {
    const album = get().albums.find((a) => a.id === albumId);
    if (!album) return [];
    if (album.tracks.length > 0) {
      console.log(`[Library] "${albumId}" already loaded (${album.tracks.length} tracks)`);
      return album.tracks;
    }

    try {
      const tracks = await fetchAlbumTracks(album);

      set((state) => {
        const updatedAlbums = state.albums.map((a) =>
          a.id === albumId ? { ...a, tracks, trackCount: tracks.length } : a
        );
        const allTracks    = updatedAlbums.flatMap((a) => a.tracks);
        const updatedArtists = buildArtistIndex(updatedAlbums);

        return {
          albums:    updatedAlbums,
          tracks:    allTracks,
          artists:   updatedArtists,
          trackMap:  buildTrackMap(allTracks),
          albumMap:  buildAlbumMap(updatedAlbums),
          artistMap: buildArtistMap(updatedArtists),
        };
      });

      console.log(`[Library] "${albumId}" loaded: ${tracks.length} tracks | pool: ${get().tracks.length}`);
      return tracks;
    } catch (err) {
      console.error(`[Library] Failed to load "${albumId}":`, (err as Error).message);
      return [];
    }
  },

  // ── O(1) lookup API ───────────────────────────────────────────────────────
  getTrackById:  (id) => get().trackMap.get(id),
  getAlbumById:  (id) => get().albumMap.get(id),
  getArtistById: (id) => get().artistMap.get(id),
}));
