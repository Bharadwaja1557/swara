-- supabase-migration-006.sql
-- Favorite Artists Cloud Sync
-- Run in: Supabase Dashboard → SQL Editor
--
-- Creates the favorite_artists table and RLS policies required for
-- useFavoriteArtistsStore.syncFromCloud() to work correctly.
--
-- Architecture mirrors liked_songs: user_id set by DEFAULT auth.uid(),
-- never passed from client, enforced by RLS INSERT WITH CHECK.

-- ── Table ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS favorite_artists (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        DEFAULT auth.uid() NOT NULL
                          REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id   text        NOT NULL,
  followed_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE (user_id, artist_id)
);

-- ── Indexes ────────────────────────────────────────────────────────────────────

-- Fast lookup of all followed artists for a given user (used by getFollowedArtists())
CREATE INDEX IF NOT EXISTS idx_favorite_artists_user_id
  ON favorite_artists (user_id);

-- Fast single-artist lookup (used by the unique constraint, explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_favorite_artists_user_artist
  ON favorite_artists (user_id, artist_id);

-- ── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE favorite_artists ENABLE ROW LEVEL SECURITY;

-- SELECT: each user sees only their own rows
CREATE POLICY "Users can read own favorite artists"
  ON favorite_artists
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: user_id is enforced to equal auth.uid() even though the client
--         omits it (the DEFAULT handles the value; WITH CHECK verifies it)
CREATE POLICY "Users can insert own favorite artists"
  ON favorite_artists
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- DELETE: users can only remove their own rows
CREATE POLICY "Users can delete own favorite artists"
  ON favorite_artists
  FOR DELETE
  USING (user_id = auth.uid());

-- No UPDATE policy — the workflow is delete-then-insert (upsert on artist_id).
