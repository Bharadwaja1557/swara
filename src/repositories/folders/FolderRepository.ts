/**
 * src/repositories/folders/FolderRepository.ts
 *
 * All Supabase calls for playlist_folders and playlist_folder_entries.
 * Mirrors PlaylistRepository architecture exactly.
 */
import { supabase } from '@/lib/supabase';
import type { PlaylistFolder } from '@/store/useFolderStore';

interface FolderRow {
  id:         string;
  name:       string;
  created_at: string;
  updated_at: string;
}

interface FolderEntryRow {
  folder_id:   string;
  playlist_id: string;
}

export const FolderRepository = {

  /**
   * Fetch all folders for the current user with their playlist memberships.
   *
   * Uses exactly TWO queries, never N+1:
   *   Q1: all folders for user
   *   Q2: all entries for those folder IDs (single IN query)
   * Then groups entries client-side into playlistIds arrays.
   *
   * This is the fix for the cross-device sync bug: the old rowToFolder()
   * fired one query per folder (N+1) AND could silently drop memberships
   * if any single fetch errored. The new approach fetches all entries in
   * one shot and merges them client-side.
   */
  async listFolders(): Promise<PlaylistFolder[]> {
    console.log('[FolderRepo] listFolders');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Q1: folders
    const { data: folderRows, error: folderErr } = await supabase
      .from('playlist_folders')
      .select('id, name, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (folderErr) {
      console.error('[FolderRepo] listFolders Q1 ERROR:', folderErr.message);
      return [];
    }
    if (!folderRows || folderRows.length === 0) return [];

    const folderIds = (folderRows as FolderRow[]).map((r) => r.id);

    // Q2: all entries for these folders in ONE query (no N+1)
    const { data: entryRows, error: entryErr } = await supabase
      .from('playlist_folder_entries')
      .select('folder_id, playlist_id')
      .in('folder_id', folderIds)
      .order('created_at', { ascending: true });

    if (entryErr) {
      // Log but don't fail — return folders with empty membership
      console.error('[FolderRepo] listFolders Q2 ERROR:', entryErr.message);
    }

    // Group entries by folder_id client-side
    const entryMap = new Map<string, string[]>();
    for (const entry of ((entryRows ?? []) as FolderEntryRow[])) {
      const list = entryMap.get(entry.folder_id) ?? [];
      list.push(entry.playlist_id);
      entryMap.set(entry.folder_id, list);
    }

    const folders: PlaylistFolder[] = (folderRows as FolderRow[]).map((r) => ({
      id:          r.id,
      name:        r.name,
      playlistIds: entryMap.get(r.id) ?? [],
      createdAt:   r.created_at,
      updatedAt:   r.updated_at,
    }));

    console.log('[FolderRepo] listFolders ✓', folders.length, 'folders');
    return folders;
  },

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

  async addPlaylistToFolder(folderId: string, playlistId: string): Promise<void> {
    console.log('[FolderRepo] addPlaylistToFolder:', folderId, playlistId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlist_folder_entries')
      .upsert({ folder_id: folderId, playlist_id: playlistId },
               { onConflict: 'folder_id,playlist_id', ignoreDuplicates: true });

    await supabase
      .from('playlist_folders')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', folderId);

    if (error) console.error('[FolderRepo] addPlaylistToFolder ERROR:', error.message);
    else       console.log('[FolderRepo] addPlaylistToFolder ✓');
  },

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
