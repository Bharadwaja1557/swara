import type {
  Album,
  Artist,
  RawAlbumData,
  RawLibrary,
  RawLibraryAlbum,
  Track,
} from '@/types/music';

const BASE_URL =
  'https://raw.githubusercontent.com/gajala-sonic-solutions/m4a-db/main';

const LIBRARY_URL = `${BASE_URL}/library.json`;

let libraryCache: Album[] | null = null;

const albumTracksCache = new Map<string, Track[]>();

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeAlbum(raw: RawLibraryAlbum): Album {
  return {
    id: raw.id,
    title: raw.title,
    composer: raw.artist,
    year: raw.year,
    coverUrl: raw.cover,
    tracks: [],
    trackCount: 0,
    tracksFile: raw.tracksFile,
  };
}

function normalizeTracks(
  album: Album,
  rawTracks: RawAlbumData
): Track[] {
  return rawTracks.tracks.map((track: any) => ({
    id: `${album.id}-${track.track}`,
    title: track.title,
    artists: track.artists,
    artist: track.artists.join(', '),
    album: album.title,
    albumId: album.id,
    trackNumber: track.track,
    coverUrl: album.coverUrl,
    streamUrl: track.url,
    year: album.year,
    composer: album.composer,
    duration: track.duration ?? 0,
  }));
}

export async function fetchLibrary(): Promise<Album[]> {
  if (libraryCache) {
    return libraryCache;
  }

  const response = await fetch(LIBRARY_URL);

  if (!response.ok) {
    throw new Error('Unable to load music library');
  }

  const data: RawLibrary = await response.json();

  libraryCache = data.albums.map(normalizeAlbum);

  return libraryCache ?? [];
}

export async function fetchAlbumTracks(
  album: Album
): Promise<Track[]> {
  if (albumTracksCache.has(album.id)) {
    return albumTracksCache.get(album.id)!;
  }

  if (!album.tracksFile) {
    return [];
  }

  try {
    const response = await fetch(
      `${BASE_URL}/${album.tracksFile}`
    );

    if (!response.ok) {
      throw new Error('Album fetch failed');
    }

    const data: RawAlbumData = await response.json();

    const tracks = normalizeTracks(album, data);

    albumTracksCache.set(album.id, tracks);

    return tracks;
  } catch {
    return [];
  }
}

export function buildArtistIndex(
  albums: Album[]
): Artist[] {
  const map = new Map<string, Artist>();

  albums.forEach((album) => {
    const artistId = slugify(album.composer);

    if (!map.has(artistId)) {
      map.set(artistId, {
        id: artistId,
        name: album.composer,
        trackIds: [],
        albumIds: [],
        composerAlbumIds: [],
        coverUrl: album.coverUrl,
      });
    }

    const artist = map.get(artistId)!;

    if (!artist.albumIds.includes(album.id)) {
      artist.albumIds.push(album.id);
    }

    if (!artist.composerAlbumIds.includes(album.id)) {
      artist.composerAlbumIds.push(album.id);
    }
  });

  return Array.from(map.values());
}