/**
 * AppLayout — root layout and startup sequencer.
 *
 * STARTUP SEQUENCE (strictly ordered, all steps awaited):
 *
 *   1. initialize()       — restore Supabase auth session from localStorage
 *   2. load()             — fetch library catalogue (album stubs, tracks:[])
 *   3. loadAlbumTracks()  — load ALL album track lists in parallel
 *                           (fixed: functional set() in libraryStore prevents
 *                            concurrent calls from overwriting each other)
 *   4. syncFromCloud()    — fetch liked IDs from Supabase, resolve against
 *                           the now-complete track pool, REPLACE local state
 *
 * Steps 3+4 run only once per session (syncDoneRef guard) and only after
 * steps 1+2 are confirmed complete (isAuth && loaded).
 */
import { Outlet } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { useLikedStore }   from '@/store/likedStore';
import { useAuthStore }    from '@/store/useAuthStore';
import { useIsDesktop }    from '@/hooks/useIsDesktop';
import { BottomNav }       from '@/components/nav/BottomNav';
import MiniPlayer          from '@/components/player/MiniPlayer';
import FullscreenPlayer    from '@/components/player/FullscreenPlayer';
import DesktopLayout       from '@/layouts/DesktopLayout';
import LoginModal          from '@/components/auth/LoginModal';

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

// ── Splash: shown ~100–300 ms while auth check runs ──────────────────────────
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
  const load        = useLibraryStore((s) => s.load);
  const loaded      = useLibraryStore((s) => s.loaded);
  const isDesktop   = useIsDesktop();
  const initialize  = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);
  const isAuth      = useAuthStore((s) => s.isAuthenticated);

  // Ensures the 3+4 async sequence runs exactly once per browser session.
  const syncDoneRef = useRef(false);

  // ── Step 1: restore auth session ─────────────────────────────────────────
  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 2: load library stubs (album metadata, tracks:[]) ───────────────
  useEffect(() => {
    if (isAuth) load();
  }, [isAuth, load]);

  // ── Steps 3 + 4: load all track data, then hydrate liked store ────────────
  useEffect(() => {
    if (!isAuth || !loaded)       return;  // wait for preconditions
    if (syncDoneRef.current)      return;  // run only once
    syncDoneRef.current = true;

    (async () => {
      console.log('[Startup] ═══════════════════════════════════════════════');
      console.log('[Startup] Auth ✓  Library stubs ✓  — starting sync sequence');

      // ── Step 3: load ALL album tracks in parallel ─────────────────────
      // libraryStore.loadAlbumTracks() now uses functional set() so
      // concurrent calls accumulate correctly instead of overwriting.
      const { albums, loadAlbumTracks } = useLibraryStore.getState();
      const unloaded = albums.filter((a) => a.tracks.length === 0);

      if (unloaded.length > 0) {
        console.log(`[Startup] Loading tracks for ${unloaded.length} albums in parallel...`);
        await Promise.all(unloaded.map((a) => loadAlbumTracks(a.id)));
      }

      // Verify the pool is complete before handing off to syncFromCloud.
      const finalPool = useLibraryStore.getState().tracks;
      console.log(`[Startup] Track pool complete: ${finalPool.length} tracks across ${albums.length} albums ✓`);

      if (finalPool.length === 0) {
        console.error('[Startup] ERROR: track pool is empty after loading all albums.');
        console.error('[Startup] Check library fetch / loadAlbumTracks for errors above.');
        return; // abort — syncFromCloud would resolve nothing
      }

      // ── Step 4: cloud → local hydration ──────────────────────────────
      console.log('[Startup] Handing off to syncFromCloud...');
      await useLikedStore.getState().syncFromCloud();

      console.log('[Startup] ═══════════════════════════════════════════════');
      console.log('[Startup] Startup sequence complete.');
    })();
  }, [isAuth, loaded]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!initialized) return <AuthSplash />;
  if (!isAuth)      return <LoginModal />;
  return isDesktop  ? <DesktopLayout /> : <MobileLayout />;
};

export default AppLayout;
