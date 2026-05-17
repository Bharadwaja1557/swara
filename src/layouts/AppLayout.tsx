/**
 * AppLayout — root layout and deterministic startup sequencer.
 *
 * STARTUP SEQUENCE (strictly ordered, every step awaited):
 *
 *   1. initialize()      — restore Supabase auth session
 *   2a. load()           — fetch library stubs (parallel with 2b)
 *   2b. fetchProfile()   — fetch user profile (parallel with 2a)
 *   3. loadAlbumTracks() — load ALL album track lists in parallel
 *                          (libraryStore uses functional set() — no race)
 *   4. restorePlayback() — resolve saved queue IDs against trackMap, restore
 *                          engine state, DO NOT autoplay
 *   5. syncFromCloud()   — fetch liked IDs from Supabase, resolve via trackMap
 *                          (O(1)), REPLACE local liked state
 *
 * Steps 3–5 run only once per session (syncDoneRef guard) and only after
 * steps 1 + 2a are confirmed complete (isAuth && loaded).
 *
 * Step 2b (profile) is initiated in the same effect as 2a (parallel) since
 * it has no dependency on the library.
 */
import { Outlet }      from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useLibraryStore }   from '@/store/libraryStore';
import { useLikedStore }     from '@/store/likedStore';
import { useAuthStore }      from '@/store/useAuthStore';
import { useProfileStore }   from '@/store/useProfileStore';
import { useIsDesktop }      from '@/hooks/useIsDesktop';
import { restorePlaybackState } from '@/store/playerStore';
import { BottomNav }         from '@/components/nav/BottomNav';
import MiniPlayer            from '@/components/player/MiniPlayer';
import FullscreenPlayer      from '@/components/player/FullscreenPlayer';
import DesktopLayout         from '@/layouts/DesktopLayout';
import LoginModal            from '@/components/auth/LoginModal';
import { ScrollRestorer }    from '@/components/ScrollRestorer';

// ── Mobile shell ──────────────────────────────────────────────────────────────
const MobileLayout = () => (
  <div className="flex flex-col h-dvh bg-swara-bg overflow-hidden">
    <main
      id="main-content"
      className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none"
      style={{ overscrollBehavior: 'none' }}
    >
      <Outlet />
    </main>
    <MiniPlayer />
    <BottomNav />
    <FullscreenPlayer />
  </div>
);

// ── Auth splash — shown ~100–300 ms while session check runs ─────────────────
const AuthSplash = () => (
  <div
    className="fixed inset-0 z-[600] flex items-center justify-center"
    style={{ background: '#080808' }}
  >
    <p
      className="text-[2.5rem] font-bold tracking-[-0.05em] font-display"
      style={{ color: '#c8a96e' }}
    >
      swara
    </p>
  </div>
);

// ── Root ──────────────────────────────────────────────────────────────────────
const AppLayout = () => {
  const load           = useLibraryStore((s) => s.load);
  const loaded         = useLibraryStore((s) => s.loaded);
  const isDesktop      = useIsDesktop();
  const initialize     = useAuthStore((s) => s.initialize);
  const initialized    = useAuthStore((s) => s.initialized);
  const isAuth         = useAuthStore((s) => s.isAuthenticated);
  const fetchProfile   = useProfileStore((s) => s.fetchProfile);

  // Prevents the async steps 3–5 from running more than once per session.
  const syncDoneRef = useRef(false);

  // ── Step 1: restore auth session ─────────────────────────────────────────
  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Steps 2a + 2b: load library stubs AND fetch profile in parallel ───────
  // Profile has no library dependency — both can start immediately after auth.
  useEffect(() => {
    if (!isAuth) return;
    load();           // 2a: album stubs → triggers `loaded` flag when done
    fetchProfile();   // 2b: profile from Supabase (independent of library)
  }, [isAuth, load, fetchProfile]);

  // ── Steps 3–5: track loading + playback restore + liked sync ─────────────
  // Only runs when BOTH auth AND library stubs are confirmed ready.
  // syncDoneRef ensures this is a one-shot operation per session.
  useEffect(() => {
    if (!isAuth || !loaded)  return;
    if (syncDoneRef.current) return;
    syncDoneRef.current = true;

    (async () => {
      console.log('[Startup] ══════════════════════════════════════════════');
      console.log('[Startup] Auth ✓  Library stubs ✓  — full sync sequence starting');

      // ── Step 3: load ALL album tracks in parallel ──────────────────────
      // libraryStore.loadAlbumTracks() uses functional set() so concurrent
      // calls accumulate correctly rather than overwriting each other.
      const { albums, loadAlbumTracks } = useLibraryStore.getState();
      const unloaded = albums.filter((a) => a.tracks.length === 0);

      if (unloaded.length > 0) {
        console.log(`[Startup] Loading tracks for ${unloaded.length} albums in parallel...`);
        await Promise.all(unloaded.map((a) => loadAlbumTracks(a.id)));
      }

      const { trackMap } = useLibraryStore.getState();
      console.log(`[Startup] Track pool ready: ${trackMap.size} tracks (${albums.length} albums) ✓`);

      if (trackMap.size === 0) {
        console.error('[Startup] ERROR: trackMap is empty after loading all albums.');
        console.error('[Startup] Check library fetch / loadAlbumTracks errors above. Aborting sync.');
        return;
      }

      // ── Step 4: restore playback session ──────────────────────────────
      // Resolves saved queue IDs via O(1) trackMap, restores audio engine,
      // seeks to saved timestamp, but NEVER autoplays (browser policy).
      console.log('[Startup] Restoring playback session...');
      restorePlaybackState(trackMap);

      // ── Step 5: sync liked songs from Supabase → Zustand ──────────────
      // Uses trackMap.get() (O(1)) for ID resolution. Replaces local cache.
      console.log('[Startup] Syncing liked songs from cloud...');
      await useLikedStore.getState().syncFromCloud();

      console.log('[Startup] ══════════════════════════════════════════════');
      console.log('[Startup] Startup sequence complete ✓');
    })();
  }, [isAuth, loaded]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!initialized) return <AuthSplash />;
  if (!isAuth)      return <LoginModal />;
  return (
    <>
      {/* Scrolls #main-content to top on every route change */}
      <ScrollRestorer />
      {isDesktop ? <DesktopLayout /> : <MobileLayout />}
    </>
  );
};

export default AppLayout;
