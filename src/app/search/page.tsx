'use client';

import { albumHref } from '@/components/library/AlbumCard';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { TrackRow } from '@/components/library/TrackRow';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Album, Track } from '@/types';

// Flat search: searches album titles, artists, track titles, track artists
function normalise(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

interface SearchResults {
  albums: Album[];
  tracks: Track[];
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const albums = useLibraryStore((s) => s.albums);
  const albumDetails = useLibraryStore((s) => s.albumDetails);
  const fetchAlbumDetail = useLibraryStore((s) => s.fetchAlbumDetail);
  const isLoadingAlbums = useLibraryStore((s) => s.isLoadingAlbums);

  // Collect all tracks from loaded album details
  const allTracks = useMemo(() => {
    return Object.values(albumDetails).flatMap((d) => d.tracks);
  }, [albumDetails]);

  // Search results
  const results = useMemo<SearchResults>(() => {
    const q = normalise(query);
    if (!q) return { albums: [], tracks: [] };

    const matchedAlbums = albums.filter(
      (a) =>
        normalise(a.title).includes(q) ||
        (a.primaryArtist && normalise(a.primaryArtist).includes(q)) ||
        (a.genre && normalise(a.genre).includes(q)) ||
        (a.year && a.year.includes(q)),
    );

    const matchedTracks = allTracks.filter(
      (t) =>
        normalise(t.title).includes(q) ||
        normalise(t.artistsDisplay).includes(q) ||
        t.artists.some((a) => normalise(a).includes(q)) ||
        (t.albumTitle && normalise(t.albumTitle).includes(q)),
    );

    return { albums: matchedAlbums, tracks: matchedTracks };
  }, [query, albums, allTracks]);

  const hasQuery = query.trim().length > 0;
  const hasResults = results.albums.length > 0 || results.tracks.length > 0;

  // Load all album details to enable track search
  // We do this lazily on search page mount
  const detailsLoadedRef = useRef(false);
  if (!detailsLoadedRef.current && albums.length > 0) {
    detailsLoadedRef.current = true;
    albums.forEach((album) => {
      if (!albumDetails[album.id]) {
        fetchAlbumDetail(album.id).catch(() => {});
      }
    });
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-3xl font-bold text-text tracking-tight mb-4">Search</h1>

        {/* Search input */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            <SearchIcon />
          </div>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Albums, artists, songs…"
            autoComplete="off"
            spellCheck={false}
            className="
              w-full h-12 pl-11 pr-10 rounded-2xl
              bg-bg-surface border border-border
              text-text text-base placeholder:text-text-muted
              outline-none focus:border-accent focus:ring-2 focus:ring-accent/20
              transition-all duration-200
            "
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-bg-elevated text-text-muted active:bg-border transition-colors"
              aria-label="Clear search"
            >
              <ClearIcon />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!hasQuery ? (
        // Browse: show all albums as chips/grid when not searching
        <BrowseView albums={albums} isLoading={isLoadingAlbums} />
      ) : !hasResults ? (
        <EmptyState
          title={`No results for "${query}"`}
          description="Try a different search term or browse the library."
          icon={<SearchEmptyIcon />}
        />
      ) : (
        <div className="pb-4">
          {/* Album results */}
          {results.albums.length > 0 && (
            <section className="mb-6">
              <div className="px-5 mb-3">
                <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
                  Albums
                </h2>
              </div>
              <div className="space-y-1 px-2">
                {results.albums.map((album) => (
                  <AlbumSearchRow key={album.id} album={album} />
                ))}
              </div>
            </section>
          )}

          {/* Track results */}
          {results.tracks.length > 0 && (
            <section>
              <div className="px-5 mb-2">
                <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
                  Songs · {results.tracks.length}
                </h2>
              </div>
              <div className="space-y-0.5">
                {results.tracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    queue={results.tracks}
                    showAlbum
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Browse view (no query) ─────────────────────────────────────────────────

function BrowseView({ albums, isLoading }: { albums: Album[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="px-5 space-y-2 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl skeleton" />
        ))}
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <EmptyState
        title="Your library is empty"
        description="Add albums to the m4a-db repo to get started."
      />
    );
  }

  return (
    <div className="px-5 pb-4">
      <p className="text-xs text-text-muted uppercase tracking-widest mb-3 font-semibold">
        Browse all
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {albums.map((album) => (
          <Link
            key={album.id}
            href={albumHref(album.id)}
            className="relative h-20 rounded-2xl overflow-hidden flex items-end p-3 no-select active:scale-[0.97] transition-transform"
            style={{ background: '#1a1a1a' }}
          >
            {album.coverUrl && (
              <Image
                src={album.coverUrl}
                alt={album.title}
                fill
                className="object-cover opacity-40"
                unoptimized
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <p className="relative z-10 text-sm font-semibold text-white line-clamp-2 leading-tight">
              {album.title}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Album row in search results ────────────────────────────────────────────

function AlbumSearchRow({ album }: { album: Album }) {
  return (
    <Link
      href={albumHref(album.id)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-bg-elevated transition-colors no-select"
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-bg-elevated">
        {album.coverUrl ? (
          <Image
            src={album.coverUrl}
            alt={album.title}
            width={48}
            height={48}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-bg-elevated" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text leading-tight line-clamp-1">{album.title}</p>
        <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
          Album
          {album.primaryArtist && ` · ${album.primaryArtist}`}
          {album.year && ` · ${album.year}`}
        </p>
      </div>
      <ChevronRightIcon />
    </Link>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchEmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.2" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9 11h4M11 9v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
