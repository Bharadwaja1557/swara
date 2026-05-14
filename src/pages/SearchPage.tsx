import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import type { Track, Album, Artist } from '@/types/music';

type Filter = 'All' | 'Tracks' | 'Albums' | 'Artists';
const FILTERS: Filter[] = ['All', 'Tracks', 'Albums', 'Artists'];
const RECENTS_KEY = 'swara_search_recents';
const MAX_PER = 5;

function loadSearchRecents(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]'); } catch { return []; }
}
function pushSearchRecent(q: string) {
  if (!q.trim()) return;
  const list = loadSearchRecents().filter((r) => r !== q);
  list.unshift(q);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, 5)));
}

// ─── Sub-rows ─────────────────────────────────────────────────────────────────
const TrackRow = ({ track, queue }: { track: Track; queue: Track[] }) => {
  const playTrack = usePlayerStore((s) => s.playTrack);
  return (
    <button type="button" onClick={() => playTrack(track, queue)}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left">
      <img src={track.coverUrl} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />
      <div className="flex-1 min-w-0">
        <p className="text-[0.88rem] font-medium text-swara-text truncate">{track.title}</p>
        <p className="text-[0.72rem] text-swara-muted truncate">{track.artist}</p>
      </div>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-swara-dim flex-shrink-0" aria-hidden="true">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    </button>
  );
};

const AlbumRow = ({ album }: { album: Album }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(`/album/${album.id}`)}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left">
      <img src={album.coverUrl} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-swara-elevated" loading="lazy" />
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

const ArtistRow = ({ artist }: { artist: Artist }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(`/artist/${artist.id}`)}
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
  <div className="mb-4">
    <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-1.5 px-1">{title}</p>
    {children}
  </div>
);

