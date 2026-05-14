import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { BottomNav } from '@/components/nav/BottomNav';
import MiniPlayer from '@/components/player/MiniPlayer';
import FullscreenPlayer from '@/components/player/FullscreenPlayer';
import DesktopLayout from '@/layouts/DesktopLayout';

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

const AppLayout = () => {
  const load      = useLibraryStore((s) => s.load);
  const isDesktop = useIsDesktop();

  useEffect(() => { load(); }, [load]);

  // Desktop: render full 3-column layout (DesktopLayout contains its own Outlet)
  // Mobile:  render slim flex-column layout (unchanged from before)
  return isDesktop ? <DesktopLayout /> : <MobileLayout />;
};

export default AppLayout;
