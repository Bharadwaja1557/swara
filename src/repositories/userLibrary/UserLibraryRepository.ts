/**
 * src/repositories/userLibrary/UserLibraryRepository.ts
 *
 * Repository pattern: all Supabase calls for user_library go here.
 * Mirrors LikedSongsRepository exactly — no Supabase imports elsewhere.
 *
 * Schema:
 *   user_library (
 *     id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     album_id   text NOT NULL,
 *     track_ids  text[] NOT NULL DEFAULT '{}',
 *     added_at   timestamptz DEFAULT now(),
 *     UNIQUE (user_id_implicit_from_rls, album_id)  -- enforced by RLS + unique index
 *   )
 *
 * Security:
 *   user_id is NOT in this table's columns — ownership is implicit via RLS.
 *   The RLS policy uses auth.uid() to scope all operations.
 *   Clients never pass user_id — the database owns row ownership.
 *
 * All methods fail gracefully when unauthenticated (return empty / no-op).
 */
import { supabase } from '@/lib/supabase';
import type { UserLibraryEntry } from '@/store/useUserLibraryStore';

// Shape of a row as returned from Supabase
interface UserLibraryRow {
  album_id:  string;
  track_ids: string[];
  added_at:  string;   // ISO timestamp
}

export const UserLibraryRepository = {

  /**
   * Fetch the full library for the current user.
   * Returns entries ordered by most recently added first.
   */
  async getLibrary(): Promise<UserLibraryEntry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_library')
      .select('album_id, track_ids, added_at')
      .order('added_at', { ascending: false });

    if (error) {
      console.error('[UserLibraryRepo] getLibrary:', error.message);
      return [];
    }

    return (data ?? []).map((row: UserLibraryRow) => ({
      albumId:  row.album_id,
      trackIds: row.track_ids ?? [],
      addedAt:  new Date(row.added_at).getTime(),
    }));
  },

  /**
   * Upsert the full entry for an album.
   * If the album is already saved, replaces its trackIds.
   * Uses upsert on album_id — idempotent and safe to call on every add.
   *
   * NOTE: user_id is NOT passed — RLS sets ownership via auth.uid().
   */
  async upsertAlbum(albumId: string, trackIds: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_library')
      .upsert(
        { album_id: albumId, track_ids: trackIds },
        { onConflict: 'album_id' }
      );

    if (error) console.error('[UserLibraryRepo] upsertAlbum:', error.message);
  },

  /**
   * Remove an entire album entry from the user's library.
   */
  async removeAlbum(albumId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_library')
      .delete()
      .eq('album_id', albumId);

    if (error) console.error('[UserLibraryRepo] removeAlbum:', error.message);
  },

  /**
   * Add a single track to an album entry.
   * Reads current trackIds, merges, writes back. Uses upsert for safety.
   *
   * For optimistic UI, the Zustand store handles the local merge — this
   * function is called fire-and-forget after the local update is applied.
   */
  async addTrack(albumId: string, newTrackIds: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // newTrackIds is the full merged list (already computed by the store)
    const { error } = await supabase
      .from('user_library')
      .upsert(
        { album_id: albumId, track_ids: newTrackIds },
        { onConflict: 'album_id' }
      );

    if (error) console.error('[UserLibraryRepo] addTrack:', error.message);
  },

  /**
   * Remove a single track from an album entry.
   * newTrackIds is the already-filtered list from the store.
   * If empty, removes the album row entirely.
   */
  async removeTrack(albumId: string, newTrackIds: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (newTrackIds.length === 0) {
      return UserLibraryRepository.removeAlbum(albumId);
    }

    const { error } = await supabase
      .from('user_library')
      .upsert(
        { album_id: albumId, track_ids: newTrackIds },
        { onConflict: 'album_id' }
      );

    if (error) console.error('[UserLibraryRepo] removeTrack:', error.message);
  },
};
