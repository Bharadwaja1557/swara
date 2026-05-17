import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { useLikedStore }   from '@/store/likedStore';
import { getRecentEntries } from '@/store/playerStore';

type Tab      = 'Playlists' | 'Albums' | 'Artists';
type Sort     = 'Recently Played' | 'Recently Added' | 'A-Z' | 'Z-A' | 'Random';
type ViewMode = 'list' | 'grid';

const TABS:  Tab[]  = ['Playlists', 'Albums', 'Artists'];
const SORTS: Sort[] = ['Recently Played', 'Recently Added', 'A-Z', 'Z-A', 'Random'];
const PREF_KEY = 'swara_library_prefs';

// ── Persistence helpers ───────────────────────────────────────────────────────
// Read synchronously in useState initializer — no flicker on restore.
function loadPrefs(): { sort: Sort; view: ViewMode } {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { sort: 'Recently Played', view: 'list' };
    const p = JSON.parse(raw) as { sort?: Sort; view?: ViewMode };
    return {
      sort: (SORTS as string[]).includes(p.sort ?? '') ? (p.sort as Sort) : 'Recently Played',
      view: p.view === 'grid' ? 'grid' : 'list',
    };
  } catch { return { sort: 'Recently Played', view: 'list' }; }
}
function savePrefs(sort: Sort, view: ViewMode) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ sort, view })); } catch {}
}