// ─── SearchPage ───────────────────────────────────────────────────────────────
const SearchPage = () => {
  const [query,        setQuery]        = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [indexing,     setIndexing]     = useState(false);
  const [recents,      setRecents]      = useState(loadSearchRecents);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { tracks, albums, artists, loaded, loadAlbumTracks } = useLibraryStore();
  const q = query.trim().toLowerCase();

  // Eagerly load all tracks when query is active (for track-search)
  const loadAll = useCallback(async () => {
    const unloaded = albums.filter((a) => a.tracks.length === 0);
    if (!unloaded.length) return;
    setIndexing(true);
    await Promise.all(unloaded.map((a) => loadAlbumTracks(a.id)));
    setIndexing(false);
  }, [albums, loadAlbumTracks]);

  useEffect(() => {
    if (!q || !loaded || activeFilter === 'Albums' || activeFilter === 'Artists') return;
    loadAll();
  }, [q, loaded, activeFilter, loadAll]);

  const handleSearch = (val: string) => {
    setQuery(val);
  };

  const handleSubmit = () => {
    if (q) { pushSearchRecent(query.trim()); setRecents(loadSearchRecents()); }
  };

  // ── Filtering — tracks match title ONLY, artists match name ONLY ───────────
  const matchedTracks = useMemo(() => {
    if (!q || activeFilter === 'Albums' || activeFilter === 'Artists') return [];
    return tracks
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, MAX_PER);
  }, [q, tracks, activeFilter]);

  const matchedAlbums = useMemo(() => {
    if (!q || activeFilter === 'Tracks' || activeFilter === 'Artists') return [];
    return albums
      .filter((a) => a.title.toLowerCase().includes(q) || a.composer.toLowerCase().includes(q))
      .slice(0, MAX_PER);
  }, [q, albums, activeFilter]);

  const matchedArtists = useMemo(() => {
    if (!q || activeFilter === 'Tracks' || activeFilter === 'Albums') return [];
    return artists
      .filter((a) => a.name.toLowerCase().includes(q))
      .slice(0, MAX_PER);
  }, [q, artists, activeFilter]);

  const hasResults = matchedTracks.length > 0 || matchedAlbums.length > 0 || matchedArtists.length > 0;

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      {/* Search bar — git-play style, sticky */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm pt-5 pb-3 px-4">
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-swara-muted pointer-events-none">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.75"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            ref={inputRef}
            type="search"
            placeholder="Songs, artists, albums…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { handleSubmit(); inputRef.current?.blur(); } }}
            className="w-full bg-swara-card border border-swara-border rounded-2xl pl-10 pr-10 py-3 text-[0.9rem] text-swara-text placeholder:text-swara-dim focus:outline-none focus:border-swara-accent/40 focus:bg-swara-elevated transition-all duration-200"
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-swara-muted hover:text-swara-text transition-colors" aria-label="Clear">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Filters — only when searching */}
        {query && (
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none">
            {FILTERS.map((f) => (
              <button key={f} type="button" onClick={() => setActiveFilter(f)}
                className={[
                  'flex-shrink-0 px-4 py-1.5 rounded-full text-[0.8rem] font-medium border transition-all duration-200',
                  activeFilter === f
                    ? 'bg-swara-accent border-swara-accent text-swara-bg'
                    : 'bg-transparent border-swara-border text-swara-muted hover:text-swara-text',
                ].join(' ')}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Indexing */}
        {indexing && (
          <div className="flex flex-col items-center gap-2 mt-10">
            <div className="w-5 h-5 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
            <p className="text-xs text-swara-dim">Indexing tracks…</p>
          </div>
        )}

        {/* Empty state — recent searches + browse */}
        {!indexing && !q && (
          <div>
            {/* Recent searches */}
            {recents.length > 0 && (
              <div className="mb-6 mt-2">
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase">Recent Searches</p>
                  <button type="button" onClick={() => { localStorage.removeItem(RECENTS_KEY); setRecents([]); }}
                    className="text-[0.72rem] text-swara-accent hover:text-swara-accent-bright transition-colors">
                    Clear
                  </button>
                </div>
                {recents.map((r) => (
                  <button key={r} type="button"
                    onClick={() => { setQuery(r); inputRef.current?.focus(); }}
                    className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card transition-colors text-left">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
                      <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
                    </svg>
                    <span className="text-[0.88rem] text-swara-muted">{r}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Browse */}
            <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-3 px-1">Browse</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Albums', path: '/library?tab=albums', icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
                { label: 'Artists', path: '/library?tab=artists', icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
                { label: 'By Year', path: '/library?tab=year', icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
              ].map(({ label, path, icon }) => (
                <button key={label} type="button" onClick={() => navigate(path)}
                  className="flex flex-col items-center gap-2.5 py-5 bg-swara-card border border-swara-border rounded-2xl text-swara-muted text-[0.8rem] font-medium active:scale-95 hover:border-swara-accent/30 hover:text-swara-text transition-all duration-200">
                  <div className="text-swara-accent">{icon}</div>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {!indexing && q && !hasResults && (
          <div className="flex flex-col items-center justify-center mt-16 gap-3">
            <p className="text-sm font-medium text-swara-muted text-center">No results for "{query}"</p>
            <p className="text-xs text-swara-dim text-center">Try a different keyword</p>
          </div>
        )}

        {/* Results */}
        {!indexing && q && hasResults && (
          <div className="mt-1">
            {(activeFilter === 'All' || activeFilter === 'Tracks') && matchedTracks.length > 0 && (
              <Section title="Songs">
                {matchedTracks.map((t) => <TrackRow key={t.id} track={t} queue={matchedTracks} />)}
              </Section>
            )}
            {(activeFilter === 'All' || activeFilter === 'Albums') && matchedAlbums.length > 0 && (
              <Section title="Albums">
                {matchedAlbums.map((a) => <AlbumRow key={a.id} album={a} />)}
              </Section>
            )}
            {(activeFilter === 'All' || activeFilter === 'Artists') && matchedArtists.length > 0 && (
              <Section title="Artists">
                {matchedArtists.map((a) => <ArtistRow key={a.id} artist={a} />)}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
