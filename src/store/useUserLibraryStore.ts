/**
 * useUserLibraryStore — the user's personal music library.
 *
 * Stores only IDs — never duplicates Track/Album objects from the catalog.
 * Resolved against canonical Maps (albumMap, trackMap) at render time.
 *
 * Architecture is intentionally extensible: follow LikedSongsRepository
 * pattern to add Supabase sync later without touching this store interface.
 *
 * INVARIANT: trackIds within each entry are always ordered by the original
 * album track order (enforced in addTrack via allAlbumTrackIds sort key).
 */
import { create } from 'zustand';

const KEY = 'swara_user_library_v1';

export interface UserLibraryEntry {
  albumId:  string;
  trackIds: string[];  // ordered subset of album tracks
  addedAt:  number;    // ms timestamp — used for "Recently Added" sort
}

interface UserLibraryState {
  entries: UserLibraryEntry[];

  /**
   * Add a single track to the library.
   * Creates an album entry if absent; merges if present.
   * allAlbumTrackIds is the full ordered track list from the catalog album —
   * used to restore original sort order after insertion.
   */
  addTrack(albumId: string, trackId: string, allAlbumTrackIds: string[]): void;

  /** Remove one track. Removes the album entry if no tracks remain. */
  removeTrack(albumId: string, trackId: string): void;

  /** Add the entire album (all tracks, in original order). */
  addAlbum(albumId: string, allTrackIds: string[]): void;

  /** Remove the entire album entry. */
  removeAlbum(albumId: string): void;

  hasAlbum(albumId: string): boolean;
  hasTrack(albumId: string, trackId: string): boolean;
  getEntry(albumId: string): UserLibraryEntry | undefined;
}

function read(): UserLibraryEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}
function write(entries: UserLibraryEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch {}
}

export const useUserLibraryStore = create<UserLibraryState>((set, get) => ({
  entries: read(),

  addTrack: (albumId, trackId, allAlbumTrackIds) => {
    const entries = [...get().entries];
    const idx = entries.findIndex((e) => e.albumId === albumId);

    if (idx === -1) {
      entries.unshift({ albumId, trackIds: [trackId], addedAt: Date.now() });
    } else {
      const entry = { ...entries[idx] };
      if (entry.trackIds.includes(trackId)) return; // idempotent
      const merged = [...entry.trackIds, trackId];
      // Restore original album track order
      merged.sort((a, b) => allAlbumTrackIds.indexOf(a) - allAlbumTrackIds.indexOf(b));
      entry.trackIds = merged;
      entries[idx] = entry;
    }

    write(entries);
    set({ entries });
  },

  removeTrack: (albumId, trackId) => {
    const entries = get().entries
      .map((e) =>
        e.albumId !== albumId ? e : { ...e, trackIds: e.trackIds.filter((id) => id !== trackId) }
      )
      .filter((e) => e.trackIds.length > 0); // prune empty album entries
    write(entries);
    set({ entries });
  },

  addAlbum: (albumId, allTrackIds) => {
    const entries = [...get().entries];
    const idx = entries.findIndex((e) => e.albumId === albumId);
    if (idx === -1) {
      entries.unshift({ albumId, trackIds: [...allTrackIds], addedAt: Date.now() });
    } else {
      // Replace with full ordered track list (idempotent, adds any missing tracks)
      entries[idx] = { ...entries[idx], trackIds: [...allTrackIds] };
    }
    write(entries);
    set({ entries });
  },

  removeAlbum: (albumId) => {
    const entries = get().entries.filter((e) => e.albumId !== albumId);
    write(entries);
    set({ entries });
  },

  hasAlbum:  (albumId) => get().entries.some((e) => e.albumId === albumId),
  hasTrack:  (albumId, trackId) => !!get().entries.find((e) => e.albumId === albumId)?.trackIds.includes(trackId),
  getEntry:  (albumId) => get().entries.find((e) => e.albumId === albumId),
}));
