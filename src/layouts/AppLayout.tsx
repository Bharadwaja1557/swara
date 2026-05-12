import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/nav/BottomNav';
import MiniPlayer from '@/components/player/MiniPlayer';
import FullscreenPlayer from '@/components/player/FullscreenPlayer';
import { usePlayerStore } from '@/store/playerStore';
import { useEffect } from 'react';
import { useLibraryStore } from '@/store/libraryStore';

/**
 * AppLayout
 *
 * Persistent shell that wraps every page.
 * Also owns MiniPlayer + FullscreenPlayer layer.
 * Kicks off library data fetch on mount.
 */
const AppLayout = () => {
  const { currentTrack, isExpanded } = usePlayerStore();
  const load = useLibraryStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const hasMiniPlayer = !!currentTrack;
  const miniPlayerHeight = hasMiniPlayer ? 'calc(4rem + 64px + env(safe-area-inset-bottom, 0px))' : 'calc(4rem + env(safe-area-inset-bottom, 0px))';

  return (
    <div className="flex flex-col min-h-dvh bg-swara-bg">
      {/* Scrollable page content */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: miniPlayerHeight }}
        id="main-content"
      >
        <Outlet />
      </main>

      {/* Mini player (above bottom nav) */}
      <MiniPlayer />

      {/* Persistent bottom navigation */}
      <BottomNav />

      {/* Fullscreen player overlay */}
      <FullscreenPlayer />

      {/* Backdrop when expanded (prevents scroll) */}
      {isExpanded && (
        <div className="fixed inset-0 z-[55] bg-swara-bg pointer-events-none" aria-hidden="true" />
      )}
    </div>
  );
};

export default AppLayout;
