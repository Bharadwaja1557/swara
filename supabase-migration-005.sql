-- ============================================================
-- Swara — Supabase Migration: 005_playlists
-- ============================================================
-- Run AFTER migration 004 (user_library_and_security).
-- Idempotent — safe to re-run.
--
-- SCHEMA DECISIONS:
--   playlists.user_id      — DEFAULT auth.uid(), never sent from client
--   playlist_tracks.user_id — NOT stored; ownership flows through playlists.user_id
--   track ordering         — integer position column, explicit reorder via UPDATE
--   public playlists       — is_public=true allows any auth'd user to SELECT
--   cascade delete         — deleting a playlist removes all its tracks
--   duplicate tracks       — allowed (same track can appear multiple times at
--                            different positions; no UNIQUE on playlist_id+track_id)
-- ============================================================


-- ── 1. playlists ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.playlists (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL DEFAULT auth.uid()
                           REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description  text        CHECK (char_length(description) <= 1000),
  cover_url    text,
  is_public    boolean     NOT NULL DEFAULT false,
  track_count  integer     NOT NULL DEFAULT 0,   -- denormalized for fast list display
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playlists_user_id_idx
  ON public.playlists (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS playlists_public_idx
  ON public.playlists (is_public, updated_at DESC)
  WHERE is_public = true;


-- ── 2. playlist_tracks ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id  uuid        NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id     text        NOT NULL,    -- deterministic "albumId--trackNumber"
  position     integer     NOT NULL,    -- 1-based, explicit ordering
  added_at     timestamptz NOT NULL DEFAULT now()
  -- NOTE: no UNIQUE(playlist_id, track_id) — duplicate tracks are permitted
  --       (same song can appear in multiple spots in a playlist)
);

-- Primary access pattern: get all tracks for a playlist in order
CREATE INDEX IF NOT EXISTS playlist_tracks_playlist_position_idx
  ON public.playlist_tracks (playlist_id, position ASC);

-- Secondary: check whether a specific track is in a playlist
CREATE INDEX IF NOT EXISTS playlist_tracks_playlist_track_idx
  ON public.playlist_tracks (playlist_id, track_id);


-- ── 3. updated_at trigger ─────────────────────────────────────────────────────
-- Automatically bumps updated_at on any playlist UPDATE.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS playlists_set_updated_at ON public.playlists;
CREATE TRIGGER playlists_set_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 4. track_count maintenance trigger ────────────────────────────────────────
-- Keeps playlists.track_count accurate after INSERT/DELETE on playlist_tracks.
-- Avoids expensive COUNT(*) on every playlist list fetch.

CREATE OR REPLACE FUNCTION public.sync_playlist_track_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.playlists
      SET track_count = track_count + 1,
          updated_at  = now()
      WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.playlists
      SET track_count = GREATEST(0, track_count - 1),
          updated_at  = now()
      WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS playlist_tracks_count_sync ON public.playlist_tracks;
CREATE TRIGGER playlist_tracks_count_sync
  AFTER INSERT OR DELETE ON public.playlist_tracks
  FOR EACH ROW EXECUTE FUNCTION public.sync_playlist_track_count();


-- ── 5. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.playlists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Clean slate (idempotent)
DROP POLICY IF EXISTS "playlists_select"        ON public.playlists;
DROP POLICY IF EXISTS "playlists_insert"        ON public.playlists;
DROP POLICY IF EXISTS "playlists_update"        ON public.playlists;
DROP POLICY IF EXISTS "playlists_delete"        ON public.playlists;
DROP POLICY IF EXISTS "playlist_tracks_select"  ON public.playlist_tracks;
DROP POLICY IF EXISTS "playlist_tracks_insert"  ON public.playlist_tracks;
DROP POLICY IF EXISTS "playlist_tracks_update"  ON public.playlist_tracks;
DROP POLICY IF EXISTS "playlist_tracks_delete"  ON public.playlist_tracks;

-- playlists: owner has full CRUD; public playlists are readable by all auth'd users
CREATE POLICY "playlists_select"
  ON public.playlists FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "playlists_insert"
  ON public.playlists FOR INSERT
  WITH CHECK (user_id = auth.uid());   -- DB DEFAULT ensures this, policy double-checks

CREATE POLICY "playlists_update"
  ON public.playlists FOR UPDATE
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "playlists_delete"
  ON public.playlists FOR DELETE
  USING (user_id = auth.uid());

-- playlist_tracks: access flows through the parent playlist's RLS
-- SELECT: readable if the parent playlist is owned by the user or is public
CREATE POLICY "playlist_tracks_select"
  ON public.playlist_tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id
        AND (p.user_id = auth.uid() OR p.is_public = true)
    )
  );

-- INSERT/UPDATE/DELETE: only the playlist owner may modify tracks
CREATE POLICY "playlist_tracks_insert"
  ON public.playlist_tracks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "playlist_tracks_update"
  ON public.playlist_tracks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "playlist_tracks_delete"
  ON public.playlist_tracks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id AND p.user_id = auth.uid()
    )
  );


-- ── 6. Verify ─────────────────────────────────────────────────────────────────

-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' ORDER BY tablename;

-- SELECT tablename, policyname, cmd, qual
--   FROM pg_policies WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
