import TopBar          from '@/components/home/TopBar';
import GreetingSection from '@/components/home/GreetingSection';
import RecentlyPlayed  from '@/components/home/RecentlyPlayed';
import QuickPicks      from '@/components/home/QuickPicks';
import ExploreAlbums   from '@/components/home/ExploreAlbums';
import { useLibraryStore } from '@/store/libraryStore';
import { useProfileStore } from '@/store/useProfileStore';

// ── Library Stats — minimal footer summary ────────────────────────────────────
const LibraryStats = () => {
  const albums = useLibraryStore((s) => s.albums);
  const tracks = useLibraryStore((s) => s.tracks);

  if (!albums.length) return null;

  return (
    <div
      className="flex items-center justify-center gap-6 px-5 py-8"
      aria-label="Library statistics"
    >
      <div className="text-center">
        <p className="text-[1.05rem] font-bold text-swara-text tabular-nums">{albums.length}</p>
        <p className="text-[0.63rem] uppercase tracking-[0.14em] mt-0.5" style={{ color: '#3a3830' }}>
          Albums
        </p>
      </div>
      <div className="w-px h-5 bg-swara-border opacity-40" aria-hidden="true" />
      <div className="text-center">
        <p className="text-[1.05rem] font-bold text-swara-text tabular-nums">
          {tracks.length > 0 ? tracks.length : '…'}
        </p>
        <p className="text-[0.63rem] uppercase tracking-[0.14em] mt-0.5" style={{ color: '#3a3830' }}>
          Tracks
        </p>
      </div>
    </div>
  );
};

// ── HomePage ──────────────────────────────────────────────────────────────────
const HomePage = () => {
  const { albums, loading, error } = useLibraryStore();
  const displayName = useProfileStore((s) => s.getDisplayName());

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">
      <TopBar />
      <GreetingSection username={displayName || 'Swara'} />
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
          {/* Stats footer — shows total albums + tracks from library */}
          <LibraryStats />
        </>
      )}
    </div>
  );
};

export default HomePage;
