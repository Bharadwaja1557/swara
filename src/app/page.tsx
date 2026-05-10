'use client';

import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { AlbumCard, AlbumCardSkeleton } from '@/components/library/AlbumCard';
import { TrackRow } from '@/components/library/TrackRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { APP_NAME } from '@/lib/constants';

export default function HomePage() {
  const albums = useLibraryStore((s) => s.albums);
  const isLoadingAlbums = useLibraryStore((s) => s.isLoadingAlbums);
  const error = useLibraryStore((s) => s.error);
  const recentlyPlayed = useLibraryStore((s) => s.recentlyPlayed);
  const fetchAlbums = useLibraryStore((s) => s.fetchAlbums);

  if (error) {
    return (
      <div className="px-4 pt-6">
        <EmptyState
          title="Couldn't load library"
          description={error}
          action={
            <button
              onClick={fetchAlbums}
              className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="px-5 pt-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-text">{APP_NAME}</h1>
        <p className="text-text-muted text-sm mt-1">Your music, your space</p>
      </header>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <section className="mb-6">
          <div className="px-5 mb-3">
            <h2 className="text-base font-semibold text-text-secondary uppercase tracking-wider text-xs">
              Recently Played
            </h2>
          </div>
          <div className="space-y-0.5">
            {recentlyPlayed.slice(0, 5).map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={recentlyPlayed}
                showAlbum
              />
            ))}
          </div>
        </section>
      )}

      {/* Albums */}
      <section className="px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-secondary uppercase tracking-wider text-xs px-1">
            Albums
          </h2>
          <span className="text-xs text-text-muted font-mono">
            {albums.length > 0 ? `${albums.length} albums` : ''}
          </span>
        </div>

        {isLoadingAlbums ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <AlbumCardSkeleton key={i} />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <EmptyState
            title="No albums yet"
            description="Add albums to the m4a-db repository to see them here."
            icon={<MusicIcon />}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MusicIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 18V5l12-2v13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
