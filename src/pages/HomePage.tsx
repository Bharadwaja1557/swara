import TopBar          from '@/components/home/TopBar';
import GreetingSection from '@/components/home/GreetingSection';
import RecentlyPlayed  from '@/components/home/RecentlyPlayed';
import QuickPicks      from '@/components/home/QuickPicks';
import ExploreAlbums   from '@/components/home/ExploreAlbums';
import { useMemo } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { useProfileStore } from '@/store/useProfileStore';

// ── Library Stats ─────────────────────────────────────────────────────────────
const LibraryStats = () => {
  const albums = useLibraryStore((s) => s.albums);
  const tracks = useLibraryStore((s) => s.tracks);

  // Deduplicate singers and composers with Sets.
  // Singers  = unique values across all track.artists arrays.
  // Composers = unique album.composer values.
  // Memoized so it only recomputes when the library data changes.
  const { singerCount, composerCount } = useMemo(() => {
    const singers   = new Set<string>();
    const composers = new Set<string>();
    for (const t of tracks) {
      for (const name of t.artists) if (name) singers.add(name.trim().toLowerCase());
    }
    for (const a of albums) {
      if (a.composer) composers.add(a.composer.trim().toLowerCase());
    }
    return { singerCount: singers.size, composerCount: composers.size };
  }, [tracks, albums]);

  if (!albums.length) return null;

  const Stat = ({ value, label }: { value: number | string; label: string }) => (
    <div className="flex flex-col items-center gap-0.5">
      <p className="text-[1.05rem] font-bold text-swara-text tabular-nums leading-none">{value}</p>
      <p className="text-[0.6rem] uppercase tracking-[0.13em] text-swara-dim mt-0.5">{label}</p>
    </div>
  );

  return (
    <div className="px-5 pt-6 pb-8" aria-label="Library statistics">
      <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-4 text-center">
        Catalog
      </p>
      <div className="flex items-center justify-center gap-5">
        <Stat value={albums.length} label="Albums" />
        <div className="w-px h-4 bg-swara-border opacity-40" aria-hidden="true" />
        <Stat value={tracks.length > 0 ? tracks.length : '…'} label="Tracks" />
        <div className="w-px h-4 bg-swara-border opacity-40" aria-hidden="true" />
        <Stat value={singerCount > 0 ? singerCount : '…'} label="Singers" />
        <div className="w-px h-4 bg-swara-border opacity-40" aria-hidden="true" />
        <Stat value={composerCount > 0 ? composerCount : '…'} label="Composers" />
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
