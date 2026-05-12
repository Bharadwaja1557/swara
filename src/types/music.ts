// ─── Music Domain Types ───────────────────────────────────────────────────────

/**
 * A single playable track.
 */
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  duration: number; // seconds
  coverUrl: string;
  year: number;
  genre?: string;
  playCount?: number;
}

/**
 * An album / release.
 */
export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
  trackCount: number;
  genre?: string;
}

/**
 * A curated quick-pick playlist shown on the home screen.
 */
export interface QuickPick {
  id: string;
  title: string;
  subtitle: string;
  /** 1–4 cover URLs used for a mosaic thumbnail */
  coverUrls: string[];
  trackCount: number;
  accentColor: string; // CSS color for decorative accents
}

/**
 * Navigation tab identifiers.
 */
export type NavTab = 'home' | 'search' | 'library';
