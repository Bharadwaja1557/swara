/**
 * SearchPage — unified search + catalog browser (mobile & desktop).
 *
 * Layout (when not searching):
 *   1. Search bar
 *   2. History section  (below bar, above browse)
 *   3. Browse buttons   (Albums / Artists / Year)
 *   4. Browse content   (inline — no navigation away)
 *
 * Layout (when searching):
 *   1. Search bar
 *   2. Filter chips
 *   3. Results
 *
 * Browse sections show the FULL CATALOG — NOT the user's personal library.
 * Library (personal) is a separate concept accessible via the Library tab.
 */
import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore }          from '@/store/libraryStore';
import { useSearchHistoryStore }    from '@/store/useSearchHistoryStore';
import { useDesktopSearchStore }    from '@/store/useDesktopSearchStore';
import { useIsDesktop }             from '@/hooks/useIsDesktop';
import { trackActions }             from '@/lib/trackActions';
import SongRow                        from '@/components/ui/SongRow';
import type { Album, Artist } from '@/types/music';

type Filter      = 'All' | 'Tracks' | 'Albums' | 'Artists';
type BrowseMode  = 'Albums' | 'Artists' | 'Year' | null;
type AlbumSort   = 'A-Z' | 'Z-A' | 'Latest' | 'Oldest';
type YearOrder   = 'latest' | 'oldest';
type AlbumView   = 'grid' | 'list';

const FILTERS: Filter[] = ['All', 'Tracks', 'Albums', 'Artists'];

// ─── Sub-rows ─────────────────────────────────────────────────────────────────
const AlbumRow = ({ album, onResultClick }: { album: Album; onResultClick?: () => void }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => { onResultClick?.(); navigate(`/album/${album.id}`); }}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left">
      <img src={album.coverUrl} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />
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
        <img src={artist.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
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

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-2 px-3">{title}</p>
    {children}
  </div>
);

// ─── Catalog album card (for browse grid) ────────────────────────────────────
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

