/**
 * src/features/library/components/LibraryContent.tsx
 *
 * THE canonical library renderer.
 * Used by both LibraryPage (full mobile+desktop page) and LibraryPanel
 * (desktop left sidebar). All filter chips, sort controls, content grids,
 * folder handling, and empty states live here — once.
 *
 * PROPS:
 *   mode: 'page'  — full-page layout (LibraryPage)
 *   mode: 'panel' — compact sidebar layout (LibraryPanel)
 *
 * Outer shell (scrollable container, padding) is handled by the caller.
 * This component emits an unstyled fragment; callers wrap it.
 *
 * FILTER CHIP LOGIC:
 *   Playlists, Albums: independently toggleable
 *   Artists: exclusive — activating it deactivates Playlists + Albums
 *   Deactivating Artists restores Playlists + Albums
 *
 * FOLDER RENDERING (Issue 2):
 *   Folders appear at top of Playlists view via buildRenderables.
 *   FolderRow/FolderCard are rendered inline — clicking a folder
 *   expands it in-place (no navigation).
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation }       from 'react-router-dom';
import { useLibraryStore }                from '@/store/libraryStore';
import { useLikedStore }                  from '@/store/likedStore';
import { useUserLibraryStore }            from '@/store/useUserLibraryStore';
import { usePlaylistStore }               from '@/store/usePlaylistStore';
import { useLibraryPrefsStore }           from '@/store/useLibraryPrefsStore';
import { useFavoriteArtistsStore }        from '@/store/useFavoriteArtistsStore';
import { useFolderStore }                 from '@/store/useFolderStore';
import LibraryCard                        from '@/components/ui/LibraryCard';
import LibraryRow                         from '@/components/ui/LibraryRow';
import CreateLibraryItemSheet             from '@/components/ui/CreateLibraryItemSheet';
import {
  buildRenderables,
  type LibraryRenderable,
  type LibraryEntityType,
} from '@/lib/libraryRenderables';
import type { LibrarySortMode }           from '@/store/useLibraryPrefsStore';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LibraryContentMode = 'page' | 'panel';
type ViewMode = 'list' | 'grid';

const SORTS: LibrarySortMode[] = ['Recently Added', 'A-Z', 'Z-A'];

// ── Liked Songs row ───────────────────────────────────────────────────────────

const LikedSongsRow = ({
  count, compact, onClick,
}: { count: number; compact: boolean; onClick: () => void }) => {
  const imgCls = compact ? 'w-10 h-10 rounded-lg' : 'w-[72px] h-[72px] rounded-xl';
  return (
    <button type="button" onClick={onClick}
      className={[
        'flex items-center w-full text-left rounded-xl transition-all',
        compact
          ? 'gap-3 px-2 py-3 hover:bg-swara-card'
          : 'gap-4 lg:gap-5 py-3 px-3 hover:bg-swara-card active:scale-[0.98]',
      ].join(' ')}>
      <div className={`${imgCls} flex-shrink-0 flex items-center justify-center`}
        style={{ background: 'linear-gradient(135deg, #1e0b0b 0%, #2d1212 50%, #1a0808 100%)' }}>
        <svg viewBox="0 0 24 24" width={compact ? 18 : 28} height={compact ? 18 : 28}
          fill="#c8a96e" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className={[compact ? 'text-[0.82rem]' : 'text-[1rem] lg:text-[1.05rem]',
          'font-semibold text-swara-text truncate leading-snug'].join(' ')}>
          Liked Songs
        </p>
        <p className={[compact ? 'text-[0.68rem]' : 'text-[0.8rem] lg:text-[0.88rem]',
          'text-swara-muted truncate mt-0.5'].join(' ')}>
          {count > 0 ? `${count} songs` : 'Your saved favorites'}
        </p>
      </div>
      {!compact && (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-swara-dim flex-shrink-0" aria-hidden="true">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      )}
    </button>
  );
};

// ── Content renderers ─────────────────────────────────────────────────────────

const RenderableGrid = ({
  items, compact, activeRoute, onNavigate,
}: {
  items: LibraryRenderable[];
  compact: boolean;
  activeRoute: string;
  onNavigate: (route: string) => void;
}) => (
  <div className={compact
    ? 'grid grid-cols-2 gap-2'
    : 'grid grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4'}>
    {items.map((item) => (
      <LibraryCard
        key={item.key}
        title={item.title}
        subtitle={item.subtitle}
        coverUrl={item.playlist ? undefined : item.imageUrl}
        playlist={item.playlist}
        coverShape={item.coverShape}
        isActive={activeRoute.includes(item.route)}
        compact={compact}
        onClick={() => item.route && onNavigate(item.route)}
      />
    ))}
  </div>
);

const RenderableList = ({
  items, compact, activeRoute, onNavigate,
}: {
  items: LibraryRenderable[];
  compact: boolean;
  activeRoute: string;
  onNavigate: (route: string) => void;
}) => (
  <div className="flex flex-col gap-0">
    {items.map((item) => (
      <LibraryRow
        key={item.key}
        title={item.title}
        subtitle={item.subtitle}
        tertiary={compact ? undefined : item.tertiary}
        coverUrl={item.playlist ? undefined : item.imageUrl}
        playlist={item.playlist}
        coverShape={item.coverShape}
        isActive={activeRoute.includes(item.route)}
        compact={compact}
        showChevron={!compact}
        onClick={() => item.route && onNavigate(item.route)}
      />
    ))}
  </div>
);

// ── LibraryContent ────────────────────────────────────────────────────────────

interface LibraryContentProps {
  mode: LibraryContentMode;
}

const LibraryContent = ({ mode }: LibraryContentProps) => {
  const compact  = mode === 'panel';
  const navigate = useNavigate();
  const location = useLocation();
  const activeRoute = location.hash;

  // ── Persisted prefs ───────────────────────────────────────────────────────
  const { sort, view, setSort, setView } = useLibraryPrefsStore();
  const [sortOpen,   setSortOpen]   = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // ── Filter chip state ─────────────────────────────────────────────────────
  const [showPlaylists, setShowPlaylists] = useState(true);
  const [showAlbums,    setShowAlbums]    = useState(true);
  const [showArtists,   setShowArtists]   = useState(false);

  // ── Store subscriptions ───────────────────────────────────────────────────
  const { albumMap, artistMap, trackMap } = useLibraryStore();
  const entries    = useUserLibraryStore((s) => s.entries);
  const playlists  = usePlaylistStore((s) => s.playlists);
  const folders    = useFolderStore((s) => s.folders);
  const likedCount = useLikedStore((s) => s.getLikedTracks().length);
  const favorites  = useFavoriteArtistsStore((s) => s.favorites);

  const favoriteArtistIds = useMemo(
    () => favorites.map((f) => f.artistId),
    [favorites],
  );

  // ── Filter chip handlers ──────────────────────────────────────────────────

  const handleTogglePlaylists = () => {
    setShowPlaylists((v) => !v);
    setShowArtists(false);
  };
  const handleToggleAlbums = () => {
    setShowAlbums((v) => !v);
    setShowArtists(false);
  };
  const handleToggleArtists = () => {
    if (!showArtists) {
      setShowArtists(true);
      setShowPlaylists(false);
      setShowAlbums(false);
    } else {
      setShowArtists(false);
      setShowPlaylists(true);
      setShowAlbums(true);
    }
  };

  // ── Prefs handlers ────────────────────────────────────────────────────────
  const handleSetSort = useCallback((s: LibrarySortMode) => {
    setSort(s); setSortOpen(false);
  }, [setSort]);

  const handleSetView = useCallback((v: ViewMode) => {
    setView(v);
  }, [setView]);

  const handleNavigate = useCallback((route: string) => {
    navigate(route);
  }, [navigate]);

  // ── Derived include set ───────────────────────────────────────────────────
  const include = useMemo(() => {
    const s = new Set<LibraryEntityType>();
    if (showPlaylists) s.add('playlist');
    if (showAlbums)    s.add('album');
    if (showArtists)   s.add('artist');
    if (s.size === 0) { s.add('album'); s.add('playlist'); }
    return s;
  }, [showPlaylists, showAlbums, showArtists]);

  // ── Renderables ───────────────────────────────────────────────────────────
  const renderables = useMemo(
    () => buildRenderables(
      entries, albumMap, artistMap, playlists, trackMap, sort, include,
      showArtists ? favoriteArtistIds : undefined,
      showPlaylists ? folders : [],
    ),
    [entries, albumMap, artistMap, playlists, trackMap, sort, include,
     favoriteArtistIds, showArtists, folders, showPlaylists],
  );

  // ── Empty state flags ─────────────────────────────────────────────────────
  const hasAnyContent     = entries.length > 0 || playlists.length > 0;
  const currentTabIsEmpty = renderables.length === 0;

  // ── Padding classes by mode ───────────────────────────────────────────────
  const px = compact ? 'px-3' : 'px-5 lg:px-8';

  return (
    <>
      {/* ── Header ── */}
      <div className={`${px} ${compact ? 'pt-5 pb-3' : 'pt-6 pb-2'}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={[
            'font-bold text-swara-text tracking-tight font-display',
            compact ? 'text-[0.78rem] font-semibold text-swara-muted tracking-widest uppercase' : 'text-[1.5rem]',
          ].join(' ')}>
            My Library
          </h2>
          <div className="flex items-center gap-1.5">
            {/* View toggle — always visible in panel, visible when content exists on page */}
            {(compact || (!compact && hasAnyContent && !currentTabIsEmpty)) && (
              <div className="flex items-center gap-0.5 bg-swara-card border border-swara-border rounded-lg p-0.5">
                {(['list', 'grid'] as ViewMode[]).map((v) => (
                  <button key={v} type="button" onClick={() => handleSetView(v)}
                    className={[
                      'flex items-center justify-center rounded transition-colors',
                      compact ? 'w-6 h-5' : 'h-7 px-2 gap-1.5',
                      view === v ? 'bg-swara-elevated text-swara-text' : 'text-swara-dim hover:text-swara-muted',
                    ].join(' ')}
                    aria-label={`${v} view`} aria-pressed={view === v}>
                    {v === 'list'
                      ? <svg viewBox="0 0 24 24" width={compact ? 11 : 14} height={compact ? 11 : 14}
                          fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                          <path d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                      : <svg viewBox="0 0 24 24" width={compact ? 11 : 14} height={compact ? 11 : 14}
                          fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="3" width="7" height="7" rx="1"/>
                          <rect x="14" y="3" width="7" height="7" rx="1"/>
                          <rect x="3" y="14" width="7" height="7" rx="1"/>
                          <rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>}
                    {!compact && <span className="hidden lg:inline text-[0.75rem] font-medium capitalize">{v}</span>}
                  </button>
                ))}
              </div>
            )}
            {/* + Create button */}
            <button type="button" onClick={() => setCreateOpen(true)}
              className={[
                'flex items-center justify-center rounded-full text-swara-dim hover:text-swara-muted hover:bg-swara-card transition-all',
                compact ? 'w-6 h-6' : 'w-8 h-8',
              ].join(' ')}
              aria-label="Create playlist or folder">
              <svg viewBox="0 0 24 24" width={compact ? 14 : 20} height={compact ? 14 : 20}
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {[
            { label: 'Playlists', active: showPlaylists && !showArtists, handler: handleTogglePlaylists },
            { label: 'Albums',    active: showAlbums    && !showArtists, handler: handleToggleAlbums    },
            { label: 'Artists',   active: showArtists,                   handler: handleToggleArtists   },
          ].map(({ label, active, handler }) => (
            <button key={label} type="button" onClick={handler}
              className={[
                'flex-shrink-0 rounded-full font-medium border transition-all duration-200',
                compact ? 'px-3 py-1 text-[0.72rem]' : 'px-4 py-1.5 text-[0.82rem]',
                active
                  ? 'bg-swara-accent border-swara-accent text-swara-bg'
                  : 'bg-transparent border-swara-border text-swara-muted hover:text-swara-text',
              ].join(' ')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${compact ? 'mx-3' : 'mx-5 lg:mx-8'} h-px bg-swara-border opacity-50 mb-2`} />

      {/* Sort row — page mode only when there's content */}
      {!compact && hasAnyContent && !currentTabIsEmpty && (
        <div className={`flex items-center justify-between ${px} mb-4`}>
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
        </div>
      )}

      {/* ── Content ── */}
      <div className={`${px} ${compact ? 'pb-3' : 'pb-6'}`}>

        {/* Global empty */}
        {!hasAnyContent && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            {!compact && (
              <div className="w-14 h-14 rounded-2xl bg-swara-card border border-swara-border flex items-center justify-center text-swara-dim">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                </svg>
              </div>
            )}
            <p className={[compact ? 'text-[0.78rem]' : 'text-[0.9rem]', 'font-semibold text-swara-muted'].join(' ')}>
              Your library is empty
            </p>
            {!compact && (
              <>
                <p className="text-[0.78rem] text-swara-dim max-w-[220px] leading-relaxed">
                  Browse the catalog and add albums or tracks to your library.
                </p>
                <button type="button" onClick={() => navigate('/search')}
                  className="mt-1 px-5 py-2 rounded-full bg-swara-accent text-swara-bg text-[0.82rem] font-semibold active:scale-95 transition-transform">
                  Browse Catalog
                </button>
              </>
            )}
          </div>
        )}

        {hasAnyContent && (
          <>
            {/* Liked Songs */}
            {!showArtists && (
              <LikedSongsRow
                count={likedCount}
                compact={compact}
                onClick={() => navigate('/liked')}
              />
            )}

            {/* Per-filter empty state */}
            {currentTabIsEmpty && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                {showArtists ? (
                  <>
                    {!compact && (
                      <div className="w-12 h-12 rounded-2xl bg-swara-card border border-swara-border flex items-center justify-center text-swara-dim">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="8" r="4"/>
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                        </svg>
                      </div>
                    )}
                    <p className={[compact ? 'text-[0.75rem]' : 'text-[0.88rem]', 'font-semibold text-swara-muted'].join(' ')}>
                      No followed artists
                    </p>
                    {!compact && (
                      <p className="text-[0.75rem] text-swara-dim max-w-[200px] leading-relaxed">
                        Visit an artist page and tap "Follow".
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[0.78rem] text-swara-dim">Nothing here yet.</p>
                )}
              </div>
            )}

            {/* Content grid / list */}
            {!currentTabIsEmpty && (
              view === 'grid'
                ? <RenderableGrid items={renderables} compact={compact} activeRoute={activeRoute} onNavigate={handleNavigate} />
                : <RenderableList items={renderables} compact={compact} activeRoute={activeRoute} onNavigate={handleNavigate} />
            )}
          </>
        )}

        {/* Browse link — panel only */}
        {compact && (
          <div className="pt-4 pb-1">
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
        )}
      </div>

      <CreateLibraryItemSheet isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
};

export default LibraryContent;
