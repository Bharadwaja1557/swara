-- supabase-migration-010.sql
-- Avatar support: columns on profiles + Supabase Storage bucket
-- Run AFTER migration-009.

-- ── 1. Add avatar columns to profiles ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN avatar_url        text,
      ADD COLUMN avatar_updated_at timestamptz,
      ADD COLUMN bio               text;
  END IF;
END $$;

-- ── 2. Create the avatars storage bucket ─────────────────────────────────────
-- Run this in the Supabase Dashboard → Storage → New bucket, OR via the API.
-- Bucket name: avatars
-- Public: TRUE  (avatar images are publicly readable — no auth needed to view)
-- File size limit: 5 242 880 bytes (5 MB)
-- Allowed MIME types: image/webp, image/jpeg, image/png
--
-- SQL equivalent (requires service role or dashboard):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
  SET public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

-- ── 3. Storage RLS policies ───────────────────────────────────────────────────
-- SELECT (read): any user (authenticated or anonymous) can view avatar images.
-- This is intentional — avatar images are public identity assets.
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- INSERT: authenticated users can only upload to their own path ({user_id}.webp)
CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND name = (auth.uid()::text || '.webp')
  );

-- UPDATE: same path restriction as INSERT
CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name = (auth.uid()::text || '.webp')
  );

-- DELETE: owner can delete their own avatar
CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name = (auth.uid()::text || '.webp')
  );

-- ── 4. Verify ─────────────────────────────────────────────────────────────────
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'avatars';
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'profiles'
--   ORDER BY ordinal_position;
