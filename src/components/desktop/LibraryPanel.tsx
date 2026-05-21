/**
 * LibraryPanel — desktop left sidebar.
 * Shows the user's PERSONAL library (useUserLibraryStore).
 * Does NOT show the full catalog — that's Search > Browse.
 *
 * Content resolved from IDs via canonical Maps (O(1) — no find()).
 *
 * TABS: Albums | Artists | Playlists
 *   Playlists come directly from usePlaylistStore (same source as LibraryPage).
 *   View toggle is hidden on Playlists tab (grid-only, matching LibraryPage UX).
 *   isEmpty is now tab-aware: the global empty state fires only when the user
 *   has no albums AND no playlists.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLibraryStore }      from '@/store/libraryStore';
import { useUserLibraryStore }  from '@/store/useUserLibraryStore';
import { useLikedStore }        from '@/store/likedStore';
import { usePlaylistStore }     from '@/store/usePlaylistStore';
import type { Playlist }        from '@/store/usePlaylistStore';
import type { Album, Artist }   from '@/types/music';
import { slugify }               from '@/utils/library';

type Tab      = 'Albums' | 'Artists' | 'Playlists';
type Sort     = 'Recently Added' | 'A-Z' | 'Z-A';
type ViewMode = 'list' | 'grid';

const PANEL_PREF_KEY = 'swara_panel_prefs';

function loadPanelPrefs(): { sort: Sort; view: ViewMode } {
  try {
    const raw = localStorage.getItem(PANEL_PREF_KEY);
    if (!raw) return { sort: 'Recently Added', view: 'list' };
    const p = JSON.parse(raw) as { sort?: Sort; view?: ViewMode };
    return {
      sort: (['Recently Added', 'A-Z', 'Z-A'] as string[]).includes(p.sort ?? '')
        ? (p.sort as Sort) : 'Recently Added',
      view: p.view === 'grid' ? 'grid' : 'list',
    };
  } catch { return { sort: 'Recently Added', view: 'list' }; }
}
function savePanelPrefs(sort: Sort, view: ViewMode) {
  try { localStorage.setItem(PANEL_PREF_KEY, JSON.stringify({ sort, view })); } catch {}
}

// ── Playlist fallback artwork ─────────────────────────────────────────────────
// Returns the first available cover URL for a playlist (explicit → undefined).
// trackMap lookup omitted in the compact sidebar — artwork is purely optional.
function getPlaylistThumb(playlist: Playlist): string | undefined {
  return playlist.coverUrl ?? undefined;
}

const LibraryPanel = () => {
  const [tab,      setTab]      = useState<Tab>('Albums');
  const [sort,     setSort]     = useState<Sort>(() => loadPanelPrefs().sort);
  const [view,     setView]     = useState<ViewMode>(() => loadPanelPrefs().view);
  const [sortOpen, setSortOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // ── Store subscriptions ───────────────────────────────────────────────────

  // Catalog Maps — O(1) resolution
  const { albumMap, artistMap } = useLibraryStore();

  // User library entries (IDs only)
  const { entries } = useUserLibraryStore();

  // User playlists — selector subscription (only re-renders when playlists change)
  const playlists = usePlaylistStore((s) => s.playlists);

  // Liked count
  const getLikedTracks = useLikedStore((s) => s.getLikedTracks);
  const likedCount     = getLikedTracks().length;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSetSort = useCallback((s: Sort) => {
    setSort(s); setSortOpen(false); savePanelPrefs(s, view);
  }, [view]);

  const handleSetView = useCallback((v: ViewMode) => {
    setView(v); savePanelPrefs(sort, v);
  }, [sort]);

  // ── Memoized resolved + sorted lists ─────────────────────────────────────

  // Resolve IDs → Album objects
  const libraryAlbums = useMemo((): Album[] => {
    const list = entries
      .map((e) => albumMap.get(e.albumId))
      .filter((a): a is Album => a !== undefined);
    if (sort === 'A-Z') return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'Z-A') return [...list].sort((a, b) => b.title.localeCompare(a.title));
    return list; // Recently Added preserves insertion order
  }, [entries, albumMap, sort]);

  // Derive unique artists from library albums
  const libraryArtists = useMemo((): Artist[] => {
    const seen = new Set<string>();
    const result: Artist[] = [];
    for (const entry of entries) {
      const album = albumMap.get(entry.albumId);
      if (!album) continue;
      const artistId = slugify(album.composer);
      if (!artistId || seen.has(artistId)) continue;
      seen.add(artistId);
      const artist = artistMap.get(artistId);
      if (artist) result.push(artist);
    }
    if (sort === 'A-Z') return [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'Z-A') return [...result].sort((a, b) => b.name.localeCompare(a.name));
    return result; // Recently Added preserves album-derived order
  }, [entries, albumMap, artistMap, sort]);

  // Playlists — come directly from usePlaylistStore, no resolution needed
  const libraryPlaylists = useMemo((): Playlist[] => {
    console.log('[LibraryPanel] libraryPlaylists memo — playlists in store:', playlists.length, '| tab:', tab, '| sort:', sort);
    if (sort === 'A-Z') return [...playlists].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'Z-A') return [...playlists].sort((a, b) => b.title.localeCompare(a.title));
    // Recently Added: most-recently-updated first
    return [...playlists].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [playlists, sort, tab]);

  // ── Empty state guards ────────────────────────────────────────────────────
  // Global empty: no albums AND no playlists
  const isGloballyEmpty = entries.length === 0 && playlists.length === 0;
  // ── Diagnostic logging ────────────────────────────────────────────────────
  console.log('[LibraryPanel] render — tab:', tab, '| entries:', entries.length, '| playlists:', playlists.length, '| libraryPlaylists:', libraryPlaylists.length, '| isGloballyEmpty:', isGloballyEmpty);

  return (
    <aside
      className="flex flex-col flex-shrink-0 border-r overflow-hidden"
      style={{ width: '25%', minWidth: '220px', maxWidth: '320px', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[0.78rem] font-semibold text-swara-muted tracking-widest uppercase">Library</h2>

          <div className="flex items-center gap-2">
            {/* View toggle — hidden on Playlists (grid-only) */}
            {!isGloballyEmpty && tab !== 'Playlists' && (
              <div className="flex items-center gap-0.5 bg-swara-card border border-swara-border rounded-md p-0.5">
                {(['list', 'grid'] as ViewMode[]).map((v) => (
                  <button key={v} type="button" onClick={() => handleSetView(v)}
                    className={['w-6 h-5 flex items-center justify-center rounded transition-colors', view === v ? 'bg-swara-elevated text-swara-text' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
                    aria-label={`${v} view`} aria-pressed={view === v}>
                    {v === 'list'
                      ? <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                      : <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
                  </button>
                ))}
              </div>
            )}

            {/* Sort icon */}
            {!isGloballyEmpty && (
              <div className="relative">
                <button type="button" onClick={() => setSortOpen((o) => !o)}
                  className="text-swara-dim hover:text-swara-muted transition-colors" aria-label="Sort options">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                    <path d="M3 6h18M6 12h12M9 18h6"/>
                  </svg>
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 z-30 rounded-xl overflow-hidden shadow-lg"
                    style={{ background: '#1e1e28', border: '1px solid rgba(255,255,255,0.08)', minWidth: '165px' }}>
                    {(['Recently Added', 'A-Z', 'Z-A'] as Sort[]).map((s) => (
                      <button key={s} type="button" onClick={() => handleSetSort(s)}
                        className={['flex items-center gap-2 w-full px-3 py-2.5 text-[0.78rem] text-left hover:bg-swara-card transition-colors', sort === s ? 'text-swara-accent' : 'text-swara-muted'].join(' ')}>
                        {sort === s
                          ? <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
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

        {/* Tab chips — Albums | Artists | Playlists */}
        <div className="flex gap-1.5">
          {(['Albums', 'Artists', 'Playlists'] as Tab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={['px-3 py-1 rounded-full text-[0.72rem] font-medium border transition-all', tab === t ? 'bg-swara-accent border-swara-accent text-swara-bg' : 'border-swara-border text-swara-muted hover:text-swara-text'].join(' ')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto scrollbar-none pb-3">

        {/* Liked Songs — always pinned (hidden on Playlists tab) */}
        {tab !== 'Playlists' && (
          <div className="px-2 pb-1">
            <button type="button" onClick={() => navigate('/liked')}
              className={['flex items-center gap-3 w-full px-2 py-3 rounded-xl text-left transition-colors', location.hash.includes('/liked') ? 'bg-swara-card' : 'hover:bg-swara-card'].join(' ')}>
              <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1e0b0b 0%, #2d1212 50%, #1a0808 100%)' }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#c8a96e" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className={['text-[0.88rem] font-medium truncate', location.hash.includes('/liked') ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>Liked Songs</p>
                <p className="text-[0.76rem] text-swara-muted truncate">{likedCount > 0 ? `${likedCount} songs` : 'Your favorites'}</p>
              </div>
            </button>
          </div>
        )}

        {/* ── Global empty state (no albums AND no playlists) ── */}
        {isGloballyEmpty && (
          <div className="px-4 py-6 flex flex-col items-center gap-2.5 text-center">
            <p className="text-[0.78rem] text-swara-muted">Your library is empty.</p>
            <p className="text-[0.72rem] text-swara-dim leading-relaxed">Add albums from the catalog to see them here.</p>
            <button type="button" onClick={() => navigate('/search')}
              className="mt-1 px-4 py-1.5 rounded-full bg-swara-accent text-swara-bg text-[0.72rem] font-semibold active:scale-95 transition-transform">
              Browse Catalog
            </button>
          </div>
        )}

        {/* ══ Albums tab ══════════════════════════════════════════════════════ */}

        {/* Albums: Grid */}
        {!isGloballyEmpty && view === 'grid' && tab === 'Albums' && (
          <div className="grid grid-cols-2 gap-2 px-2 pt-1">
            {libraryAlbums.map((album) => {
              const active = location.hash.includes(`/album/${album.id}`);
              return (
                <button key={album.id} type="button" onClick={() => navigate(`/album/${album.id}`)}
                  className={['flex flex-col gap-1 text-left rounded-xl p-1.5 min-w-0 w-full overflow-hidden transition-colors active:scale-[0.97]', active ? 'bg-swara-card' : 'hover:bg-swara-card'].join(' ')}>
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-swara-elevated flex-shrink-0">
                    <img src={album.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className={['text-[0.72rem] font-medium truncate w-full leading-snug', active ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>{album.title}</p>
                  <p className="text-[0.64rem] text-swara-muted truncate w-full">{album.composer}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Albums: List */}
        {!isGloballyEmpty && view === 'list' && tab === 'Albums' && (
          <div className="px-2">
            {libraryAlbums.map((album) => {
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
          </div>
        )}

        {/* Albums tab — empty (has content elsewhere but no albums) */}
        {!isGloballyEmpty && tab === 'Albums' && libraryAlbums.length === 0 && (
          <p className="text-[0.75rem] text-swara-dim text-center py-6 px-4">Add albums to see them here.</p>
        )}

        {/* ══ Artists tab ═════════════════════════════════════════════════════ */}

        {/* Artists: Grid */}
        {!isGloballyEmpty && view === 'grid' && tab === 'Artists' && (
          <div className="grid grid-cols-2 gap-2 px-2 pt-1">
            {libraryArtists.map((artist) => {
              const active = location.hash.includes(`/artist/${artist.id}`);
              return (
                <button key={artist.id} type="button" onClick={() => navigate(`/artist/${artist.id}`)}
                  className={['flex flex-col gap-1 items-center text-center rounded-xl p-1.5 min-w-0 w-full overflow-hidden transition-colors active:scale-[0.97]', active ? 'bg-swara-card' : 'hover:bg-swara-card'].join(' ')}>
                  <div className="w-full aspect-square rounded-full overflow-hidden bg-swara-elevated flex-shrink-0">
                    <img src={artist.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className={['text-[0.72rem] font-medium truncate w-full leading-snug', active ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>{artist.name}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Artists: List */}
        {!isGloballyEmpty && view === 'list' && tab === 'Artists' && (
          <div className="px-2">
            {libraryArtists.map((artist) => {
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
        )}

        {/* Artists tab — empty */}
        {!isGloballyEmpty && tab === 'Artists' && libraryArtists.length === 0 && (
          <p className="text-[0.75rem] text-swara-dim text-center py-6 px-4">Add albums to see artists here.</p>
        )}

        {/* ══ Playlists tab ═══════════════════════════════════════════════════ */}

        {/* Playlists: Grid (always grid in the compact sidebar) */}
        {tab === 'Playlists' && libraryPlaylists.length > 0 && (
          <div className="grid grid-cols-2 gap-2 px-2 pt-1">
            {libraryPlaylists.map((playlist) => {
              const thumb  = getPlaylistThumb(playlist);
              const active = location.hash.includes(`/playlist/${playlist.id}`);
              return (
                <button key={playlist.id} type="button"
                  onClick={() => navigate(`/playlist/${playlist.id}`)}
                  className={['flex flex-col gap-1 text-left rounded-xl p-1.5 min-w-0 w-full overflow-hidden transition-colors active:scale-[0.97]', active ? 'bg-swara-card' : 'hover:bg-swara-card'].join(' ')}>
                  {/* Artwork */}
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-swara-elevated flex-shrink-0 relative">
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #1a1422 0%, #221830 50%, #1a1220 100%)' }}>
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                          stroke="rgba(200,169,106,0.35)" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
                          <path d="M9 18V5l12-2v13"/>
                          <circle cx="6" cy="18" r="3"/>
                          <circle cx="18" cy="16" r="3"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Labels */}
                  <p className={['text-[0.72rem] font-medium truncate w-full leading-snug', active ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>
                    {playlist.title}
                  </p>
                  <p className="text-[0.64rem] text-swara-muted truncate w-full">
                    {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Playlists tab — empty */}
        {tab === 'Playlists' && libraryPlaylists.length === 0 && (
          <div className="px-4 py-6 flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-xl bg-swara-card border border-swara-border flex items-center justify-center text-swara-dim">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <p className="text-[0.78rem] text-swara-muted font-medium">No playlists yet</p>
            <p className="text-[0.68rem] text-swara-dim leading-relaxed">
              Tap "Add to Playlist" on any track.
            </p>
          </div>
        )}

        {/* Browse catalog link at bottom */}
        <div className="px-4 pt-4 pb-2 mt-auto">
          <button type="button" onClick={() => navigate('/search')}
            className="flex items-center gap-2 text-[0.72rem] text-swara-dim hover:text-swara-muted transition-colors w-full">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Browse full catalog
          </button>
        </div>
      </div>
    </aside>
  );
};

export default LibraryPanel;
