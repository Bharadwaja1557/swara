import type { Album, AlbumDetail, AlbumMetaJson, AlbumsJson, Track } from '@/types';
import { ALBUMS_JSON_URL } from './constants';
import { parseFilename, buildTrackId } from './parseFilename';

// ─── In-memory cache ────────────────────────────────────────────────────────

const albumsCache: { data: Album[] | null; fetchedAt: number } = {
  data: null,
  fetchedAt: 0,
};

const albumDetailCache: Record<string, AlbumDetail> = {};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Album List ─────────────────────────────────────────────────────────────

export async function fetchAlbums(): Promise<Album[]> {
  const now = Date.now();
  if (albumsCache.data && now - albumsCache.fetchedAt < CACHE_TTL) {
    return albumsCache.data;
  }

  const res = await fetch(ALBUMS_JSON_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch albums.json: ${res.status}`);

  const json: AlbumsJson = await res.json();

  const albums: Album[] = json.albums.map((entry) => ({
    id: entry.id,
    title: entry.title,
    coverUrl: entry.coverUrl,
    year: entry.year,
    trackCount: entry.trackCount,
    metaUrl: entry.metaUrl,
    primaryArtist: entry.primaryArtist,
    genre: entry.genre,
  }));

  albumsCache.data = albums;
  albumsCache.fetchedAt = now;

  return albums;
}

// ─── Album Detail ────────────────────────────────────────────────────────────

export async function fetchAlbumDetail(album: Album): Promise<AlbumDetail> {
  if (albumDetailCache[album.id]) {
    return albumDetailCache[album.id];
  }

  const res = await fetch(album.metaUrl, { cache: 'no-store' });
  if (!res.ok)
    throw new Error(`Failed to fetch album metadata for "${album.id}": ${res.status}`);

  const json: AlbumMetaJson = await res.json();

  const tracks: Track[] = json.tracks.map((t) => ({
    id: buildTrackId(album.id, t.trackNumber),
    albumId: album.id,
    trackNumber: t.trackNumber,
    title: t.title,
    artists: t.artists,
    artistsDisplay: t.artistsDisplay,
    streamUrl: t.streamUrl,
    albumTitle: json.title,
    albumCover: json.coverUrl,
  }));

  const detail: AlbumDetail = {
    id: json.id,
    title: json.title,
    coverUrl: json.coverUrl,
    year: json.year,
    trackCount: tracks.length,
    metaUrl: album.metaUrl,
    primaryArtist: json.primaryArtist,
    genre: json.genre,
    description: json.description,
    tracks,
  };

  albumDetailCache[album.id] = detail;
  return detail;
}

// ─── Static params helper (used by Next.js generateStaticParams) ─────────────

export async function getStaticAlbumIds(): Promise<string[]> {
  try {
    const albums = await fetchAlbums();
    return albums.map((a) => a.id);
  } catch (err) {
    console.warn('[swara] Could not pre-fetch album IDs for static generation:', err);
    return [];
  }
}

// ─── Parse raw filename into Track (helper for metadata generator) ───────────

export function filenameToTrack(
  filename: string,
  albumId: string,
  albumTitle: string,
  albumCover: string,
  releaseTag: string,
  repo: string,
): Track {
  const parsed = parseFilename(filename);
  const streamUrl = `https://github.com/${repo}/releases/download/${releaseTag}/${filename}`;

  return {
    id: buildTrackId(albumId, parsed.trackNumber),
    albumId,
    trackNumber: parsed.trackNumber,
    title: parsed.title,
    artists: parsed.artists,
    artistsDisplay: parsed.artistsDisplay,
    streamUrl,
    albumTitle,
    albumCover,
  };
}
