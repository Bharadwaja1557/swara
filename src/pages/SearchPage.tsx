/**
 * SearchPage — unified search + catalog browser.
 *
 * REFINEMENT PASS 4:
 *
 *   1. Search history: entity tiles instead of raw query text.
 *      Clicking a history entity performs its natural action:
 *        track  → plays the song
 *        album  → navigates to album page
 *        artist → navigates to artist page
 *
 *   2. Browse cards: 4 columns on large screens (single row).
 *      When a browse card is active, the history section is hidden and
 *      browse floats to the top — focused browsing mode.
 *
 *   3. Playlists in search results.
 *      Own playlists (public + private) + saved + other users' public.
 *      Private playlists from other users are excluded (RLS + client).
 *
 * ── MATCHING ARCHITECTURE ─────────────────────────────────────────────────────
 *   Tracks  → title only
 *   Albums  → album title only
 *   Artists → artist name only
 *   Playlists → playlist name, via async Supabase query
 */
import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { useNavigate }                  from 'react-router-dom';
import { useLibraryStore }              from '@/store/libraryStore';
import { useSearchHistoryStore }        from '@/store/useSearchHistoryStore';
import { useDesktopSearchStore }        from '@/store/useDesktopSearchStore';
import { useIsDesktop }                 from '@/hooks/useIsDesktop';
import { trackActions }                 from '@/lib/trackActions';
import { PlaylistRepository }           from '@/repositories/playlists/PlaylistRepository';
import { usePlaylistStore }             from '@/store/usePlaylistStore';
import { PlaylistArtwork }              from '@/features/artwork';
import SongRow                          from '@/components/ui/SongRow';
import type { Album, Artist }           from '@/types/music';
import type { HistoryEntity }           from '@/store/useSearchHistoryStore';
import type { Playlist }                from '@/store/usePlaylistStore';

type Filter     = 'All' | 'Tracks' | 'Albums' | 'Artists' | 'Playlists';
type BrowseMode = 'Albums' | 'Composers' | 'Singers' | 'Year' | null;
type AlbumSort  = 'A-Z' | 'Z-A' | 'Latest' | 'Oldest';
type YearOrder  = 'latest' | 'oldest';
type AlbumView  = 'grid' | 'list';

const FILTERS: Filter[] = ['All', 'Tracks', 'Albums', 'Artists', 'Playlists'];
const SEARCH_MAX = 5;

const PH_ALBUM  = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';
const PH_ARTIST = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><circle cx="50" cy="38" r="20" fill="%233E3D3A"/><ellipse cx="50" cy="80" rx="30" ry="18" fill="%233E3D3A"/></svg>';

// ─── Result row sub-components ────────────────────────────────────────────────

const AlbumRow = ({ album, onResultClick }: { album: Album; onResultClick?: () => void }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => { onResultClick?.(); navigate(`/album/${album.id}`); }}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left">
      <img src={album.coverUrl || PH_ALBUM} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />
      <div className="flex-1 min-w-0">
        <p className="text-[0.88rem] font-medium text-swara-text truncate">{album.title}</p>
        <p className="text-[0.72rem] text-swara-muted truncate">{album.composer} · {album.year}</p>
      </div>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </button>
  );
};

const ArtistRow = ({ artist, onResultClick }: { artist: Artist; onResultClick?: () => void }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => { onResultClick?.(); navigate(`/artist/${artist.id}`); }}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left">
      <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-swara-elevated">
        <img src={artist.coverUrl || PH_ARTIST} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.88rem] font-medium text-swara-text truncate">{artist.name}</p>
        <p className="text-[0.72rem] text-swara-muted truncate">{artist.albumIds.length} album{artist.albumIds.length !== 1 ? 's' : ''}</p>
      </div>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </button>
  );
};

