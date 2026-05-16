/**
 * src/repositories/likedSongs/LikedSongsRepository.ts
 *
 * Repository pattern: all Supabase calls for liked_songs go here.
 * No Supabase imports in UI components or stores — they call this.
 *
 * All methods fail gracefully when unauthenticated (return empty / no-op).
 * RLS policies enforce server-side: users can only touch their own rows.
 */
import { supabase } from '@/lib/supabase';

export const LikedSongsRepository = {
  /**
   * Record a like for the current user.
   * Uses upsert to be idempotent — safe to call even if already liked.
   */
  async likeTrack(trackId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // silently no-op when unauthenticated

    const { error } = await supabase
      .from('liked_songs')
      .upsert({ user_id: user.id, track_id: trackId });
    if (error) console.error('[LikedSongsRepo] likeTrack:', error.message);
  },

  /**
   * Remove a like for the current user.
   */
  async unlikeTrack(trackId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('liked_songs')
      .delete()
      .eq('user_id', user.id)
      .eq('track_id', trackId);
    if (error) console.error('[LikedSongsRepo] unlikeTrack:', error.message);
  },

  /**
   * Fetch all liked track IDs for the current user.
   * Ordered by most recently liked first.
   */
  async getLikedSongIds(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('liked_songs')
      .select('track_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[LikedSongsRepo] getLikedSongIds:', error.message);
      return [];
    }
    return (data ?? []).map((r: { track_id: string }) => r.track_id);
  },

  /**
   * Check if a specific track is liked by the current user.
   * (Used for one-off checks; prefer local state for UI reactivity.)
   */
  async isLiked(trackId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { count, error } = await supabase
      .from('liked_songs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('track_id', trackId);

    if (error) return false;
    return (count ?? 0) > 0;
  },
};
