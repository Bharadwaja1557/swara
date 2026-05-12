import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import type { Track, Album, Artist } from '@/types/music';
// import { slugify } from '@/utils/library';

// ─── Filter chip type ─────────────────────────────────────────────────────────
type Filter = 'All' | 'Songs' | 'Albums' | 'Artists';
const FILTERS: Filter[] = ['All', 'Songs', 'Albums', 'Artists'];

// ─── Sub-components ───────────────────────────────────────────────────────────

const TrackRow = ({ track, queue }: { track: Track; queue: Track[] }) => {
  const playTrack = usePlayerStore((s) => s.playTrack);

  return (
    <button
      type="button"
      onClick={() => playTrack(track, queue)}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left"
      aria-label={`Play ${track.title} by ${track.artist}`}
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
        <p className="text-[0.6875rem] text-swara-muted truncate">{track.artist}</p>
      </div>
      <div className="flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-swara-dim" aria-hidden="true">
          <path d="M6 4.75v14.5a.75.75 0 0 0 1.14.64l11.5-7.25a.75.75 0 0 0 0-1.28L7.14 4.11A.75.75 0 0 0 6 4.75Z" />
        </svg>
      </div>
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
      aria-label={`Open ${album.title}`}
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
      aria-label={`Open ${artist.name}`}
    >
      <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-swara-elevated">
        <img
          src={artist.coverUrl}
          alt={artist.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.8125rem] font-medium text-swara-text leading-snug truncate tracking-tight">
          {artist.name}
        </p>
        <p className="text-[0.6875rem] text-swara-muted truncate">
          {artist.trackIds.length} song{artist.trackIds.length !== 1 ? 's' : ''}
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <h2 className="text-[0.6875rem] font-semibold text-swara-muted tracking-widest uppercase mb-2 px-1">
      {title}
    </h2>
    {children}
  </div>
);

// ─── SearchPage ───────────────────────────────────────────────────────────────

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const inputRef = useRef<HTMLInputElement>(null);

  const { tracks, albums, artists, loading, loaded } = useLibraryStore();

  const q = query.trim().toLowerCase();

  const matchedTracks = useMemo(() => {
    if (!q) return [];
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
    );
  }, [q, tracks]);

  const matchedAlbums = useMemo(() => {
    if (!q) return [];
    return albums.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.composer.toLowerCase().includes(q)
    );
  }, [q, albums]);

  const matchedArtists = useMemo(() => {
    if (!q) return [];
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  }, [q, artists]);

  const hasResults = matchedTracks.length > 0 || matchedAlbums.length > 0 || matchedArtists.length > 0;

  const showSongs   = activeFilter === 'All' || activeFilter === 'Songs';
  const showAlbums  = activeFilter === 'All' || activeFilter === 'Albums';
  const showArtists = activeFilter === 'All' || activeFilter === 'Artists';

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      {/* Sticky header with search bar */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm pt-5 pb-3 px-4">
        {/* Search input */}
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-swara-muted pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M11 20a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM20.97 20.97l-1.5-1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="search"
            placeholder="Songs, artists, albums…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={[
              'w-full bg-swara-card border border-swara-border rounded-xl',
              'pl-10 pr-10 py-3',
              'text-sm text-swara-text placeholder:text-swara-dim',
              'focus:outline-none focus:border-swara-accent/50 focus:bg-swara-elevated',
              'transition-all duration-200',
              'tracking-tight',
            ].join(' ')}
            autoComplete="off"
            aria-label="Search music"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-swara-muted hover:text-swara-text transition-colors"
              aria-label="Clear search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={[
                'flex-shrink-0 px-4 py-1.5 rounded-full text-[0.8125rem] font-medium',
                'border transition-all duration-200',
                activeFilter === filter
                  ? 'bg-swara-accent border-swara-accent text-swara-bg'
                  : 'bg-transparent border-swara-border text-swara-muted hover:text-swara-text',
              ].join(' ')}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center mt-16">
            <div className="w-6 h-6 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
          </div>
        )}

        {/* Empty search */}
        {!loading && loaded && !q && (
          <div className="flex flex-col items-center justify-center mt-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-swara-card border border-swara-border flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-swara-dim" aria-hidden="true">
                <path
                  d="M11 20a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM20.97 20.97l-1.5-1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-swara-muted text-center">
              Search your library
            </p>
            <p className="text-xs text-swara-dim text-center max-w-[200px]">
              Find any song, album, or artist
            </p>
          </div>
        )}

        {/* No results */}
        {!loading && loaded && q && !hasResults && (
          <div className="flex flex-col items-center justify-center mt-16 gap-3">
            <p className="text-sm font-medium text-swara-muted text-center">
              No results for "{query}"
            </p>
            <p className="text-xs text-swara-dim text-center">
              Try a different spelling or keyword
            </p>
          </div>
        )}

        {/* Results: Songs first, then Albums, then Artists */}
        {!loading && loaded && q && hasResults && (
          <div className="mt-2">
            {showSongs && matchedTracks.length > 0 && (
              <Section title="Songs">
                {matchedTracks.map((track) => (
                  <TrackRow key={track.id} track={track} queue={matchedTracks} />
                ))}
              </Section>
            )}

            {showAlbums && matchedAlbums.length > 0 && (
              <Section title="Albums">
                {matchedAlbums.map((album) => (
                  <AlbumRow key={album.id} album={album} />
                ))}
              </Section>
            )}

            {showArtists && matchedArtists.length > 0 && (
              <Section title="Artists">
                {matchedArtists.map((artist) => (
                  <ArtistRow key={artist.id} artist={artist} />
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
