-- ============================================================
-- Swara — Supabase Migration: 004_user_library_and_security
-- ============================================================
-- Run this in the Supabase SQL editor or via supabase db push.
-- Idempotent where possible (IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ── 1. user_library table ──────────────────────────────────
--
-- One row per (user, album) pair.
-- track_ids is the ordered subset of album tracks the user has saved.
-- Storing track_ids as a text array avoids a separate junction table
-- at this scale — PostgreSQL native array is efficient for read patterns.
--
-- SECURITY: user_id column has DEFAULT auth.uid().
-- The client NEVER passes user_id. The database populates it automatically.
-- RLS policies below ensure users can only access their own rows.

CREATE TABLE IF NOT EXISTS public.user_library (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id   text        NOT NULL,
  track_ids  text[]      NOT NULL DEFAULT '{}',
  added_at   timestamptz NOT NULL DEFAULT now(),

  -- One album entry per user — upsert on this conflict
  CONSTRAINT user_library_user_album_unique UNIQUE (user_id, album_id)
);

-- Index for fast per-user lookups (the only query pattern we use)
CREATE INDEX IF NOT EXISTS user_library_user_id_idx
  ON public.user_library (user_id, added_at DESC);


-- ── 2. user_library RLS policies ──────────────────────────
--
-- Enable RLS (safe to run even if already enabled)
ALTER TABLE public.user_library ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow clean recreation (idempotent)
DROP POLICY IF EXISTS "user_library_select" ON public.user_library;
DROP POLICY IF EXISTS "user_library_insert" ON public.user_library;
DROP POLICY IF EXISTS "user_library_update" ON public.user_library;
DROP POLICY IF EXISTS "user_library_delete" ON public.user_library;

-- SELECT: user can only read their own rows
CREATE POLICY "user_library_select"
  ON public.user_library
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: DB sets user_id via DEFAULT; policy verifies it matches the caller.
-- This double-check means even if a client somehow passes a different user_id
-- in the payload, the INSERT will be rejected.
CREATE POLICY "user_library_insert"
  ON public.user_library
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: user can only update their own rows
CREATE POLICY "user_library_update"
  ON public.user_library
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: user can only delete their own rows
CREATE POLICY "user_library_delete"
  ON public.user_library
  FOR DELETE
  USING (user_id = auth.uid());


-- ── 3. Harden liked_songs RLS ──────────────────────────────
--
-- The liked_songs table was previously created with user_id passed from the
-- client. We now move ownership to the database level.
--
-- First, add DEFAULT auth.uid() to the user_id column if not already set.
ALTER TABLE public.liked_songs
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Recreate RLS policies without requiring client to pass user_id
ALTER TABLE public.liked_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "liked_songs_select" ON public.liked_songs;
DROP POLICY IF EXISTS "liked_songs_insert" ON public.liked_songs;
DROP POLICY IF EXISTS "liked_songs_delete" ON public.liked_songs;

CREATE POLICY "liked_songs_select"
  ON public.liked_songs
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: DB sets user_id via DEFAULT; policy verifies it
CREATE POLICY "liked_songs_insert"
  ON public.liked_songs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "liked_songs_delete"
  ON public.liked_songs
  FOR DELETE
  USING (user_id = auth.uid());


-- ── 4. profiles RLS (ensure correct) ──────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_insert"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ── 5. Future: playlists tables (scaffolded, disabled) ─────
--
-- Uncomment when ready to implement playlists.
-- track_id scheme ("albumId--trackNumber") works identically here.

/*
CREATE TABLE IF NOT EXISTS public.playlists (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  cover_url   text,
  is_public   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id uuid        NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id    text        NOT NULL,
  position    integer     NOT NULL,
  added_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT playlist_tracks_unique UNIQUE (playlist_id, track_id)
);

CREATE INDEX IF NOT EXISTS playlist_tracks_playlist_id_idx
  ON public.playlist_tracks (playlist_id, position ASC);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- SELECT: public playlists visible to all; private only to owner
CREATE POLICY "playlists_select"
  ON public.playlists FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "playlists_insert"
  ON public.playlists FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "playlists_update"
  ON public.playlists FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "playlists_delete"
  ON public.playlists FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "playlist_tracks_select"
  ON public.playlist_tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id
      AND (p.is_public = true OR p.user_id = auth.uid())
    )
  );

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
*/

-- ── 6. Verify ──────────────────────────────────────────────
-- Run these SELECTs to confirm the migration applied correctly.

-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;

-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
