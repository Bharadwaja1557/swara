/**
 * AppLayout — root layout and deterministic startup sequencer.
 *
 * STARTUP SEQUENCE (strictly ordered, every step awaited):
 *
 *   1. initialize()         — restore Supabase auth session
 *   2a. load()              — fetch library stubs (parallel with 2b)
 *   2b. fetchProfile()      — fetch user profile (parallel with 2a)
 *   3. loadAlbumTracks()    — load ALL album track lists in parallel
 *   4. restorePlayback()    — resolve saved queue IDs against trackMap
 *   5. liked.syncFromCloud()    — fetch liked IDs from Supabase
 *   6. library.syncFromCloud()  — fetch user library from Supabase
 *   7. playlists.syncFromCloud()— fetch playlist stubs from Supabase
 *
 * Steps 5, 6, 7 run in parallel (no inter-dependency).
 */
import { Outlet }      from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useLibraryStore }      from '@/store/libraryStore';
import { useLikedStore }        from '@/store/likedStore';
import { useUserLibraryStore }  from '@/store/useUserLibraryStore';
import { usePlaylistStore }     from '@/store/usePlaylistStore';
import { useAuthStore }         from '@/store/useAuthStore';
import { useProfileStore }      from '@/store/useProfileStore';
import { useIsDesktop }         from '@/hooks/useIsDesktop';
import { restorePlaybackState } from '@/store/playerStore';
import { startRealtimeSync, stopRealtimeSync } from '@/lib/realtimeSync';
import { BottomNav }            from '@/components/nav/BottomNav';
import MiniPlayer               from '@/components/player/MiniPlayer';
import FullscreenPlayer         from '@/components/player/FullscreenPlayer';
import DesktopLayout            from '@/layouts/DesktopLayout';
import LoginModal               from '@/components/auth/LoginModal';
import { ScrollRestorer }       from '@/components/ScrollRestorer';
import { ToastProvider }        from '@/components/ui/ToastProvider';

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
  const load              = useLibraryStore((s) => s.load);
  const loaded            = useLibraryStore((s) => s.loaded);
  const isDesktop         = useIsDesktop();
  const initialize        = useAuthStore((s) => s.initialize);
  const initialized       = useAuthStore((s) => s.initialized);
  const isAuth            = useAuthStore((s) => s.isAuthenticated);
  const fetchProfile      = useProfileStore((s) => s.fetchProfile);

  // Prevents the async steps 3–6 from running more than once per session.
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

  // ── Steps 3–6: track loading + playback restore + cloud syncs ─────────────
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

      // ── Steps 5 + 6 + 7: sync liked, library, playlists in parallel ──────
      // All three are independent — none depends on the others.
      // All use cloud-authoritative replace strategy.
      console.log('[Startup] Syncing liked songs, user library, and playlists from cloud...');
      await Promise.all([
        useLikedStore.getState().syncFromCloud(),
        useUserLibraryStore.getState().syncFromCloud(),
        usePlaylistStore.getState().syncFromCloud(),
        // Folders sync after playlists (same pattern, independent)
        import('@/store/useFolderStore').then(({ useFolderStore }) =>
          useFolderStore.getState().syncFromCloud()
        ),
      ]);

      // ── Step 8: Start Supabase Realtime sync ──────────────────────────
      // Must start AFTER initial sync so we don't double-process startup changes.
      // Realtime delivers push notifications for playlist_tracks and playlists
      // changes — enables sub-second cross-device reorder propagation.
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        startRealtimeSync(userId);
      }

      console.log('[Startup] ══════════════════════════════════════════════');
      console.log('[Startup] Startup sequence complete ✓');
    })();
  }, [isAuth, loaded]);

  // ── Stop realtime sync on logout ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuth) {
      stopRealtimeSync();
      // Reset syncDoneRef so re-login triggers full startup sequence again
      syncDoneRef.current = false;
    }
  }, [isAuth]);
  // This is the cross-device reorder sync fix.
  //
  // Why cover sync appears instant but reorder does not:
  //   Cover upload updates a single `playlists` row → syncFromCloud picks it up.
  //   Reorder updates many `playlist_tracks.position` rows → syncFromCloud
  //   only re-runs on app startup (syncDoneRef gate). Device B never sees the
  //   new order until the user reopens the app or returns to the tab.
  //
  // Fix: re-sync playlists (and folders) whenever:
  //   a) the window regains focus     — user switches from another device/browser
  //   b) the tab becomes visible again — user switches back from another tab
  //
  // Both fire syncFromCloud which calls getAllPlaylists() with the Q2 batch
  // track-order fetch, so track ordering from Supabase replaces local state.
  // The `isSyncing` guard in the store prevents concurrent duplicate calls.
  useEffect(() => {
    if (!isAuth) return;

    const syncPlaylists = () => {
      // Only re-sync when the document is actually visible to avoid
      // unnecessary network calls on background tabs.
      if (document.visibilityState !== 'visible') return;
      console.log('[Sync] Focus/visibility → re-syncing playlists + folders');
      usePlaylistStore.getState().syncFromCloud();
      import('@/store/useFolderStore').then(({ useFolderStore }) =>
        useFolderStore.getState().syncFromCloud()
      ).catch(() => {});
    };

    window.addEventListener('focus', syncPlaylists);
    document.addEventListener('visibilitychange', syncPlaylists);

    return () => {
      window.removeEventListener('focus', syncPlaylists);
      document.removeEventListener('visibilitychange', syncPlaylists);
    };
  }, [isAuth]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!initialized) return <AuthSplash />;
  if (!isAuth)      return <LoginModal />;
  return (
    <>
      {/* Scrolls #main-content to top on every route change */}
      <ScrollRestorer />
      {/* Global toast notifications — rendered above all content layers */}
      <ToastProvider />
      {isDesktop ? <DesktopLayout /> : <MobileLayout />}
    </>
  );
};

export default AppLayout;
