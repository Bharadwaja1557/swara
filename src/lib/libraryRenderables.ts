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
import type { PlaylistFolder } from '@/store/useFolderStore';
import type { UserLibraryEntry } from '@/store/useUserLibraryStore';
import { slugify } from '@/utils/library';

// ── Public interface ──────────────────────────────────────────────────────────

export type LibraryEntityType = 'album' | 'artist' | 'playlist' | 'folder';

export interface LibraryRenderable {
  /** Stable React key — includes type prefix to avoid cross-type collisions. */
  key:               string;
  type:              LibraryEntityType;
  id:                string;
  route:             string;
  title:             string;
  subtitle?:         string;
  tertiary?:         string;
  /** Cover image URL — set for albums and artists. NOT used for playlists/folders. */
  imageUrl?:         string;
  coverShape:        'square' | 'circle';
  /** True for playlists/folders — signals LibraryCard/LibraryRow to use PlaylistArtwork. */
  playlistFallback:  boolean;
  /** Raw playlist object — present when type === 'playlist'. */
  playlist?:         Playlist;
  /** Raw folder object — present when type === 'folder'. */
  folder?:           PlaylistFolder;
  /** Milliseconds timestamp for "Recently Added" sort. */
  sortDate:          number;
  /** Pre-lowercased title/name string for locale-aware A-Z / Z-A sort. */
  sortName:          string;
}

export type LibrarySortMode = 'Recently Added' | 'A-Z' | 'Z-A';

// ── Normalizers ───────────────────────────────────────────────────────────────

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

/**
 * Convert a single Playlist to a LibraryRenderable.
 * The raw playlist object is carried along so PlaylistArtwork can resolve
 * the correct cover (uploaded → preset → collage → single → placeholder)
 * using the canonical resolvePlaylistArtwork() logic.
 * imageUrl is NOT set here — PlaylistArtwork reads trackMap itself.
 */
function fromPlaylist(playlist: Playlist): LibraryRenderable {
  const count = playlist.trackCount;
  return {
    key:              `playlist-${playlist.id}`,
    type:             'playlist',
    id:               playlist.id,
    route:            `/playlist/${playlist.id}`,
    title:            playlist.title,
    subtitle:         `${count} ${count === 1 ? 'track' : 'tracks'}`,
    coverShape:       'square',
    playlistFallback: true,
    playlist:         playlist,
    sortDate:         new Date(playlist.updatedAt).getTime(),
    sortName:         playlist.title,
  };
}

/** Convert a PlaylistFolder to a LibraryRenderable.
 *  Folders render before playlists in the Playlists filter view. */
function fromFolder(folder: PlaylistFolder): LibraryRenderable {
  const count = folder.playlistIds.length;
  return {
    key:              `folder-${folder.id}`,
    type:             'folder',
    id:               folder.id,
    route:            `/folder/${folder.id}`,
    title:            folder.name,
    subtitle:         `${count} ${count === 1 ? 'playlist' : 'playlists'}`,
    coverShape:       'square',
    playlistFallback: false,
    folder:           folder,
    sortDate:         new Date(folder.updatedAt).getTime(),
    sortName:         folder.name,
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
 * @param entries            UserLibraryStore entries (album IDs + addedAt timestamps)
 * @param albumMap           Catalog album map (id → Album)
 * @param artistMap          Catalog artist map (id → Artist)
 * @param playlists          All user playlists from usePlaylistStore
 * @param trackMap           Catalog track map — kept for API compat, used by PlaylistArtwork at render time
 * @param mode               Sort mode
 * @param include            Which entity types to include. Defaults to all three.
 * @param favoriteArtistIds  Explicitly-followed artist IDs (from useFavoriteArtistsStore).
 *                           When provided, Artists section shows ONLY these artists.
 *                           When undefined, falls back to album-derived artists (legacy behavior).
 */
export function buildRenderables(
  entries:            UserLibraryEntry[],
  albumMap:           Map<string, Album>,
  artistMap:          Map<string, Artist>,
  playlists:          Playlist[],
  trackMap:           Map<string, Track>,
  mode:               LibrarySortMode,
  include:            Set<LibraryEntityType> = new Set(['album', 'artist', 'playlist']),
  favoriteArtistIds?: string[],
  folders:            PlaylistFolder[] = [],
): LibraryRenderable[] {
  void trackMap; // playlist covers resolved at render time by PlaylistArtwork

  const items: LibraryRenderable[] = [];

  if (include.has('album')) {
    for (const entry of entries) {
      const album = albumMap.get(entry.albumId);
      if (!album) continue;
      items.push(fromAlbum(album, entry.addedAt));
    }
  }

  if (include.has('artist')) {
    if (favoriteArtistIds && favoriteArtistIds.length > 0) {
      for (const artistId of favoriteArtistIds) {
        const artist = artistMap.get(artistId);
        if (artist) items.push(fromArtist(artist, Date.now()));
      }
    } else if (!favoriteArtistIds) {
      const seenArtistIds = new Set<string>();
      for (const entry of entries) {
        const album = albumMap.get(entry.albumId);
        if (!album) continue;
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
    // Build the set of playlist IDs that live inside at least one folder.
    // These must NOT appear at the top-level playlists section — they are
    // already visible inside their folder cards / folder pages.
    // This is computed here (data layer) not in JSX (view layer).
    const playlistIdsInsideFolders = new Set(
      folders.flatMap((f) => f.playlistIds)
    );

    // Folders first — they are containers and float above sorted content
    for (const folder of folders) {
      items.push(fromFolder(folder));
    }

    // Only standalone playlists — ones not belonging to any folder
    const standalonePlaylists = playlists.filter(
      (p) => !playlistIdsInsideFolders.has(p.id)
    );
    for (const pl of standalonePlaylists) {
      items.push(fromPlaylist(pl));
    }
  }

  // Folders don't participate in the sort pipeline (they float at top when
  // playlist filter is active) but albums/artists/playlists do.
  // Separate: sort non-folder items, then prepend folders.
  const folderItems = items.filter((i) => i.type === 'folder');
  const otherItems  = items.filter((i) => i.type !== 'folder');
  return [...folderItems, ...sortRenderables(otherItems, mode)];
}