const PlaylistResultRow = ({ playlist, onResultClick }: { playlist: Playlist; onResultClick?: () => void }) => {
  const navigate     = useNavigate();
  // Upsert the full playlist object into the store so PlaylistPage resolves
  // immediately when navigated to — no redundant cloud round-trip needed.
  const upsertPlaylist = usePlaylistStore((s) => s.upsertPlaylist);
  const handleClick = () => {
    upsertPlaylist(playlist);
    onResultClick?.();
    navigate(`/playlist/${playlist.id}`);
  };
  return (
    <button type="button" onClick={handleClick}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left">
      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-swara-elevated">
        <PlaylistArtwork playlist={playlist} size={44} className="w-11 h-11 rounded-xl" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.88rem] font-medium text-swara-text truncate">{playlist.title}</p>
        <p className="text-[0.72rem] text-swara-muted truncate">
          by {playlist.creatorUsername}
          {playlist.trackCount > 0 && ` · ${playlist.trackCount} track${playlist.trackCount !== 1 ? 's' : ''}`}
          {playlist.isSaved && <span className="ml-1 text-swara-accent">· Saved</span>}
        </p>
      </div>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </button>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-2 px-3">{title}</p>
    {children}
  </div>
);

// ─── History entity tile ───────────────────────────────────────────────────────
// Compact tile for a previously-clicked entity.
// Track tiles play on click; album/artist tiles navigate.

const HistoryTile = ({ entry, onPlay, onNavigate, onRemove }: {
  entry: ReturnType<typeof useSearchHistoryStore.getState>['entries'][number];
  onPlay:     () => void;
  onNavigate: () => void;
  onRemove:   () => void;
}) => {
  const { entity } = entry;
  const isCircle = entity.type === 'artist';
  const imgClass = isCircle
    ? 'w-9 h-9 rounded-full object-cover bg-swara-elevated flex-shrink-0'
    : 'w-9 h-9 rounded-lg object-cover bg-swara-elevated flex-shrink-0';

  return (
    <div className="flex items-center gap-0 group">
      <button
        type="button"
        onClick={entity.type === 'track' ? onPlay : onNavigate}
        className="flex-1 flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-swara-card text-left transition-colors"
        aria-label={entity.type === 'track' ? `Play ${entity.title}` : `Open ${entity.title}`}
      >
        <img
          src={entity.coverUrl || PH_ALBUM}
          alt=""
          className={imgClass}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = entity.type === 'artist' ? PH_ARTIST : PH_ALBUM; }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[0.85rem] font-medium text-swara-text truncate leading-tight">{entity.title}</p>
          <p className="text-[0.7rem] text-swara-muted truncate mt-0.5 leading-tight">{entity.subtitle}</p>
        </div>
        {/* Type badge */}
        <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-swara-dim flex-shrink-0 opacity-60 capitalize">
          {entity.type}
        </span>
      </button>
      <button type="button" onClick={onRemove}
        className="w-8 h-8 flex items-center justify-center text-swara-dim hover:text-swara-muted transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
        aria-label={`Remove from history`}>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
};

// ─── Catalog album card (for browse grid) ─────────────────────────────────────

const CatalogAlbumCard = memo(({ album }: { album: Album }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(`/album/${album.id}`)}
      className="flex flex-col gap-1.5 text-left active:scale-[0.97] transition-transform min-w-0 w-full overflow-hidden">
      <div className="w-full aspect-square rounded-xl overflow-hidden bg-swara-elevated flex-shrink-0">
        <img src={album.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
      <p className="text-[0.78rem] font-medium text-swara-text truncate w-full">{album.title}</p>
      <p className="text-[0.68rem] text-swara-muted truncate w-full">{album.composer}</p>
    </button>
  );
});

// ─── Browse cards ─────────────────────────────────────────────────────────────

