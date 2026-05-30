-- supabase-migration-007.sql
-- Shared Playlist Architecture: playlist_saves table
-- Run AFTER migration 006.
--
-- DESIGN: Reference model, NOT clone model.
--   playlist_saves stores (user_id, playlist_id) references only.
--   When the original creator changes title/tracks/cover/order, ALL saved
--   references automatically reflect the changes — because there is no
--   duplicated data, only pointers.
--
-- PRIVACY:
--   Only public playlists (is_public = true) should be saveable by others.
--   The existing playlists SELECT RLS already enforces this:
--     "user_id = auth.uid() OR is_public = true"
--   The save operation itself is guarded by RLS on playlist_saves.
--
-- ALSO: Adds cover_id column to playlists if not already present
-- (may have been added outside migration-005 in older environments).

-- ── 1. playlist_saves ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.playlist_saves (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL DEFAULT auth.uid()
                          REFERENCES auth.users(id)  ON DELETE CASCADE,
  playlist_id uuid        NOT NULL
                          REFERENCES public.playlists(id) ON DELETE CASCADE,
  saved_at    timestamptz NOT NULL DEFAULT now(),

  -- A user can save any given playlist at most once
  UNIQUE (user_id, playlist_id)
);

-- Fast lookup: all playlists saved by a user
CREATE INDEX IF NOT EXISTS playlist_saves_user_id_idx
  ON public.playlist_saves (user_id, saved_at DESC);

-- Fast lookup: all users who saved a given playlist (for analytics)
CREATE INDEX IF NOT EXISTS playlist_saves_playlist_id_idx
  ON public.playlist_saves (playlist_id);

-- ── 2. RLS for playlist_saves ─────────────────────────────────────────────────

ALTER TABLE public.playlist_saves ENABLE ROW LEVEL SECURITY;

-- Clean slate (idempotent)
DROP POLICY IF EXISTS "playlist_saves_select" ON public.playlist_saves;
DROP POLICY IF EXISTS "playlist_saves_insert" ON public.playlist_saves;
DROP POLICY IF EXISTS "playlist_saves_delete" ON public.playlist_saves;

-- SELECT: a user can only see their own saves
CREATE POLICY "playlist_saves_select"
  ON public.playlist_saves FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: user_id enforced by DEFAULT auth.uid(); also enforce that the
-- target playlist is public (only public playlists may be saved by others)
CREATE POLICY "playlist_saves_insert"
  ON public.playlist_saves FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id
        AND p.is_public = true
        AND p.user_id <> auth.uid()  -- can't save your own playlist
    )
  );

-- DELETE: a user may only remove their own saves
CREATE POLICY "playlist_saves_delete"
  ON public.playlist_saves FOR DELETE
  USING (user_id = auth.uid());

-- ── 3. cover_id column on playlists (if not already present) ─────────────────
-- This was referenced in PlaylistRepository but not in migration-005.
-- DO block handles the case where it already exists gracefully.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'playlists'
      AND column_name  = 'cover_id'
  ) THEN
    ALTER TABLE public.playlists ADD COLUMN cover_id text;
  END IF;
END $$;

-- ── 4. Verify ─────────────────────────────────────────────────────────────────
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' ORDER BY tablename;
