import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/nav/BottomNav';
import MiniPlayer from '@/components/player/MiniPlayer';
import FullscreenPlayer from '@/components/player/FullscreenPlayer';
import { useEffect } from 'react';
import { useLibraryStore } from '@/store/libraryStore';

const AppLayout = () => {
  const load = useLibraryStore((s) => s.load);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-dvh bg-swara-bg overflow-hidden">
      {/* Scrollable page content */}
      <main
        id="main-content"
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ overscrollBehavior: 'none' }}
      >
        <Outlet />
      </main>

      {/* MiniPlayer — sticky above nav, not floating */}
      <MiniPlayer />

      {/* Bottom nav */}
      <BottomNav />

      {/* Now Playing — fullscreen overlay */}
      <FullscreenPlayer />
    </div>
  );
};

export default AppLayout;
