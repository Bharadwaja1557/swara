/**
 * src/repositories/favoriteArtists/FavoriteArtistsRepository.ts
 *
 * All Supabase calls for the `favorite_artists` table.
 * Mirrors the LikedSongsRepository architecture exactly:
 *   - No user_id in client payloads (set by DEFAULT auth.uid() in DB)
 *   - RLS enforces user isolation on all operations
 *   - All methods fail gracefully when unauthenticated
 *
 * TABLE: favorite_artists
 *   id          uuid  DEFAULT gen_random_uuid() PRIMARY KEY
 *   user_id     uuid  DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
 *   artist_id   text  NOT NULL
 *   followed_at timestamptz DEFAULT now()
 *   UNIQUE(user_id, artist_id)
 *
 * RLS policies required:
 *   SELECT: user_id = auth.uid()
 *   INSERT: user_id = auth.uid()  (enforced even though client omits user_id)
 *   DELETE: user_id = auth.uid()
 *
 * See: supabase-migration-006.sql for the full DDL + policy statements.
 */
import { supabase } from '@/lib/supabase';

export const FavoriteArtistsRepository = {
  /**
   * Follow an artist for the current user.
   * Uses upsert so it's idempotent — safe even if already followed.
   * Does NOT pass user_id — the DB sets it via DEFAULT auth.uid().
   */
  async followArtist(artistId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('favorite_artists')
      .upsert({ artist_id: artistId, followed_at: new Date().toISOString() });
    if (error) console.error('[FavoriteArtistsRepo] followArtist:', error.message);
  },

  /**
   * Unfollow an artist for the current user.
   * RLS ensures only the authenticated user's rows are deleted.
   */
  async unfollowArtist(artistId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('favorite_artists')
      .delete()
      .eq('artist_id', artistId);
    if (error) console.error('[FavoriteArtistsRepo] unfollowArtist:', error.message);
  },

  /**
   * Fetch all followed artist IDs for the current user.
   * Returns objects with artistId + followedAt so the store can
   * preserve the original follow timestamps (shown in library sort).
   * Ordered by most-recently-followed first.
   */
  async getFollowedArtists(): Promise<Array<{ artistId: string; followedAt: string }>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('favorite_artists')
      .select('artist_id, followed_at')
      .order('followed_at', { ascending: false });

    if (error) {
      console.error('[FavoriteArtistsRepo] getFollowedArtists:', error.message);
      return [];
    }
    return (data ?? []).map((r: { artist_id: string; followed_at: string }) => ({
      artistId:   r.artist_id,
      followedAt: r.followed_at,
    }));
  },
};
