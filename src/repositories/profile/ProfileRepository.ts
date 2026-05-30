/**
 * src/repositories/profile/ProfileRepository.ts
 *
 * Repository for the `profiles` table and `avatars` storage bucket.
 *
 * ── TABLE SCHEMA ─────────────────────────────────────────────────────────────
 *   profiles (
 *     id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *     username          text NOT NULL UNIQUE,
 *     display_name      text,
 *     theme             text DEFAULT 'dark',
 *     avatar_url        text,          -- public URL to avatars/{id}.webp
 *     avatar_updated_at timestamptz,   -- cache-busting timestamp
 *     bio               text,          -- optional, not yet displayed
 *     created_at        timestamptz DEFAULT now()
 *   )
 *
 * ── STORAGE BUCKET ───────────────────────────────────────────────────────────
 *   Bucket:  avatars  (public)
 *   Path:    avatars/{user_id}.webp
 *   One file per user; uploading overwrites the previous file.
 *
 * ── AVATAR CACHE BUSTING ─────────────────────────────────────────────────────
 *   All consumers append ?v={avatar_updated_at} to the avatar_url.
 *   The timestamp changes on every upload so browsers immediately invalidate
 *   their cached copy. Using the timestamp (not a random value) means the
 *   same URL is deterministic for the same version of the avatar, enabling
 *   CDN caching between updates.
 *
 * ── RLS (profiles table) ─────────────────────────────────────────────────────
 *   SELECT: any authenticated user  (for creator attribution)
 *   INSERT/UPDATE: own row only
 *   See migration-008 for full policy DDL.
 *
 * ── RLS (storage.objects — avatars bucket) ───────────────────────────────────
 *   SELECT: public (no auth needed — avatar URLs are public)
 *   INSERT/UPDATE/DELETE: authenticated, own file only ({uid}.webp)
 *   See migration-010 for full policy DDL.
 */
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Profile {
  id:                string;
  username:          string;
  display_name:      string | null;
  theme:             string | null;
  avatar_url:        string | null;
  avatar_updated_at: string | null;
  bio:               string | null;
  created_at:        string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derive a readable username from a Supabase email.
 *  neo@swara.app → "neo"  */
export function usernameFromEmail(email: string): string {
  return email.split('@')[0]?.trim() || 'user';
}

/**
 * Append a cache-busting query param to an avatar URL.
 * Uses avatar_updated_at so the cache is invalidated exactly when the
 * avatar changes, but is stable (same value → same URL → CDN cache hit).
 */
export function buildAvatarUrl(
  rawUrl: string | null | undefined,
  avatarUpdatedAt: string | null | undefined,
): string | null {
  if (!rawUrl) return null;
  const sep = rawUrl.includes('?') ? '&' : '?';
  const v   = avatarUpdatedAt
    ? new Date(avatarUpdatedAt).getTime()
    : Date.now();
  return `${rawUrl}${sep}v=${v}`;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const ProfileRepository = {

  async getProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') console.error('[ProfileRepo] getProfile:', error.message);
      return null;
    }
    return data as Profile;
  },

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

  async updateProfile(
    fields: Partial<Pick<Profile, 'display_name' | 'theme' | 'bio'>>,
  ): Promise<Profile | null> {
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

  // ── Avatar ─────────────────────────────────────────────────────────────────

  /**
   * Upload an avatar image for the current user.
   *
   * Flow:
   *   1. Upload the WebP blob to avatars/{user_id}.webp (upsert — overwrites)
   *   2. Get the public URL from Supabase Storage
   *   3. Update profiles.avatar_url + profiles.avatar_updated_at = now()
   *   4. Return the updated Profile row
   *
   * The caller is responsible for resizing/converting to WebP before calling.
   * (See AvatarUpload component which uses canvas for client-side conversion.)
   *
   * @param webpBlob  The final WebP image blob (≤5 MB, 512×512 recommended)
   * @param onProgress  Optional callback with 0–100 progress estimate
   */
  async uploadAvatar(
    webpBlob: Blob,
    onProgress?: (pct: number) => void,
  ): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const path = `${user.id}.webp`;
    onProgress?.(10);

    // Upload (upsert) — one file per user, overwriting the previous
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, webpBlob, {
        contentType: 'image/webp',
        upsert:      true,   // overwrite existing file
        cacheControl: '3600', // CDN caches for 1h; cache-busting ?v= handles staleness
      });

    if (uploadError) {
      console.error('[ProfileRepo] uploadAvatar upload:', uploadError.message);
      return null;
    }
    onProgress?.(70);

    // Get the permanent public URL (no expiry — bucket is public)
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    const avatarUrl = urlData.publicUrl;
    const now       = new Date().toISOString();
    onProgress?.(80);

    // Persist to profiles row
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl, avatar_updated_at: now })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[ProfileRepo] uploadAvatar profile update:', updateError.message);
      return null;
    }
    onProgress?.(100);
    return data as Profile;
  },

  // ── Batch username resolver (used by PlaylistRepository) ──────────────────

  async resolveCreatorUsernames(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const uniqueIds = [...new Set(userIds)];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', uniqueIds);

    if (error) console.error('[ProfileRepo] resolveCreatorUsernames:', error.message);

    const result = new Map<string, string>();
    for (const row of ((data ?? []) as { id: string; username: string }[])) {
      result.set(row.id, row.username);
    }

    const missing = uniqueIds.filter((id) => !result.has(id));
    if (missing.length > 0) {
      console.warn('[ProfileRepo] resolveCreatorUsernames: missing', missing.length, 'profile(s)');
      const { data: { user: self } } = await supabase.auth.getUser();
      if (self && missing.includes(self.id)) {
        const healed = await ProfileRepository.getOrCreate();
        if (healed) {
          result.set(healed.id, healed.username);
          missing.splice(missing.indexOf(self.id), 1);
        }
      }
      for (const id of missing) {
        result.set(id, `user-${id.replace(/-/g, '').slice(0, 4)}`);
      }
    }
    return result;
  },
};