const BROWSE_CARDS: {
  mode:  BrowseMode;
  label: string;
  sub:   (counts: { albums: number; composers: number; singers: number }) => string;
  icon:  React.ReactNode;
}[] = [
  {
    mode: 'Albums', label: 'Albums',
    sub: ({ albums }) => `${albums} album${albums !== 1 ? 's' : ''}`,
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    mode: 'Composers', label: 'Composers',
    sub: ({ composers }) => `${composers} composer${composers !== 1 ? 's' : ''}`,
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
  {
    mode: 'Singers', label: 'Singers',
    sub: ({ singers }) => `${singers} singer${singers !== 1 ? 's' : ''}`,
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2a3 3 0 003 3v5a3 3 0 01-6 0V5a3 3 0 013-3z"/>
        <path d="M19 10a7 7 0 01-14 0"/>
        <line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
      </svg>
    ),
  },
  {
    mode: 'Year', label: 'By Year',
    sub: ({ albums }) => `${albums} album${albums !== 1 ? 's' : ''}`,
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
];

// ─── SearchPage ───────────────────────────────────────────────────────────────

const SearchPage = () => {
  const [query,          setQuery]          = useState('');
  const [debouncedQ,     setDebouncedQ]     = useState('');
  const [activeFilter,   setActiveFilter]   = useState<Filter>('All');
  const [indexing,       setIndexing]       = useState(false);
  const [browseMode,     setBrowseMode]     = useState<BrowseMode>(null);
  const [albumSort,      setAlbumSort]      = useState<AlbumSort>('A-Z');
  const [albumView,      setAlbumView]      = useState<AlbumView>('grid');
  const [yearOrder,      setYearOrder]      = useState<YearOrder>('latest');
  const [playlistResults, setPlaylistResults] = useState<Playlist[]>([]);
  const [plSearching,    setPlSearching]    = useState(false);

  const isDesktop  = useIsDesktop();
  const inputRef   = useRef<HTMLInputElement>(null);
  const hasIndexed = useRef(false);
  const navigate   = useNavigate();

  const { tracks, albums, artists, loaded } = useLibraryStore();
  const historyEntries  = useSearchHistoryStore((s) => s.entries);
  const pushEntity      = useSearchHistoryStore((s) => s.pushEntity);
  const clearHistory    = useSearchHistoryStore((s) => s.clear);
  const removeHistory   = useSearchHistoryStore((s) => s.remove);

  const desktopStoreQuery = useDesktopSearchStore((s) => s.query);
  const effectiveQuery    = isDesktop ? desktopStoreQuery : query;

  // Auto-focus on mount (mobile only)
  useEffect(() => {
    if (isDesktop) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [isDesktop]);

  // Debounce effectiveQuery → debouncedQ (200 ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(effectiveQuery), 200);
    return () => clearTimeout(t);
  }, [effectiveQuery]);

  const q           = debouncedQ.trim().toLowerCase();
  const isSearching = q.length > 0;

  // Load all tracks for full-text search (once per session)
  const loadAll = useCallback(async () => {
    if (hasIndexed.current) return;
    const { albums: snap, loadAlbumTracks } = useLibraryStore.getState();
    const unloaded = snap.filter((a) => a.tracks.length === 0);
    if (!unloaded.length) { hasIndexed.current = true; return; }
    hasIndexed.current = true;
    setIndexing(true);
    await Promise.all(unloaded.map((a) => loadAlbumTracks(a.id)));
    setIndexing(false);
  }, []);

  useEffect(() => {
    if (!q || !loaded || activeFilter === 'Albums' || activeFilter === 'Artists') return;
    loadAll();
  }, [q, loaded, activeFilter, loadAll]);

  // Async playlist search — triggers on query change when filter includes playlists
  useEffect(() => {
    if (!q || !(activeFilter === 'All' || activeFilter === 'Playlists')) {
      setPlaylistResults([]);
      setPlSearching(false);
      return;
    }
    let cancelled = false;
    setPlSearching(true);
    PlaylistRepository.searchPlaylists(q)
      .then((results) => {
        if (!cancelled) {
          setPlaylistResults(results.slice(0, SEARCH_MAX));
          setPlSearching(false);
        }
      })
      .catch(() => { if (!cancelled) setPlSearching(false); });
    return () => { cancelled = true; };
  }, [q, activeFilter]);

  // Clear search — collapses results instantly
  const clearSearch = useCallback(() => {
    if (isDesktop) {
      useDesktopSearchStore.getState().setQuery('');
    } else {
      setQuery('');
      inputRef.current?.blur();
    }
    setDebouncedQ('');
  }, [isDesktop]);

  const handleSearch = (val: string) => setQuery(val);

  // ── Filtered search results ────────────────────────────────────────────────
  const matchedTracks = useMemo(() =>
    q ? tracks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, SEARCH_MAX) : [],
  [q, tracks]);

  const matchedAlbums = useMemo(() =>
    q ? albums.filter((a) => a.title.toLowerCase().includes(q)).slice(0, SEARCH_MAX) : [],
  [q, albums]);

  const matchedArtists = useMemo(() =>
    q ? artists.filter((a) => a.name.toLowerCase().includes(q)).slice(0, SEARCH_MAX) : [],
  [q, artists]);

  const hasResults = matchedTracks.length > 0 || matchedAlbums.length > 0 ||
                     matchedArtists.length > 0 || playlistResults.length > 0;

  // ── Browse data ────────────────────────────────────────────────────────────
  const browseAlbums = useMemo(() => {
    const list = [...albums];
    if (albumSort === 'A-Z')    list.sort((a, b) => a.title.localeCompare(b.title));
    if (albumSort === 'Z-A')    list.sort((a, b) => b.title.localeCompare(a.title));
    if (albumSort === 'Latest') list.sort((a, b) => b.year - a.year);
    if (albumSort === 'Oldest') list.sort((a, b) => a.year - b.year);
    return list;
  }, [albums, albumSort]);

  const browseComposers = useMemo(() =>
    [...artists].filter((a) => a.composerAlbumIds.length > 0).sort((a, b) => a.name.localeCompare(b.name)),
  [artists]);

  const browseSingers = useMemo(() =>
    [...artists].filter((a) => a.trackIds.length > 0).sort((a, b) => a.name.localeCompare(b.name)),
  [artists]);

  const albumsByYear = useMemo(() => {
    const sorted = [...albums].sort((a, b) =>
      yearOrder === 'latest' ? b.year - a.year : a.year - b.year
    );
    const map = new Map<number, Album[]>();
    for (const album of sorted) {
      if (!map.has(album.year)) map.set(album.year, []);
      map.get(album.year)!.push(album);
    }
    return map;
  }, [albums, yearOrder]);

  const counts = useMemo(() => ({
    albums: albums.length, composers: browseComposers.length, singers: browseSingers.length,
  }), [albums.length, browseComposers.length, browseSingers.length]);

  const handleBrowse = (mode: BrowseMode) => {
    setBrowseMode((prev) => prev === mode ? null : mode);
  };

  // ── onResultClick: push entity to history ─────────────────────────────────
  const buildTrackEntity = useCallback((trackId: string): HistoryEntity | null => {
    const t = tracks.find((x) => x.id === trackId);
    if (!t) return null;
    return { type: 'track', id: t.id, title: t.title, coverUrl: t.coverUrl, subtitle: t.artist };
  }, [tracks]);

  const buildAlbumEntity = (album: Album): HistoryEntity => ({
    type: 'album', id: album.id, title: album.title, coverUrl: album.coverUrl, subtitle: album.composer,
  });

  const buildArtistEntity = (artist: Artist): HistoryEntity => ({
    type: 'artist', id: artist.id, title: artist.name, coverUrl: artist.coverUrl,
    subtitle: `${artist.albumIds.length} album${artist.albumIds.length !== 1 ? 's' : ''}`,
  });

  const makeOnResultClick = useCallback((entity: HistoryEntity) => {
    pushEntity(entity);
    clearSearch();
  }, [pushEntity, clearSearch]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* Mobile search bar */}
      {!isDesktop && (
        <div className="sticky top-0 z-10 bg-swara-bg/98 backdrop-blur-sm px-4 pt-5 pb-3">
          <div className="relative">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-swara-dim pointer-events-none" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search catalog…"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl bg-swara-card border border-swara-border pl-9 pr-8 py-2.5 text-[0.9rem] text-swara-text placeholder:text-swara-dim focus:outline-none focus:border-swara-accent/40 transition-colors"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); setDebouncedQ(''); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-swara-dim hover:text-swara-muted transition-colors"
                aria-label="Clear search">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {isSearching && (
            <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none pb-0.5">
              {FILTERS.map((f) => (
                <button key={f} type="button" onClick={() => setActiveFilter(f)}
                  className={[
                    'flex-shrink-0 px-3.5 py-1 rounded-full text-[0.78rem] font-medium border transition-all',
                    activeFilter === f
                      ? 'bg-swara-accent border-swara-accent text-swara-bg'
                      : 'border-swara-border text-swara-muted hover:text-swara-text',
                  ].join(' ')}>
                  {f}
                </button>
              ))}
              {(indexing || plSearching) && (
                <div className="flex-shrink-0 flex items-center gap-1.5 text-swara-dim text-[0.72rem] px-1">
                  <div className="w-3 h-3 rounded-full border border-swara-border border-t-swara-accent animate-spin" />
                  Indexing…
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="px-4 lg:px-8 pb-8 lg:pt-6">

        {/* Desktop filter chips */}
        {isDesktop && isSearching && (
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none pb-0.5">
            {FILTERS.map((f) => (
              <button key={f} type="button" onClick={() => setActiveFilter(f)}
                className={[
                  'flex-shrink-0 px-3.5 py-1 rounded-full text-[0.78rem] font-medium border transition-all',
                  activeFilter === f
                    ? 'bg-swara-accent border-swara-accent text-swara-bg'
                    : 'border-swara-border text-swara-muted hover:text-swara-text',
                ].join(' ')}>
                {f}
              </button>
            ))}
          </div>
        )}

        {/* ══ NOT SEARCHING ═══════════════════════════════════════════════════ */}
        {!isSearching && (
          <>
            {/* History — hidden when browse mode is active (focused browsing) */}
            {!browseMode && historyEntries.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase px-1">
                    Recent
                  </p>
                  <button type="button" onClick={clearHistory}
                    className="text-[0.72rem] text-swara-dim hover:text-swara-muted transition-colors px-1">
                    Clear
                  </button>
                </div>
                <div className="flex flex-col gap-0">
                  {historyEntries.map((entry) => (
                    <HistoryTile
                      key={entry.id}
                      entry={entry}
                      onPlay={() => {
                        // Resolve full track from library and play
                        const track = tracks.find((t) => t.id === entry.entity.id);
                        if (track) trackActions.play(track);
                      }}
                      onNavigate={() => {
                        if (entry.entity.type === 'album')  navigate(`/album/${entry.entity.id}`);
                        if (entry.entity.type === 'artist') navigate(`/artist/${entry.entity.id}`);
                      }}
                      onRemove={() => removeHistory(entry.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Browse cards
                Mobile/tablet: 2 columns
                Large desktop: 4 columns (single row) ── */}
            <div className="mb-4">
              {browseMode && (
                <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-3 px-1">Browse</p>
              )}
              {!browseMode && (
                <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-3 px-1">Browse</p>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {BROWSE_CARDS.map(({ mode, label, sub, icon }) => {
                  const isActive = browseMode === mode;
                  return (
                    <button key={mode} type="button" onClick={() => handleBrowse(mode)}
                      className={[
                        'flex flex-col items-center justify-center gap-2.5 py-5 px-3 rounded-2xl border transition-all text-center active:scale-[0.97]',
                        isActive
                          ? 'bg-swara-accent/10 border-swara-accent text-swara-accent'
                          : 'bg-swara-card border-swara-border text-swara-muted hover:border-swara-border/80 hover:text-swara-text hover:bg-swara-elevated',
                      ].join(' ')}>
                      <span className={isActive ? 'text-swara-accent' : 'text-swara-dim'}>{icon}</span>
                      <div>
                        <p className="text-[0.85rem] font-semibold leading-tight">{label}</p>
                        <p className="text-[0.68rem] mt-0.5 opacity-70">{sub(counts)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Inline browse content ── */}
            {browseMode === 'Albums' && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-[0.82rem] font-semibold text-swara-text">
                    All Albums <span className="text-swara-dim font-normal">({albums.length})</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <select value={albumSort} onChange={(e) => setAlbumSort(e.target.value as AlbumSort)}
                      className="text-[0.75rem] text-swara-muted bg-swara-card border border-swara-border rounded-lg px-2 py-1 focus:outline-none cursor-pointer">
                      <option value="A-Z">A–Z</option>
                      <option value="Z-A">Z–A</option>
                      <option value="Latest">Latest</option>
                      <option value="Oldest">Oldest</option>
                    </select>
                    <div className="flex items-center gap-0.5 bg-swara-card border border-swara-border rounded-lg p-0.5">
                      <button type="button" onClick={() => setAlbumView('grid')}
                        className={['w-6 h-5 flex items-center justify-center rounded transition-colors', albumView === 'grid' ? 'bg-swara-elevated text-swara-text' : 'text-swara-dim'].join(' ')}
                        aria-label="Grid view">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>
                      </button>
                      <button type="button" onClick={() => setAlbumView('list')}
                        className={['w-6 h-5 flex items-center justify-center rounded transition-colors', albumView === 'list' ? 'bg-swara-elevated text-swara-text' : 'text-swara-dim'].join(' ')}
                        aria-label="List view">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                {albumView === 'grid' ? (
                  <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                    {browseAlbums.map((a) => <CatalogAlbumCard key={a.id} album={a} />)}
                  </div>
                ) : (
                  <div className="flex flex-col gap-0">
                    {browseAlbums.map((a) => <AlbumRow key={a.id} album={a} />)}
                  </div>
                )}
              </div>
            )}

            {browseMode === 'Composers' && (
              <div className="mt-2">
                <p className="text-[0.82rem] font-semibold text-swara-text mb-3 px-1">
                  Composers <span className="text-swara-dim font-normal">({browseComposers.length})</span>
                </p>
                <div className="flex flex-col gap-0">
                  {browseComposers.map((a) => <ArtistRow key={a.id} artist={a} />)}
                </div>
              </div>
            )}

            {browseMode === 'Singers' && (
              <div className="mt-2">
                <p className="text-[0.82rem] font-semibold text-swara-text mb-3 px-1">
                  Singers <span className="text-swara-dim font-normal">({browseSingers.length})</span>
                </p>
                <div className="flex flex-col gap-0">
                  {browseSingers.map((a) => <ArtistRow key={a.id} artist={a} />)}
                </div>
              </div>
            )}

            {browseMode === 'Year' && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-[0.82rem] font-semibold text-swara-text">Albums by Year</p>
                  <div className="flex gap-1.5">
                    {(['latest', 'oldest'] as YearOrder[]).map((o) => (
                      <button key={o} type="button" onClick={() => setYearOrder(o)}
                        className={[
                          'px-3 py-1 rounded-full text-[0.72rem] font-medium border transition-all capitalize',
                          yearOrder === o ? 'bg-swara-accent border-swara-accent text-swara-bg' : 'border-swara-border text-swara-muted',
                        ].join(' ')}>
                        {o === 'latest' ? 'Latest First' : 'Oldest First'}
                      </button>
                    ))}
                  </div>
                </div>
                {Array.from(albumsByYear.entries()).map(([year, yearAlbums]) => (
                  <div key={year} className="mb-5">
                    <div className="sticky top-16 lg:top-0 z-[5] bg-swara-bg py-1.5 px-1 -mx-1 mb-2">
                      <p className="text-[0.65rem] font-semibold text-swara-dim tracking-widest uppercase">{year}</p>
                    </div>
                    <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                      {yearAlbums.map((a) => <CatalogAlbumCard key={a.id} album={a} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ SEARCHING ═══════════════════════════════════════════════════════ */}
        {isSearching && (
          <>
            {!hasResults && !indexing && !plSearching && (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-[0.9rem] font-medium text-swara-muted">No results for "{effectiveQuery}"</p>
                <p className="text-[0.78rem] text-swara-dim">Try a different spelling or keyword</p>
              </div>
            )}

            {(hasResults || indexing || plSearching) && (() => {
              const onResultClickFor = (entity: HistoryEntity) => () => {
                makeOnResultClick(entity);
              };

              return (
                <>
                  {(activeFilter === 'All' || activeFilter === 'Tracks') && matchedTracks.length > 0 && (
                    <Section title="Tracks">
                      <ul className="space-y-0">
                        {matchedTracks.map((t) => {
                          const entity: HistoryEntity = buildTrackEntity(t.id) ?? {
                            type: 'track', id: t.id, title: t.title, coverUrl: t.coverUrl, subtitle: t.artist,
                          };
                          return (
                            <SongRow
                              key={t.id}
                              track={t}
                              onPlay={() => {
                                makeOnResultClick(entity);
                                trackActions.playFromSearch(t, matchedTracks, effectiveQuery);
                              }}
                              menuContext="default"
                            />
                          );
                        })}
                      </ul>
                    </Section>
                  )}
                  {(activeFilter === 'All' || activeFilter === 'Albums') && matchedAlbums.length > 0 && (
                    <Section title="Albums">
                      {matchedAlbums.map((a) => (
                        <AlbumRow
                          key={a.id}
                          album={a}
                          onResultClick={onResultClickFor(buildAlbumEntity(a))}
                        />
                      ))}
                    </Section>
                  )}
                  {(activeFilter === 'All' || activeFilter === 'Artists') && matchedArtists.length > 0 && (
                    <Section title="Artists">
                      {matchedArtists.map((a) => (
                        <ArtistRow
                          key={a.id}
                          artist={a}
                          onResultClick={onResultClickFor(buildArtistEntity(a))}
                        />
                      ))}
                    </Section>
                  )}
                  {(activeFilter === 'All' || activeFilter === 'Playlists') && playlistResults.length > 0 && (
                    <Section title="Playlists">
                      {playlistResults.map((p) => (
                        <PlaylistResultRow
                          key={p.id}
                          playlist={p}
                          onResultClick={() => clearSearch()}
                        />
                      ))}
                    </Section>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