const LibraryPage = () => {
  const [tab,      setTab]      = useState<Tab>('Albums');
  // Initializers run once and read from localStorage — sort/view restore on refresh
  const [sort,     setSort]     = useState<Sort>(() => loadPrefs().sort);
  const [view,     setView]     = useState<ViewMode>(() => loadPrefs().view);
  const [sortOpen, setSortOpen] = useState(false);
  // shuffleKey: incrementing forces useMemo to re-run Fisher-Yates on next render.
  // Starts at 0 — first render with sort='Random' already produces a fresh shuffle.
  const [shuffleKey, setShuffleKey] = useState(0);

  const navigate = useNavigate();
  const { albums, artists } = useLibraryStore();
  const getLikedTracks = useLikedStore((s) => s.getLikedTracks);
  const likedCount     = getLikedTracks().length;

  const recentAlbumOrder = useMemo(() => {
    const entries = getRecentEntries();
    return entries.map((e) => e.albumId);
  }, []);

  const sortedAlbums = useMemo(() => {
    const list = [...albums];
    if (sort === 'Random') {
      // Fisher-Yates shuffle — re-runs whenever shuffleKey changes (user picks Random)
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    }
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
  }, [albums, sort, recentAlbumOrder, shuffleKey]); // eslint-disable-line

  const sortedArtists = useMemo(() => {
    const list = [...artists];
    if (sort === 'Random') {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    }
    if (sort === 'A-Z') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'Z-A') list.sort((a, b) => b.name.localeCompare(a.name));
    return list;
  }, [artists, sort, shuffleKey]); // eslint-disable-line

  // Persist sort + view whenever they change
  const handleSetSort = useCallback((s: Sort) => {
    setSort(s);
    setSortOpen(false);
    // Increment shuffleKey each time Random is chosen (even if already active)
    // so the user can reshuffle by re-selecting it from the dropdown.
    if (s === 'Random') setShuffleKey((k) => k + 1);
    savePrefs(s, view);
  }, [view]);

  const handleSetView = useCallback((v: ViewMode) => {
    setView(v);
    savePrefs(sort, v);
  }, [sort]);

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* ── Header ── */}
      <div className="px-5 lg:px-8 pt-6 pb-2">
        <h1 className="text-[1.5rem] font-bold text-swara-text tracking-tight font-display mb-4">
          My Library
        </h1>

        {/* Filter chips — identical on mobile and desktop */}
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

      {/* Divider */}
      <div className="mx-5 lg:mx-8 h-px bg-swara-border opacity-50 mb-3" />

      {/* ── Sort + View controls — same hierarchy on mobile and desktop ── */}
      <div className="flex items-center justify-between px-5 lg:px-8 mb-4 relative">

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
                  onClick={() => handleSetSort(s)}
                  className={[
                    'flex items-center gap-2 w-full px-4 py-2.5 text-[0.85rem] text-left transition-colors hover:bg-swara-card',
                    sort === s ? 'text-swara-accent' : 'text-swara-text',
                  ].join(' ')}>
                  {sort === s
                    ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    : <span className="w-[14px]" />}
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View toggle — icon-only on mobile, icon+label on desktop */}
        <div className="flex items-center gap-1 bg-swara-card border border-swara-border rounded-lg p-0.5">
          <button type="button" onClick={() => handleSetView('list')}
            className={[
              'flex items-center gap-1.5 h-7 px-2 rounded-md transition-colors',
              view === 'list' ? 'bg-swara-elevated text-swara-text' : 'text-swara-dim hover:text-swara-muted',
            ].join(' ')}
            aria-label="List view" aria-pressed={view === 'list'}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
            <span className="hidden lg:inline text-[0.75rem] font-medium">List</span>
          </button>
          <button type="button" onClick={() => handleSetView('grid')}
            className={[
              'flex items-center gap-1.5 h-7 px-2 rounded-md transition-colors',
              view === 'grid' ? 'bg-swara-elevated text-swara-text' : 'text-swara-dim hover:text-swara-muted',
            ].join(' ')}
            aria-label="Grid view" aria-pressed={view === 'grid'}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span className="hidden lg:inline text-[0.75rem] font-medium">Grid</span>
          </button>
        </div>
      </div>

      {/* ── Liked Songs — pinned system playlist, always visible ── */}
      <div className="px-5 lg:px-8 mb-3">
        <button
          type="button"
          onClick={() => navigate('/liked')}
          className="flex items-center gap-4 lg:gap-5 w-full py-3 lg:py-3.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all text-left"
        >
          {/* Heart artwork */}
          <div
            className="w-[72px] h-[72px] lg:w-[100px] lg:h-[100px] rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1e0b0b 0%, #2d1212 50%, #1a0808 100%)' }}
          >
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
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* ── Content ── */}
      <div className="px-5 lg:px-8 pb-6">

        {/* Playlists */}
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

        {/* Albums */}
        {tab === 'Albums' && (
          view === 'grid' ? (
            // Mobile: 3 cols — Desktop: 2 cols (larger cards)
            <div className="grid grid-cols-3 lg:grid-cols-2 gap-3 lg:gap-4">
              {sortedAlbums.map((album) => (
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
            // List view:
            // Mobile: 72px cover (150% of original 48px), py-3 row
            // Desktop: 100px cover (150% of previous 72px upgrade), py-4 row
            <div className="flex flex-col gap-0">
              {sortedAlbums.map((album) => (
                <button key={album.id} type="button" onClick={() => navigate(`/album/${album.id}`)}
                  className="flex items-center gap-4 lg:gap-5 py-3 lg:py-3.5 px-2 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all text-left">
                  <img src={album.coverUrl} alt=""
                    className="w-[72px] h-[72px] lg:w-[100px] lg:h-[100px] rounded-xl object-cover flex-shrink-0 bg-swara-elevated"
                    loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[1rem] lg:text-[1.05rem] font-semibold text-swara-text truncate leading-snug">{album.title}</p>
                    <p className="text-[0.86rem] lg:text-[0.88rem] text-swara-muted truncate mt-0.5">{album.composer}</p>
                    <p className="text-[0.72rem] lg:text-[0.78rem] text-swara-dim truncate mt-0.5">{album.year}</p>
                  </div>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              ))}
            </div>
          )
        )}

        {/* Artists */}
        {tab === 'Artists' && (
          view === 'grid' ? (
            // Mobile: 3 cols — Desktop: 4 cols (matches album grid density)
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
              {sortedArtists.map((artist) => (
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
            // List view: same 150% treatment as albums
            <div className="flex flex-col gap-0">
              {sortedArtists.map((artist) => (
                <button key={artist.id} type="button" onClick={() => navigate(`/artist/${artist.id}`)}
                  className="flex items-center gap-4 lg:gap-5 py-3 lg:py-3.5 px-2 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all text-left">
                  <div className="w-[72px] h-[72px] lg:w-[100px] lg:h-[100px] rounded-full overflow-hidden flex-shrink-0 bg-swara-elevated">
                    <img src={artist.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[1rem] lg:text-[1.05rem] font-semibold text-swara-text truncate leading-snug">{artist.name}</p>
                    <p className="text-[0.86rem] lg:text-[0.88rem] text-swara-muted truncate mt-0.5">
                      {artist.albumIds.length} album{artist.albumIds.length !== 1 ? 's' : ''}
                    </p>
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
