/**
 * useUserLibraryStore — the user's personal music library.
 *
 * CANONICAL USER LIBRARY STORE (v1).
 *
 * Why this store vs the deleted libraryUserStore:
 *   - Stores only IDs, never duplicates Track/Album objects from the catalog.
 *     The old store cached album metadata inside entries, which diverged from
 *     catalog updates and wasted memory with stale snapshots.
 *   - Correct hasTrack(albumId, trackId) signature — two args, scoped to album.
 *     The old store's hasTrack(trackId) scanned all albums — O(n*m) and wrong.
 *   - Has addedAt timestamp for "Recently Added" sort ordering.
 *   - Array-based entries — naturally ordered, simpler to sync, simpler to iterate.
 *   - Version-suffixed localStorage key (swara_user_library_v1) for safe future
 *     migrations. Old key (swara_user_library) is migrated on first read.
 *
 * CLOUD IS SOURCE OF TRUTH (after startup sync).
 * localStorage is a write-through cache — seeded on mount for instant UI,
 * then REPLACED by syncFromCloud() which uses Supabase as the authority.
 *
 * Startup contract (enforced by AppLayout):
 *   syncFromCloud() is called ONLY after:
 *     1. auth session confirmed
 *     2. library.load() complete (albumMap populated)
 *
 * Data model:
 *   One entry per album the user has added anything from.
 *   trackIds is an ordered subset of that album's tracks (original album order).
 *   Adding the full album sets trackIds = all album track IDs.
 */
import { create } from 'zustand';

const CURRENT_KEY = 'swara_user_library_v1';
const LEGACY_KEY  = 'swara_user_library'; // written by deleted libraryUserStore

export interface UserLibraryEntry {
  albumId:  string;
  trackIds: string[];  // ordered subset of album tracks
  addedAt:  number;    // ms timestamp — used for "Recently Added" sort
}

interface UserLibraryState {
  entries:   UserLibraryEntry[];
  isSyncing: boolean;
  /** True once the first cloud sync has completed successfully. */
  hydrated:  boolean;

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

  /**
   * Replace local state with cloud state.
   * Caller (AppLayout) guarantees library is fully loaded before this runs.
   */
  syncFromCloud(): Promise<void>;

  /**
   * Clear all user-specific state on logout.
   * Does NOT clear localStorage — that happens in clearLocalState().
   */
  reset(): void;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function read(): UserLibraryEntry[] {
  // Try current key first
  const current = localStorage.getItem(CURRENT_KEY);
  if (current) {
    try { return JSON.parse(current); } catch { return []; }
  }

  // One-time migration from legacy key (swara_user_library → swara_user_library_v1)
  // The legacy store used Record<string, { album: ..., trackIds: string[] }>
  // We extract just what we need and discard the embedded album metadata.
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const old = JSON.parse(legacy) as Record<string, { trackIds: string[] }>;
      const migrated: UserLibraryEntry[] = Object.entries(old).map(([albumId, entry]) => ({
        albumId,
        trackIds: entry.trackIds ?? [],
        addedAt:  Date.now(), // no timestamp in old format — use now as approximation
      }));
      // Write to new key and remove old key
      localStorage.setItem(CURRENT_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_KEY);
      console.log(`[UserLibrary] Migrated ${migrated.length} entries from legacy key`);
      return migrated;
    } catch {
      localStorage.removeItem(LEGACY_KEY);
      return [];
    }
  }

  return [];
}

function write(entries: UserLibraryEntry[]) {
  try { localStorage.setItem(CURRENT_KEY, JSON.stringify(entries)); } catch {}
}

