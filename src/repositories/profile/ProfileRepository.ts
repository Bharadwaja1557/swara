/**
 * src/repositories/profile/ProfileRepository.ts
 *
 * Repository for the `profiles` table.
 * Architecture mirrors LikedSongsRepository — no Supabase logic in components.
 *
 * getOrCreate() handles both new users (profile created via trigger) and
 * edge cases where the trigger didn't fire (legacy users, dev environments).
 */
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Profile {
  id:           string;
  username:     string;
  display_name: string | null;
  created_at:   string;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const ProfileRepository = {

  /**
   * Fetch the authenticated user's profile.
   * Returns null if not found or unauthenticated.
   */
  async getProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      // PGRST116 = no rows found — not a real error, just no profile yet
      if (error.code !== 'PGRST116') {
        console.error('[ProfileRepo] getProfile:', error.message);
      }
      return null;
    }
    return data as Profile;
  },

  /**
   * Get profile, creating one if it doesn't exist.
   * Username is derived from the internal email convention (neo@swara.app → neo).
   * This is the safe method to call at startup.
   */
  async getOrCreate(): Promise<Profile | null> {
    const existing = await ProfileRepository.getProfile();
    if (existing) return existing;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return null;

    // Extract username from internal email: neo@swara.app → neo
    const username = user.email.split('@')[0] ?? 'user';

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[ProfileRepo] getOrCreate:', error.message);
      return null;
    }
    return data as Profile;
  },

  /**
   * Update display_name or other mutable fields.
   */
  async updateProfile(fields: Partial<Pick<Profile, 'display_name'>>): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .update(fields)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[ProfileRepo] updateProfile:', error.message);
      return null;
    }
    return data as Profile;
  },
};
