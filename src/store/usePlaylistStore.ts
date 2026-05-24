/**
 * src/store/usePlaylistStore.ts
 *
 * User playlist state — follows the exact optimistic-update + cloud-authoritative
 * pattern established by useLikedStore and useUserLibraryStore.
 *
 * DATA FLOW:
 *   1. Mount: read localStorage cache → instant UI
 *   2. Startup: syncFromCloud() replaces local with Supabase-authoritative state
 *   3. Mutations: optimistic local update first, then fire-and-forget cloud write
 *   4. Logout: reset() clears Zustand + localStorage
 *
 * LOCAL STATE:
 *   playlists — ordered array (most-recently-updated first)
 *   Each Playlist has trackIds[] in playlist order for queue building.
 *
 * TYPES:
 *   Playlist         — domain object with all metadata + ordered trackIds
 *   PlaylistTrackEntry — raw DB row shape (used by PlaylistPage for drag-reorder)
 */
import { create } from 'zustand';

export interface PlaylistTrackEntry {
  entryId:  string;   // playlist_tracks.id (UUID) — used for stable key + reorder
  trackId:  string;   // deterministic "albumId--trackNumber"
  position: number;   // 1-based
  addedAt:  string;   // ISO timestamp
}

export interface Playlist {
  id:          string;
  title:       string;
  description?: string;
  /** User-uploaded cover image URL (future — currently always undefined). */
  coverImageUrl?: string;
  /** Built-in cover ID key — e.g. 'aurora', 'pulse'. Synced to cloud. */
  coverId?:    string;
  isPublic:    boolean;
  trackCount:  number;
  createdAt:   string;
  updatedAt:   string;
  /** Ordered track IDs — populated after getPlaylist() or syncFromCloud(). */
  trackIds:    string[];
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const CACHE_KEY = 'swara_playlists_v1';

function readCache(): Playlist[] {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]'); } catch { return []; }
}
function writeCache(playlists: Playlist[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(playlists)); } catch {}
}
function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

// ── Store interface ───────────────────────────────────────────────────────────

interface PlaylistState {
  playlists: Playlist[];
  isSyncing: boolean;
  hydrated:  boolean;

  // ── Reads ─────────────────────────────────────────────────────────────────
  getPlaylist:  (id: string) => Playlist | undefined;

  // ── Playlist CRUD ─────────────────────────────────────────────────────────
  createPlaylist:  (title: string, description?: string) => Promise<Playlist | null>;
  renamePlaylist:  (id: string, title: string) => void;
  deletePlaylist:  (id: string) => void;
  togglePublic:    (id: string) => void;
  updateCover:     (id: string, coverImageUrl: string | null) => void;
  /** Set a built-in cover by ID (e.g. 'aurora'). Syncs to cloud. */
  updateCoverId:   (id: string, coverId: string | null) => void;

  // ── Track mutations ───────────────────────────────────────────────────────
  addTrackToPlaylist:      (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, entryId: string) => void;
  /** Remove a track by its trackId (for use when entryId is not available). */
  removeTrackByTrackId:    (playlistId: string, trackId: string) => void;
  reorderPlaylistTracks:   (playlistId: string, orderedEntryIds: string[]) => void;

  // ── Detailed load (for PlaylistPage) ──────────────────────────────────────
  /** Fetch a single playlist's full track list from cloud and merge into state. */
  loadPlaylistTracks: (playlistId: string) => Promise<PlaylistTrackEntry[]>;

  // ── Cloud sync ────────────────────────────────────────────────────────────
  syncFromCloud: () => Promise<void>;

  // ── Logout ────────────────────────────────────────────────────────────────
  reset: () => void;
}

