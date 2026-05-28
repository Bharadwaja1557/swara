-- supabase-migration-008.sql
-- Profiles table: canonical schema, trigger, and RLS fix
-- Run AFTER migration 007.
--
-- WHY THIS MIGRATION IS NEEDED:
--   The profiles table was created manually in Supabase without a committed
--   migration file.  Its RLS policy may restrict SELECT to own-row only, which
--   causes playlist creator attribution to show "unknown" or UUID fragments
--   when any authenticated user tries to read another user's playlist.
--
--   Usernames are NOT sensitive — they are displayed publicly as playlist
--   creator attribution ("by neo").  The correct policy is: any authenticated
--   user can read any profile's username.  Only the owner can UPDATE their own.
--
-- IDEMPOTENT: safe to re-run.

-- ── 1. Ensure profiles table exists ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid        PRIMARY KEY
                           REFERENCES auth.users(id) ON DELETE CASCADE,
  username     text        NOT NULL,
  display_name text,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT profiles_username_length CHECK (char_length(username) BETWEEN 1 AND 50)
);

-- Index for fast username lookups (used in search / attribution)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (lower(username));

-- ── 2. Trigger: auto-create profile on user signup ────────────────────────────
--
-- Derives username from the email's local part: neo@swara.app → "neo"
-- This runs synchronously on auth.users INSERT so there is NO race condition
-- between the user being created and the profile row existing.
--
-- The application-side getOrCreate() is a fallback only for:
--   a) users created BEFORE this trigger was installed
--   b) dev/test environments where the trigger was dropped

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER          -- runs as superuser so it can INSERT into profiles
SET search_path = public
AS $$
DECLARE
  derived_username text;
BEGIN
  -- Derive username from email local-part (before @)
  derived_username := split_part(NEW.email, '@', 1);

  -- Guarantee uniqueness: if the username is taken, append first 4 chars of UUID
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(derived_username)) THEN
    derived_username := derived_username || '_' || left(replace(NEW.id::text, '-', ''), 4);
  END IF;

  INSERT INTO public.profiles (id, username, created_at)
  VALUES (NEW.id, derived_username, now())
  ON CONFLICT (id) DO NOTHING;  -- idempotent: if row already exists, skip

  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger so this migration is idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 3. Backfill: create profiles for existing users who don't have one ────────
--
-- For users created before the trigger existed, insert a profile row derived
-- from their email.  Uses ON CONFLICT DO NOTHING so existing rows are untouched.
--
-- NOTE: auth.users is in the auth schema; this SELECT requires the service role.
-- In the Supabase dashboard SQL editor this runs with the service role by default.

DO $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at)
  SELECT
    u.id,
    split_part(u.email, '@', 1) AS username,
    COALESCE(u.created_at, now())
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Backfill complete: % profile(s) created',
    (SELECT count(*) FROM public.profiles);
END;
$$;


-- ── 4. RLS: correct policies ───────────────────────────────────────────────────
--
-- KEY CHANGE: SELECT is open to ALL authenticated users.
-- This is required for playlist creator attribution to work correctly.
-- Usernames are public identifiers — this is the same model used by
-- Spotify, Apple Music, SoundCloud, and every other music platform.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean slate (idempotent)
DROP POLICY IF EXISTS "profiles_select_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_select"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_update"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete"       ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile."       ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile."             ON public.profiles;

-- SELECT: any authenticated user can read any profile (for creator attribution)
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: users may only insert their own profile row (service role bypasses RLS)
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE: users may only update their own profile
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING    (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE: no client-side deletes (ON DELETE CASCADE from auth.users handles cleanup)
-- No DELETE policy → no client can delete profiles.


-- ── 5. Verify ──────────────────────────────────────────────────────────────────

-- SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies
--  WHERE schemaname = 'public' AND tablename = 'profiles'
--  ORDER BY policyname;

-- SELECT count(*) AS profiles_count FROM public.profiles;
