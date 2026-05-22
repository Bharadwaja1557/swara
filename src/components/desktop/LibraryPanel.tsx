/**
 * LibraryPanel — desktop left sidebar.
 *
 * TAB ORDER: All | Playlists | Albums | Artists
 *
 * Uses the same LibraryRenderable normalization pipeline as LibraryPage.
 * Rendering is branch-free: LibraryCard / LibraryRow receive the same
 * props regardless of entity type. compact=true on all shared components.
 *
 * Active route detection uses location.hash (HashRouter) for highlight.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLibraryStore }      from '@/store/libraryStore';
import { useUserLibraryStore }  from '@/store/useUserLibraryStore';
import { useLikedStore }        from '@/store/likedStore';
import { usePlaylistStore }     from '@/store/usePlaylistStore';
import LibraryCard              from '@/components/ui/LibraryCard';
import LibraryRow               from '@/components/ui/LibraryRow';
import {
  buildRenderables,
  type LibraryRenderable,
  type LibrarySortMode,
} from '@/lib/libraryRenderables';

type Tab      = 'All' | 'Playlists' | 'Albums' | 'Artists';
type ViewMode = 'list' | 'grid';

const PANEL_PREF_KEY = 'swara_panel_prefs';
const SORTS: LibrarySortMode[] = ['Recently Added', 'A-Z', 'Z-A'];

function loadPanelPrefs(): { sort: LibrarySortMode; view: ViewMode } {
  try {
    const raw = localStorage.getItem(PANEL_PREF_KEY);
    if (!raw) return { sort: 'Recently Added', view: 'list' };
    const p = JSON.parse(raw) as { sort?: LibrarySortMode; view?: ViewMode };
    return {
      sort: (SORTS as string[]).includes(p.sort ?? '')
        ? (p.sort as LibrarySortMode) : 'Recently Added',
      view: p.view === 'grid' ? 'grid' : 'list',
    };
  } catch { return { sort: 'Recently Added', view: 'list' }; }
}
function savePanelPrefs(sort: LibrarySortMode, view: ViewMode) {
  try { localStorage.setItem(PANEL_PREF_KEY, JSON.stringify({ sort, view })); } catch {}
}

// ── Branch-free grid / list renderers (compact variant) ──────────────────────

const GRID_CLS = 'grid grid-cols-2 gap-2 px-2 pt-1';

const CompactGrid = ({
  items, activeRoute, onNavigate,
}: { items: LibraryRenderable[]; activeRoute: string; onNavigate: (r: string) => void }) => (
  <div className={GRID_CLS}>
    {items.map((item) => (
      <LibraryCard
        key={item.key}
        title={item.title}
        subtitle={item.subtitle}
        coverUrl={item.imageUrl}
        coverShape={item.coverShape}
        playlistFallback={item.playlistFallback}
        isActive={activeRoute.includes(item.route)}
        compact
        onClick={() => onNavigate(item.route)}
      />
    ))}
  </div>
);

const CompactList = ({
  items, activeRoute, onNavigate,
}: { items: LibraryRenderable[]; activeRoute: string; onNavigate: (r: string) => void }) => (
  <div className="px-2">
    {items.map((item) => (
      <LibraryRow
        key={item.key}
        title={item.title}
        subtitle={item.subtitle}
        coverUrl={item.imageUrl}
        coverShape={item.coverShape}
        playlistFallback={item.playlistFallback}
        isActive={activeRoute.includes(item.route)}
        compact
        showChevron={false}
        onClick={() => onNavigate(item.route)}
      />
    ))}
  </div>
);

// ── LibraryPanel ──────────────────────────────────────────────────────────────

const LibraryPanel = () => {
  const [tab,      setTab]      = useState<Tab>('All');
  const [sort,     setSort]     = useState<LibrarySortMode>(() => loadPanelPrefs().sort);
  const [view,     setView]     = useState<ViewMode>(() => loadPanelPrefs().view);
  const [sortOpen, setSortOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  // HashRouter stores the route in location.hash — use it for active-link detection.
  const activeRoute = location.hash;

  // ── Store subscriptions ───────────────────────────────────────────────────

  const { albumMap, artistMap, trackMap } = useLibraryStore();
  const entries    = useUserLibraryStore((s) => s.entries);
  const playlists  = usePlaylistStore((s) => s.playlists);
  const likedCount = useLikedStore((s) => s.getLikedTracks().length);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSetSort = useCallback((s: LibrarySortMode) => {
    setSort(s); setSortOpen(false); savePanelPrefs(s, view);
  }, [view]);

  const handleSetView = useCallback((v: ViewMode) => {
    setView(v); savePanelPrefs(sort, v);
  }, [sort]);

  const handleNavigate = useCallback((route: string) => {
    navigate(route);
  }, [navigate]);

  // ── Normalized renderables — ONE pipeline per tab ─────────────────────────

  const allRenderables = useMemo(
    () => buildRenderables(entries, albumMap, artistMap, playlists, trackMap, sort),
    [entries, albumMap, artistMap, playlists, trackMap, sort],
  );

  const playlistRenderables = useMemo(
    () => buildRenderables(entries, albumMap, artistMap, playlists, trackMap, sort, new Set(['playlist'])),
    [entries, albumMap, artistMap, playlists, trackMap, sort],
  );

  const albumRenderables = useMemo(
    () => buildRenderables(entries, albumMap, artistMap, playlists, trackMap, sort, new Set(['album'])),
    [entries, albumMap, artistMap, playlists, trackMap, sort],
  );

  const artistRenderables = useMemo(
    () => buildRenderables(entries, albumMap, artistMap, playlists, trackMap, sort, new Set(['artist'])),
    [entries, albumMap, artistMap, playlists, trackMap, sort],
  );

  const currentRenderables: LibraryRenderable[] = {
    All:      allRenderables,
    Playlists:playlistRenderables,
    Albums:   albumRenderables,
    Artists:  artistRenderables,
  }[tab];

  // ── Empty-state flags ─────────────────────────────────────────────────────

  const isGloballyEmpty    = entries.length === 0 && playlists.length === 0;
  const currentTabIsEmpty  = currentRenderables.length === 0;

  return (
    <aside
      className="flex flex-col flex-shrink-0 border-r overflow-hidden"
      style={{ width: '25%', minWidth: '220px', maxWidth: '320px', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[0.78rem] font-semibold text-swara-muted tracking-widest uppercase">
            Library
          </h2>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            {!isGloballyEmpty && (
              <div className="flex items-center gap-0.5 bg-swara-card border border-swara-border rounded-md p-0.5">
                {(['list', 'grid'] as ViewMode[]).map((v) => (
                  <button key={v} type="button" onClick={() => handleSetView(v)}
                    className={[
                      'w-6 h-5 flex items-center justify-center rounded transition-colors',
                      view === v ? 'bg-swara-elevated text-swara-text' : 'text-swara-dim hover:text-swara-muted',
                    ].join(' ')}
                    aria-label={`${v} view`} aria-pressed={view === v}>
                    {v === 'list'
                      ? <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                      : <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
                          strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="3" width="7" height="7" rx="1"/>
                          <rect x="14" y="3" width="7" height="7" rx="1"/>
                          <rect x="3" y="14" width="7" height="7" rx="1"/>
                          <rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>}
                  </button>
                ))}
              </div>
            )}

            {/* Sort */}
            {!isGloballyEmpty && (
              <div className="relative">
                <button type="button" onClick={() => setSortOpen((o) => !o)}
                  className="text-swara-dim hover:text-swara-muted transition-colors"
                  aria-label="Sort options">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                    strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                    <path d="M3 6h18M6 12h12M9 18h6"/>
                  </svg>
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 z-30 rounded-xl overflow-hidden shadow-lg"
                    style={{ background: '#1e1e28', border: '1px solid rgba(255,255,255,0.08)', minWidth: '165px' }}>
                    {SORTS.map((s) => (
                      <button key={s} type="button" onClick={() => handleSetSort(s)}
                        className={[
                          'flex items-center gap-2 w-full px-3 py-2.5 text-[0.78rem] text-left hover:bg-swara-card transition-colors',
                          sort === s ? 'text-swara-accent' : 'text-swara-muted',
                        ].join(' ')}>
                        {sort === s
                          ? <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor"
                              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          : <span className="w-[11px]" />}
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab chips */}
        <div className="flex gap-1 flex-wrap">
          {(['All', 'Playlists', 'Albums', 'Artists'] as Tab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={[
                'px-2.5 py-1 rounded-full text-[0.68rem] font-medium border transition-all',
                tab === t
                  ? 'bg-swara-accent border-swara-accent text-swara-bg'
                  : 'border-swara-border text-swara-muted hover:text-swara-text',
              ].join(' ')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto scrollbar-none pb-3">

        {/* Liked Songs — pinned, hidden on Playlists tab */}
        {tab !== 'Playlists' && (
          <div className="px-2 pb-1">
            <button type="button" onClick={() => navigate('/liked')}
              className={[
                'flex items-center gap-3 w-full px-2 py-3 rounded-xl text-left transition-colors',
                activeRoute.includes('/liked') ? 'bg-swara-card' : 'hover:bg-swara-card',
              ].join(' ')}>
              <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1e0b0b 0%, #2d1212 50%, #1a0808 100%)' }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#c8a96e" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className={[
                  'text-[0.88rem] font-medium truncate',
                  activeRoute.includes('/liked') ? 'text-swara-accent' : 'text-swara-text',
                ].join(' ')}>Liked Songs</p>
                <p className="text-[0.76rem] text-swara-muted truncate">
                  {likedCount > 0 ? `${likedCount} songs` : 'Your favorites'}
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Global empty state */}
        {isGloballyEmpty && (
          <div className="px-4 py-6 flex flex-col items-center gap-2.5 text-center">
            <p className="text-[0.78rem] text-swara-muted">Your library is empty.</p>
            <p className="text-[0.72rem] text-swara-dim leading-relaxed">
              Add albums from the catalog to see them here.
            </p>
            <button type="button" onClick={() => navigate('/search')}
              className="mt-1 px-4 py-1.5 rounded-full bg-swara-accent text-swara-bg text-[0.72rem] font-semibold active:scale-95 transition-transform">
              Browse Catalog
            </button>
          </div>
        )}

        {/* Per-tab empty */}
        {!isGloballyEmpty && currentTabIsEmpty && (
          <div className="px-4 py-6 flex flex-col items-center gap-2 text-center">
            {tab === 'Playlists' ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-swara-card border border-swara-border flex items-center justify-center text-swara-dim">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                </div>
                <p className="text-[0.78rem] text-swara-muted font-medium">No playlists yet</p>
                <p className="text-[0.68rem] text-swara-dim leading-relaxed">
                  Tap "Add to Playlist" on any track.
                </p>
              </>
            ) : (
              <p className="text-[0.75rem] text-swara-dim">
                {tab === 'Albums'  ? 'Add albums to see them here.'   : ''}
                {tab === 'Artists' ? 'Add albums to see artists here.' : ''}
                {tab === 'All'     ? 'Add albums or create playlists.' : ''}
              </p>
            )}
          </div>
        )}

        {/* Content — branch-free renderer */}
        {!isGloballyEmpty && !currentTabIsEmpty && (
          view === 'grid'
            ? <CompactGrid  items={currentRenderables} activeRoute={activeRoute} onNavigate={handleNavigate} />
            : <CompactList  items={currentRenderables} activeRoute={activeRoute} onNavigate={handleNavigate} />
        )}

        {/* Browse catalog link */}
        <div className="px-4 pt-4 pb-2">
          <button type="button" onClick={() => navigate('/search')}
            className="flex items-center gap-2 text-[0.72rem] text-swara-dim hover:text-swara-muted transition-colors w-full">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Browse full catalog
          </button>
        </div>
      </div>
    </aside>
  );
};

export default LibraryPanel;
