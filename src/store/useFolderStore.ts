/**
 * src/store/useFolderStore.ts
 *
 * Playlist Folder entity.
 *
 * PERSISTENCE STRATEGY (mirrors usePlaylistStore):
 *   localStorage = write-through cache for instant UI.
 *   Supabase = authoritative source; replaces local state on syncFromCloud().
 *
 * All mutations are optimistic: local state updates immediately,
 * cloud write fires-and-forgets. syncFromCloud() is called by AppLayout
 * after auth + library hydration, same as playlists.
 *
 * DATA MODEL:
 *   PlaylistFolder {
 *     id:          string       — UUID (from Supabase or client-generated for offline)
 *     name:        string
 *     playlistIds: string[]     — ordered list of playlist IDs
 *     createdAt:   string       — ISO timestamp
 *     updatedAt:   string       — bumped on every mutation
 *   }
 */
import { create } from 'zustand';

const CACHE_KEY = 'swara:folders_v1';

export interface PlaylistFolder {
  id:          string;
  name:        string;
  playlistIds: string[];
  createdAt:   string;
  updatedAt:   string;
}

function readCache(): PlaylistFolder[] {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]'); } catch { return []; }
}
function writeCache(folders: PlaylistFolder[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(folders)); } catch {}
}

function makeId(): string {
  // Use crypto.randomUUID when available (modern browsers), fallback otherwise
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface FolderState {
  folders:    PlaylistFolder[];
  isSyncing:  boolean;
  hydrated:   boolean;

  createFolder:             (name: string) => PlaylistFolder;
  renameFolder:             (id: string, name: string) => void;
  deleteFolder:             (id: string) => void;
  addPlaylistToFolder:      (folderId: string, playlistId: string) => void;
  removePlaylistFromFolder: (folderId: string, playlistId: string) => void;
  togglePlaylistInFolder:   (folderId: string, playlistId: string) => boolean;

  getFolder:             (id: string) => PlaylistFolder | undefined;
  getFoldersForPlaylist: (playlistId: string) => PlaylistFolder[];

  /** Fetch authoritative state from Supabase and merge into local. */
  syncFromCloud: () => Promise<void>;
  /** Called on logout — clear local state and cache. */
  reset: () => void;
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folders:   readCache(),
  isSyncing: false,
  hydrated:  false,

  createFolder: (name) => {
    const now = new Date().toISOString();
    const folder: PlaylistFolder = {
      id:          makeId(),
      name:        name.trim(),
      playlistIds: [],
      createdAt:   now,
      updatedAt:   now,
    };
    const folders = [folder, ...get().folders];
    writeCache(folders);
    set({ folders });

    // Cloud write — fire-and-forget
    import('@/repositories/folders/FolderRepository')
      .then(({ FolderRepository }) => FolderRepository.createFolder(folder.name))
      .catch((err) => console.error('[Folders] createFolder cloud write failed:', err));

    return folder;
  },

  renameFolder: (id, name) => {
    const folders = get().folders.map((f) =>
      f.id !== id ? f : { ...f, name: name.trim(), updatedAt: new Date().toISOString() }
    );
    writeCache(folders);
    set({ folders });

    import('@/repositories/folders/FolderRepository')
      .then(({ FolderRepository }) => FolderRepository.renameFolder(id, name))
      .catch((err) => console.error('[Folders] renameFolder cloud write failed:', err));
  },

  deleteFolder: (id) => {
    const folders = get().folders.filter((f) => f.id !== id);
    writeCache(folders);
    set({ folders });

    import('@/repositories/folders/FolderRepository')
      .then(({ FolderRepository }) => FolderRepository.deleteFolder(id))
      .catch((err) => console.error('[Folders] deleteFolder cloud write failed:', err));
  },

  addPlaylistToFolder: (folderId, playlistId) => {
    const folders = get().folders.map((f) => {
      if (f.id !== folderId) return f;
      if (f.playlistIds.includes(playlistId)) return f;
      return { ...f, playlistIds: [...f.playlistIds, playlistId], updatedAt: new Date().toISOString() };
    });
    writeCache(folders);
    set({ folders });

    import('@/repositories/folders/FolderRepository')
      .then(({ FolderRepository }) => FolderRepository.addPlaylistToFolder(folderId, playlistId))
      .catch((err) => console.error('[Folders] addPlaylistToFolder cloud write failed:', err));
  },

  removePlaylistFromFolder: (folderId, playlistId) => {
    const folders = get().folders.map((f) =>
      f.id !== folderId ? f : {
        ...f,
        playlistIds: f.playlistIds.filter((id) => id !== playlistId),
        updatedAt:   new Date().toISOString(),
      }
    );
    writeCache(folders);
    set({ folders });

    import('@/repositories/folders/FolderRepository')
      .then(({ FolderRepository }) => FolderRepository.removePlaylistFromFolder(folderId, playlistId))
      .catch((err) => console.error('[Folders] removePlaylistFromFolder cloud write failed:', err));
  },

  togglePlaylistInFolder: (folderId, playlistId) => {
    const folder = get().folders.find((f) => f.id === folderId);
    if (!folder) return false;
    const inFolder = folder.playlistIds.includes(playlistId);
    if (inFolder) {
      get().removePlaylistFromFolder(folderId, playlistId);
      return false;
    } else {
      get().addPlaylistToFolder(folderId, playlistId);
      return true;
    }
  },

  getFolder: (id) => get().folders.find((f) => f.id === id),

  getFoldersForPlaylist: (playlistId) =>
    get().folders.filter((f) => f.playlistIds.includes(playlistId)),

  syncFromCloud: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    console.log('[Folders] syncFromCloud started');
    try {
      const { FolderRepository } = await import('@/repositories/folders/FolderRepository');
      const cloudFolders = await FolderRepository.listFolders();
      console.log('[Folders] cloud folders fetched:', cloudFolders.length);
      writeCache(cloudFolders);
      set({ folders: cloudFolders, hydrated: true });
      console.log('[Folders] hydration complete ✓');
    } catch (err) {
      console.error('[Folders] syncFromCloud error:', err);
      set({ hydrated: true }); // unblock UI even on failure
    } finally {
      set({ isSyncing: false });
    }
  },

  reset: () => {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
    set({ folders: [], hydrated: false });
  },
}));
