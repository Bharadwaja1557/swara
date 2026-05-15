/**
 * DesktopLayout — Spotify-style 3-column layout.
 * Only rendered on screens >= 1024px.
 * Mobile layout is rendered by AppLayout directly when !isDesktop.
 *
 * Fullscreen now-playing mode:
 *   When isExpanded (playerStore), LibraryPanel and SongInfoPanel are hidden,
 *   main content expands to full width and DesktopNowPlaying fills the area.
 *   ESC key exits fullscreen (handled inside DesktopNowPlaying).
 */
import { Outlet } from 'react-router-dom';
import DesktopTopBar     from '@/components/desktop/DesktopTopBar';
import LibraryPanel      from '@/components/desktop/LibraryPanel';
import SongInfoPanel     from '@/components/desktop/SongInfoPanel';
import DesktopPlayer     from '@/components/desktop/DesktopPlayer';
import DesktopNowPlaying from '@/components/desktop/DesktopNowPlaying';
import { usePlayerStore } from '@/store/playerStore';

const DesktopLayout = () => {
  const { isExpanded, currentTrack } = usePlayerStore();

  // Fullscreen mode: player expanded + a track is loaded
  const fullscreen = isExpanded && !!currentTrack;

  return (
    <div className="flex flex-col h-dvh bg-swara-bg overflow-hidden">
      {/* Top bar — always visible */}
      <DesktopTopBar />

      {/* 3-column body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT — Library (hidden in fullscreen) */}
        {!fullscreen && <LibraryPanel />}

        {/* CENTER — Page content OR desktop now-playing */}
        {fullscreen ? (
          <DesktopNowPlaying />
        ) : (
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none"
            style={{ overscrollBehavior: 'none' }}
            id="main-content"
          >
            <Outlet />
          </main>
        )}

        {/* RIGHT — Song info (hidden in fullscreen) */}
        {!fullscreen && <SongInfoPanel />}
      </div>

      {/* Bottom player — always visible */}
      <DesktopPlayer />
    </div>
  );
};

export default DesktopLayout;
