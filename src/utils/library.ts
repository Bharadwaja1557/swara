import type { RawLibrary, RawLibraryAlbum, Track, Album, Artist } from '@/types/music';

const LIBRARY_URL =
  'https://cdn.jsdelivr.net/gh/gajala-sonic-solutions/m4a-db/generated/library.json';

// ─── Slugify ──────────────────────────────────────────────────────────────────
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Normalize ───────────────────────────────────────────────────────────────
function normalizeAlbum(raw: RawLibraryAlbum): Album {
  const tracks: Track[] = raw.tracks.map((rt) => ({
    id: `${raw.id}--${rt.track}`,
    title: rt.title,
    artists: rt.artists,
    artist: rt.artists.join(', '),
    album: raw.title,
    albumId: raw.id,
    trackNumber: rt.track,
    coverUrl: raw.cover,
    streamUrl: rt.url,
    year: raw.year,
    composer: raw.composer,
    duration: 0,
  }));

  return {
    id: raw.id,
    title: raw.title,
    composer: raw.composer,
    year: raw.year,
    coverUrl: raw.cover,
    tracks,
    trackCount: tracks.length,
  };
}

// ─── Build Artist Index ───────────────────────────────────────────────────────
export function buildArtistIndex(albums: Album[]): Artist[] {
  const map = new Map<string, Artist>();

  for (const album of albums) {
    // Register composer as an artist with composerAlbumIds
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
        if (!entry.trackIds.includes(track.id)) {
          entry.trackIds.push(track.id);
        }
        if (!entry.albumIds.includes(album.id)) {
          entry.albumIds.push(album.id);
        }
      }
    }
  }

  return Array.from(map.values());
}

// ─── Fetch & Parse ───────────────────────────────────────────────────────────
export async function fetchLibrary(): Promise<{
  albums: Album[];
  tracks: Track[];
  artists: Artist[];
}> {
  const res = await fetch(LIBRARY_URL);
  if (!res.ok) throw new Error(`Failed to fetch library: ${res.status}`);
  const raw: RawLibrary = await res.json();

  const albums = raw.albums.map(normalizeAlbum);
  const tracks = albums.flatMap((a) => a.tracks);
  const artists = buildArtistIndex(albums);

  return { albums, tracks, artists };
}
