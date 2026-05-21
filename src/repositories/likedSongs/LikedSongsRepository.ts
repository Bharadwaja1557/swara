/**
 * src/repositories/likedSongs/LikedSongsRepository.ts
 *
 * Repository pattern: all Supabase calls for liked_songs go here.
 * No Supabase imports in UI components or stores — they call this.
 *
 * SECURITY: user_id is NOT passed in any client payload.
 *   The database column has DEFAULT auth.uid() and the RLS INSERT policy
 *   enforces user_id = auth.uid(). Even if an attacker modifies the JS
 *   bundle to pass a different user_id, the database will reject it.
 *   This closes the class of bugs where a misconfigured INSERT RLS policy
 *   (or a policy that was accidentally dropped) would allow cross-user writes.
 *
 * RLS policies required (Supabase dashboard / migration):
 *   SELECT: user_id = auth.uid()
 *   INSERT: user_id = auth.uid()  (enforced even though client doesn't pass it)
 *   DELETE: user_id = auth.uid()
 *
 * All methods fail gracefully when unauthenticated (return empty / no-op).
 */
import { supabase } from '@/lib/supabase';

export const LikedSongsRepository = {
  /**
   * Record a like for the current user.
   * Does NOT pass user_id — the DB sets it via DEFAULT auth.uid().
   * Uses upsert to be idempotent — safe to call even if already liked.
   */
  async likeTrack(trackId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('liked_songs')
      .upsert({ track_id: trackId });
    if (error) console.error('[LikedSongsRepo] likeTrack:', error.message);
  },

  /**
   * Remove a like for the current user.
   * RLS ensures only the authenticated user's rows are deleted.
   */
  async unlikeTrack(trackId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('liked_songs')
      .delete()
      .eq('track_id', trackId);
      // No .eq('user_id', ...) needed — RLS filters to current user automatically
    if (error) console.error('[LikedSongsRepo] unlikeTrack:', error.message);
  },

  /**
   * Fetch all liked track IDs for the current user.
   * RLS ensures only the current user's rows are returned.
   * Ordered by most recently liked first.
   */
  async getLikedSongIds(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('liked_songs')
      .select('track_id')
      .order('created_at', { ascending: false });
      // No .eq('user_id', ...) needed — RLS filters to current user automatically

    if (error) {
      console.error('[LikedSongsRepo] getLikedSongIds:', error.message);
      return [];
    }
    return (data ?? []).map((r: { track_id: string }) => r.track_id);
  },
};
