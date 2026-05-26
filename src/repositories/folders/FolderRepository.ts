/**
 * src/repositories/folders/FolderRepository.ts
 *
 * All Supabase calls for playlist_folders and playlist_folder_entries.
 * Mirrors the exact architecture of PlaylistRepository:
 *   - user_id never passed from client (auth.uid() default + RLS)
 *   - optimistic UI in the store; cloud writes fire-and-forget here
 *   - every method logs entry, key params, and outcome
 *
 * ── Required Supabase tables ────────────────────────────────────────────────
 *
 * CREATE TABLE playlist_folders (
 *   id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id    uuid NOT NULL DEFAULT auth.uid(),
 *   name       text NOT NULL,
 *   created_at timestamptz DEFAULT now(),
 *   updated_at timestamptz DEFAULT now()
 * );
 * CREATE INDEX idx_playlist_folders_user ON playlist_folders(user_id);
 *
 * CREATE TABLE playlist_folder_entries (
 *   id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   folder_id   uuid NOT NULL REFERENCES playlist_folders(id) ON DELETE CASCADE,
 *   playlist_id text NOT NULL,
 *   created_at  timestamptz DEFAULT now()
 * );
 * CREATE INDEX idx_pfe_folder    ON playlist_folder_entries(folder_id);
 * CREATE INDEX idx_pfe_playlist  ON playlist_folder_entries(playlist_id);
 *
 * -- RLS (identical to playlists table)
 * ALTER TABLE playlist_folders         ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE playlist_folder_entries  ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "owner_all" ON playlist_folders
 *   USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
 *
 * CREATE POLICY "owner_all" ON playlist_folder_entries
 *   USING (folder_id IN (SELECT id FROM playlist_folders WHERE user_id = auth.uid()))
 *   WITH CHECK (folder_id IN (SELECT id FROM playlist_folders WHERE user_id = auth.uid()));
 */
import { supabase } from '@/lib/supabase';
import type { PlaylistFolder } from '@/store/useFolderStore';

// ── Row shapes ────────────────────────────────────────────────────────────────

interface FolderRow {
  id:         string;
  name:       string;
  created_at: string;
  updated_at: string;
}

interface FolderEntryRow {
  playlist_id: string;
}

// ── Converters ────────────────────────────────────────────────────────────────

async function rowToFolder(r: FolderRow): Promise<PlaylistFolder> {
  // Fetch playlist IDs for this folder
  const { data } = await supabase
    .from('playlist_folder_entries')
    .select('playlist_id')
    .eq('folder_id', r.id)
    .order('created_at', { ascending: true });

  const playlistIds = (data ?? []).map((e: FolderEntryRow) => e.playlist_id);

  return {
    id:          r.id,
    name:        r.name,
    playlistIds,
    createdAt:   r.created_at,
    updatedAt:   r.updated_at,
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export const FolderRepository = {

  /**
   * Fetch all folders for the current user, with their playlist memberships.
   */
  async listFolders(): Promise<PlaylistFolder[]> {
    console.log('[FolderRepo] listFolders');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('playlist_folders')
      .select('id, name, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[FolderRepo] listFolders ERROR:', error.message);
      return [];
    }

    const folders = await Promise.all((data ?? []).map(rowToFolder));
    console.log('[FolderRepo] listFolders ✓', folders.length, 'folders');
    return folders;
  },

  /**
   * Create a new folder. Returns the created folder's ID.
   */
  async createFolder(name: string): Promise<string | null> {
    console.log('[FolderRepo] createFolder:', name);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('playlist_folders')
      .insert({ name, user_id: user.id })
      .select('id')
      .single();

    if (error) { console.error('[FolderRepo] createFolder ERROR:', error.message); return null; }
    console.log('[FolderRepo] createFolder ✓', data.id);
    return data.id;
  },

  /**
   * Rename a folder.
   */
  async renameFolder(folderId: string, name: string): Promise<void> {
    console.log('[FolderRepo] renameFolder:', folderId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlist_folders')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', folderId);

    if (error) console.error('[FolderRepo] renameFolder ERROR:', error.message);
    else       console.log('[FolderRepo] renameFolder ✓');
  },

  /**
   * Delete a folder (cascade deletes entries).
   */
  async deleteFolder(folderId: string): Promise<void> {
    console.log('[FolderRepo] deleteFolder:', folderId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlist_folders')
      .delete()
      .eq('id', folderId);

    if (error) console.error('[FolderRepo] deleteFolder ERROR:', error.message);
    else       console.log('[FolderRepo] deleteFolder ✓');
  },

  /**
   * Add a playlist to a folder.
   */
  async addPlaylistToFolder(folderId: string, playlistId: string): Promise<void> {
    console.log('[FolderRepo] addPlaylistToFolder:', folderId, playlistId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert to avoid duplicate entries
    const { error } = await supabase
      .from('playlist_folder_entries')
      .upsert({ folder_id: folderId, playlist_id: playlistId },
               { onConflict: 'folder_id,playlist_id', ignoreDuplicates: true });

    // Also bump folder.updated_at so recency sort reflects the change
    await supabase
      .from('playlist_folders')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', folderId);

    if (error) console.error('[FolderRepo] addPlaylistToFolder ERROR:', error.message);
    else       console.log('[FolderRepo] addPlaylistToFolder ✓');
  },

  /**
   * Remove a playlist from a folder.
   */
  async removePlaylistFromFolder(folderId: string, playlistId: string): Promise<void> {
    console.log('[FolderRepo] removePlaylistFromFolder:', folderId, playlistId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlist_folder_entries')
      .delete()
      .eq('folder_id', folderId)
      .eq('playlist_id', playlistId);

    await supabase
      .from('playlist_folders')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', folderId);

    if (error) console.error('[FolderRepo] removePlaylistFromFolder ERROR:', error.message);
    else       console.log('[FolderRepo] removePlaylistFromFolder ✓');
  },
};
