import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/nav/BottomNav';

/**
 * AppLayout
 *
 * Persistent shell that wraps every page:
 *   ┌─────────────────────────┐
 *   │  <page content>         │  ← scrollable
 *   │                         │
 *   │                         │
 *   ├─────────────────────────┤
 *   │  BottomNav              │  ← fixed
 *   └─────────────────────────┘
 *
 * The main scroll area has padding-bottom to avoid content hiding
 * behind the fixed BottomNav (60px nav + safe area inset).
 */
const AppLayout = () => {
  return (
    <div className="flex flex-col min-h-dvh bg-swara-bg">
      {/* Scrollable page content */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden pb-[calc(4rem+env(safe-area-inset-bottom,0px))]"
        id="main-content"
      >
        <Outlet />
      </main>

      {/* Persistent bottom navigation */}
      <BottomNav />
    </div>
  );
};

export default AppLayout;
