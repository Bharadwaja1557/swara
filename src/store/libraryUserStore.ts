/**
 * libraryUserStore — user's personal library (saved albums + tracks)
 * Albums are stored with only the tracks the user has added,
 * but always in original track order.
 */
import { create } from 'zustand';
import type { Album, Track } from '@/types/music';

const KEY = 'swara_user_library';

interface LibraryEntry {
  album: Omit<Album, 'tracks'>;
  trackIds: string[]; // original-order track ids added by user
}

function load(): Record<string, LibraryEntry> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}
function save(data: Record<string, LibraryEntry>) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

interface LibraryUserState {
  entries: Record<string, LibraryEntry>;
  isInLibrary: (albumId: string) => boolean;
  hasTrack: (trackId: string) => boolean;
  addTrack: (track: Track, album: Album) => void;
  removeTrack: (track: Track) => void;
  removeAlbum: (albumId: string) => void;
  getAlbums: () => Album[]; // reconstructed with real track objects (needs tracks injected)
}

export const useLibraryUserStore = create<LibraryUserState>((set, get) => ({
  entries: load(),

  isInLibrary: (albumId) => !!get().entries[albumId],

  hasTrack: (trackId) =>
    Object.values(get().entries).some((e) => e.trackIds.includes(trackId)),

  addTrack: (track, album) => {
    const entries = { ...get().entries };
    const existing = entries[album.id];
    if (existing) {
      if (!existing.trackIds.includes(track.id)) {
        // Insert in original order
        const originalOrder = album.tracks.map((t) => t.id);
        const merged = [...existing.trackIds, track.id];
        entries[album.id] = {
          ...existing,
          trackIds: originalOrder.filter((id) => merged.includes(id)),
        };
      }
    } else {
      entries[album.id] = {
        album: { id: album.id, title: album.title, composer: album.composer, year: album.year, coverUrl: album.coverUrl, trackCount: album.trackCount, tracksFile: album.tracksFile },
        trackIds: [track.id],
      };
    }
    save(entries);
    set({ entries });
  },

  removeTrack: (track) => {
    const entries = { ...get().entries };
    const entry = entries[track.albumId];
    if (!entry) return;
    const newIds = entry.trackIds.filter((id) => id !== track.id);
    if (newIds.length === 0) {
      delete entries[track.albumId];
    } else {
      entries[track.albumId] = { ...entry, trackIds: newIds };
    }
    save(entries);
    set({ entries });
  },

  removeAlbum: (albumId) => {
    const entries = { ...get().entries };
    delete entries[albumId];
    save(entries);
    set({ entries });
  },

  getAlbums: () => {
    // Returns album stubs — caller must hydrate tracks from libraryStore
    return Object.values(get().entries).map((e) => ({
      ...e.album,
      tracks: [],
    }));
  },
}));
