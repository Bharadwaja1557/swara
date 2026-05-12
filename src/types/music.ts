// ─── Music Domain Types ───────────────────────────────────────────────────────

/**
 * A single playable track — normalized from library.json
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
 */
export interface Album {
  id: string;
  title: string;
  composer: string;
  year: number;
  coverUrl: string;
  tracks: Track[];
  trackCount: number;
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
 * Raw library.json track shape
 */
export interface RawLibraryTrack {
  track: number;
  title: string;
  artists: string[];
  url: string;
}

/**
 * Raw library.json album shape
 */
export interface RawLibraryAlbum {
  id: string;
  title: string;
  composer: string;
  year: number;
  cover: string;
  tracks: RawLibraryTrack[];
}

/**
 * Raw library.json root shape
 */
export interface RawLibrary {
  generatedAt: string;
  albums: RawLibraryAlbum[];
}

/**
 * Repeat mode
 */
export type RepeatMode = 'off' | 'all' | 'one';
