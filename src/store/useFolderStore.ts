/**
 * src/store/useFolderStore.ts
 *
 * Playlist Folder entity.
 *
 * DESIGN:
 *   Folders are containers of playlist IDs. They do NOT contain tracks.
 *   They do NOT duplicate playlist data.
 *   A playlist can belong to multiple folders.
 *
 * PERSISTENCE: localStorage only (local-first).
 *   Future cloud sync: add syncFromCloud() following the same pattern as
 *   usePlaylistStore — optimistic local write, then fire-and-forget cloud write.
 *
 * DATA MODEL:
 *   PlaylistFolder {
 *     id:          string       — client UUID
 *     name:        string       — display name
 *     playlistIds: string[]     — ordered list of playlist IDs
 *     createdAt:   string       — ISO timestamp
 *     updatedAt:   string       — ISO timestamp (bumped on any mutation)
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
  return `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface FolderState {
  folders: PlaylistFolder[];

  createFolder:           (name: string) => PlaylistFolder;
  renameFolder:           (id: string, name: string) => void;
  deleteFolder:           (id: string) => void;
  addPlaylistToFolder:    (folderId: string, playlistId: string) => void;
  removePlaylistFromFolder: (folderId: string, playlistId: string) => void;
  /** Toggle membership — returns true if now in folder, false if removed. */
  togglePlaylistInFolder: (folderId: string, playlistId: string) => boolean;

  getFolder:  (id: string) => PlaylistFolder | undefined;
  /** All folders that contain this playlist. */
  getFoldersForPlaylist: (playlistId: string) => PlaylistFolder[];

  reset: () => void;
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folders: readCache(),

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
    return folder;
  },

  renameFolder: (id, name) => {
    const folders = get().folders.map((f) =>
      f.id !== id ? f : { ...f, name: name.trim(), updatedAt: new Date().toISOString() }
    );
    writeCache(folders);
    set({ folders });
  },

  deleteFolder: (id) => {
    const folders = get().folders.filter((f) => f.id !== id);
    writeCache(folders);
    set({ folders });
  },

  addPlaylistToFolder: (folderId, playlistId) => {
    const folders = get().folders.map((f) => {
      if (f.id !== folderId) return f;
      if (f.playlistIds.includes(playlistId)) return f; // already present
      return { ...f, playlistIds: [...f.playlistIds, playlistId], updatedAt: new Date().toISOString() };
    });
    writeCache(folders);
    set({ folders });
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

  reset: () => {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
    set({ folders: [] });
  },
}));
