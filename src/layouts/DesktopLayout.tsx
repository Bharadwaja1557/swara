/**
 * DesktopLayout — Spotify-style 3-column layout.
 * Only rendered on screens >= 1024px.
 * Mobile layout is rendered by AppLayout directly when !isDesktop.
 */
import { Outlet } from 'react-router-dom';
import DesktopTopBar  from '@/components/desktop/DesktopTopBar';
import LibraryPanel   from '@/components/desktop/LibraryPanel';
import SongInfoPanel  from '@/components/desktop/SongInfoPanel';
import DesktopPlayer  from '@/components/desktop/DesktopPlayer';
import FullscreenPlayer from '@/components/player/FullscreenPlayer';

const DesktopLayout = () => (
  <div className="flex flex-col h-dvh bg-swara-bg overflow-hidden">
    {/* Top bar */}
    <DesktopTopBar />

    {/* 3-column body */}
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* LEFT — Library */}
      <LibraryPanel />

      {/* CENTER — Page content */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ overscrollBehavior: 'none' }}
        id="main-content"
      >
        <Outlet />
      </main>

      {/* RIGHT — Song info */}
      <SongInfoPanel />
    </div>

    {/* Bottom player */}
    <DesktopPlayer />

    {/* Now playing fullscreen overlay works on both layouts */}
    <FullscreenPlayer />
  </div>
);

export default DesktopLayout;