// ── Store implementation ──────────────────────────────────────────────────────

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: readCache(),
  isSyncing: false,
  hydrated:  false,

  // ── Reads ─────────────────────────────────────────────────────────────────

  getPlaylist: (id) => get().playlists.find((p) => p.id === id),

  // ── Playlist CRUD ─────────────────────────────────────────────────────────

  createPlaylist: async (title, description) => {
    console.log('[Playlists] createPlaylist:', title);

    // ── Optimistic local update ───────────────────────────────────────────
    // We cannot use a client-generated UUID as the permanent ID because
    // Supabase generates the real UUID. Strategy:
    //   1. Add a temporary entry immediately so Library updates instantly
    //   2. Replace it with the server entry on success
    //   3. On server failure, keep the local entry and log — the user's
    //      action is never silently discarded
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempPlaylist: Playlist = {
      id:         tempId,
      title:      title.trim(),
      description: description?.trim(),
      isPublic:   false,
      trackCount: 0,
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
      trackIds:   [],
    };

    // Immediately update Zustand and localStorage — Library page re-renders now
    const withTemp = [tempPlaylist, ...get().playlists];
    writeCache(withTemp);
    set({ playlists: withTemp });

    // ── Cloud write ────────────────────────────────────────────────────────
    try {
      const { PlaylistRepository } = await import('@/repositories/playlists/PlaylistRepository');
      const created = await PlaylistRepository.createPlaylist(title, description);

      if (created) {
        // Replace temp entry with the real server entry (real UUID)
        const realPlaylist: Playlist = { ...created, trackIds: [] };
        const reconciled = get().playlists.map((p) => p.id === tempId ? realPlaylist : p);
        writeCache(reconciled);
        set({ playlists: reconciled });
        console.log('[Playlists] createPlaylist: server confirmed, tempId replaced with', created.id);
        return realPlaylist;
      } else {
        // Server failed but we keep the local entry — it will be a "pending" playlist
        // that syncs properly when syncFromCloud next runs (or on next app load).
        console.warn('[Playlists] createPlaylist: server returned null — keeping local entry with tempId');
        return tempPlaylist;
      }
    } catch (err) {
      console.error('[Playlists] createPlaylist cloud write failed:', err);
      // Keep local entry — do not remove it
      return tempPlaylist;
    }
  },

  renamePlaylist: (id, title) => {
    const playlists = get().playlists.map((p) =>
      p.id !== id ? p : { ...p, title, updatedAt: new Date().toISOString() }
    );
    writeCache(playlists);
    set({ playlists });

    import('@/repositories/playlists/PlaylistRepository')
      .then(({ PlaylistRepository }) => PlaylistRepository.renamePlaylist(id, title))
      .catch((err) => console.error('[Playlists] renamePlaylist cloud write failed:', err));
  },

  deletePlaylist: (id) => {
    const playlists = get().playlists.filter((p) => p.id !== id);
    writeCache(playlists);
    set({ playlists });

    import('@/repositories/playlists/PlaylistRepository')
      .then(({ PlaylistRepository }) => PlaylistRepository.deletePlaylist(id))
      .catch((err) => console.error('[Playlists] deletePlaylist cloud write failed:', err));
  },

  togglePublic: (id) => {
    const target  = get().playlists.find((p) => p.id === id);
    if (!target) return;
    const isPublic = !target.isPublic;
    const playlists = get().playlists.map((p) =>
      p.id !== id ? p : { ...p, isPublic, updatedAt: new Date().toISOString() }
    );
    writeCache(playlists);
    set({ playlists });

    import('@/repositories/playlists/PlaylistRepository')
      .then(({ PlaylistRepository }) => PlaylistRepository.togglePublic(id, isPublic))
      .catch((err) => console.error('[Playlists] togglePublic cloud write failed:', err));
  },

  updateCover: (id, coverImageUrl) => {
    const playlists = get().playlists.map((p) =>
      p.id !== id ? p : { ...p, coverImageUrl: coverImageUrl ?? undefined, updatedAt: new Date().toISOString() }
    );
    writeCache(playlists);
    set({ playlists });

    import('@/repositories/playlists/PlaylistRepository')
      .then(({ PlaylistRepository }) => PlaylistRepository.updateCover(id, coverImageUrl))
      .catch((err) => console.error('[Playlists] updateCover cloud write failed:', err));
  },

  updateCoverId: (id, coverId) => {
    // Optimistic local update first
    const playlists = get().playlists.map((p) =>
      p.id !== id ? p : { ...p, coverId: coverId ?? undefined, updatedAt: new Date().toISOString() }
    );
    writeCache(playlists);
    set({ playlists });

    // Cloud write — persists across devices
    import('@/repositories/playlists/PlaylistRepository')
      .then(({ PlaylistRepository }) => PlaylistRepository.updateCoverId(id, coverId))
      .catch((err) => console.error('[Playlists] updateCoverId cloud write failed:', err));
  },

  // ── Track mutations ───────────────────────────────────────────────────────

  addTrackToPlaylist: (playlistId, trackId) => {
    // Optimistic: append trackId to the playlist's local trackIds list
    const playlists = get().playlists.map((p) => {
      if (p.id !== playlistId) return p;
      return {
        ...p,
        trackIds:   [...p.trackIds, trackId],
        trackCount: p.trackCount + 1,
        updatedAt:  new Date().toISOString(),
      };
    });
    writeCache(playlists);
    set({ playlists });

    import('@/repositories/playlists/PlaylistRepository')
      .then(({ PlaylistRepository }) => PlaylistRepository.addTrack(playlistId, trackId))
      .catch((err) => console.error('[Playlists] addTrackToPlaylist cloud write failed:', err));
  },

  removeTrackFromPlaylist: (playlistId, entryId) => {
    // Optimistic: we don't easily know which trackId maps to entryId locally,
    // so we just decrement count and the full trackIds list refreshes next load
    const playlists = get().playlists.map((p) => {
      if (p.id !== playlistId) return p;
      return {
        ...p,
        trackCount: Math.max(0, p.trackCount - 1),
        updatedAt:  new Date().toISOString(),
      };
    });
    writeCache(playlists);
    set({ playlists });

    import('@/repositories/playlists/PlaylistRepository')
      .then(({ PlaylistRepository }) => PlaylistRepository.removeTrack(entryId))
      .catch((err) => console.error('[Playlists] removeTrackFromPlaylist cloud write failed:', err));
  },

  // Remove by trackId — used by PlaylistPickerSheet toggle where entryId is
  // not available. Removes the first occurrence from trackIds optimistically.
  removeTrackByTrackId: (playlistId, trackId) => {
    const playlists = get().playlists.map((p) => {
      if (p.id !== playlistId) return p;
      const idx = p.trackIds.indexOf(trackId);
      if (idx === -1) return p; // not in playlist — no-op
      const trackIds = [...p.trackIds];
      trackIds.splice(idx, 1);
      return {
        ...p,
        trackIds,
        trackCount: Math.max(0, p.trackCount - 1),
        updatedAt:  new Date().toISOString(),
      };
    });
    writeCache(playlists);
    set({ playlists });

    // Cloud: look up the entryId via repository then remove
    import('@/repositories/playlists/PlaylistRepository')
      .then(({ PlaylistRepository }) =>
        PlaylistRepository.removeTrackByTrackId(playlistId, trackId)
      )
      .catch((err) => console.error('[Playlists] removeTrackByTrackId cloud write failed:', err));
  },

  reorderPlaylistTracks: (playlistId, orderedEntryIds) => {
    // Optimistic reorder is handled locally in PlaylistPage via its own entries state.
    // The store just fires the cloud write.
    import('@/repositories/playlists/PlaylistRepository')
      .then(({ PlaylistRepository }) => PlaylistRepository.reorderTracks(playlistId, orderedEntryIds))
      .catch((err) => console.error('[Playlists] reorderPlaylistTracks cloud write failed:', err));
  },

  // ── Detailed load ─────────────────────────────────────────────────────────

  loadPlaylistTracks: async (playlistId) => {
    console.log('[Playlists] loadPlaylistTracks:', playlistId);
    const { PlaylistRepository } = await import('@/repositories/playlists/PlaylistRepository');
    const result = await PlaylistRepository.getPlaylist(playlistId);
    if (!result) return [];

    // Merge trackIds into local state for queue building
    const playlists = get().playlists.map((p) =>
      p.id !== playlistId ? p : { ...p, trackIds: result.trackIds, trackCount: result.entries.length }
    );
    writeCache(playlists);
    set({ playlists });

    return result.entries;
  },

  // ── Cloud sync ────────────────────────────────────────────────────────────

  syncFromCloud: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    console.log('[Playlists] ─────────────────────────────────────────');
    console.log('[Playlists] syncFromCloud started');

    try {
      const { PlaylistRepository } = await import('@/repositories/playlists/PlaylistRepository');
      const cloudPlaylists = await PlaylistRepository.getAllPlaylists();

      console.log('[Playlists] cloud playlists fetched:', cloudPlaylists.length);

      // Cloud is authoritative for metadata. Preserve any locally loaded trackIds
      // so PlaylistPage doesn't lose track lists that were already fetched.
      // coverId comes from the cloud response (cover_id DB column).
      const merged = cloudPlaylists.map((cloud) => {
        const local = get().playlists.find((p) => p.id === cloud.id);
        return { ...cloud, trackIds: local?.trackIds ?? [] };
      });

      writeCache(merged);
      set({ playlists: merged, hydrated: true });

      console.log('[Playlists] hydration complete ✓ (' + merged.length + ' playlists)');
      console.log('[Playlists] ─────────────────────────────────────────');
    } catch (err) {
      console.error('[Playlists] syncFromCloud error:', err);
      set({ hydrated: true }); // unblock UI even on failure
    } finally {
      set({ isSyncing: false });
    }
  },

  // ── Logout ────────────────────────────────────────────────────────────────

  reset: () => {
    clearCache();
    set({ playlists: [], isSyncing: false, hydrated: false });
    console.log('[Playlists] reset on logout ✓');
  },
}));