function clearLocalState() {
  try { localStorage.removeItem(CURRENT_KEY); } catch {}
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useUserLibraryStore = create<UserLibraryState>((set, get) => ({
  entries:   read(),
  isSyncing: false,
  hydrated:  false,

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

    // Optimistic local update done — cloud write is fire-and-forget
    const updatedEntry = entries.find((e) => e.albumId === albumId);
    if (updatedEntry) {
      console.log('[UserLibrary] addTrack: firing cloud write for', albumId);
      import('@/repositories/userLibrary/UserLibraryRepository')
        .then(({ UserLibraryRepository }) =>
          UserLibraryRepository.addTrack(albumId, updatedEntry.trackIds)
        )
        .catch((err) => console.error('[UserLibrary] addTrack cloud write failed:', err));
    }
  },

  removeTrack: (albumId, trackId) => {
    const entries = get().entries
      .map((e) =>
        e.albumId !== albumId ? e : { ...e, trackIds: e.trackIds.filter((id) => id !== trackId) }
      )
      .filter((e) => e.trackIds.length > 0); // prune empty album entries
    write(entries);
    set({ entries });

    // Fire-and-forget: pass remaining track IDs (empty = remove album row)
    const remaining = entries.find((e) => e.albumId === albumId)?.trackIds ?? [];
    console.log('[UserLibrary] removeTrack: firing cloud write for', albumId, '| remaining:', remaining.length);
    import('@/repositories/userLibrary/UserLibraryRepository')
      .then(({ UserLibraryRepository }) =>
        UserLibraryRepository.removeTrack(albumId, remaining)
      )
      .catch((err) => console.error('[UserLibrary] removeTrack cloud write failed:', err));
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

    // Fire-and-forget
    console.log('[UserLibrary] addAlbum: firing cloud write for', albumId, '| tracks:', allTrackIds.length);
    import('@/repositories/userLibrary/UserLibraryRepository')
      .then(({ UserLibraryRepository }) =>
        UserLibraryRepository.upsertAlbum(albumId, allTrackIds)
      )
      .catch((err) => console.error('[UserLibrary] addAlbum cloud write failed:', err));
  },

  removeAlbum: (albumId) => {
    const entries = get().entries.filter((e) => e.albumId !== albumId);
    write(entries);
    set({ entries });

    // Fire-and-forget
    console.log('[UserLibrary] removeAlbum: firing cloud write for', albumId);
    import('@/repositories/userLibrary/UserLibraryRepository')
      .then(({ UserLibraryRepository }) =>
        UserLibraryRepository.removeAlbum(albumId)
      )
      .catch((err) => console.error('[UserLibrary] removeAlbum cloud write failed:', err));
  },

  hasAlbum:  (albumId) => get().entries.some((e) => e.albumId === albumId),
  hasTrack:  (albumId, trackId) => !!get().entries.find((e) => e.albumId === albumId)?.trackIds.includes(trackId),
  getEntry:  (albumId) => get().entries.find((e) => e.albumId === albumId),

  syncFromCloud: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    console.log('[UserLibrary] ─────────────────────────────────────────');
    console.log('[UserLibrary] sync started');

    try {
      // Dynamic import breaks store → repository circular dep at module level
      const { UserLibraryRepository } = await import('@/repositories/userLibrary/UserLibraryRepository');
      const cloudEntries = await UserLibraryRepository.getLibrary();

      console.log(`[UserLibrary] cloud entries fetched: ${cloudEntries.length}`);

      // Cloud is authoritative — REPLACE local state entirely.
      // This handles adds AND removes from other devices correctly.
      write(cloudEntries);
      set({ entries: cloudEntries, hydrated: true });

      console.log(`[UserLibrary] hydration complete ✓ (${cloudEntries.length} albums)`);
      console.log('[UserLibrary] ─────────────────────────────────────────');
    } catch (err) {
      console.error('[UserLibrary] syncFromCloud error:', err);
      // Keep existing local state on failure — don't wipe what we have
      set({ hydrated: true }); // mark hydrated anyway to unblock UI
    } finally {
      set({ isSyncing: false });
    }
  },

  reset: () => {
    clearLocalState();
    set({ entries: [], isSyncing: false, hydrated: false });
    console.log('[UserLibrary] reset on logout ✓');
  },
}));
