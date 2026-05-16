/**
 * AppLayout — root layout and startup sequencer.
 *
 * STARTUP SEQUENCE (strictly ordered):
 *   1. initialize() — restore auth session from localStorage
 *   2. load()       — fetch library catalogue (album stubs + initial tracks)
 *   3. loadAlbumTracks() — load ALL album track lists (needed for ID resolution)
 *   4. syncFromCloud()   — fetch cloud liked IDs, resolve → Track objects, REPLACE local
 *
 * Steps 3+4 only run once steps 1+2 are confirmed complete.
 * This ordering is the fix for cross-device liked-song sync failure.
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
      className="flex-1 overflow-y-auto overflow-x-hidden"
      style={{ overscrollBehavior: 'none' }}
    >
      <Outlet />
    </main>
    <MiniPlayer />
    <BottomNav />
    <FullscreenPlayer />
  </div>
);

// ── Auth splash — shown for the ~100–300ms while session check runs ───────────
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

// ── Root layout ───────────────────────────────────────────────────────────────
const AppLayout = () => {
  const load       = useLibraryStore((s) => s.load);
  const loaded     = useLibraryStore((s) => s.loaded);
  const isDesktop  = useIsDesktop();
  const initialize  = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);
  const isAuth      = useAuthStore((s) => s.isAuthenticated);

  // Guard: run the full startup sequence only once per session
  const syncDoneRef = useRef(false);

  // ── Step 1: restore auth session ─────────────────────────────────────────
  useEffect(() => {
    initialize();
  }, [initialize]); // eslint-disable-line

  // ── Step 2: load library catalogue (only after auth confirmed) ────────────
  useEffect(() => {
    if (isAuth) load();
  }, [isAuth, load]);

  // ── Steps 3 + 4: full liked-songs sync sequence ───────────────────────────
  // Runs only when BOTH auth AND library stubs are confirmed ready.
  // This is the only place syncFromCloud() is called — the fix for the
  // cross-device sync failure caused by calling it prematurely in
  // onAuthStateChange (before library tracks were available).
  useEffect(() => {
    if (!isAuth || !loaded) return;       // wait for both preconditions
    if (syncDoneRef.current) return;      // run only once per session
    syncDoneRef.current = true;

    (async () => {
      console.log('[Startup] ── liked sync sequence starting ─────────────────');
      console.log('[Startup] Auth ✓  Library stubs ✓');

      // Step 3: ensure ALL album tracks are loaded so track IDs can be resolved
      const { albums, loadAlbumTracks } = useLibraryStore.getState();
      const unloaded = albums.filter((a) => a.tracks.length === 0);

      if (unloaded.length > 0) {
        console.log(`[Startup] Loading tracks for ${unloaded.length} albums...`);
        await Promise.all(unloaded.map((a) => loadAlbumTracks(a.id)));
        console.log(`[Startup] Album tracks ready ✓ (${useLibraryStore.getState().tracks.length} total tracks)`);
      } else {
        console.log(`[Startup] Tracks already loaded ✓ (${useLibraryStore.getState().tracks.length} total)`);
      }

      // Step 4: sync liked songs — cloud overwrites local
      console.log('[Startup] Syncing liked songs from cloud...');
      await useLikedStore.getState().syncFromCloud();
      console.log('[Startup] ── startup sequence complete ────────────────────');
    })();
  }, [isAuth, loaded]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!initialized) return <AuthSplash />;
  if (!isAuth)      return <LoginModal />;
  return isDesktop  ? <DesktopLayout /> : <MobileLayout />;
};

export default AppLayout;
