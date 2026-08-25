# Swara

A personal music streaming app — React + TypeScript on the front end, a public
GitHub repo as the music catalog, and Supabase for accounts and everything the
user saves. Runs as a web app (GitHub Pages), an installable PWA, and an Android
app via Capacitor.

Current app version: **10.1** (`src/version.ts`).

---

## Contents

- [How it works](#how-it-works)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Supabase setup](#supabase-setup)
- [Android build (Capacitor)](#android-build-capacitor)
- [Deployment](#deployment)
- [Architecture notes](#architecture-notes)
- [Conventions](#conventions)
- [Not implemented yet](#not-implemented-yet)

---

## How it works

Two independent backends, neither of which is a server Swara owns:

```
  MUSIC CATALOG (read-only, public)          USER DATA (per-account, private)
  ─────────────────────────────────          ────────────────────────────────
                                               Supabase (Postgres + Auth + Storage)
    library.json      album manifest           liked_songs, user_library,
    albums/*.json     per-album track lists     playlists, playlist_tracks,
    audio + cover assets                        playlist_saves, playlist_folders,
            │                                   playlist_folder_entries,
            │  jsDelivr CDN                     favorite_artists, profiles
            ▼                                            │
       ┌──────────────────────────────────────────────────┐
       │            Swara (React SPA, no server)          │
       │  HTMLAudioElement engine + Zustand stores        │
       └──────────────────────────────────────────────────┘
```

The catalog is fetched at startup: `library.json` gives album stubs, then every
album's track JSON is fetched in parallel. Tracks get deterministic IDs of the
form `${albumId}--${trackNumber}` (e.g. `dear-comrade-ost--3`), which is what
makes it safe to store bare track IDs in Supabase — no music metadata is ever
duplicated into the database.

All catalog URLs are resolved through a single module,
[mediaProvider.ts](src/features/media/mediaProvider.ts). Flipping the
`ACTIVE_PROVIDER` constant (`'jsdelivr'` → `'github-raw'`) swaps the entire
delivery layer, and relative asset paths are rewritten to the active origin.

---

## Features

**Playback**

- Background-safe audio engine built on a single `HTMLAudioElement`, living
  outside React so playback survives re-renders and route changes
- Queue with shuffle (Fisher-Yates), repeat off/all/one, reorder, remove,
  play-next and append
- "Playing from …" context tracking (album / artist / liked / library /
  playlist / search / manual) persisted with the queue
- Next-track preloading — buffering starts at 50% of the current track and the
  buffered element is swapped in at transition time
- Media Session integration: lock-screen art and metadata, hardware/Bluetooth/
  car controls, seek, ±10s skip
- Playback session (queue, index, shuffle, repeat, volume, position) restored on
  reload — paused, never autoplaying

**Library and content**

- Home: greeting, recently played, quick picks (shuffle play / latest uploads),
  explore albums, library stats
- Album, artist (with similar-artists heuristic), liked songs, queue, and search
  pages; search covers tracks, albums, artists and playlists, with entity-based
  search history
- Personal library of albums and individual tracks, explicitly followed artists,
  and liked songs — all cloud-synced
- Playlists: create, rename, describe, reorder by drag (@dnd-kit), preset or
  uploaded covers, auto-generated collage artwork from track covers, public/
  private toggle, soft delete
- Playlist folders, and saving other users' public playlists by reference (edits
  by the creator propagate — nothing is cloned)
- Public user profiles at `/user/:username` showing only public playlists

**Shell and platform**

- Separate mobile shell (bottom nav, mini player, swipe-down fullscreen player)
  and desktop shell (three-column layout, top bar, library panel, song-info
  panel, fullscreen now-playing) switched at 1024px
- Three themes — dark, semi-dark, light — as CSS variables on `[data-theme]`,
  persisted locally and synced to the user's Supabase profile
- Keyboard controls: Space, Alt/Ctrl + arrows for next/prev and volume
- Avatar upload with client-side resize to 512×512 WebP and cache-busted URLs
- Toasts, bottom sheets that become centered modals on desktop, scroll
  restoration, typed media-error messages
- Android hardware back button and status-bar handling under Capacitor

---

## Tech stack

| Layer       | Choice                                                             |
| ----------- | ------------------------------------------------------------------ |
| UI          | React 18, TypeScript 5 (strict), Tailwind CSS 3                    |
| State       | Zustand 5 (no middleware — persistence is hand-rolled)             |
| Routing     | react-router-dom 6, `HashRouter` (GitHub Pages / WebView friendly) |
| Build       | Vite 5                                                             |
| Backend     | Supabase (Auth, Postgres with RLS, Realtime, Storage)              |
| Drag & drop | @dnd-kit                                                           |
| Native      | Capacitor 8 (Android)                                              |
| Fonts       | Syne (display), DM Sans (body)                                     |

---

## Project structure

```
src/
  main.tsx            entry — applies theme + Capacitor init before render
  App.tsx             HashRouter route table
  version.ts          APP_VERSION — single source of truth

  layouts/
    AppLayout.tsx     root shell AND the deterministic startup sequencer
    DesktopLayout.tsx three-column desktop shell (>= 1024px)

  pages/              Home, Search, Library, Album, Artist, Playlist, Folder,
                      LikedSongs, Queue, Profile, PublicUser
  components/
    home/ nav/ player/ desktop/ profile/ auth/ ui/

  features/
    media/            provider URLs, format probing, error taxonomy, logger
    artwork/          playlist artwork resolution + cache (canonical)
    playlists/        cover registry, edit modal, sorting
    library/          LibraryContent — one renderer for page and panel
    offline/          resolveTrackSource — pass-through stub for future downloads

  store/              Zustand stores (see below)
  repositories/       every Supabase call lives here — nothing else imports it
  services/auth/      AuthService — username ⇄ email translation
  lib/                queueBuilders, trackActions, selectors, navigation,
                      audioPreloader, realtimeSync, persistence/, image/
  utils/library.ts    catalog fetch, normalization, artist index
  types/music.ts      domain types

supabase_sql_scripts/ migrations 005–010 (DDL + RLS policies)
android/              Capacitor Android project
```

### Stores

| Store                                                               | Responsibility                                            |
| ------------------------------------------------------------------- | --------------------------------------------------------- |
| `playerStore`                                                       | audio engine, queue, playback state, recents              |
| `libraryStore`                                                      | catalog + canonical `trackMap` / `albumMap` / `artistMap` |
| `likedStore`                                                        | liked tracks                                              |
| `useUserLibraryStore`                                               | saved albums and individual tracks                        |
| `usePlaylistStore` / `useFolderStore`                               | playlists and folders                                     |
| `useFavoriteArtistsStore`                                           | explicitly followed artists                               |
| `useAuthStore` / `useProfileStore`                                  | session and profile                                       |
| `useThemeStore` / `useLibraryPrefsStore`                            | theme, library sort/view/tab                              |
| `useSearchHistoryStore` / `useDesktopSearchStore` / `useToastStore` | UI state                                                  |

---

## Getting started

**Prerequisites:** Node 18+, npm, and a Supabase project.

```bash
git clone https://github.com/Bharadwaja1557/swara
cd swara
npm install
```

Create `.env` in the repo root:

```bash
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Both are required — [supabase.ts](src/lib/supabase.ts) logs a hard error at
module load if either is missing, and nothing in the app will work without them.

```bash
npm run dev        # Vite dev server
npm run build      # tsc && vite build  → dist/  (base: /swara/)
npm run preview    # serve the production build locally
```

There is no linter or test suite configured; `tsc` under `npm run build` is the
only automated check.

### Scripts

| Script          | Does                                             |
| --------------- | ------------------------------------------------ |
| `dev`           | Vite dev server                                  |
| `build`         | typecheck + production build with base `/swara/` |
| `build:android` | same, with base `/` (mode `android`)             |
| `cap:sync`      | `build:android` then `npx cap sync android`      |
| `cap:open`      | open the Android project in Android Studio       |
| `preview`       | preview the built bundle                         |
| `deploy`        | publish `dist/` to `gh-pages`                    |

---

## Supabase setup

**1. Run the migrations.** Paste `supabase_sql_scripts/supabase-migration-005
…010.sql` into the Supabase SQL editor in order. They are idempotent and safe to
re-run. Note that 001–004 are not in this repo — the tables they created
(`liked_songs`, `user_library`) are documented in the repository files that use
them, [LikedSongsRepository.ts](src/repositories/likedSongs/LikedSongsRepository.ts)
and [UserLibraryRepository.ts](src/repositories/userLibrary/UserLibraryRepository.ts).

Tables in use: `profiles`, `liked_songs`, `user_library`, `playlists`,
`playlist_tracks`, `playlist_saves`, `playlist_folders`,
`playlist_folder_entries`, `favorite_artists`.

**2. Enable Realtime** for cross-device playlist sync:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE playlist_tracks;
```

**3. Create storage buckets:**

| Bucket            | Public | Contents                        |
| ----------------- | ------ | ------------------------------- |
| `avatars`         | yes    | `{user_id}.webp`, one per user  |
| `playlist-covers` | yes    | `{user_id}/{playlist_id}.{ext}` |

**4. Create users manually.** There is no public sign-up. Add users in the
Supabase dashboard with the email convention `<username>@swara.app`; the UI only
ever asks for a username and
[AuthService](src/services/auth/AuthService.ts) does the translation. A trigger
from migration 008 creates the matching `profiles` row.

### Security model

`user_id` is never sent from the client. Every relevant column is
`DEFAULT auth.uid()` and RLS enforces `user_id = auth.uid()` on select, insert
and delete — so tampering with the JS bundle cannot produce a cross-user write.
Profiles are readable by any authenticated user (usernames are shown as playlist
attribution); only the owner can update their own row.

---

## Android build (Capacitor)

App ID `com.swara.app`, min SDK 24, compile/target SDK 36.

```bash
npm run cap:sync   # build with base "/" and copy into android/
npm run cap:open   # open in Android Studio, then Run or Build APK
```

The Android build must use `build:android` — the default build hardcodes the
`/swara/` GitHub Pages sub-path, which breaks asset resolution inside the
WebView. [capacitor.config.ts](capacitor.config.ts) sets
`androidScheme: 'https'` so Supabase auth, `localStorage` and Web Crypto behave
as they do on a real HTTPS origin, and pins the status bar to the app background
(`#09090C`) so there is no white flash on launch.

---

## Deployment

```bash
npm run deploy     # predeploy runs the build, then gh-pages -d dist
```

Published at `https://bharadwaja1557.github.io/swara`. Two things make the
sub-path work: `base: "/swara/"` in [vite.config.ts](vite.config.ts), and
`HashRouter` so deep links resolve without server rewrites. Anything referencing
a file in `public/` must join against `import.meta.env.BASE_URL` rather than a
root-absolute path — see
[coverRegistry.ts](src/features/playlists/coverRegistry.ts).

---

## Architecture notes

### Startup is a strict sequence

[AppLayout](src/layouts/AppLayout.tsx) owns it, and the order matters:

1. restore the Supabase session
2. in parallel — fetch catalog stubs, fetch profile (then apply cloud theme)
3. load **all** album track lists in parallel, populating `trackMap`
4. restore the persisted playback session against `trackMap`
5. in parallel — sync liked songs, user library, playlists, folders, followed
   artists from Supabase
6. start the Realtime subscription

Cloud sync cannot run before step 3: saved rows are bare track IDs, and with an
empty `trackMap` they resolve to nothing and the hydration silently produces an
empty library. A `syncDoneRef` makes the sequence one-shot per session; it is
reset on logout.

### Local-first, cloud-authoritative

Every user-data store follows the same shape: seed from `localStorage` on mount
so the UI is instant, replace wholesale with Supabase state on
`syncFromCloud()`, apply mutations optimistically and fire the cloud write
without awaiting it, and `reset()` on logout. Logout clears all user state
_before_ invalidating the session, so account switches on a shared device can't
leak data.

Realtime ([realtimeSync.ts](src/lib/realtimeSync.ts)) subscribes to `playlists`
and `playlist_tracks` and debounces 300ms before re-syncing — that's what makes
a reorder on one device show up on another without a refresh. Focus and
visibility events trigger a re-sync as a fallback.

### Playback

The engine (module-level state in [playerStore.ts](src/store/playerStore.ts)) is
deliberately outside React; Zustand holds only a projection of it, pushed
through a `_sync()` callback. Seven queue invariants are documented at the top of
the file and checked after every mutation in dev builds. Playback errors are
classified into a typed taxonomy
([mediaErrors.ts](src/features/media/mediaErrors.ts)) and auto-skip to the next
track, with a five-consecutive-failure circuit breaker.

Persisted playback state is versioned: `swara_playback_v3` with a pure migration
pipeline in [lib/persistence/](src/lib/persistence/). Adding v4 means adding a
schema interface, one migration function, and a pipeline entry.

### Queue construction is centralized

Components never build track arrays. They call `trackActions.playXxx()`, which
calls a builder in [queueBuilders.ts](src/lib/queueBuilders.ts), which returns
`{ tracks, context, startIndex }` for `playerStore.playQueue()`. Shuffle is
applied by the engine, never by a builder. Similarly, all route strings live in
[navigation.ts](src/lib/navigation.ts), and all Supabase calls live in
`repositories/`.

### Theming

Three themes are pure CSS-variable swaps on `[data-theme]`, mapped to Tailwind
`swara-*` tokens. Components use `bg-swara-bg`, `text-swara-text` and never need
to know the current theme. `initTheme()` runs in `main.tsx` before React renders,
so there is no flash.

---

## Conventions

- **Path alias** — `@/` maps to `src/` (configured in both `tsconfig.json` and
  `vite.config.ts`)
- **Versioning** — `APP_VERSION` in [src/version.ts](src/version.ts) only. Major
  digit for architectural changes, minor for features and polish. `10.x` is the
  Capacitor/Android generation
- **Barrel imports** — import from `@/features/media`, `@/features/artwork`,
  `@/features/library`, not their sub-files
- **Comments** — non-obvious decisions are documented as file headers explaining
  why the current shape exists, often including the bug that motivated it. Keep
  that up when changing those files

---

## Not implemented yet

- **Offline downloads.** [resolveTrackSource.ts](src/features/offline/resolveTrackSource.ts)
  is a pass-through stub with the intended design written out — IndexedDB on
  web, Capacitor Filesystem on native. Not `localStorage`
- **Service worker.** The manifest and icons make the app installable, but there
  is no offline shell or asset caching
- **iOS.** Capacitor is configured for Android only
- **Tests and linting.** Neither is set up
- **"Most played" and "Hide song"** are present in the UI as disabled
  coming-soon affordances
