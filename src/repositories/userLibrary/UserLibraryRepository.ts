/**
 * src/repositories/userLibrary/UserLibraryRepository.ts
 *
 * BUGS FIXED IN THIS VERSION:
 *
 * Bug 1 (FATAL — caused empty table):
 *   onConflict: 'album_id' was wrong. The unique constraint is COMPOSITE:
 *   UNIQUE (user_id, album_id). PostgREST requires the conflict target to
 *   match the exact constraint. With 'album_id' alone, PostgREST cannot find
 *   the constraint, the upsert silently fails (treated as a failed INSERT),
 *   and the .catch(()=>{}) in the store swallows the error with no log output.
 *   Fix: onConflict: 'user_id,album_id'
 *
 * Bug 2 (masked all errors):
 *   All repository methods had errors silently swallowed by .catch(()=>{})
 *   in the store call sites. Added explicit logging at every stage so failures
 *   appear in the browser console.
 *
 * Why liked songs worked but library didn't:
 *   liked_songs upsert passes user_id explicitly in the payload AND the PK
 *   is (user_id, track_id) — PostgREST finds the conflict target against the PK.
 *   user_library upsert did NOT pass user_id (correct for security) but also
 *   specified the wrong single-column conflict target, so the resolution failed.
 *
 * Security note:
 *   user_id is still NOT passed in client payloads — the fix only corrects
 *   the onConflict target string to match the actual DB constraint name.
 */
import { supabase } from '@/lib/supabase';
import type { UserLibraryEntry } from '@/store/useUserLibraryStore';

interface UserLibraryRow {
  album_id:  string;
  track_ids: string[];
  added_at:  string;
}

export const UserLibraryRepository = {

  async getLibrary(): Promise<UserLibraryEntry[]> {
    console.log('[UserLibraryRepo] getLibrary: fetching...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[UserLibraryRepo] getLibrary: no authenticated user — returning []');
      return [];
    }
    console.log('[UserLibraryRepo] getLibrary: user =', user.id);

    const { data, error } = await supabase
      .from('user_library')
      .select('album_id, track_ids, added_at')
      .order('added_at', { ascending: false });

    if (error) {
      console.error('[UserLibraryRepo] getLibrary ERROR:', error.code, error.message, error.details);
      return [];
    }

    console.log('[UserLibraryRepo] getLibrary: rows returned =', data?.length ?? 0);
    return (data ?? []).map((row: UserLibraryRow) => ({
      albumId:  row.album_id,
      trackIds: row.track_ids ?? [],
      addedAt:  new Date(row.added_at).getTime(),
    }));
  },

  async upsertAlbum(albumId: string, trackIds: string[]): Promise<void> {
    console.log('[UserLibraryRepo] upsertAlbum: albumId =', albumId, '| trackIds.length =', trackIds.length);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[UserLibraryRepo] upsertAlbum: no authenticated user — skipping');
      return;
    }

    const payload = { album_id: albumId, track_ids: trackIds };
    console.log('[UserLibraryRepo] upsertAlbum: payload =', payload);

    // FIX: conflict target must be 'user_id,album_id' to match the composite
    // UNIQUE (user_id, album_id) constraint. 'album_id' alone does not exist
    // as a unique constraint and causes PostgREST to reject the upsert.
    const { data, error } = await supabase
      .from('user_library')
      .upsert(payload, { onConflict: 'user_id,album_id' })
      .select();

    if (error) {
      console.error('[UserLibraryRepo] upsertAlbum ERROR:', error.code, error.message, error.details, error.hint);
    } else {
      console.log('[UserLibraryRepo] upsertAlbum SUCCESS: rows affected =', data?.length ?? 0);
    }
  },

  async removeAlbum(albumId: string): Promise<void> {
    console.log('[UserLibraryRepo] removeAlbum: albumId =', albumId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[UserLibraryRepo] removeAlbum: no authenticated user — skipping');
      return;
    }

    const { error } = await supabase
      .from('user_library')
      .delete()
      .eq('album_id', albumId);

    if (error) {
      console.error('[UserLibraryRepo] removeAlbum ERROR:', error.code, error.message);
    } else {
      console.log('[UserLibraryRepo] removeAlbum SUCCESS');
    }
  },

  async addTrack(albumId: string, newTrackIds: string[]): Promise<void> {
    console.log('[UserLibraryRepo] addTrack: albumId =', albumId, '| trackIds =', newTrackIds);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[UserLibraryRepo] addTrack: no authenticated user — skipping');
      return;
    }

    const payload = { album_id: albumId, track_ids: newTrackIds };
    const { data, error } = await supabase
      .from('user_library')
      .upsert(payload, { onConflict: 'user_id,album_id' })
      .select();

    if (error) {
      console.error('[UserLibraryRepo] addTrack ERROR:', error.code, error.message, error.details, error.hint);
    } else {
      console.log('[UserLibraryRepo] addTrack SUCCESS: rows =', data?.length ?? 0);
    }
  },

  async removeTrack(albumId: string, newTrackIds: string[]): Promise<void> {
    console.log('[UserLibraryRepo] removeTrack: albumId =', albumId, '| remaining trackIds =', newTrackIds);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[UserLibraryRepo] removeTrack: no authenticated user — skipping');
      return;
    }

    if (newTrackIds.length === 0) {
      console.log('[UserLibraryRepo] removeTrack: no tracks remaining — deleting album row');
      return UserLibraryRepository.removeAlbum(albumId);
    }

    const payload = { album_id: albumId, track_ids: newTrackIds };
    const { data, error } = await supabase
      .from('user_library')
      .upsert(payload, { onConflict: 'user_id,album_id' })
      .select();

    if (error) {
      console.error('[UserLibraryRepo] removeTrack ERROR:', error.code, error.message, error.details, error.hint);
    } else {
      console.log('[UserLibraryRepo] removeTrack SUCCESS: rows =', data?.length ?? 0);
    }
  },
};
