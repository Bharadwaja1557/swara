import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import type { Track, Album, Artist } from '@/types/music';

type Filter = 'All' | 'Tracks' | 'Albums' | 'Artists' | 'Year';
const FILTERS: Filter[] = ['All', 'Tracks', 'Albums', 'Artists', 'Year'];

type BrowseMode = 'artist' | 'year' | 'album' | null;

// ─── Sub-components ───────────────────────────────────────────────────────────

const TrackRow = ({ track, queue }: { track: Track; queue: Track[] }) => {
  const playTrack = usePlayerStore((s) => s.playTrack);
  return (
    <button
      type="button"
      onClick={() => playTrack(track, queue)}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left"
    >
      <img
        src={track.coverUrl}
        alt={track.album}
        className="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[0.8125rem] font-medium text-swara-text leading-snug truncate tracking-tight">
          {track.title}
        </p>
        <p className="text-[0.6875rem] text-swara-muted truncate">
          {track.artist} · {track.album}
        </p>
      </div>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-swara-dim flex-shrink-0" aria-hidden="true">
        <path d="M6 4.75v14.5a.75.75 0 0 0 1.14.64l11.5-7.25a.75.75 0 0 0 0-1.28L7.14 4.11A.75.75 0 0 0 6 4.75Z" />
      </svg>
    </button>
  );
};

const AlbumRow = ({ album }: { album: Album }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/album/${album.id}`)}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left"
    >
      <img
        src={album.coverUrl}
        alt={album.title}
        className="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[0.8125rem] font-medium text-swara-text leading-snug truncate tracking-tight">
          {album.title}
        </p>
        <p className="text-[0.6875rem] text-swara-muted truncate">
          {album.composer} · {album.year}
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
};

const ArtistRow = ({ artist }: { artist: Artist }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/artist/${artist.id}`)}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left"
    >
      <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-swara-elevated">
        <img src={artist.coverUrl} alt={artist.name} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.8125rem] font-medium text-swara-text leading-snug truncate tracking-tight">{artist.name}</p>
        <p className="text-[0.6875rem] text-swara-muted truncate">{artist.albumIds.length} album{artist.albumIds.length !== 1 ? 's' : ''}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <p className="text-[0.6875rem] font-semibold text-swara-muted tracking-widest uppercase mb-2 px-1">
      {title}
    </p>
    {children}
  </div>
);

interface BrowseCardProps { icon: React.ReactNode; label: string; onClick: () => void; }
const BrowseCard = ({ icon, label, onClick }: BrowseCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col items-center gap-2.5 p-5 bg-swara-card border border-swara-border rounded-2xl text-swara-muted text-[0.8125rem] font-medium active:scale-95 hover:border-swara-accent/30 hover:text-swara-text transition-all duration-200"
  >
    <div className="w-10 h-10 rounded-full bg-swara-elevated flex items-center justify-center text-swara-accent">
      {icon}
    </div>
    <span className="tracking-tight">{label}</span>
  </button>
);

const BrowseGroup = ({ groupKey, albums }: { groupKey: string; albums: Album[] }) => (
  <div className="mb-5">
    <h3 className="text-[0.8125rem] font-bold text-swara-text tracking-tight mb-1 px-1 border-b border-swara-border pb-1">
      {groupKey}
    </h3>
    {albums.map((album) => <AlbumRow key={album.id} album={album} />)}
  </div>
);

