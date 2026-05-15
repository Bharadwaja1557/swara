/**
 * LibraryPanel — left column, desktop only.
 * Reuses same data/logic as LibraryPage, list-view only.
 */
import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { getRecentEntries } from '@/store/playerStore';

type Tab  = 'Albums' | 'Artists';
type Sort = 'Recently Played' | 'A-Z' | 'Z-A';
const TABS: Tab[] = ['Albums', 'Artists'];

const LibraryPanel = () => {
  const [tab,      setTab]      = useState<Tab>('Albums');
  const [sort,     setSort]     = useState<Sort>('Recently Played');
  const [sortOpen, setSortOpen] = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const { albums, artists } = useLibraryStore();

  const recentOrder = useMemo(() => getRecentEntries().map((e) => e.albumId), []);

  const sortedAlbums = useMemo(() => {
    const list = [...albums];
    if (sort === 'Recently Played') {
      list.sort((a, b) => {
        const ai = recentOrder.indexOf(a.id), bi = recentOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return b.year - a.year;
        if (ai === -1) return 1; if (bi === -1) return -1;
        return ai - bi;
      });
    } else if (sort === 'A-Z') list.sort((a, b) => a.title.localeCompare(b.title));
    else list.sort((a, b) => b.title.localeCompare(a.title));
    return list;
  }, [albums, sort, recentOrder]);

  const sortedArtists = useMemo(() => {
    const list = [...artists];
    if (sort === 'A-Z') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'Z-A') list.sort((a, b) => b.name.localeCompare(a.name));
    return list;
  }, [artists, sort]);


  return (
    <aside
      className="flex flex-col flex-shrink-0 border-r overflow-hidden"
      style={{ width: '25%', minWidth: '220px', maxWidth: '320px', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[0.78rem] font-semibold text-swara-muted tracking-widest uppercase">Library</h2>
          {/* Sort button */}
          <div className="relative">
            <button type="button" onClick={() => setSortOpen((o) => !o)}
              className="text-swara-dim hover:text-swara-muted transition-colors" aria-label="Sort">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <path d="M3 6h18M6 12h12M9 18h6"/>
              </svg>
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden shadow-lg"
                style={{ background: '#1e1e28', border: '1px solid rgba(255,255,255,0.08)', minWidth: '160px' }}>
                {(['Recently Played', 'A-Z', 'Z-A'] as Sort[]).map((s) => (
                  <button key={s} type="button" onClick={() => { setSort(s); setSortOpen(false); }}
                    className={['flex items-center gap-2 w-full px-3 py-2.5 text-[0.78rem] text-left hover:bg-swara-card transition-colors', sort === s ? 'text-swara-accent' : 'text-swara-muted'].join(' ')}>
                    {sort === s && <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>}
                    {sort !== s && <span className="w-[11px]" />}
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tab chips */}
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={['px-3 py-1 rounded-full text-[0.72rem] font-medium border transition-all', tab === t ? 'bg-swara-accent border-swara-accent text-swara-bg' : 'border-swara-border text-swara-muted hover:text-swara-text'].join(' ')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-2 pb-3">
        {tab === 'Albums' && sortedAlbums.map((album) => {
          const active = location.hash.includes(`/album/${album.id}`);
          return (
            <button key={album.id} type="button" onClick={() => navigate(`/album/${album.id}`)}
              className={['flex items-center gap-3 w-full px-2 py-3 rounded-xl text-left transition-colors', active ? 'bg-swara-card' : 'hover:bg-swara-card'].join(' ')}>
              <img src={album.coverUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />
              <div className="flex-1 min-w-0">
                <p className={['text-[0.88rem] font-medium truncate', active ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>{album.title}</p>
                <p className="text-[0.76rem] text-swara-muted truncate">{album.composer}</p>
              </div>
            </button>
          );
        })}

        {tab === 'Artists' && sortedArtists.map((artist) => {
          const active = location.hash.includes(`/artist/${artist.id}`);
          return (
            <button key={artist.id} type="button" onClick={() => navigate(`/artist/${artist.id}`)}
              className={['flex items-center gap-3 w-full px-2 py-3 rounded-xl text-left transition-colors', active ? 'bg-swara-card' : 'hover:bg-swara-card'].join(' ')}>
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-swara-elevated">
                <img src={artist.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={['text-[0.88rem] font-medium truncate', active ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>{artist.name}</p>
                <p className="text-[0.76rem] text-swara-muted truncate">{artist.albumIds.length} album{artist.albumIds.length !== 1 ? 's' : ''}</p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default LibraryPanel;
