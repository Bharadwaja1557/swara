// ─── Music Domain Types ───────────────────────────────────────────────────────

/**
 * A single playable track — normalized from album JSON
 */
export interface Track {
  id: string;
  title: string;
  artists: string[];        // array of artists
  artist: string;           // joined string for display
  album: string;
  albumId: string;
  trackNumber: number;
  coverUrl: string;
  streamUrl: string;
  year: number;
  composer: string;
  duration: number;         // filled in after audio loads, 0 initially
}

/**
 * An album / release — normalized from library.json
 * tracksFile is preserved for lazy loading of tracks
 */
export interface Album {
  id: string;
  title: string;
  composer: string;
  year: number;
  coverUrl: string;
  tracks: Track[];
  trackCount: number;
  tracksFile?: string;      // path relative to repo root, used for lazy loading
}

/**
 * An artist entity — derived from the library
 */
export interface Artist {
  id: string;               // slugified name
  name: string;
  trackIds: string[];
  albumIds: string[];       // albums where they appear
  composerAlbumIds: string[]; // albums where they are the composer
  coverUrl: string;         // taken from first album cover
}

/**
 * A curated quick-pick playlist shown on the home screen.
 */
export interface QuickPick {
  id: string;
  title: string;
  subtitle: string;
  coverUrls: string[];
  trackCount: number;
  accentColor: string;
}

/**
 * Navigation tab identifiers.
 */
export type NavTab = 'home' | 'search' | 'library';

/**
 * Raw track shape inside an album JSON file (albums/*.json)
 */
export interface RawLibraryTrack {
  track: number;
  title: string;
  artists: string[];
  url: string;
}

/**
 * Raw album shape inside library.json
 * Note: `artist` (not `composer`) and `tracksFile` instead of embedded tracks
 */
export interface RawLibraryAlbum {
  id: string;
  title: string;
  artist: string;           // may contain underscores e.g. "Shashwat_Sachdev"
  year: number;
  cover: string;
  tracksFile: string;       // relative path e.g. "albums/SS-Dhurandhar-2025.json"
}

/**
 * Raw library.json root shape (from m4a-db)
 */
export interface RawLibrary {
  albums: RawLibraryAlbum[];
}

/**
 * Raw album file shape (albums/*.json from m4a-db)
 */
export interface RawAlbumFile {
  tracks: RawLibraryTrack[];
}

/**
 * Repeat mode
 */
export type RepeatMode = 'off' | 'all' | 'one';
