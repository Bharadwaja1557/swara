'use client';

import { useMemo, useEffect } from 'react';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { TrackRow } from '@/components/library/TrackRow';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Track } from '@/types';

export default function LikedPage() {
  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const albumDetails = useLibraryStore((s) => s.albumDetails);
  const albums = useLibraryStore((s) => s.albums);
  const fetchAlbumDetail = useLibraryStore((s) => s.fetchAlbumDetail);

  const playAlbum = usePlayerStore((s) => s.playAlbum);

  // Collect liked tracks from all loaded album details, preserving like order
  const likedTracks = useMemo<Track[]>(() => {
    const allTracks = Object.values(albumDetails).flatMap((d) => d.tracks);
    const trackMap = new Map(allTracks.map((t) => [t.id, t]));

    // Iterate in liked order (Set preserves insertion order)
    const result: Track[] = [];
    likedTrackIds.forEach((id) => {
      const track = trackMap.get(id);
      if (track) result.push(track);
    });
    return result;
  }, [likedTrackIds, albumDetails]);

  // Load all album details so we can surface liked tracks
  useEffect(() => {
    albums.forEach((album) => {
      if (!albumDetails[album.id]) {
        fetchAlbumDetail(album.id).catch(() => {});
      }
    });
  }, [albums, albumDetails, fetchAlbumDetail]);

  const count = likedTracks.length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-400 flex items-center justify-center flex-shrink-0 shadow-lg">
            <HeartSolidIcon size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text tracking-tight">Liked Songs</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {likedTrackIds.size === 0
                ? 'No liked songs yet'
                : `${likedTrackIds.size} ${likedTrackIds.size === 1 ? 'song' : 'songs'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Action bar — only if there are liked songs */}
      {count > 0 && (
        <>
          <div className="px-5 pb-4 flex items-center gap-3">
            <button
              onClick={() => playAlbum(likedTracks, 0)}
              className="flex-1 h-12 rounded-2xl bg-accent text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-accent-glow active:scale-[0.97] transition-transform"
            >
              <PlaySolidIcon />
              Play all
            </button>
            <button
              onClick={() => {
                const randomIndex = Math.floor(Math.random() * likedTracks.length);
                playAlbum(likedTracks, randomIndex);
                requestAnimationFrame(() => {
                  usePlayerStore.getState().toggleShuffle();
                });
              }}
              className="h-12 px-5 rounded-2xl bg-bg-surface border border-border text-text font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <ShuffleIcon />
              Shuffle
            </button>
          </div>
          <div className="mx-5 border-t border-border mb-2" />
        </>
      )}

      {/* Track list */}
      {likedTrackIds.size === 0 ? (
        <EmptyState
          title="No liked songs yet"
          description="Tap the heart icon on any track to save it here."
          icon={<HeartOutlineIcon size={48} />}
        />
      ) : count === 0 && likedTrackIds.size > 0 ? (
        // Liked IDs exist but tracks not yet loaded from album details
        <div className="px-5 space-y-1 pt-2">
          {Array.from({ length: Math.min(likedTrackIds.size, 6) }).map((_, i) => (
            <div key={i} className="h-[60px] rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="space-y-0.5 pb-4">
          {likedTracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              queue={likedTracks}
              index={i}
              showAlbum
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function HeartSolidIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21C12 21 3 15 3 9a4.5 4.5 0 018.94-.89L12 9l.06-.89A4.5 4.5 0 0121 9c0 6-9 12-9 12z"
        fill="white"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartOutlineIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21C12 21 3 15 3 9a4.5 4.5 0 018.94-.89L12 9l.06-.89A4.5 4.5 0 0121 9c0 6-9 12-9 12z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlaySolidIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M16 3h5v5M4 20l16-16M16 20h5v-5M4 4l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
