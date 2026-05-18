/**
 * LibraryPage — the user's PERSONAL library.
 *
 * Shows ONLY what the user has explicitly added (via "Add to Library").
 * Does NOT show the full catalog — use Search > Browse for that.
 *
 * Content is resolved from useUserLibraryStore (IDs) against the canonical
 * albumMap / trackMap (full metadata) — no duplication.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore }     from '@/store/libraryStore';
import { slugify }             from '@/utils/library';
import { useLikedStore }       from '@/store/likedStore';
import { useUserLibraryStore } from '@/store/useUserLibraryStore';

type Tab      = 'Albums' | 'Artists';
type Sort     = 'Recently Added' | 'A-Z' | 'Z-A';
type ViewMode = 'list' | 'grid';

const SORTS: Sort[]    = ['Recently Added', 'A-Z', 'Z-A'];
const PREF_KEY = 'swara_library_prefs';

function loadPrefs(): { sort: Sort; view: ViewMode } {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { sort: 'Recently Added', view: 'list' };
    const p = JSON.parse(raw) as { sort?: Sort; view?: ViewMode };
    return {
      sort: (SORTS as string[]).includes(p.sort ?? '') ? (p.sort as Sort) : 'Recently Added',
      view: p.view === 'grid' ? 'grid' : 'list',
    };
  } catch { return { sort: 'Recently Added', view: 'list' }; }
}
function savePrefs(sort: Sort, view: ViewMode) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ sort, view })); } catch {}
}

const LibraryPage = () => {
  const [tab,      setTab]      = useState<Tab>('Albums');
  const [sort,     setSort]     = useState<Sort>(() => loadPrefs().sort);
  const [view,     setView]     = useState<ViewMode>(() => loadPrefs().view);
  const [sortOpen, setSortOpen] = useState(false);

  const navigate  = useNavigate();

  // Catalog maps — O(1) resolution
  const { albumMap, artistMap } = useLibraryStore();

  // User library (IDs only)
  const { entries } = useUserLibraryStore();

  // Liked songs count for pinned entry
  const getLikedTracks = useLikedStore((s) => s.getLikedTracks);
  const likedCount     = getLikedTracks().length;

  const handleSetSort = useCallback((s: Sort) => {
    setSort(s); setSortOpen(false); savePrefs(s, view);
  }, [view]);

  const handleSetView = useCallback((v: ViewMode) => {
    setView(v); savePrefs(sort, v);
  }, [sort]);

  // Resolve user library album entries to full Album objects
  const libraryAlbums = useMemo(() => {
    const resolved = entries
      .map((e) => albumMap.get(e.albumId))
      .filter(Boolean) as typeof Array.prototype;

    // @ts-ignore — TS doesn't narrow the filtered type automatically
    const list = resolved as import('@/types/music').Album[];
    if (sort === 'Recently Added') {
      // entries are already ordered by addedAt (newest first from unshift)
      return list;
    }
    if (sort === 'A-Z') return [...list].sort((a, b) => a.title.localeCompare(b.title));
    return [...list].sort((a, b) => b.title.localeCompare(a.title));
  }, [entries, albumMap, sort]);

  // Derive unique artists from user's library albums
  const libraryArtists = useMemo(() => {
    const artistIds = new Set<string>();
    for (const entry of entries) {
      const album = albumMap.get(entry.albumId);
      if (album) artistIds.add(slugify(album.composer));
    }
    return Array.from(artistIds)
      .map((id) => artistMap.get(id))
      .filter(Boolean) as import('@/types/music').Artist[];
  }, [entries, albumMap, artistMap]);

  const isEmpty = entries.length === 0;

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* Header */}
      <div className="px-5 lg:px-8 pt-6 pb-2">
        <h1 className="text-[1.5rem] font-bold text-swara-text tracking-tight font-display mb-4">My Library</h1>

        {/* Tab chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {(['Albums', 'Artists'] as Tab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={[
                'flex-shrink-0 px-4 py-1.5 rounded-full text-[0.82rem] font-medium border transition-all duration-200',
                tab === t ? 'bg-swara-accent border-swara-accent text-swara-bg' : 'bg-transparent border-swara-border text-swara-muted hover:text-swara-text',
              ].join(' ')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-5 lg:mx-8 h-px bg-swara-border opacity-50 mb-3" />

      {/* Sort + view controls — only when there's content */}
      {!isEmpty && (
        <div className="flex items-center justify-between px-5 lg:px-8 mb-4 relative">
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
              <div className="absolute top-full left-0 mt-2 z-20 bg-swara-elevated border border-swara-border rounded-xl overflow-hidden shadow-lg min-w-[170px]">
                {SORTS.map((s) => (
                  <button key={s} type="button" onClick={() => handleSetSort(s)}
                    className={['flex items-center gap-2 w-full px-4 py-2.5 text-[0.85rem] text-left hover:bg-swara-card transition-colors', sort === s ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>
                    {sort === s ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> : <span className="w-[14px]" />}
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 bg-swara-card border border-swara-border rounded-lg p-0.5">
            {(['list', 'grid'] as ViewMode[]).map((v) => (
              <button key={v} type="button" onClick={() => handleSetView(v)}
                className={['flex items-center gap-1.5 h-7 px-2 rounded-md transition-colors', view === v ? 'bg-swara-elevated text-swara-text' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
                aria-label={`${v} view`} aria-pressed={view === v}>
                {v === 'list'
                  ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                  : <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
                <span className="hidden lg:inline text-[0.75rem] font-medium capitalize">{v}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-5 lg:px-8 pb-6">

        {/* Liked Songs — always pinned */}
        <div className="mb-3">
          <button type="button" onClick={() => navigate('/liked')}
            className="flex items-center gap-4 lg:gap-5 w-full py-3 lg:py-3.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all text-left">
            <div className="w-[72px] h-[72px] lg:w-[100px] lg:h-[100px] rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e0b0b 0%, #2d1212 50%, #1a0808 100%)' }}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="#c8a96e" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[1rem] lg:text-[1.05rem] font-semibold text-swara-text truncate leading-snug">Liked Songs</p>
              <p className="text-[0.8rem] lg:text-[0.88rem] text-swara-muted truncate mt-0.5">
                {likedCount > 0 ? `${likedCount} songs` : 'Your saved favorites'}
              </p>
            </div>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-swara-card border border-swara-border flex items-center justify-center text-swara-dim">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
              </svg>
            </div>
            <p className="text-[0.9rem] font-semibold text-swara-muted">Your library is empty</p>
            <p className="text-[0.78rem] text-swara-dim max-w-[220px] leading-relaxed">
              Browse the catalog and add albums or tracks to your library.
            </p>
            <button type="button" onClick={() => navigate('/search')}
              className="mt-1 px-5 py-2 rounded-full bg-swara-accent text-swara-bg text-[0.82rem] font-semibold active:scale-95 transition-transform">
              Browse Catalog
            </button>
          </div>
        )}

        {/* Albums tab */}
        {!isEmpty && tab === 'Albums' && (
          view === 'grid' ? (
            <div className="grid grid-cols-3 lg:grid-cols-2 gap-3 lg:gap-4">
              {libraryAlbums.map((album) => (
                <button key={album.id} type="button" onClick={() => navigate(`/album/${album.id}`)}
                  className="flex flex-col gap-1.5 text-left active:scale-95 transition-transform min-w-0 w-full overflow-hidden">
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-swara-elevated flex-shrink-0">
                    <img src={album.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className="text-[0.75rem] lg:text-[0.85rem] font-medium text-swara-text truncate w-full">{album.title}</p>
                  <p className="text-[0.65rem] lg:text-[0.72rem] text-swara-muted truncate w-full">{album.composer}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {libraryAlbums.map((album) => (
                <button key={album.id} type="button" onClick={() => navigate(`/album/${album.id}`)}
                  className="flex items-center gap-4 lg:gap-5 py-3 lg:py-3.5 px-2 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all text-left">
                  <img src={album.coverUrl} alt="" className="w-[72px] h-[72px] lg:w-[100px] lg:h-[100px] rounded-xl object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.95rem] lg:text-[1.05rem] font-semibold text-swara-text truncate leading-snug">{album.title}</p>
                    <p className="text-[0.8rem] lg:text-[0.88rem] text-swara-muted truncate mt-0.5">{album.composer}</p>
                    <p className="text-[0.72rem] lg:text-[0.78rem] text-swara-dim truncate mt-0.5">{album.year}</p>
                  </div>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              ))}
            </div>
          )
        )}

        {/* Artists tab */}
        {!isEmpty && tab === 'Artists' && (
          view === 'grid' ? (
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
              {libraryArtists.map((artist) => (
                <button key={artist.id} type="button" onClick={() => navigate(`/artist/${artist.id}`)}
                  className="flex flex-col gap-1.5 items-center text-center active:scale-95 transition-transform min-w-0 w-full overflow-hidden">
                  <div className="w-full aspect-square rounded-full overflow-hidden bg-swara-elevated flex-shrink-0">
                    <img src={artist.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className="text-[0.75rem] lg:text-[0.82rem] font-medium text-swara-text truncate w-full">{artist.name}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {libraryArtists.map((artist) => (
                <button key={artist.id} type="button" onClick={() => navigate(`/artist/${artist.id}`)}
                  className="flex items-center gap-4 lg:gap-5 py-3 lg:py-3.5 px-2 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all text-left">
                  <div className="w-[72px] h-[72px] lg:w-[100px] lg:h-[100px] rounded-full overflow-hidden flex-shrink-0 bg-swara-elevated">
                    <img src={artist.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.95rem] lg:text-[1.05rem] font-semibold text-swara-text truncate leading-snug">{artist.name}</p>
                    <p className="text-[0.8rem] lg:text-[0.88rem] text-swara-muted truncate mt-0.5">
                      {artist.albumIds.length} album{artist.albumIds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              ))}
            </div>
          )
        )}

        {/* Empty artists */}
        {!isEmpty && tab === 'Artists' && libraryArtists.length === 0 && (
          <p className="text-[0.82rem] text-swara-dim text-center py-8">
            Add albums to see artists here.
          </p>
        )}
      </div>
    </div>
  );
};

export default LibraryPage;
