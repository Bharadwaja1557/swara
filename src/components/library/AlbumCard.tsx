'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Album } from '@/types';

interface AlbumCardProps {
  album: Album;
}

/** Build the URL for an album page. Uses search params (not path params) for static-export compatibility. */
export function albumHref(id: string): string {
  return `/album/?id=${encodeURIComponent(id)}`;
}

export function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Link
      href={albumHref(album.id)}
      className="block no-select album-card group"
    >
      <div className="bg-bg-surface rounded-2xl overflow-hidden shadow-card ring-1 ring-white/5">
        {/* Cover */}
        <div className="aspect-square relative overflow-hidden bg-bg-elevated">
          {album.coverUrl ? (
            <Image
              src={album.coverUrl}
              alt={album.title}
              fill
              sizes="(max-width: 640px) 45vw, 200px"
              className="object-cover transition-transform duration-300 group-active:scale-[1.04]"
              unoptimized
            />
          ) : (
            <DefaultAlbumCover />
          )}
          <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition-colors duration-150" />
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-sm font-semibold text-text leading-tight line-clamp-1">
            {album.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            {album.primaryArtist && (
              <p className="text-xs text-text-secondary line-clamp-1 flex-1">
                {album.primaryArtist}
              </p>
            )}
            {album.year && (
              <span className="text-xs text-text-muted font-mono flex-shrink-0">{album.year}</span>
            )}
          </div>
          <p className="text-2xs text-text-muted mt-1">
            {album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}
          </p>
        </div>
      </div>
    </Link>
  );
}

function DefaultAlbumCover() {
  return (
    <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="#2a2a2a" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="8" stroke="#2a2a2a" strokeWidth="1.5" />
        <path d="M12 4v2M12 18v2M4 12H2M22 12h-2" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function AlbumCardSkeleton() {
  return (
    <div className="block">
      <div className="bg-bg-surface rounded-2xl overflow-hidden">
        <div className="aspect-square skeleton" />
        <div className="p-3 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
    </div>
  );
}
