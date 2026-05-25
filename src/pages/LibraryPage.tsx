/**
 * LibraryPage — the user's personal library.
 *
 * ARCHITECTURE:
 *   All data is normalized into LibraryRenderable[] via buildRenderables()
 *   before any JSX is evaluated. The render loop is branch-free.
 *
 * FILTER CHIPS (Issue 5):
 *   Playlists + Albums: independently toggleable
 *   Artists: exclusive — selecting it deactivates Playlists/Albums
 *   Selecting Playlists or Albums deactivates Artists
 *
 * UI PREFS (Issue 1):
 *   Sort + view + tab persisted to localStorage via useLibraryPrefsStore.
 *   Zero flicker on hydration — state is read synchronously from localStorage
 *   before first render (no useEffect hydration dance).
 *
 * ARTISTS (Issue 6):
 *   Artists section shows ONLY explicitly-followed artists (useFavoriteArtistsStore).
 *   Passing favoriteArtistIds to buildRenderables() activates the explicit-follow path.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore }          from '@/store/libraryStore';
import { useLikedStore }            from '@/store/likedStore';
import { useUserLibraryStore }      from '@/store/useUserLibraryStore';
import { usePlaylistStore }         from '@/store/usePlaylistStore';
import { useLibraryPrefsStore }     from '@/store/useLibraryPrefsStore';
import { useFavoriteArtistsStore }  from '@/store/useFavoriteArtistsStore';
import LibraryCard                  from '@/components/ui/LibraryCard';
import LibraryRow                   from '@/components/ui/LibraryRow';
import CreateLibraryItemSheet       from '@/components/ui/CreateLibraryItemSheet';
import {
  buildRenderables,
  type LibraryRenderable,
} from '@/lib/libraryRenderables';
import type { LibrarySortMode } from '@/store/useLibraryPrefsStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'grid';

const SORTS: LibrarySortMode[] = ['Recently Added', 'A-Z', 'Z-A'];
const GRID_CLASS = 'grid grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4';

// ── Liked Songs pinned row ────────────────────────────────────────────────────

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

// ── Renderers ─────────────────────────────────────────────────────────────────

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
  // Persisted prefs — synchronously initialized from localStorage, zero flicker
  const { sort, view, setSort, setView } = useLibraryPrefsStore();

  const [sortOpen,      setSortOpen]      = useState(false);
  const [createOpen,    setCreateOpen]    = useState(false);

  // Issue 5: filter chip state (independent toggles for playlists/albums, exclusive for artists)
  const [showPlaylists, setShowPlaylists] = useState(true);
  const [showAlbums,    setShowAlbums]    = useState(true);
  const [showArtists,   setShowArtists]   = useState(false);

  const navigate = useNavigate();

  // ── Store subscriptions ───────────────────────────────────────────────────

  const { albumMap, artistMap, trackMap } = useLibraryStore();
  const entries    = useUserLibraryStore((s) => s.entries);
  const playlists  = usePlaylistStore((s) => s.playlists);
  const likedCount = useLikedStore((s) => s.getLikedTracks().length);
  // Issue 6: explicit-follow-only artists
  const favorites  = useFavoriteArtistsStore((s) => s.favorites);
  const favoriteArtistIds = useMemo(
    () => favorites.map((f) => f.artistId),
    [favorites],
  );

  // ── Filter chip handlers (Issue 5) ───────────────────────────────────────

  const handleTogglePlaylists = () => {
    setShowPlaylists((v) => !v);
    setShowArtists(false); // artists is exclusive
  };

  const handleToggleAlbums = () => {
    setShowAlbums((v) => !v);
    setShowArtists(false); // artists is exclusive
  };

  const handleToggleArtists = () => {
    if (!showArtists) {
      // Activate artists exclusively
      setShowArtists(true);
      setShowPlaylists(false);
      setShowAlbums(false);
    } else {
      // Deactivate — return to all
      setShowArtists(false);
      setShowPlaylists(true);
      setShowAlbums(true);
    }
  };

  // ── Prefs handlers ────────────────────────────────────────────────────────

  const handleSetSort = useCallback((s: LibrarySortMode) => {
    setSort(s);
    setSortOpen(false);
  }, [setSort]);

  const handleSetView = useCallback((v: ViewMode) => {
    setView(v);
  }, [setView]);

  const handleNavigate = useCallback((route: string) => {
    navigate(route);
  }, [navigate]);

  // ── Derive the include set from filter chip state ─────────────────────────

  const include = useMemo(() => {
    const s = new Set<'album' | 'artist' | 'playlist'>();
    if (showPlaylists) s.add('playlist');
    if (showAlbums)    s.add('album');
    if (showArtists)   s.add('artist');
    // When all are off, show everything (prevents empty screen confusion)
    if (s.size === 0) { s.add('album'); s.add('playlist'); }
    return s;
  }, [showPlaylists, showAlbums, showArtists]);

  // ── Normalized renderables ────────────────────────────────────────────────

  const renderables = useMemo(
    () => buildRenderables(
      entries, albumMap, artistMap, playlists, trackMap, sort, include,
      showArtists ? favoriteArtistIds : undefined,
    ),
    [entries, albumMap, artistMap, playlists, trackMap, sort, include, favoriteArtistIds, showArtists],
  );

  // ── Empty-state flags ─────────────────────────────────────────────────────

  const hasAnyContent     = entries.length > 0 || playlists.length > 0;
  const currentTabIsEmpty = renderables.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* ── Header ── */}
      <div className="px-5 lg:px-8 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[1.5rem] font-bold text-swara-text tracking-tight font-display">
            My Library
          </h1>
          {/* Issue 3: "+" button opens Create Playlist / Folder picker */}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text hover:bg-swara-card transition-all"
            aria-label="Create playlist or folder"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Issue 5: Filter chips — playlists+albums toggleable, artists exclusive */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {/* Playlists chip */}
          <button type="button" onClick={handleTogglePlaylists}
            className={[
              'flex-shrink-0 px-4 py-1.5 rounded-full text-[0.82rem] font-medium border transition-all duration-200',
              showPlaylists && !showArtists
                ? 'bg-swara-accent border-swara-accent text-swara-bg'
                : 'bg-transparent border-swara-border text-swara-muted hover:text-swara-text',
            ].join(' ')}>
            Playlists
          </button>

          {/* Albums chip */}
          <button type="button" onClick={handleToggleAlbums}
            className={[
              'flex-shrink-0 px-4 py-1.5 rounded-full text-[0.82rem] font-medium border transition-all duration-200',
              showAlbums && !showArtists
                ? 'bg-swara-accent border-swara-accent text-swara-bg'
                : 'bg-transparent border-swara-border text-swara-muted hover:text-swara-text',
            ].join(' ')}>
            Albums
          </button>

          {/* Artists chip — exclusive */}
          <button type="button" onClick={handleToggleArtists}
            className={[
              'flex-shrink-0 px-4 py-1.5 rounded-full text-[0.82rem] font-medium border transition-all duration-200',
              showArtists
                ? 'bg-swara-accent border-swara-accent text-swara-bg'
                : 'bg-transparent border-swara-border text-swara-muted hover:text-swara-text',
            ].join(' ')}>
            Artists
          </button>
        </div>
      </div>

      <div className="mx-5 lg:mx-8 h-px bg-swara-border opacity-50 mb-3" />

      {/* ── Sort + view controls ── */}
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

          {/* View toggle */}
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
            {/* Liked Songs — hidden when Artists filter is active */}
            {!showArtists && (
              <LikedSongsRow count={likedCount} onClick={() => navigate('/liked')} />
            )}

            {/* Empty state for current filter */}
            {currentTabIsEmpty && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                {showArtists ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-swara-card border border-swara-border flex items-center justify-center text-swara-dim">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                    </div>
                    <p className="text-[0.9rem] font-semibold text-swara-muted">No followed artists</p>
                    <p className="text-[0.78rem] text-swara-dim max-w-[230px] leading-relaxed">
                      Visit an artist page and tap "Follow" to add them here.
                    </p>
                  </>
                ) : (
                  <p className="text-[0.82rem] text-swara-dim">Nothing here yet. Try a different filter.</p>
                )}
              </div>
            )}

            {/* Content */}
            {!currentTabIsEmpty && (
              view === 'grid'
                ? <RenderableGrid items={renderables} onNavigate={handleNavigate} />
                : <RenderableList items={renderables} onNavigate={handleNavigate} />
            )}
          </>
        )}
      </div>

      {/* Create Playlist / Folder sheet */}
      <CreateLibraryItemSheet
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
};

export default LibraryPage;