// ─── SearchPage ───────────────────────────────────────────────────────────────
const SearchPage = () => {
  const [query,        setQuery]        = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [browseMode,   setBrowseMode]   = useState<BrowseMode>(null);
  const [indexing,     setIndexing]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tracks, albums, artists, loaded, loadAlbumTracks } = useLibraryStore();

  const q       = query.trim().toLowerCase();
  const isYear  = /^\d{4}$/.test(q);

  // Eagerly load all album tracks when user types (for track-level search)
  const loadAllTracks = useCallback(async () => {
    const unloaded = albums.filter((a) => a.tracks.length === 0);
    if (!unloaded.length) return;
    setIndexing(true);
    await Promise.all(unloaded.map((a) => loadAlbumTracks(a.id)));
    setIndexing(false);
  }, [albums, loadAlbumTracks]);

  useEffect(() => {
    if (!q || !loaded) return;
    if (activeFilter === 'Albums' || activeFilter === 'Artists') return;
    loadAllTracks();
  }, [q, loaded, activeFilter, loadAllTracks]);

  // ── Matched results ────────────────────────────────────────────────────
  const matchedTracks = useMemo(() => {
    if (!q || activeFilter === 'Albums' || activeFilter === 'Artists') return [];
    return tracks.filter((t) => {
      if (isYear || activeFilter === 'Year') return String(t.year) === q;
      // ✅ ONLY match on track title and singer names — NOT on album name
      return (
        t.title.toLowerCase().includes(q) ||
        t.artists.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [q, tracks, activeFilter, isYear]);

  const matchedAlbums = useMemo(() => {
    if (!q || activeFilter === 'Tracks' || activeFilter === 'Artists') return [];
    return albums.filter((a) => {
      if (isYear || activeFilter === 'Year') return String(a.year) === q;
      return (
        a.title.toLowerCase().includes(q) ||
        a.composer.toLowerCase().includes(q)
      );
    });
  }, [q, albums, activeFilter, isYear]);

  const matchedArtists = useMemo(() => {
    if (!q || activeFilter === 'Tracks' || activeFilter === 'Albums' || activeFilter === 'Year') return [];
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  }, [q, artists, activeFilter]);

  const hasResults = matchedTracks.length > 0 || matchedAlbums.length > 0 || matchedArtists.length > 0;

  const showTracks  = activeFilter === 'All' || activeFilter === 'Tracks' || activeFilter === 'Year';
  const showAlbums  = activeFilter === 'All' || activeFilter === 'Albums' || activeFilter === 'Year';
  const showArtists = activeFilter === 'All' || activeFilter === 'Artists';

  // ── Browse groupings ───────────────────────────────────────────────────
  const browseGrouped = useMemo(() => {
    if (!browseMode || q) return null;
    if (browseMode === 'artist') {
      const map: Record<string, Album[]> = {};
      albums.forEach((a) => { (map[a.composer] ??= []).push(a); });
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }
    if (browseMode === 'year') {
      const map: Record<string, Album[]> = {};
      albums.forEach((a) => { (map[String(a.year)] ??= []).push(a); });
      return Object.entries(map).sort(([a], [b]) => Number(b) - Number(a));
    }
    if (browseMode === 'album') {
      const map: Record<string, Album[]> = {};
      albums.forEach((a) => {
        const letter = (a.title[0] || '#').toUpperCase();
        const key    = /[A-Z]/.test(letter) ? letter : '#';
        (map[key] ??= []).push(a);
      });
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }
    return null;
  }, [browseMode, albums, q]);

  const handleClear = () => {
    setQuery('');
    setBrowseMode(null);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm pt-5 pb-3 px-4">
        {/* Search input */}
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-swara-muted pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M11 20a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM20.97 20.97l-1.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="search"
            placeholder="Songs, artists, albums, year…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (e.target.value) setBrowseMode(null); }}
            className="w-full bg-swara-card border border-swara-border rounded-xl pl-10 pr-10 py-3 text-sm text-swara-text placeholder:text-swara-dim focus:outline-none focus:border-swara-accent/50 focus:bg-swara-elevated transition-all duration-200 tracking-tight"
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-swara-muted hover:text-swara-text transition-colors" aria-label="Clear">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f} type="button"
              onClick={() => setActiveFilter(f)}
              className={[
                'flex-shrink-0 px-4 py-1.5 rounded-full text-[0.8125rem] font-medium border transition-all duration-200',
                activeFilter === f
                  ? 'bg-swara-accent border-swara-accent text-swara-bg'
                  : 'bg-transparent border-swara-border text-swara-muted hover:text-swara-text',
              ].join(' ')}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Indexing spinner */}
        {indexing && (
          <div className="flex flex-col items-center gap-2 mt-12">
            <div className="w-5 h-5 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
            <p className="text-xs text-swara-dim">Indexing tracks…</p>
          </div>
        )}

        {/* No query — browse cards or browse drill-down */}
        {!indexing && !q && (
          <>
            {browseMode && browseGrouped ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setBrowseMode(null)}
                  className="flex items-center gap-1.5 text-swara-accent text-sm font-medium mb-4"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Browse
                </button>
                {browseGrouped.map(([key, grpAlbums]) => (
                  <BrowseGroup key={key} groupKey={key} albums={grpAlbums} />
                ))}
              </div>
            ) : (
              <>
                <p className="text-[0.6875rem] font-semibold text-swara-muted tracking-widest uppercase mt-5 mb-3 px-1">
                  Browse by
                </p>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <BrowseCard label="Artists" onClick={() => setBrowseMode('artist')} icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  } />
                  <BrowseCard label="By Year" onClick={() => setBrowseMode('year')} icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  } />
                  <BrowseCard label="A–Z" onClick={() => setBrowseMode('album')} icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 6h16M4 10h10M4 14h14M4 18h8" />
                    </svg>
                  } />
                </div>
                <div className="flex flex-col items-center justify-center mt-8 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-swara-card border border-swara-border flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-swara-dim" aria-hidden="true">
                      <path d="M11 20a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM20.97 20.97l-1.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-swara-muted text-center">Search your library</p>
                  <p className="text-xs text-swara-dim text-center max-w-[200px]">Find any song, artist, album, or type a year like 2025</p>
                </div>
              </>
            )}
          </>
        )}

        {/* No results */}
        {!indexing && q && !hasResults && (
          <div className="flex flex-col items-center justify-center mt-16 gap-3">
            <p className="text-sm font-medium text-swara-muted text-center">No results for "{query}"</p>
            <p className="text-xs text-swara-dim text-center">
              {isYear ? 'Try a 4-digit year like 2025' : 'Try a different keyword'}
            </p>
          </div>
        )}

        {/* Results */}
        {!indexing && q && hasResults && (
          <div className="mt-2">
            {showTracks && matchedTracks.length > 0 && (
              <Section title={isYear ? `Songs from ${q}` : 'Songs'}>
                {matchedTracks.slice(0, 30).map((track) => (
                  <TrackRow key={track.id} track={track} queue={matchedTracks} />
                ))}
              </Section>
            )}
            {showAlbums && matchedAlbums.length > 0 && (
              <Section title={isYear ? `Albums from ${q}` : 'Albums'}>
                {matchedAlbums.map((album) => <AlbumRow key={album.id} album={album} />)}
              </Section>
            )}
            {showArtists && matchedArtists.length > 0 && (
              <Section title="Artists">
                {matchedArtists.map((artist) => <ArtistRow key={artist.id} artist={artist} />)}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
