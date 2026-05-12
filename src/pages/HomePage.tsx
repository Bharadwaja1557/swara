import TopBar from '@/components/home/TopBar';
import GreetingSection from '@/components/home/GreetingSection';
import RecentlyPlayed from '@/components/home/RecentlyPlayed';
import QuickPicks from '@/components/home/QuickPicks';
import ExploreAlbums from '@/components/home/ExploreAlbums';
import { recentlyPlayed, quickPicks, albumsPool } from '@/data/mockData';

/**
 * HomePage
 *
 * Premium home screen.
 * Sections (top → bottom):
 *   1. TopBar         — Logo + Profile
 *   2. GreetingSection — Time-aware greeting
 *   3. RecentlyPlayed  — Horizontal scroll cards
 *   4. QuickPicks      — Curated playlist list
 *   5. ExploreAlbums   — Shuffleable 2×2 album grid
 *
 * The page scrolls vertically; BottomNav is rendered by AppLayout.
 */
const HomePage = () => {
  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      <TopBar />
      <GreetingSection username="Neo" />

      {/* Visual separator */}
      <div className="mx-5 mt-4 h-px bg-swara-border opacity-60" aria-hidden="true" />

      <RecentlyPlayed tracks={recentlyPlayed} />
      <QuickPicks picks={quickPicks} />
      <ExploreAlbums albumPool={albumsPool} />
    </div>
  );
};

export default HomePage;
