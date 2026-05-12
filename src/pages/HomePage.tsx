import { useMemo } from 'react';
import TopBar from '@/components/home/TopBar';
import GreetingSection from '@/components/home/GreetingSection';
import RecentlyPlayed from '@/components/home/RecentlyPlayed';
import QuickPicks from '@/components/home/QuickPicks';
import ExploreAlbums from '@/components/home/ExploreAlbums';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import type { QuickPick } from '@/types/music';
import { pickRandom } from '@/utils/greeting';

/**
 * HomePage — fully driven by the dynamic m4a-db library.
 *
 * Sections:
 *   1. TopBar          — Logo + Profile
 *   2. GreetingSection — Time-aware greeting
 *   3. RecentlyPlayed  — Last played tracks from player store
 *   4. QuickPicks      — Derived from real album data
 *   5. ExploreAlbums   — Shuffleable 2×2 album grid from library
 */

// Accent colour palette for quick-pick cards
const ACCENTS = ['#6B5CE7', '#C8A96A', '#3E8B6E', '#3E6B8B', '#8B3E6B', '#8B5E3E'];

const HomePage = () => {
  const { albums, loading, error } = useLibraryStore();
  const queue = usePlayerStore((s) => s.queue);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  // Build recently-played list from the player's current queue
  const recentTracks = useMemo(() => {
    if (currentTrack) {
      // Show tracks in current queue, prioritising the one just played
      const idx = queue.findIndex((t) => t.id === currentTrack.id);
      const before = idx > 0 ? queue.slice(Math.max(0, idx - 5), idx) : [];
      const after = queue.slice(idx, idx + 6);
      return [...before, ...after].slice(0, 10);
    }
    // Before anything is played: show first track from each album as a preview
    return albums
      .filter((a) => a.tracks.length > 0)
      .slice(0, 10)
      .map((a) => a.tracks[0]);
  }, [queue, currentTrack, albums]);

  // Build quick picks from real album data
  const quickPicks = useMemo<QuickPick[]>(() => {
    if (albums.length === 0) return [];
    const allCovers = albums.map((a) => a.coverUrl).filter(Boolean);

    return [
      {
        id: 'qp-all',
        title: 'All Albums',
        subtitle: 'Every release in the library',
        coverUrls: pickRandom(allCovers, 4),
        trackCount: albums.reduce((s, a) => s + (a.trackCount || 0), 0),
        accentColor: ACCENTS[0],
      },
      {
        id: 'qp-newest',
        title: 'Latest Releases',
        subtitle: 'Freshest additions first',
        coverUrls: [...albums]
          .sort((a, b) => b.year - a.year)
          .slice(0, 4)
          .map((a) => a.coverUrl),
        trackCount: albums.filter((a) => a.year >= new Date().getFullYear() - 1).length,
        accentColor: ACCENTS[1],
      },
    ].filter((qp) => qp.coverUrls.length > 0);
  }, [albums]);

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      <TopBar />
      <GreetingSection username="Neo" />

      {/* Visual separator */}
      <div className="mx-5 mt-4 h-px bg-swara-border opacity-60" aria-hidden="true" />

      {/* Error state */}
      {error && (
        <div className="mx-5 mt-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="flex justify-center items-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
        </div>
      )}

      {/* Main content once library loaded */}
      {!loading && !error && (
        <>
          {recentTracks.length > 0 && <RecentlyPlayed tracks={recentTracks} />}
          {quickPicks.length > 0 && <QuickPicks picks={quickPicks} />}
          {albums.length > 0 && <ExploreAlbums albumPool={albums} />}

          {albums.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <p className="text-swara-muted text-sm">No albums found in the library.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HomePage;
