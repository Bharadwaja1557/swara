-- supabase-migration-009.sql
-- Theme persistence + soft delete for playlists
-- Run AFTER migration 008.

-- ── 1. Add theme column to profiles ───────────────────────────────────────────
-- Persists the user's chosen theme (dark / semi-dark / light) across devices.
-- Defaults to 'dark' so existing rows are unaffected.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'theme'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN theme text NOT NULL DEFAULT 'dark'
      CONSTRAINT profiles_theme_check CHECK (theme IN ('dark', 'semi-dark', 'light'));
  END IF;
END $$;


-- ── 2. Add soft_deleted + deleted_at to playlists ─────────────────────────────
-- Enables soft deletion: playlists are hidden from all queries but not purged.
-- Preserves playlist_saves references and enables future recovery.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'playlists' AND column_name = 'soft_deleted'
  ) THEN
    ALTER TABLE public.playlists
      ADD COLUMN soft_deleted boolean NOT NULL DEFAULT false,
      ADD COLUMN deleted_at   timestamptz;
  END IF;
END $$;

-- Index for the common case: soft_deleted=false WHERE user_id=auth.uid()
CREATE INDEX IF NOT EXISTS idx_playlists_soft_deleted
  ON public.playlists (user_id, soft_deleted, updated_at DESC)
  WHERE soft_deleted = false;


-- ── 3. UPDATE RLS for playlists: SELECT must exclude soft-deleted rows ────────
-- The main SELECT policy already uses user_id = auth.uid() OR is_public = true.
-- We augment it to also exclude soft-deleted rows so no client can see them.

DROP POLICY IF EXISTS "playlist_select"        ON public.playlists;
DROP POLICY IF EXISTS "playlists_select"       ON public.playlists;
DROP POLICY IF EXISTS "Users can view own playlists." ON public.playlists;

CREATE POLICY "playlists_select"
  ON public.playlists FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() OR is_public = true)
    AND soft_deleted = false
  );

-- SELECT policy for soft-deleted rows visible only to their owner (for future restore UI)
-- Disabled by default — uncomment when restore UI is implemented:
-- CREATE POLICY "playlists_select_own_deleted"
--   ON public.playlists FOR SELECT
--   TO authenticated
--   USING (user_id = auth.uid());  -- shows soft-deleted to owner only


-- ── 4. Verify ─────────────────────────────────────────────────────────────────
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name IN ('profiles', 'playlists')
--  ORDER BY table_name, ordinal_position;
