import TopBar from '@/components/home/TopBar';
import GreetingSection from '@/components/home/GreetingSection';
import ExploreAlbums from '@/components/home/ExploreAlbums';
import { useLibraryStore } from '@/store/libraryStore';

const HomePage = () => {
  const { albums, error } = useLibraryStore();

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      <TopBar />
      <GreetingSection username="Neo" />

      <div className="mx-5 mt-4 h-px bg-swara-border opacity-60" aria-hidden="true" />

      {error ? (
        <div className="px-5 py-8 text-sm text-swara-muted">
          Unable to load music library
        </div>
      ) : (
        <ExploreAlbums albumPool={albums} />
      )}
    </div>
  );
};

export default HomePage;
