/**
 * LibraryPage — the user's PERSONAL library (mobile full-page + desktop content).
 *
 * TAB ORDER: All | Playlists | Albums | Artists
 *
 * "All" tab: unified flat list — Liked Songs pinned, then all playlists +
 * albums + artists sorted together by recency or name.
 *
 * UNIFIED RENDERING:
 *   All tabs share the SAME:
 *     - sort options (Recently Added / A-Z / Z-A)
 *     - view modes (list / grid)
 *     - card/row components (LibraryCard, LibraryRow)
 *     - hover/active states and typography hierarchy
 *   Playlists no longer have special-case grid-only treatment.
 *
 * DATA SOURCES:
 *   Albums   → useUserLibraryStore entries → resolved via albumMap
 *   Artists  → derived from album entries → resolved via artistMap
 *   Playlists→ usePlaylistStore.playlists (direct, no resolution needed)
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore }     from '@/store/libraryStore';
import { slugify }             from '@/utils/library';
import { useLikedStore }       from '@/store/likedStore';
import { useUserLibraryStore } from '@/store/useUserLibraryStore';
import { usePlaylistStore }    from '@/store/usePlaylistStore';
import LibraryCard             from '@/components/ui/LibraryCard';
import LibraryRow              from '@/components/ui/LibraryRow';
import type { Album, Artist }  from '@/types/music';
import type { Playlist }       from '@/store/usePlaylistStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab      = 'All' | 'Playlists' | 'Albums' | 'Artists';
type Sort     = 'Recently Added' | 'A-Z' | 'Z-A';
type ViewMode = 'list' | 'grid';

const TABS:  Tab[]  = ['All', 'Playlists', 'Albums', 'Artists'];
const SORTS: Sort[] = ['Recently Added', 'A-Z', 'Z-A'];
const PREF_KEY      = 'swara_library_prefs';

// ── Prefs persistence ─────────────────────────────────────────────────────────

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

// ── Playlist artwork helper ───────────────────────────────────────────────────

function playlistCoverUrl(
  playlist: Playlist,
  trackMap: Map<string, import('@/types/music').Track>,
): string | undefined {
  if (playlist.coverUrl) return playlist.coverUrl;
  if (playlist.trackIds.length > 0) return trackMap.get(playlist.trackIds[0])?.coverUrl;
  return undefined;
}

// ── "All" tab unified item ────────────────────────────────────────────────────
// A discriminated union used to sort everything together.

type AllItem =
  | { kind: 'album';    data: Album;    sortName: string; sortDate: number }
  | { kind: 'artist';   data: Artist;   sortName: string; sortDate: number }
  | { kind: 'playlist'; data: Playlist; sortName: string; sortDate: number };

// ── LibraryPage ───────────────────────────────────────────────────────────────

const LibraryPage = () => {
  const [tab,      setTab]      = useState<Tab>('All');
  const [sort,     setSort]     = useState<Sort>(() => loadPrefs().sort);
  const [view,     setView]     = useState<ViewMode>(() => loadPrefs().view);
  const [sortOpen, setSortOpen] = useState(false);

  const navigate = useNavigate();

  // ── Store subscriptions ───────────────────────────────────────────────────

  const { albumMap, artistMap, trackMap } = useLibraryStore();
  const entries   = useUserLibraryStore((s) => s.entries);
  const playlists = usePlaylistStore((s) => s.playlists);
  const getLikedTracks = useLikedStore((s) => s.getLikedTracks);
  const likedCount     = getLikedTracks().length;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSetSort = useCallback((s: Sort) => {
    setSort(s); setSortOpen(false); savePrefs(s, view);
  }, [view]);

  const handleSetView = useCallback((v: ViewMode) => {
    setView(v); savePrefs(sort, v);
  }, [sort]);

  // ── Sorted Albums ─────────────────────────────────────────────────────────

  const libraryAlbums = useMemo((): Album[] => {
    const resolved = entries
      .map((e) => albumMap.get(e.albumId))
      .filter((a): a is Album => a !== undefined);
    if (sort === 'Recently Added') return resolved;
    if (sort === 'A-Z') return [...resolved].sort((a, b) => a.title.localeCompare(b.title));
    return [...resolved].sort((a, b) => b.title.localeCompare(a.title));
  }, [entries, albumMap, sort]);

  // ── Sorted Artists ────────────────────────────────────────────────────────

  const libraryArtists = useMemo((): Artist[] => {
    const seen = new Set<string>();
    const ordered: Artist[] = [];
    for (const entry of entries) {
      const album = albumMap.get(entry.albumId);
      if (!album) continue;
      const id = slugify(album.composer);
      if (!seen.has(id)) {
        seen.add(id);
        const artist = artistMap.get(id);
        if (artist) ordered.push(artist);
      }
    }
    if (sort === 'Recently Added') return ordered;
    if (sort === 'A-Z') return [...ordered].sort((a, b) => a.name.localeCompare(b.name));
    return [...ordered].sort((a, b) => b.name.localeCompare(a.name));
  }, [entries, albumMap, artistMap, sort]);

  // ── Sorted Playlists ──────────────────────────────────────────────────────

  const libraryPlaylists = useMemo((): Playlist[] => {
    if (sort === 'Recently Added')
      return [...playlists].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (sort === 'A-Z') return [...playlists].sort((a, b) => a.title.localeCompare(b.title));
    return [...playlists].sort((a, b) => b.title.localeCompare(a.title));
  }, [playlists, sort]);

  // ── "All" tab: unified sorted list ───────────────────────────────────────

  const allItems = useMemo((): AllItem[] => {
    const items: AllItem[] = [];

    for (const [i, entry] of entries.entries()) {
      const album = albumMap.get(entry.albumId);
      if (!album) continue;
      items.push({ kind: 'album', data: album, sortName: album.title, sortDate: entry.addedAt });

      const artistId = slugify(album.composer);
      const artist   = artistMap.get(artistId);
      if (artist && !items.some((x) => x.kind === 'artist' && x.data.id === artist.id)) {
        // Artist date = most recent album's addedAt
        items.push({ kind: 'artist', data: artist, sortName: artist.name, sortDate: entry.addedAt });
      }
      void i;
    }

    for (const pl of playlists) {
      items.push({
        kind:     'playlist',
        data:     pl,
        sortName: pl.title,
        sortDate: new Date(pl.updatedAt).getTime(),
      });
    }

    if (sort === 'Recently Added') return items.sort((a, b) => b.sortDate - a.sortDate);
    if (sort === 'A-Z') return items.sort((a, b) => a.sortName.localeCompare(b.sortName));
    return items.sort((a, b) => b.sortName.localeCompare(a.sortName));
  }, [entries, albumMap, artistMap, playlists, sort]);

  // ── Empty-state guards ────────────────────────────────────────────────────

  const hasAnyContent = entries.length > 0 || playlists.length > 0;
  const currentTabIsEmpty =
    (tab === 'All'      && allItems.length === 0) ||
    (tab === 'Playlists'&& libraryPlaylists.length === 0) ||
    (tab === 'Albums'   && libraryAlbums.length === 0) ||
    (tab === 'Artists'  && libraryArtists.length === 0);

  // ── Grid columns helper ───────────────────────────────────────────────────
  const gridClass = 'grid grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4';

  // ── Liked Songs pinned row ────────────────────────────────────────────────
  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* ── Header + tab chips ── */}
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

      {/* ── Sort + view controls ── */}
      {!currentTabIsEmpty && (
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
              <div className="absolute top-full left-0 mt-2 z-20 bg-swara-elevated border border-swara-border rounded-xl overflow-hidden shadow-lg min-w-[170px]">
                {SORTS.map((s) => (
                  <button key={s} type="button" onClick={() => handleSetSort(s)}
                    className={['flex items-center gap-2 w-full px-4 py-2.5 text-[0.85rem] text-left hover:bg-swara-card transition-colors', sort === s ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>
                    {sort === s
                      ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
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

      {/* ── Content ── */}
      <div className="px-5 lg:px-8 pb-6">

        {/* Global empty state */}
        {!hasAnyContent && (
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

        {/* ══ ALL TAB ══════════════════════════════════════════════════════ */}
        {tab === 'All' && hasAnyContent && (
          <>
            {/* Liked Songs — always pinned first */}
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
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </div>

            {/* Unified sorted list of playlists + albums + artists */}
            {allItems.length === 0 && (
              <p className="text-[0.82rem] text-swara-dim text-center py-8">
                Add albums or create playlists to see them here.
              </p>
            )}

            {view === 'grid' ? (
              <div className={gridClass}>
                {allItems.map((item) => {
                  if (item.kind === 'album') {
                    return (
                      <LibraryCard key={`album-${item.data.id}`}
                        title={item.data.title} subtitle={item.data.composer}
                        coverUrl={item.data.coverUrl}
                        onClick={() => navigate(`/album/${item.data.id}`)} />
                    );
                  }
                  if (item.kind === 'artist') {
                    return (
                      <LibraryCard key={`artist-${item.data.id}`}
                        title={item.data.name} coverUrl={item.data.coverUrl}
                        coverShape="circle"
                        onClick={() => navigate(`/artist/${item.data.id}`)} />
                    );
                  }
                  // playlist
                  return (
                    <LibraryCard key={`playlist-${item.data.id}`}
                      title={item.data.title}
                      subtitle={`${item.data.trackCount} ${item.data.trackCount === 1 ? 'track' : 'tracks'}`}
                      coverUrl={playlistCoverUrl(item.data, trackMap)}
                      playlistFallback
                      onClick={() => navigate(`/playlist/${item.data.id}`)} />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-0">
                {allItems.map((item) => {
                  if (item.kind === 'album') {
                    return (
                      <LibraryRow key={`album-${item.data.id}`}
                        title={item.data.title} subtitle={item.data.composer}
                        tertiary={String(item.data.year)} coverUrl={item.data.coverUrl}
                        onClick={() => navigate(`/album/${item.data.id}`)} showChevron />
                    );
                  }
                  if (item.kind === 'artist') {
                    return (
                      <LibraryRow key={`artist-${item.data.id}`}
                        title={item.data.name}
                        subtitle={`${item.data.albumIds.length} album${item.data.albumIds.length !== 1 ? 's' : ''}`}
                        coverUrl={item.data.coverUrl} coverShape="circle"
                        onClick={() => navigate(`/artist/${item.data.id}`)} showChevron />
                    );
                  }
                  // playlist
                  return (
                    <LibraryRow key={`playlist-${item.data.id}`}
                      title={item.data.title}
                      subtitle={`${item.data.trackCount} ${item.data.trackCount === 1 ? 'track' : 'tracks'}`}
                      coverUrl={playlistCoverUrl(item.data, trackMap)}
                      playlistFallback
                      onClick={() => navigate(`/playlist/${item.data.id}`)} showChevron />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══ PLAYLISTS TAB ════════════════════════════════════════════════ */}
        {tab !== 'All' && tab !== 'Playlists' && (
          /* Liked Songs pinned on non-All, non-Playlists tabs */
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
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
        )}

        {tab === 'Playlists' && libraryPlaylists.length > 0 && (
          view === 'grid' ? (
            <div className={gridClass}>
              {libraryPlaylists.map((pl) => (
                <LibraryCard key={pl.id}
                  title={pl.title}
                  subtitle={`${pl.trackCount} ${pl.trackCount === 1 ? 'track' : 'tracks'}`}
                  coverUrl={playlistCoverUrl(pl, trackMap)}
                  playlistFallback
                  onClick={() => navigate(`/playlist/${pl.id}`)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {libraryPlaylists.map((pl) => (
                <LibraryRow key={pl.id}
                  title={pl.title}
                  subtitle={`${pl.trackCount} ${pl.trackCount === 1 ? 'track' : 'tracks'}`}
                  coverUrl={playlistCoverUrl(pl, trackMap)}
                  playlistFallback
                  onClick={() => navigate(`/playlist/${pl.id}`)} showChevron />
              ))}
            </div>
          )
        )}

        {tab === 'Playlists' && libraryPlaylists.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-swara-card border border-swara-border flex items-center justify-center text-swara-dim">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <p className="text-[0.9rem] font-semibold text-swara-muted">No playlists yet</p>
            <p className="text-[0.78rem] text-swara-dim max-w-[220px] leading-relaxed">
              Tap "Add to Playlist" on any track to create your first playlist.
            </p>
          </div>
        )}

        {/* ══ ALBUMS TAB ═══════════════════════════════════════════════════ */}

        {tab === 'Albums' && libraryAlbums.length > 0 && (
          view === 'grid' ? (
            <div className={gridClass}>
              {libraryAlbums.map((album) => (
                <LibraryCard key={album.id}
                  title={album.title} subtitle={album.composer}
                  coverUrl={album.coverUrl}
                  onClick={() => navigate(`/album/${album.id}`)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {libraryAlbums.map((album) => (
                <LibraryRow key={album.id}
                  title={album.title} subtitle={album.composer}
                  tertiary={String(album.year)} coverUrl={album.coverUrl}
                  onClick={() => navigate(`/album/${album.id}`)} showChevron />
              ))}
            </div>
          )
        )}

        {tab === 'Albums' && hasAnyContent && libraryAlbums.length === 0 && (
          <p className="text-[0.82rem] text-swara-dim text-center py-8">Add albums to see them here.</p>
        )}

        {/* ══ ARTISTS TAB ══════════════════════════════════════════════════ */}

        {tab === 'Artists' && libraryArtists.length > 0 && (
          view === 'grid' ? (
            <div className={gridClass}>
              {libraryArtists.map((artist) => (
                <LibraryCard key={artist.id}
                  title={artist.name} coverUrl={artist.coverUrl}
                  coverShape="circle"
                  onClick={() => navigate(`/artist/${artist.id}`)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {libraryArtists.map((artist) => (
                <LibraryRow key={artist.id}
                  title={artist.name}
                  subtitle={`${artist.albumIds.length} album${artist.albumIds.length !== 1 ? 's' : ''}`}
                  coverUrl={artist.coverUrl} coverShape="circle"
                  onClick={() => navigate(`/artist/${artist.id}`)} showChevron />
              ))}
            </div>
          )
        )}

        {tab === 'Artists' && hasAnyContent && libraryArtists.length === 0 && (
          <p className="text-[0.82rem] text-swara-dim text-center py-8">Add albums to see artists here.</p>
        )}

      </div>
    </div>
  );
};

export default LibraryPage;