// ─── SearchPage ───────────────────────────────────────────────────────────────
const SearchPage = () => {
  const [query,        setQuery]        = useState('');
  const [debouncedQ,   setDebouncedQ]   = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [indexing,     setIndexing]     = useState(false);
  const [browseMode,   setBrowseMode]   = useState<BrowseMode>(null);
  const [albumSort,    setAlbumSort]    = useState<AlbumSort>('A-Z');
  const [albumView,    setAlbumView]    = useState<AlbumView>('grid');
  const [yearOrder,    setYearOrder]    = useState<YearOrder>('latest');

  const isDesktop = useIsDesktop();

  const inputRef  = useRef<HTMLInputElement>(null);
  const hasIndexed = useRef(false);

  const { tracks, albums, artists, loaded } = useLibraryStore();
  const history = useSearchHistoryStore((s) => s.entries);
  const pushHistory = useSearchHistoryStore((s) => s.push);
  const clearHistory = useSearchHistoryStore((s) => s.clear);
  const removeHistory = useSearchHistoryStore((s) => s.remove);

  // On desktop, query is driven by DesktopTopBar via shared store
  const desktopStoreQuery = useDesktopSearchStore((s) => s.query);
  // Effective query: desktop reads from shared store, mobile from local state
  const effectiveQuery = isDesktop ? desktopStoreQuery : query;

  // Auto-focus input on mount (mobile only — desktop uses top bar search)
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

  const q = debouncedQ.trim().toLowerCase();
  const isSearching = q.length > 0;

  // ── Load all tracks for search (once per session) ─────────────────────────
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

  const handleSearch = (val: string) => setQuery(val);

  const handleSubmit = () => {
    if (q) {
      pushHistory(effectiveQuery.trim());
    }
  };

  // ── Filtered results ──────────────────────────────────────────────────────
  const MAX = 5;
  const matchedTracks = useMemo(() =>
    q ? tracks.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)).slice(0, MAX) : [],
  [q, tracks]);

  const matchedAlbums = useMemo(() =>
    q ? albums.filter((a) => a.title.toLowerCase().includes(q) || a.composer.toLowerCase().includes(q)).slice(0, MAX) : [],
  [q, albums]);

  const matchedArtists = useMemo(() =>
    q ? artists.filter((a) => a.name.toLowerCase().includes(q)).slice(0, MAX) : [],
  [q, artists]);

  const hasResults = matchedTracks.length > 0 || matchedAlbums.length > 0 || matchedArtists.length > 0;

  // ── Browse: sorted albums ─────────────────────────────────────────────────
  const browseAlbums = useMemo(() => {
    const list = [...albums];
    if (albumSort === 'A-Z')     list.sort((a, b) => a.title.localeCompare(b.title));
    if (albumSort === 'Z-A')     list.sort((a, b) => b.title.localeCompare(a.title));
    if (albumSort === 'Latest')  list.sort((a, b) => b.year - a.year);
    if (albumSort === 'Oldest')  list.sort((a, b) => a.year - b.year);
    return list;
  }, [albums, albumSort]);

  const browseArtists = useMemo(() =>
    [...artists].sort((a, b) => a.name.localeCompare(b.name)),
  [artists]);

  // ── Browse: albums grouped by year ────────────────────────────────────────
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

  // ── Browse section toggle ─────────────────────────────────────────────────
  const handleBrowse = (mode: BrowseMode) => {
    setBrowseMode((prev) => prev === mode ? null : mode);
  };

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* ── Search bar — mobile only (desktop uses DesktopTopBar search) ── */}
      {!isDesktop && (
      <div className="sticky top-0 z-10 bg-swara-bg/98 backdrop-blur-sm px-4 lg:px-8 pt-5 pb-3">
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
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
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

        {/* Filter chips — only when searching */}
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
            {indexing && (
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

        {/* Desktop filter chips — shown when desktop is in search mode (no inline bar) */}
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
            {indexing && (
              <div className="flex-shrink-0 flex items-center gap-1.5 text-swara-dim text-[0.72rem] px-1">
                <div className="w-3 h-3 rounded-full border border-swara-border border-t-swara-accent animate-spin" />
                Indexing…
              </div>
            )}
          </div>
        )}

        {/* ══ NOT SEARCHING: History + Browse ══════════════════════════════════ */}
        {!isSearching && (
          <>
            {/* ── History section ── */}
            {history.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase px-1">History</p>
                  <button type="button" onClick={clearHistory}
                    className="text-[0.72rem] text-swara-dim hover:text-swara-muted transition-colors px-1">
                    Clear
                  </button>
                </div>
                <div className="flex flex-col gap-0">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-0">
                      <button type="button"
                        onClick={() => {
                          if (isDesktop) {
                            // Desktop: write into the shared store so the top bar
                            // input reflects the selection and SearchPage reacts
                            useDesktopSearchStore.getState().setQuery(entry.query);
                          } else {
                            setQuery(entry.query);
                            inputRef.current?.focus();
                          }
                        }}
                        className="flex-1 flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-swara-card text-left transition-colors group">
                        {/* Clock icon */}
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span className="text-[0.88rem] text-swara-text truncate">{entry.query}</span>
                      </button>
                      <button type="button" onClick={() => removeHistory(entry.id)}
                        className="w-9 h-9 flex items-center justify-center text-swara-dim hover:text-swara-muted transition-colors flex-shrink-0"
                        aria-label={`Remove "${entry.query}" from history`}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Browse buttons ── */}
            <div className="mb-4">
              <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-3 px-1">Browse</p>
              <div className="flex gap-2 flex-wrap">
                {(['Albums', 'Artists', 'Year'] as BrowseMode[]).map((mode) => (
                  <button key={mode} type="button" onClick={() => handleBrowse(mode)}
                    className={[
                      'flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.82rem] font-medium border transition-all',
                      browseMode === mode
                        ? 'bg-swara-accent border-swara-accent text-swara-bg'
                        : 'border-swara-border text-swara-muted hover:text-swara-text',
                    ].join(' ')}>
                    {mode === 'Albums'  && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3"/></svg>}
                    {mode === 'Artists' && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                    {mode === 'Year'    && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Inline browse: Albums ── */}
            {browseMode === 'Albums' && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-[0.82rem] font-semibold text-swara-text">
                    All Albums <span className="text-swara-dim font-normal">({albums.length})</span>
                  </p>
                  <div className="flex items-center gap-2">
                    {/* Sort */}
                    <select
                      value={albumSort}
                      onChange={(e) => setAlbumSort(e.target.value as AlbumSort)}
                      className="text-[0.75rem] text-swara-muted bg-swara-card border border-swara-border rounded-lg px-2 py-1 focus:outline-none cursor-pointer">
                      <option value="A-Z">A–Z</option>
                      <option value="Z-A">Z–A</option>
                      <option value="Latest">Latest</option>
                      <option value="Oldest">Oldest</option>
                    </select>
                    {/* View toggle */}
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

            {/* ── Inline browse: Artists ── */}
            {browseMode === 'Artists' && (
              <div className="mt-2">
                <p className="text-[0.82rem] font-semibold text-swara-text mb-3 px-1">
                  All Artists <span className="text-swara-dim font-normal">({artists.length})</span>
                </p>
                <div className="flex flex-col gap-0">
                  {browseArtists.map((a) => <ArtistRow key={a.id} artist={a} />)}
                </div>
              </div>
            )}

            {/* ── Inline browse: Year ── */}
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
                    <p className="text-[0.65rem] font-semibold text-swara-dim tracking-widest uppercase mb-2 px-1">{year}</p>
                    <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                      {yearAlbums.map((a) => <CatalogAlbumCard key={a.id} album={a} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ SEARCHING: Results ════════════════════════════════════════════════ */}
        {isSearching && (
          <>
            {!hasResults && !indexing && (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-[0.9rem] font-medium text-swara-muted">No results for "{effectiveQuery}"</p>
                <p className="text-[0.78rem] text-swara-dim">Try a different spelling or keyword</p>
              </div>
            )}

            {hasResults && (() => {
              // Push history whenever the user selects any result.
              // Defined once here so all three row types share the same callback.
              const onResultClick = () => {
                if (effectiveQuery.trim()) pushHistory(effectiveQuery.trim());
                // On mobile, also clear the local input and collapse keyboard
                if (!isDesktop) { setQuery(''); inputRef.current?.blur(); }
              };
              return (
                <>
                  {(activeFilter === 'All' || activeFilter === 'Tracks') && matchedTracks.length > 0 && (
                    <Section title="Tracks">
                      <ul className="space-y-0">
                        {matchedTracks.map((t) => (
                          <SongRow
                            key={t.id}
                            track={t}
                            onPlay={() => { onResultClick?.(); trackActions.playFromSearch(t, matchedTracks, effectiveQuery); }}
                            menuContext="default"
                          />
                        ))}
                      </ul>
                    </Section>
                  )}
                  {(activeFilter === 'All' || activeFilter === 'Albums') && matchedAlbums.length > 0 && (
                    <Section title="Albums">
                      {matchedAlbums.map((a) => <AlbumRow key={a.id} album={a} onResultClick={onResultClick} />)}
                    </Section>
                  )}
                  {(activeFilter === 'All' || activeFilter === 'Artists') && matchedArtists.length > 0 && (
                    <Section title="Artists">
                      {matchedArtists.map((a) => <ArtistRow key={a.id} artist={a} onResultClick={onResultClick} />)}
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
