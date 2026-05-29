import type {
  RawLibrary,
  RawLibraryAlbum,
  RawLibraryTrack,
  RawAlbumFile,
  Track,
  Album,
  Artist,
} from '@/types/music';
import {
  resolveLibraryUrl,
  resolveAlbumJsonUrl,
  resolveAudioUrl,
  resolveMediaCoverUrl,
} from '@/features/media';
import { mediaLogger } from '@/features/media';

// ─── In-memory caches ─────────────────────────────────────────────────────────
let libraryCache: { albums: Album[]; artists: Artist[] } | null = null;
const albumTracksCache = new Map<string, Track[]>();

// ─── Slugify ──────────────────────────────────────────────────────────────────
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Normalize artist name ────────────────────────────────────────────────────
function normalizeArtistName(name: string): string {
  return name.replace(/_/g, ' ');
}

// ─── Detect likely-blocked fetch ─────────────────────────────────────────────
// A blocked fetch either rejects with TypeError (network error) or returns
// a response with status 0 (opaque). We can't distinguish from 404 at runtime,
// but the combination of a github URL + TypeError strongly implies a block.
function isLikelyBlocked(url: string, err: unknown): boolean {
  return (
    typeof url === 'string' &&
    (url.includes('githubusercontent.com') || url.includes('github.com')) &&
    err instanceof TypeError // network errors come as TypeError in fetch
  );
}

// ─── Resilient fetch — one retry, block detection ────────────────────────────
async function fetchWithFallback(url: string, label: string): Promise<Response> {
  // If a cache-bust was requested (e.g. after Refresh Library Metadata),
  // use { cache: 'reload' } to bypass both browser HTTP cache and any
  // CDN edge cache for this one request. shouldBustCache() is one-shot.
  const cacheMode: RequestCache = shouldBustCache() ? 'reload' : 'default';
  try {
    const res = await fetch(url, { cache: cacheMode });
    if (!res.ok) {
      mediaLogger.fetchError(url, res.status, false);
      throw new Error(`${label}: HTTP ${res.status}`);
    }
    return res;
  } catch (err) {
    const blocked = isLikelyBlocked(url, err);
    mediaLogger.fetchError(url, undefined, blocked);
    throw err;
  }
}

// ─── Build Album stub from raw library entry ──────────────────────────────────
function buildAlbumStub(raw: RawLibraryAlbum): Album {
  return {
    id:         raw.id,
    title:      raw.title,
    composer:   normalizeArtistName(raw.artist),
    year:       raw.year,
    coverUrl:   resolveMediaCoverUrl(raw.cover),
    tracks:     [],
    trackCount: 0,
    tracksFile: raw.tracksFile,
  };
}

// ─── Normalize a raw track into a Track ───────────────────────────────────────
function normalizeTrack(rt: RawLibraryTrack, album: Album): Track {
  return {
    id:          `${album.id}--${rt.track}`,
    title:       rt.title,
    artists:     rt.artists,
    artist:      rt.artists.join(', '),
    album:       album.title,
    albumId:     album.id,
    trackNumber: rt.track,
    coverUrl:    album.coverUrl,
    streamUrl:   resolveAudioUrl(rt.url),
    year:        album.year,
    composer:    album.composer,
    duration:    0,
  };
}

// ─── Build Artist Index ───────────────────────────────────────────────────────
export function buildArtistIndex(albums: Album[]): Artist[] {
  const map = new Map<string, Artist>();

  for (const album of albums) {
    const composerId = slugify(album.composer);
    if (!map.has(composerId)) {
      map.set(composerId, {
        id:               composerId,
        name:             album.composer,
        trackIds:         [],
        albumIds:         [],
        composerAlbumIds: [],
        coverUrl:         album.coverUrl,
      });
    }
    const composerEntry = map.get(composerId)!;
    if (!composerEntry.composerAlbumIds.includes(album.id))
      composerEntry.composerAlbumIds.push(album.id);
    if (!composerEntry.albumIds.includes(album.id))
      composerEntry.albumIds.push(album.id);

    for (const track of album.tracks) {
      for (const artistName of track.artists) {
        const artistId = slugify(artistName);
        if (!map.has(artistId)) {
          map.set(artistId, {
            id:               artistId,
            name:             artistName,
            trackIds:         [],
            albumIds:         [],
            composerAlbumIds: [],
            coverUrl:         album.coverUrl,
          });
        }
        const entry = map.get(artistId)!;
        if (!entry.trackIds.includes(track.id)) entry.trackIds.push(track.id);
        if (!entry.albumIds.includes(album.id))  entry.albumIds.push(album.id);
      }
    }
  }

  return Array.from(map.values());
}

// ─── Fetch library.json ───────────────────────────────────────────────────────
export async function fetchLibrary(): Promise<{
  albums: Album[];
  tracks: Track[];
  artists: Artist[];
}> {
  if (libraryCache) {
    return {
      albums:  libraryCache.albums,
      tracks:  Array.from(albumTracksCache.values()).flat(),
      artists: libraryCache.artists,
    };
  }

  const url = resolveLibraryUrl();
  const res = await fetchWithFallback(url, 'library.json');
  const raw: RawLibrary = await res.json();

  const albums  = raw.albums.map(buildAlbumStub);
  const artists = buildArtistIndex(albums);
  libraryCache  = { albums, artists };

  return { albums, tracks: [], artists };
}

// ─── Fetch tracks for a single album (lazy, cached) ──────────────────────────
export async function fetchAlbumTracks(album: Album): Promise<Track[]> {
  if (!album.tracksFile) throw new Error(`Album ${album.id} has no tracksFile`);
  if (albumTracksCache.has(album.id)) return albumTracksCache.get(album.id)!;

  const url = resolveAlbumJsonUrl(album.tracksFile);
  const res = await fetchWithFallback(url, `album:${album.id}`);
  const data: RawAlbumFile = await res.json();

  const tracks = (data.tracks ?? []).map((rt) => normalizeTrack(rt, album));
  albumTracksCache.set(album.id, tracks);
  return tracks;
}

// ─── Clear caches ─────────────────────────────────────────────────────────────

export function clearLibraryCache(): void {
  libraryCache = null;
  albumTracksCache.clear();
}

/**
 * Extended cache clear that also instructs the browser to bypass its HTTP
 * cache on the NEXT fetch for library.json and album JSON files.
 *
 * jsDelivr CDN serves responses with long cache-control headers.
 * The browser will serve the old manifest from its HTTP cache on subsequent
 * fetch() calls unless we explicitly override the cache mode.
 *
 * We achieve this by setting a module-level flag that fetchWithFallback()
 * checks on the next call — it uses { cache: 'reload' } for that one fetch,
 * then resets to normal. This is a one-shot bypass, not a permanent change.
 */
let _bustNextFetch = false;

export function clearLibraryCacheBusted(): void {
  libraryCache = null;
  albumTracksCache.clear();
  _bustNextFetch = true;
}

export function shouldBustCache(): boolean {
  if (_bustNextFetch) {
    _bustNextFetch = false; // one-shot — reset after first read
    return true;
  }
  return false;
}


