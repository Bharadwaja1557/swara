/**
 * src/lib/queueBuilders.ts — The ONLY place queues are constructed.
 *
 * Every component that starts playback calls a builder here.
 * Builders return { tracks, context } — no component assembles raw arrays.
 *
 * This enforces:
 *   - Consistent QueueContext metadata (for "Playing from X" labels)
 *   - Deterministic ordering
 *   - Single point for future smart queue logic (crossfade, gapless, etc.)
 *   - Clean playlist integration path (just add buildPlaylistQueue)
 *
 * Shuffle is applied at the player engine layer (playerStore._setQueue),
 * NOT here. Builders always return in natural order.
 *
 * Usage:
 *   const built = buildAlbumQueue(album, startTrack);
 *   playQueue(built);
 */
import type { Track, Album, Artist, QueueContext } from '@/types/music';
import { useLikedStore }      from '@/store/likedStore';
import { useLibraryStore }    from '@/store/libraryStore';
import { useUserLibraryStore } from '@/store/useUserLibraryStore';

export interface BuiltQueue {
  tracks:  Track[];
  context: QueueContext;
  /** Index of the track to start from (0-based). Defaults to 0. */
  startIndex: number;
}

// ── Album queue ───────────────────────────────────────────────────────────────

export function buildAlbumQueue(album: Album, startTrack?: Track): BuiltQueue {
  const tracks = album.tracks;
  const startIndex = startTrack
    ? Math.max(0, tracks.findIndex((t) => t.id === startTrack.id))
    : 0;
  return {
    tracks,
    startIndex,
    context: {
      type:     'album',
      id:       album.id,
      title:    album.title,
      subtitle: album.composer,
      artwork:  album.coverUrl,
    },
  };
}

// ── Artist queue ──────────────────────────────────────────────────────────────

export function buildArtistQueue(
  artist: Artist,
  allTracks: Track[],
  startTrack?: Track
): BuiltQueue {
  // All tracks where this artist appears as a singer
  const artistTracks = allTracks.filter((t) =>
    t.artists.some((a) => a.toLowerCase().replace(/\s+/g, '-') === artist.id
      || a.toLowerCase() === artist.name.toLowerCase())
  );
  const startIndex = startTrack
    ? Math.max(0, artistTracks.findIndex((t) => t.id === startTrack.id))
    : 0;
  return {
    tracks: artistTracks,
    startIndex,
    context: {
      type:     'artist',
      id:       artist.id,
      title:    artist.name,
      subtitle: `${artistTracks.length} songs`,
      artwork:  artist.coverUrl,
    },
  };
}

// ── Liked songs queue ─────────────────────────────────────────────────────────

export function buildLikedQueue(startTrack?: Track): BuiltQueue {
  const tracks = useLikedStore.getState().getLikedTracks();
  const startIndex = startTrack
    ? Math.max(0, tracks.findIndex((t) => t.id === startTrack.id))
    : 0;
  return {
    tracks,
    startIndex,
    context: {
      type:     'liked',
      title:    'Liked Songs',
      subtitle: `${tracks.length} songs`,
      // No artwork — use generic heart display in QueuePage
    },
  };
}

// ── Library queue (all tracks from user library) ──────────────────────────────

export function buildLibraryQueue(startTrack?: Track): BuiltQueue {
  const { albumMap } = useLibraryStore.getState();
  const { entries }  = useUserLibraryStore.getState();

  const tracks: Track[] = [];
  for (const entry of entries) {
    const album = albumMap.get(entry.albumId);
    if (!album) continue;
    for (const trackId of entry.trackIds) {
      const track = album.tracks.find((t) => t.id === trackId);
      if (track) tracks.push(track);
    }
  }

  const startIndex = startTrack
    ? Math.max(0, tracks.findIndex((t) => t.id === startTrack.id))
    : 0;

  return {
    tracks,
    startIndex,
    context: {
      type:     'library',
      title:    'My Library',
      subtitle: `${tracks.length} songs`,
    },
  };
}

// ── Search results queue ──────────────────────────────────────────────────────

export function buildSearchQueue(
  tracks: Track[],
  query: string,
  startTrack?: Track
): BuiltQueue {
  const startIndex = startTrack
    ? Math.max(0, tracks.findIndex((t) => t.id === startTrack.id))
    : 0;
  return {
    tracks,
    startIndex,
    context: {
      type:     'search',
      title:    'Search Results',
      subtitle: query ? `"${query}"` : undefined,
    },
  };
}

// ── Playlist queue (future) ───────────────────────────────────────────────────

export function buildPlaylistQueue(
  playlistId: string,
  playlistTitle: string,
  tracks: Track[],
  coverUrl?: string,
  startTrack?: Track
): BuiltQueue {
  const startIndex = startTrack
    ? Math.max(0, tracks.findIndex((t) => t.id === startTrack.id))
    : 0;
  return {
    tracks,
    startIndex,
    context: {
      type:     'playlist',
      id:       playlistId,
      title:    playlistTitle,
      subtitle: `${tracks.length} songs`,
      artwork:  coverUrl,
    },
  };
}

// ── Manual / ad-hoc queue ─────────────────────────────────────────────────────

export function buildManualQueue(tracks: Track[], startTrack?: Track): BuiltQueue {
  const startIndex = startTrack
    ? Math.max(0, tracks.findIndex((t) => t.id === startTrack.id))
    : 0;
  return {
    tracks,
    startIndex,
    context: {
      type:     'manual',
      title:    'Queue',
      subtitle: `${tracks.length} songs`,
    },
  };
}
