import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/nav/BottomNav';
import MiniPlayer from '@/components/player/MiniPlayer';
import FullscreenPlayer from '@/components/player/FullscreenPlayer';
import { usePlayerStore } from '@/store/playerStore';
import { useEffect } from 'react';
import { useLibraryStore } from '@/store/libraryStore';

/**
 * AppLayout — persistent shell wrapping every page.
 *
 * Fix 8: overscrollBehavior: 'none' on the main scroll area
 * prevents Chrome/Safari pull-to-refresh from firing when the
 * user swipes down on the now-playing screen.
 */
const AppLayout = () => {
  const { currentTrack } = usePlayerStore();
  const load = useLibraryStore((s) => s.load);

  useEffect(() => { load(); }, [load]);

  // Bottom padding = nav (64px) + mini-player (72px) + safe area
  const bottomPad = currentTrack
    ? 'calc(64px + 72px + env(safe-area-inset-bottom, 0px))'
    : 'calc(64px + env(safe-area-inset-bottom, 0px))';

  return (
    <div className="flex flex-col h-dvh bg-swara-bg overflow-hidden">
      {/* Page content */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          paddingBottom:     bottomPad,
          overscrollBehavior: 'none',   /* ← prevents pull-to-refresh */
        }}
        id="main-content"
      >
        <Outlet />
      </main>

      {/* Mini player strip (above bottom nav) */}
      <MiniPlayer />

      {/* Bottom nav */}
      <BottomNav />

      {/* Fullscreen now-playing overlay */}
      <FullscreenPlayer />
    </div>
  );
};

export default AppLayout;
