/**
 * LibraryPage — the user's PERSONAL library.
 *
 * TAB ORDER: All | Playlists | Albums | Artists
 *
 * ARCHITECTURE:
 *   All data is normalized into LibraryRenderable[] via buildRenderables()
 *   before any JSX is evaluated. The render loop is branch-free:
 *
 *     renderables.map(item => <LibraryCard key={item.key} ...item />)
 *     renderables.map(item => <LibraryRow  key={item.key} ...item />)
 *
 *   Each tab passes a different `include` set to buildRenderables() —
 *   the All tab passes all three, Albums passes {'album'} only, etc.
 *   Adding a new entity type (podcasts, audiobooks) = one line in the
 *   include set + one normalizer in libraryRenderables.ts.
 *
 *   Sort + view prefs are persisted to localStorage and shared with
 *   LibraryPanel via separate storage keys.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore }     from '@/store/libraryStore';
import { useLikedStore }       from '@/store/likedStore';
import { useUserLibraryStore } from '@/store/useUserLibraryStore';
import { usePlaylistStore }    from '@/store/usePlaylistStore';
import LibraryCard             from '@/components/ui/LibraryCard';
import LibraryRow              from '@/components/ui/LibraryRow';
import {
  buildRenderables,
  type LibraryRenderable,
  type LibrarySortMode,
} from '@/lib/libraryRenderables';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab      = 'All' | 'Playlists' | 'Albums' | 'Artists';
type ViewMode = 'list' | 'grid';

const TABS:  Tab[]             = ['All', 'Playlists', 'Albums', 'Artists'];
const SORTS: LibrarySortMode[] = ['Recently Added', 'A-Z', 'Z-A'];
const PREF_KEY = 'swara_library_prefs';

// ── Prefs persistence ─────────────────────────────────────────────────────────

function loadPrefs(): { sort: LibrarySortMode; view: ViewMode } {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { sort: 'Recently Added', view: 'list' };
    const p = JSON.parse(raw) as { sort?: LibrarySortMode; view?: ViewMode };
    return {
      sort: (SORTS as string[]).includes(p.sort ?? '') ? (p.sort as LibrarySortMode) : 'Recently Added',
      view: p.view === 'grid' ? 'grid' : 'list',
    };
  } catch { return { sort: 'Recently Added', view: 'list' }; }
}
function savePrefs(sort: LibrarySortMode, view: ViewMode) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ sort, view })); } catch {}
}

// ── Liked Songs pinned row ────────────────────────────────────────────────────
// Rendered on All / Albums / Artists tabs (not Playlists).

const LikedSongsRow = ({
  count, onClick,
}: { count: number; onClick: () => void }) => (
  <div className="mb-3">
    <button type="button" onClick={onClick}
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
          {count > 0 ? `${count} songs` : 'Your saved favorites'}
        </p>
      </div>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        className="text-swara-dim flex-shrink-0" aria-hidden="true">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </button>
  </div>
);

// ── RenderableList / RenderableGrid ──────────────────────────────────────────
// Branch-free renderers — both accept LibraryRenderable[] directly.

const GRID_CLASS = 'grid grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4';

const RenderableGrid = ({
  items, onNavigate,
}: { items: LibraryRenderable[]; onNavigate: (route: string) => void }) => (
  <div className={GRID_CLASS}>
    {items.map((item) => (
      <LibraryCard
        key={item.key}
        title={item.title}
        subtitle={item.subtitle}
        coverUrl={item.playlist ? undefined : item.imageUrl}
        playlist={item.playlist}
        coverShape={item.coverShape}
        onClick={() => onNavigate(item.route)}
      />
    ))}
  </div>
);

const RenderableList = ({
  items, onNavigate,
}: { items: LibraryRenderable[]; onNavigate: (route: string) => void }) => (
  <div className="flex flex-col gap-0">
    {items.map((item) => (
      <LibraryRow
        key={item.key}
        title={item.title}
        subtitle={item.subtitle}
        tertiary={item.tertiary}
        coverUrl={item.playlist ? undefined : item.imageUrl}
        playlist={item.playlist}
        coverShape={item.coverShape}
        showChevron
        onClick={() => onNavigate(item.route)}
      />
    ))}
  </div>
);

// ── LibraryPage ───────────────────────────────────────────────────────────────

const LibraryPage = () => {
  const [tab,      setTab]      = useState<Tab>('All');
  const [sort,     setSort]     = useState<LibrarySortMode>(() => loadPrefs().sort);
  const [view,     setView]     = useState<ViewMode>(() => loadPrefs().view);
  const [sortOpen, setSortOpen] = useState(false);

  const navigate = useNavigate();

  // ── Store subscriptions ───────────────────────────────────────────────────

  const { albumMap, artistMap, trackMap } = useLibraryStore();
  const entries   = useUserLibraryStore((s) => s.entries);
  const playlists = usePlaylistStore((s) => s.playlists);
  const likedCount = useLikedStore((s) => s.getLikedTracks().length);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSetSort = useCallback((s: LibrarySortMode) => {
    setSort(s); setSortOpen(false); savePrefs(s, view);
  }, [view]);

  const handleSetView = useCallback((v: ViewMode) => {
    setView(v); savePrefs(sort, v);
  }, [sort]);

  const handleNavigate = useCallback((route: string) => {
    navigate(route);
  }, [navigate]);

  // ── Normalized renderables — ONE pipeline per tab ─────────────────────────
  // buildRenderables handles: resolution, deduplication, sort.
  // Each tab just varies the `include` set.

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

  // Derive the renderable list for the current tab
  const currentRenderables: LibraryRenderable[] = {
    All:      allRenderables,
    Playlists:playlistRenderables,
    Albums:   albumRenderables,
    Artists:  artistRenderables,
  }[tab];

  // ── Empty-state flags ─────────────────────────────────────────────────────

  const hasAnyContent      = entries.length > 0 || playlists.length > 0;
  const currentTabIsEmpty  = currentRenderables.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* ── Header + tabs ── */}
      <div className="px-5 lg:px-8 pt-6 pb-2">
        <h1 className="text-[1.5rem] font-bold text-swara-text tracking-tight font-display mb-4">
          My Library
        </h1>
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

      <div className="mx-5 lg:mx-8 h-px bg-swara-border opacity-50 mb-3" />

      {/* ── Sort + view controls — hidden when current tab is empty ── */}
      {hasAnyContent && !currentTabIsEmpty && (
        <div className="flex items-center justify-between px-5 lg:px-8 mb-4">
          {/* Sort dropdown */}
          <div className="relative">
            <button type="button" onClick={() => setSortOpen((o) => !o)}
              className="flex items-center gap-1.5 text-[0.8rem] text-swara-muted hover:text-swara-text transition-colors">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18M6 12h12M9 18h6"/>
              </svg>
              {sort}
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <polyline points={sortOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
              </svg>
            </button>
            {sortOpen && (
              <div className="absolute top-full left-0 mt-2 z-20 bg-swara-elevated border border-swara-border rounded-xl overflow-hidden shadow-lg min-w-[170px]">
                {SORTS.map((s) => (
                  <button key={s} type="button" onClick={() => handleSetSort(s)}
                    className={[
                      'flex items-center gap-2 w-full px-4 py-2.5 text-[0.85rem] text-left hover:bg-swara-card transition-colors',
                      sort === s ? 'text-swara-accent' : 'text-swara-text',
                    ].join(' ')}>
                    {sort === s
                      ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      : <span className="w-[14px]" />}
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-swara-card border border-swara-border rounded-lg p-0.5">
            {(['list', 'grid'] as ViewMode[]).map((v) => (
              <button key={v} type="button" onClick={() => handleSetView(v)}
                className={[
                  'flex items-center gap-1.5 h-7 px-2 rounded-md transition-colors',
                  view === v ? 'bg-swara-elevated text-swara-text' : 'text-swara-dim hover:text-swara-muted',
                ].join(' ')}
                aria-label={`${v} view`} aria-pressed={view === v}>
                {v === 'list'
                  ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                      strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                      <path d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                  : <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/>
                      <rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>}
                <span className="hidden lg:inline text-[0.75rem] font-medium capitalize">{v}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="px-5 lg:px-8 pb-6">

        {/* Global empty — no albums AND no playlists */}
        {!hasAnyContent && (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-swara-card border border-swara-border flex items-center justify-center text-swara-dim">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
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

        {hasAnyContent && (
          <>
            {/* Liked Songs pinned — visible on all tabs except Playlists */}
            {tab !== 'Playlists' && (
              <LikedSongsRow count={likedCount} onClick={() => navigate('/liked')} />
            )}

            {/* Per-tab empty state */}
            {currentTabIsEmpty && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                {tab === 'Playlists' ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-swara-card border border-swara-border flex items-center justify-center text-swara-dim">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
                        strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M9 18V5l12-2v13"/>
                        <circle cx="6" cy="18" r="3"/>
                        <circle cx="18" cy="16" r="3"/>
                      </svg>
                    </div>
                    <p className="text-[0.9rem] font-semibold text-swara-muted">No playlists yet</p>
                    <p className="text-[0.78rem] text-swara-dim max-w-[220px] leading-relaxed">
                      Tap "Add to Playlist" on any track to create your first playlist.
                    </p>
                  </>
                ) : (
                  <p className="text-[0.82rem] text-swara-dim">
                    {tab === 'Albums'  ? 'Add albums to see them here.'  : ''}
                    {tab === 'Artists' ? 'Add albums to see artists here.' : ''}
                    {tab === 'All'     ? 'Add albums or create playlists to see them here.' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Content list/grid — same branch-free renderer for all tabs */}
            {!currentTabIsEmpty && (
              view === 'grid'
                ? <RenderableGrid items={currentRenderables} onNavigate={handleNavigate} />
                : <RenderableList items={currentRenderables} onNavigate={handleNavigate} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LibraryPage;
