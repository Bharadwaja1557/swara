/**
 * libraryRenderables.ts — Normalized render model for library entities.
 *
 * Converts raw store data (Album, Artist, Playlist + trackMap) into a
 * flat array of LibraryRenderable objects BEFORE rendering begins.
 *
 * BENEFITS:
 *   - Zero type-branching in JSX — render loops iterate LibraryRenderable[],
 *     passing the same props to LibraryCard / LibraryRow unconditionally.
 *   - ONE sort pipeline shared by all consumers (LibraryPage, LibraryPanel).
 *   - Adding future entity types (podcasts, audiobooks, etc.) = add one
 *     normalizer function here. No render code changes needed.
 *   - Collocates all subtitle/tertiary copy in one place.
 *
 * CONSUMERS:
 *   LibraryPage (mobile + desktop content)
 *   LibraryPanel (desktop left sidebar)
 *
 * DESIGN NOTES:
 *   coverShape: 'circle' for artists, 'square' for albums/playlists.
 *   playlistFallback: true triggers the musical-note gradient placeholder.
 *   sortDate: milliseconds since epoch — used for "Recently Added" ordering.
 *   sortName: pre-computed string for A-Z / Z-A — avoids repeated .title
 *     vs .name branching inside comparators.
 */

import type { Album, Artist, Track } from '@/types/music';
import type { Playlist } from '@/store/usePlaylistStore';
import type { UserLibraryEntry } from '@/store/useUserLibraryStore';
import { slugify } from '@/utils/library';

// ── Public interface ──────────────────────────────────────────────────────────

export type LibraryEntityType = 'album' | 'artist' | 'playlist';

export interface LibraryRenderable {
  /** Stable React key — includes type prefix to avoid cross-type collisions. */
  key:               string;
  type:              LibraryEntityType;
  id:                string;
  route:             string;
  title:             string;
  subtitle?:         string;
  tertiary?:         string;
  imageUrl?:         string;
  coverShape:        'square' | 'circle';
  /** Render the music-note gradient placeholder when imageUrl is missing. */
  playlistFallback:  boolean;
  /** Milliseconds timestamp for "Recently Added" sort. */
  sortDate:          number;
  /** Pre-lowercased title/name string for locale-aware A-Z / Z-A sort. */
  sortName:          string;
}

export type LibrarySortMode = 'Recently Added' | 'A-Z' | 'Z-A';

// ── Normalizers ───────────────────────────────────────────────────────────────

/** Resolve the best available cover URL for a playlist. */
export function playlistImageUrl(
  playlist: Playlist,
  trackMap: Map<string, Track>,
): string | undefined {
  if (playlist.coverUrl) return playlist.coverUrl;
  if (playlist.trackIds.length > 0) return trackMap.get(playlist.trackIds[0])?.coverUrl;
  return undefined;
}

/** Convert a single Album to a LibraryRenderable. */
function fromAlbum(album: Album, addedAt: number): LibraryRenderable {
  return {
    key:              `album-${album.id}`,
    type:             'album',
    id:               album.id,
    route:            `/album/${album.id}`,
    title:            album.title,
    subtitle:         album.composer,
    tertiary:         String(album.year),
    imageUrl:         album.coverUrl,
    coverShape:       'square',
    playlistFallback: false,
    sortDate:         addedAt,
    sortName:         album.title,
  };
}

/** Convert a single Artist to a LibraryRenderable. */
function fromArtist(artist: Artist, addedAt: number): LibraryRenderable {
  const count = artist.albumIds.length;
  return {
    key:              `artist-${artist.id}`,
    type:             'artist',
    id:               artist.id,
    route:            `/artist/${artist.id}`,
    title:            artist.name,
    subtitle:         `${count} album${count !== 1 ? 's' : ''}`,
    imageUrl:         artist.coverUrl,
    coverShape:       'circle',
    playlistFallback: false,
    sortDate:         addedAt,
    sortName:         artist.name,
  };
}

/** Convert a single Playlist to a LibraryRenderable. */
function fromPlaylist(playlist: Playlist, trackMap: Map<string, Track>): LibraryRenderable {
  const count = playlist.trackCount;
  return {
    key:              `playlist-${playlist.id}`,
    type:             'playlist',
    id:               playlist.id,
    route:            `/playlist/${playlist.id}`,
    title:            playlist.title,
    subtitle:         `${count} ${count === 1 ? 'track' : 'tracks'}`,
    imageUrl:         playlistImageUrl(playlist, trackMap),
    coverShape:       'square',
    playlistFallback: true,
    sortDate:         new Date(playlist.updatedAt).getTime(),
    sortName:         playlist.title,
  };
}

// ── Sort pipeline ─────────────────────────────────────────────────────────────

function sortRenderables(
  items: LibraryRenderable[],
  mode: LibrarySortMode,
): LibraryRenderable[] {
  if (mode === 'A-Z') return [...items].sort((a, b) => a.sortName.localeCompare(b.sortName));
  if (mode === 'Z-A') return [...items].sort((a, b) => b.sortName.localeCompare(a.sortName));
  // 'Recently Added': newest first by sortDate
  return [...items].sort((a, b) => b.sortDate - a.sortDate);
}

// ── Public builders ───────────────────────────────────────────────────────────

/**
 * Build a sorted LibraryRenderable[] from library store data.
 *
 * @param entries     UserLibraryStore entries (album IDs + addedAt timestamps)
 * @param albumMap    Catalog album map (id → Album)
 * @param artistMap   Catalog artist map (id → Artist)
 * @param playlists   All user playlists from usePlaylistStore
 * @param trackMap    Catalog track map (id → Track) — for playlist cover resolution
 * @param mode        Sort mode
 * @param include     Which entity types to include. Defaults to all three.
 */
export function buildRenderables(
  entries:   UserLibraryEntry[],
  albumMap:  Map<string, Album>,
  artistMap: Map<string, Artist>,
  playlists: Playlist[],
  trackMap:  Map<string, Track>,
  mode:      LibrarySortMode,
  include:   Set<LibraryEntityType> = new Set(['album', 'artist', 'playlist']),
): LibraryRenderable[] {
  const items: LibraryRenderable[] = [];
  const seenArtistIds = new Set<string>();

  if (include.has('album') || include.has('artist')) {
    for (const entry of entries) {
      const album = albumMap.get(entry.albumId);
      if (!album) continue;

      if (include.has('album')) {
        items.push(fromAlbum(album, entry.addedAt));
      }

      if (include.has('artist')) {
        const artistId = slugify(album.composer);
        if (artistId && !seenArtistIds.has(artistId)) {
          seenArtistIds.add(artistId);
          const artist = artistMap.get(artistId);
          if (artist) items.push(fromArtist(artist, entry.addedAt));
        }
      }
    }
  }

  if (include.has('playlist')) {
    for (const pl of playlists) {
      items.push(fromPlaylist(pl, trackMap));
    }
  }

  return sortRenderables(items, mode);
}
