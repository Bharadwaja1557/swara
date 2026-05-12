import type {
  RawLibrary,
  RawLibraryAlbum,
  RawLibraryTrack,
  RawAlbumFile,
  Track,
  Album,
  Artist,
} from '@/types/music';

// ─── Constants ────────────────────────────────────────────────────────────────
const REPO_BASE =
  'https://raw.githubusercontent.com/gajala-sonic-solutions/m4a-db/main/';
const LIBRARY_URL = `${REPO_BASE}library.json`;

// ─── In-memory caches ─────────────────────────────────────────────────────────
let libraryCache: { albums: Album[]; artists: Artist[] } | null = null;
// albumId → Track[]
const albumTracksCache = new Map<string, Track[]>();

// ─── Slugify ──────────────────────────────────────────────────────────────────
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Normalize artist name (replace underscores with spaces) ──────────────────
function normalizeArtistName(name: string): string {
  return name.replace(/_/g, ' ');
}

// ─── Build Album stub from raw library entry ──────────────────────────────────
function buildAlbumStub(raw: RawLibraryAlbum): Album {
  return {
    id: raw.id,
    title: raw.title,
    composer: normalizeArtistName(raw.artist),
    year: raw.year,
    coverUrl: raw.cover,
    tracks: [],
    trackCount: 0,        // updated after tracks are fetched
    tracksFile: raw.tracksFile,
  };
}

// ─── Normalize a raw track into a Track ───────────────────────────────────────
function normalizeTrack(rt: RawLibraryTrack, album: Album): Track {
  return {
    id: `${album.id}--${rt.track}`,
    title: rt.title,
    artists: rt.artists,
    artist: rt.artists.join(', '),
    album: album.title,
    albumId: album.id,
    trackNumber: rt.track,
    coverUrl: album.coverUrl,
    streamUrl: rt.url,
    year: album.year,
    composer: album.composer,
    duration: 0,
  };
}

// ─── Build Artist Index ───────────────────────────────────────────────────────
export function buildArtistIndex(albums: Album[]): Artist[] {
  const map = new Map<string, Artist>();

  for (const album of albums) {
    // Register composer as an artist
    const composerId = slugify(album.composer);
    if (!map.has(composerId)) {
      map.set(composerId, {
        id: composerId,
        name: album.composer,
        trackIds: [],
        albumIds: [],
        composerAlbumIds: [],
        coverUrl: album.coverUrl,
      });
    }
    const composerEntry = map.get(composerId)!;
    if (!composerEntry.composerAlbumIds.includes(album.id)) {
      composerEntry.composerAlbumIds.push(album.id);
    }
    if (!composerEntry.albumIds.includes(album.id)) {
      composerEntry.albumIds.push(album.id);
    }

    for (const track of album.tracks) {
      for (const artistName of track.artists) {
        const artistId = slugify(artistName);
        if (!map.has(artistId)) {
          map.set(artistId, {
            id: artistId,
            name: artistName,
            trackIds: [],
            albumIds: [],
            composerAlbumIds: [],
            coverUrl: album.coverUrl,
          });
        }
        const entry = map.get(artistId)!;
        if (!entry.trackIds.includes(track.id)) entry.trackIds.push(track.id);
        if (!entry.albumIds.includes(album.id)) entry.albumIds.push(album.id);
      }
    }
  }

  return Array.from(map.values());
}

// ─── Fetch library.json → Album stubs (no tracks yet) ────────────────────────
export async function fetchLibrary(): Promise<{
  albums: Album[];
  tracks: Track[];
  artists: Artist[];
}> {
  // Return from cache if available
  if (libraryCache) {
    const cachedTracks = Array.from(albumTracksCache.values()).flat();
    return {
      albums: libraryCache.albums,
      tracks: cachedTracks,
      artists: libraryCache.artists,
    };
  }

  const res = await fetch(LIBRARY_URL);
  if (!res.ok) throw new Error('Unable to load music library');

  const raw: RawLibrary = await res.json();
  const albums = raw.albums.map(buildAlbumStub);
  const artists = buildArtistIndex(albums);

  libraryCache = { albums, artists };

  return { albums, tracks: [], artists };
}

// ─── Fetch tracks for a single album (lazy, cached) ──────────────────────────
export async function fetchAlbumTracks(album: Album): Promise<Track[]> {
  if (!album.tracksFile) {
    throw new Error(`Album ${album.id} has no tracksFile`);
  }

  // Return from cache
  if (albumTracksCache.has(album.id)) {
    return albumTracksCache.get(album.id)!;
  }

  const url = `${REPO_BASE}${album.tracksFile}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load tracks for "${album.title}": ${res.status}`);
  }

  const data: RawAlbumFile = await res.json();
  const tracks = (data.tracks ?? []).map((rt) => normalizeTrack(rt, album));

  albumTracksCache.set(album.id, tracks);
  return tracks;
}

// ─── Clear caches (for testing / forced refresh) ─────────────────────────────
export function clearLibraryCache(): void {
  libraryCache = null;
  albumTracksCache.clear();
}
