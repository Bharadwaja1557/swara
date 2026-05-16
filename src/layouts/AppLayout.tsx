import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { useAuthStore }    from '@/store/useAuthStore';
import { useIsDesktop }    from '@/hooks/useIsDesktop';
import { BottomNav }       from '@/components/nav/BottomNav';
import MiniPlayer          from '@/components/player/MiniPlayer';
import FullscreenPlayer    from '@/components/player/FullscreenPlayer';
import DesktopLayout       from '@/layouts/DesktopLayout';
import LoginModal          from '@/components/auth/LoginModal';

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

/** Minimal branded splash — shown for the ~200ms while auth initializes. */
const AuthSplash = () => (
  <div className="fixed inset-0 z-[600] flex items-center justify-center" style={{ background: '#080808' }}>
    <p className="text-[2.5rem] font-bold tracking-[-0.05em] font-display" style={{ color: '#c8a96e' }}>
      swara
    </p>
  </div>
);

const AppLayout = () => {
  const load        = useLibraryStore((s) => s.load);
  const isDesktop   = useIsDesktop();
  const initialize  = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);
  const isAuth      = useAuthStore((s) => s.isAuthenticated);

  // Initialize auth once — restores session from localStorage (near-instant)
  useEffect(() => { initialize(); }, [initialize]);

  // Load library catalogue only after auth is confirmed
  useEffect(() => {
    if (isAuth) load();
  }, [isAuth, load]);

  // Brief splash while session check runs — prevents login flash for returning users
  if (!initialized) return <AuthSplash />;

  // Not authenticated — show login over a dark background
  if (!isAuth) return <LoginModal />;

  return isDesktop ? <DesktopLayout /> : <MobileLayout />;
};

export default AppLayout;
