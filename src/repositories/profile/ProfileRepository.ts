/**
 * src/repositories/profile/ProfileRepository.ts
 *
 * Repository for the `profiles` table.
 *
 * ── TABLE SCHEMA ─────────────────────────────────────────────────────────────
 *   profiles (
 *     id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *     username     text NOT NULL UNIQUE,
 *     display_name text,
 *     created_at   timestamptz DEFAULT now()
 *   )
 *
 *   Row is created automatically by the trigger `on_auth_user_created`, which
 *   fires after INSERT on auth.users and derives username from the email
 *   (neo@swara.app → "neo").  getOrCreate() is the application-side fallback
 *   for legacy users or environments where the trigger didn't fire.
 *
 * ── RLS POLICY REQUIRED ──────────────────────────────────────────────────────
 *   Usernames are not sensitive — they are displayed publicly on playlist
 *   creator attribution.  The SELECT policy must therefore allow ANY
 *   authenticated user to read ANY profile row (not just their own).
 *
 *   See supabase-migration-008.sql for the required DDL + policies.
 *
 *   Without this policy, batch profile lookups for other users' playlists
 *   silently return 0 rows, which causes the "unknown" / UUID-fragment bug.
 *
 * ── PROFILE RESOLUTION ───────────────────────────────────────────────────────
 *   All creator-username resolution in PlaylistRepository goes through
 *   resolveCreatorUsernames() below — the single canonical resolver.
 *   No other file should contain profile-lookup logic or fallback strings.
 */
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Profile {
  id:           string;
  username:     string;
  display_name: string | null;
  created_at:   string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Derive a stable, readable username from a Supabase email address.
 *  neo@swara.app  →  "neo"
 *  alice@gmail.com  →  "alice"
 *  Guaranteed non-empty; caller should never see an empty string. */
export function usernameFromEmail(email: string): string {
  return email.split('@')[0]?.trim() || 'user';
}

// ── Repository ────────────────────────────────────────────────────────────────

export const ProfileRepository = {

  /**
   * Fetch the authenticated user's own profile.
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
      if (error.code !== 'PGRST116') {
        console.error('[ProfileRepo] getProfile:', error.message);
      }
      return null;
    }
    return data as Profile;
  },

  /**
   * Get own profile, creating one if it doesn't exist.
   * Self-healing path for legacy users or environments where the trigger
   * didn't fire.  Uses upsert so it's safe to call multiple times.
   */
  async getOrCreate(): Promise<Profile | null> {
    const existing = await ProfileRepository.getProfile();
    if (existing) return existing;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return null;

    const username = usernameFromEmail(user.email);

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[ProfileRepo] getOrCreate:', error.message);
      return null;
    }
    console.log('[ProfileRepo] getOrCreate: created profile for', username);
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

  /**
   * Batch-resolve usernames for a set of user IDs.
   *
   * This is the SINGLE canonical resolver used by PlaylistRepository.
   * All three playlist-fetch paths (getAllPlaylists, getPlaylist,
   * searchPlaylists) call this method — no duplicated fallback logic anywhere.
   *
   * Resolution strategy (in priority order):
   *   1. Profile row exists with a username  →  use it directly
   *   2. Profile row missing for own user_id →  call getOrCreate() to self-heal,
   *      then use the derived username
   *   3. Profile row missing for other user  →  should never happen once RLS is
   *      correct (migration-008), but if it does, return a stable readable
   *      fallback derived from the UUID — never "unknown", never a raw UUID
   *
   * The fallback for case 3 is "user-XXXX" where XXXX is the first 4 hex chars
   * of the UUID — recognisably a placeholder, stable across renders, never
   * ambiguous with a real username.
   *
   * @param userIds   Array of auth.users UUIDs to resolve
   * @returns         Map from UUID → resolved display username
   */
  async resolveCreatorUsernames(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();

    const uniqueIds = [...new Set(userIds)];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', uniqueIds);

    if (error) {
      console.error('[ProfileRepo] resolveCreatorUsernames:', error.message);
      // On error, attempt self-heal for own user then return best-effort map
    }

    const result = new Map<string, string>();
    const rows = (data ?? []) as { id: string; username: string }[];
    for (const row of rows) {
      result.set(row.id, row.username);
    }

    // Identify any user IDs not resolved (missing profile rows)
    const missing = uniqueIds.filter((id) => !result.has(id));
    if (missing.length > 0) {
      console.warn('[ProfileRepo] resolveCreatorUsernames: missing profiles for', missing.length, 'user(s)');

      // Self-heal: for the current user's own ID, call getOrCreate()
      const { data: { user: self } } = await supabase.auth.getUser();
      if (self && missing.includes(self.id)) {
        const healed = await ProfileRepository.getOrCreate();
        if (healed) {
          result.set(healed.id, healed.username);
          missing.splice(missing.indexOf(self.id), 1);
        }
      }

      // For any remaining missing other-user IDs: use stable "user-XXXX" placeholder.
      // This should only happen if: profiles RLS is misconfigured (migration-008
      // not yet run), or a test/dev user was created without a profile row.
      for (const id of missing) {
        const placeholder = `user-${id.replace(/-/g, '').slice(0, 4)}`;
        result.set(id, placeholder);
        console.warn('[ProfileRepo] resolveCreatorUsernames: using placeholder for', id.slice(0, 8));
      }
    }

    return result;
  },
};
