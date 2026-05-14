import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { getRecentEntries } from '@/store/playerStore';

type Tab    = 'Playlists' | 'Albums' | 'Artists';
type Sort   = 'Recently Played' | 'Recently Added' | 'A-Z' | 'Z-A';
type ViewMode = 'list' | 'grid';

const TABS:  Tab[]  = ['Playlists', 'Albums', 'Artists'];
const SORTS: Sort[] = ['Recently Played', 'Recently Added', 'A-Z', 'Z-A'];

const LibraryPage = () => {
  const [tab,      setTab]      = useState<Tab>('Albums');
  const [sort,     setSort]     = useState<Sort>('Recently Played');
  const [view,     setView]     = useState<ViewMode>('list');
  const [sortOpen, setSortOpen] = useState(false);

  const navigate = useNavigate();
  const { albums, artists } = useLibraryStore();

  const recentAlbumOrder = useMemo(() => {
    const entries = getRecentEntries();
    return entries.map((e) => e.albumId);
  }, []);

  const sortedAlbums = useMemo(() => {
    const list = [...albums];
    if (sort === 'Recently Played') {
      list.sort((a, b) => {
        const ai = recentAlbumOrder.indexOf(a.id);
        const bi = recentAlbumOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return b.year - a.year;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    } else if (sort === 'Recently Added') {
      list.sort((a, b) => b.year - a.year);
    } else if (sort === 'A-Z') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => b.title.localeCompare(a.title));
    }
    return list;
  }, [albums, sort, recentAlbumOrder]);

  const sortedArtists = useMemo(() => {
    const list = [...artists];
    if (sort === 'A-Z') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'Z-A') list.sort((a, b) => b.name.localeCompare(a.name));
    return list;
  }, [artists, sort]);

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-[1.5rem] font-bold text-swara-text tracking-tight font-display mb-4">
          My Library
        </h1>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={[
                'flex-shrink-0 px-4 py-1.5 rounded-full text-[0.82rem] font-medium border transition-all duration-200',
                tab === t
                  ? 'bg-swara-accent border-swara-accent text-swara-bg'
                  : 'bg-transparent border-swara-border text-swara-muted hover:text-swara-text',
              ].join(' ')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-5 h-px bg-swara-border opacity-50 mb-3" />

      {/* Sort + View controls */}
      <div className="flex items-center justify-between px-5 mb-3 relative">
        {/* Sort dropdown */}
        <div className="relative">
          <button type="button" onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-1.5 text-[0.8rem] text-swara-muted hover:text-swara-text transition-colors">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M6 12h12M9 18h6"/>
            </svg>
            {sort}
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <polyline points={sortOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
            </svg>
          </button>

          {sortOpen && (
            <div className="absolute top-full left-0 mt-2 z-20 bg-swara-elevated border border-swara-border rounded-xl overflow-hidden shadow-lg min-w-[180px]">
              {SORTS.map((s) => (
                <button key={s} type="button"
                  onClick={() => { setSort(s); setSortOpen(false); }}
                  className={[
                    'flex items-center gap-2 w-full px-4 py-2.5 text-[0.85rem] text-left transition-colors hover:bg-swara-card',
                    sort === s ? 'text-swara-accent' : 'text-swara-text',
                  ].join(' ')}>
                  {sort === s && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>}
                  {sort !== s && <span className="w-[14px]" />}
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-swara-card border border-swara-border rounded-lg p-0.5">
          <button type="button" onClick={() => setView('list')}
            className={['w-8 h-7 flex items-center justify-center rounded-md transition-colors', view === 'list' ? 'bg-swara-elevated text-swara-text' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
            aria-label="List view">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <button type="button" onClick={() => setView('grid')}
            className={['w-8 h-7 flex items-center justify-center rounded-md transition-colors', view === 'grid' ? 'bg-swara-elevated text-swara-text' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
            aria-label="Grid view">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-6">
        {/* Playlists tab */}
        {tab === 'Playlists' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-swara-card border border-swara-border flex items-center justify-center text-swara-dim">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-swara-muted uppercase tracking-widest">Coming Soon</p>
            <p className="text-xs text-swara-dim text-center max-w-[200px]">Playlists will be available in a future update.</p>
          </div>
        )}

        {/* Albums tab */}
        {tab === 'Albums' && (
          view === 'grid' ? (
            <div className="grid grid-cols-3 gap-3">
              {sortedAlbums.map((album) => (
                <button key={album.id} type="button" onClick={() => navigate(`/album/${album.id}`)}
                  className="flex flex-col gap-1.5 text-left active:scale-95 transition-transform">
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-swara-elevated">
                    <img src={album.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className="text-[0.75rem] font-medium text-swara-text truncate">{album.title}</p>
                  <p className="text-[0.65rem] text-swara-muted truncate">{album.composer}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {sortedAlbums.map((album) => (
                <button key={album.id} type="button" onClick={() => navigate(`/album/${album.id}`)}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all text-left">
                  <img src={album.coverUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.88rem] font-medium text-swara-text truncate">{album.title}</p>
                    <p className="text-[0.72rem] text-swara-muted truncate">{album.composer} · {album.year}</p>
                  </div>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              ))}
            </div>
          )
        )}

        {/* Artists tab */}
        {tab === 'Artists' && (
          view === 'grid' ? (
            <div className="grid grid-cols-3 gap-3">
              {sortedArtists.map((artist) => (
                <button key={artist.id} type="button" onClick={() => navigate(`/artist/${artist.id}`)}
                  className="flex flex-col gap-1.5 items-center text-center active:scale-95 transition-transform">
                  <div className="w-full aspect-square rounded-full overflow-hidden bg-swara-elevated">
                    <img src={artist.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className="text-[0.75rem] font-medium text-swara-text truncate w-full">{artist.name}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {sortedArtists.map((artist) => (
                <button key={artist.id} type="button" onClick={() => navigate(`/artist/${artist.id}`)}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all text-left">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-swara-elevated">
                    <img src={artist.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.88rem] font-medium text-swara-text truncate">{artist.name}</p>
                    <p className="text-[0.72rem] text-swara-muted truncate">{artist.albumIds.length} album{artist.albumIds.length !== 1 ? 's' : ''}</p>
                  </div>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default LibraryPage;
