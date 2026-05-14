import TopBar from '@/components/home/TopBar';
import GreetingSection from '@/components/home/GreetingSection';
import RecentlyPlayed from '@/components/home/RecentlyPlayed';
import QuickPicks from '@/components/home/QuickPicks';
import ExploreAlbums from '@/components/home/ExploreAlbums';
import { useLibraryStore } from '@/store/libraryStore';

const HomePage = () => {
  const { albums, loading, error } = useLibraryStore();
  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">
      <TopBar />
      <GreetingSection username="Neo" />
      <div className="mx-5 mt-3 h-px bg-swara-border opacity-60" aria-hidden="true" />

      {error && (
        <div className="mx-5 mt-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}
      {loading && !error && (
        <div className="flex justify-center items-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
        </div>
      )}
      {!loading && !error && (
        <>
          <RecentlyPlayed />
          <QuickPicks />
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
