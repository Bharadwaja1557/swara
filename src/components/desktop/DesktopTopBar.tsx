/**
 * DesktopTopBar — desktop-only top navigation bar.
 * Left: swara logo  |  Center: home icon + search  |  Right: user icon
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { useDesktopSearchStore } from '@/store/useDesktopSearchStore';
import type { Track, Album, Artist } from '@/types/music';

const RECENTS_KEY = 'swara_search_recents';
const MAX_PER = 5;

function loadRecents(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]'); } catch { return []; }
}
function pushRecent(q: string) {
  if (!q.trim()) return;
  const list = loadRecents().filter((r) => r !== q);
  list.unshift(q.trim());
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, 5)));
}

type Filter = 'All' | 'Tracks' | 'Albums' | 'Artists';
const FILTERS: Filter[] = ['All', 'Tracks', 'Albums', 'Artists'];

// ─── Search dropdown ──────────────────────────────────────────────────────────
const SearchDropdown = ({
  query, filter, setFilter, recents, onSelectRecent, onClear, onClose,
  tracks, albums, artists,
}: {
  query: string; filter: Filter; setFilter: (f: Filter) => void;
  recents: string[]; onSelectRecent: (r: string) => void; onClear: () => void;
  onClose: () => void;   // collapse the dropdown after any result is selected
  tracks: Track[]; albums: Album[]; artists: Artist[];
}) => {
  const navigate  = useNavigate();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const q = query.trim().toLowerCase();

  // Memoize raw matches (independent of filter) so filter-chip clicks are instant
  const mTracks  = useMemo(() => q ? tracks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, MAX_PER)  : [], [q, tracks]);
  const mAlbums  = useMemo(() => q ? albums.filter((a) => a.title.toLowerCase().includes(q) || a.composer.toLowerCase().includes(q)).slice(0, MAX_PER) : [], [q, albums]);
  const mArtists = useMemo(() => q ? artists.filter((a) => a.name.toLowerCase().includes(q)).slice(0, MAX_PER) : [], [q, artists]);
  const hasResults = mTracks.length > 0 || mAlbums.length > 0 || mArtists.length > 0;

  const showTracks  = filter === 'All' || filter === 'Tracks';
  const showAlbums  = filter === 'All' || filter === 'Albums';
  const showArtists = filter === 'All' || filter === 'Artists';

  return (
    <div
      className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-[200] flex flex-col"
      style={{ background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.7)', maxHeight: '65vh' }}
    >
      {/* Filter chips — only while typing */}
      {q && (
        <div className="flex gap-2 px-4 pt-3 pb-2 flex-shrink-0">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={['px-3 py-1 rounded-full text-[0.75rem] font-medium border transition-all', filter === f ? 'bg-swara-accent border-swara-accent text-swara-bg' : 'border-swara-border text-swara-muted hover:text-swara-text'].join(' ')}>
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-y-auto scrollbar-none flex-1">
        {/* Recent searches (when empty) */}
        {!q && recents.length > 0 && (
          <div className="p-3">
            <div className="flex items-center justify-between px-2 mb-1">
              <p className="text-[0.65rem] font-semibold text-swara-muted tracking-widest uppercase">Recent</p>
              <button type="button" onClick={onClear} className="text-[0.7rem] text-swara-accent">Clear</button>
            </div>
            {recents.map((r) => (
              <button key={r} type="button" onClick={() => onSelectRecent(r)}
                className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-swara-card transition-colors text-left">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
                  <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
                </svg>
                <span className="text-[0.85rem] text-swara-muted">{r}</span>
              </button>
            ))}
          </div>
        )}

        {/* Empty recent */}
        {!q && recents.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-[0.82rem] text-swara-dim">Start typing to search…</p>
          </div>
        )}

        {/* Results */}
        {q && !hasResults && (
          <div className="flex items-center justify-center py-8">
            <p className="text-[0.82rem] text-swara-dim">No results for "{query}"</p>
          </div>
        )}

        {q && hasResults && (
          <div className="p-2">
            {showTracks && mTracks.length > 0 && (
              <div className="mb-2">
                <p className="text-[0.62rem] font-semibold text-swara-muted tracking-widest uppercase px-2 py-1">Songs</p>
                {mTracks.map((t) => (
                  <button key={t.id} type="button"
                    onClick={() => { playTrack(t, mTracks); onClose(); }}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-swara-card transition-colors text-left">
                    <img src={t.coverUrl} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.82rem] font-medium text-swara-text truncate">{t.title}</p>
                      <p className="text-[0.68rem] text-swara-muted truncate">{t.artist}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showAlbums && mAlbums.length > 0 && (
              <div className="mb-2">
                <p className="text-[0.62rem] font-semibold text-swara-muted tracking-widest uppercase px-2 py-1">Albums</p>
                {mAlbums.map((a) => (
                  <button key={a.id} type="button"
                    onClick={() => { navigate(`/album/${a.id}`); onClose(); }}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-swara-card transition-colors text-left">
                    <img src={a.coverUrl} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.82rem] font-medium text-swara-text truncate">{a.title}</p>
                      <p className="text-[0.68rem] text-swara-muted truncate">{a.composer}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showArtists && mArtists.length > 0 && (
              <div className="mb-2">
                <p className="text-[0.62rem] font-semibold text-swara-muted tracking-widest uppercase px-2 py-1">Artists</p>
                {mArtists.map((a) => (
                  <button key={a.id} type="button"
                    onClick={() => { navigate(`/artist/${a.id}`); onClose(); }}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-swara-card transition-colors text-left">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-swara-elevated">
                      <img src={a.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <p className="text-[0.82rem] font-medium text-swara-text truncate">{a.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── DesktopTopBar ────────────────────────────────────────────────────────────
const DesktopTopBar = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  // App uses HashRouter so check the hash, not pathname
  const isSearchPage = location.hash.startsWith('#/search');

  // Subscribe only to what we need for rendering
  const { tracks, albums, artists, loaded } = useLibraryStore();

  const setDesktopQuery = useDesktopSearchStore((s) => s.setQuery);
  const clearDesktopQuery = useDesktopSearchStore((s) => s.clearQuery);

  const [query,      setQuery]      = useState('');
  const [focused,    setFocused]    = useState(false);
  const [filter,     setFilter]     = useState<Filter>('All');
  const [recents,    setRecents]    = useState(loadRecents);
  const [indexing,   setIndexing]   = useState(false);
  const inputRef   = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasIndexed = useRef(false);

  // When on SearchPage, sync query changes into the shared desktop search store
  useEffect(() => {
    if (isSearchPage) {
      setDesktopQuery(query);
    }
  }, [query, isSearchPage, setDesktopQuery]);

  // Clear desktop search query when navigating away from search page
  useEffect(() => {
    if (!isSearchPage) {
      clearDesktopQuery();
      setQuery('');
    }
  }, [isSearchPage, clearDesktopQuery]);

  // When on SearchPage the top bar IS the search input — enable it fully.
  // Elsewhere, clicking the bar navigates to /search.
  const handleSearchFocus = useCallback(() => {
    if (!isSearchPage) {
      navigate('/search');
      return;
    }
    setFocused(true);
  }, [isSearchPage, navigate]);

  const showDropdown = focused && !isSearchPage;

  // ── FIX: loadAll reads albums from getState() at call time, NOT from reactive
  // closure. This breaks the infinite loop:
  //   albums changes → loadAll recreated → effect fires → loadAlbumTracks →
  //   albums changes → ... (was crashing on filter-chip click mid-loop)
  const loadAll = useCallback(async () => {
    if (hasIndexed.current) return;
    const { albums: snap, loadAlbumTracks } = useLibraryStore.getState();
    const unloaded = snap.filter((a) => a.tracks.length === 0);
    if (!unloaded.length) { hasIndexed.current = true; return; }
    hasIndexed.current = true;          // set before awaiting to prevent double-call
    setIndexing(true);
    await Promise.all(unloaded.map((a) => loadAlbumTracks(a.id)));
    setIndexing(false);
  }, []); // ← no deps: stable forever, reads live state via getState()

  useEffect(() => {
    if (!query.trim() || !loaded) return;
    loadAll();
  }, [query, loaded, loadAll]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = () => {
    if (query.trim()) pushRecent(query.trim());
    setRecents(loadRecents());
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleSelectRecent = (r: string) => {
    setQuery(r);
    setFocused(true);
    inputRef.current?.focus();
  };

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between gap-6 px-6 h-[59px] border-b z-40 relative"
      style={{ background: 'rgba(12,12,16,0.98)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}
    >
      {/* Logo */}
      <button type="button" onClick={() => navigate('/')}
        className="flex-shrink-0 text-[1.5rem] font-bold text-swara-accent tracking-[-0.04em] font-display hover:text-swara-accent-bright transition-colors">
        swara
      </button>

      {/* Center: home + search */}
      <div className="flex items-center gap-2 flex-1 max-w-xl" ref={wrapperRef}>
        {/* Home icon */}
        <button type="button" onClick={() => navigate('/')}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text transition-colors"
          aria-label="Home">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>

        {/* Search wrapper (relative for dropdown) */}
        <div className="relative flex-1">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-swara-muted pointer-events-none">
              {indexing ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.75"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search catalog…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={handleSearchFocus}
              onClick={handleSearchFocus}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') { setFocused(false); if (!isSearchPage) { inputRef.current?.blur(); } } }}
              className="w-full rounded-xl pl-9 pr-8 py-2 text-[0.9rem] text-swara-text placeholder:text-swara-dim focus:outline-none transition-all duration-200"
              style={{ background: '#1e1e28', border: `1px solid ${focused || isSearchPage ? 'rgba(200,169,106,0.35)' : 'rgba(255,255,255,0.07)'}`, cursor: 'text' }}
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-swara-muted hover:text-swara-text transition-colors" aria-label="Clear">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>

          {showDropdown && (
            <SearchDropdown
              query={query} filter={filter} setFilter={setFilter}
              recents={recents}
              onSelectRecent={handleSelectRecent}
              onClear={() => { localStorage.removeItem(RECENTS_KEY); setRecents([]); }}
              onClose={() => { setFocused(false); setQuery(''); inputRef.current?.blur(); }}
              tracks={tracks} albums={albums} artists={artists}
            />
          )}
        </div>
      </div>

      {/* User icon */}
      <button type="button" onClick={() => navigate('/profile')}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-swara-elevated border border-swara-border flex items-center justify-center text-swara-muted hover:text-swara-text transition-colors"
        aria-label="Profile">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM20.59 22c0-3.63-3.85-6.57-8.59-6.57S3.41 18.37 3.41 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </header>
  );
};

export default DesktopTopBar;
