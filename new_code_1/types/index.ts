// ─── Core Domain Types ────────────────────────────────────────────────────────

/**
 * Represents a single track/song
 */
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string; // formatted: "3:45"
  coverSeed: string; // picsum.photos seed for deterministic artwork
}

/**
 * Represents an album
 */
export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: string;
  coverSeed: string;
}

/**
 * Quick pick playlist shortcuts shown on Home
 */
export interface QuickPick {
  id: string;
  title: string;
  subtitle: string;
  songCount: number;
  iconType: "shuffle" | "chart-bar" | "bolt";
  accentClass: string; // Tailwind CSS color class for the accent strip
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type NavTab = "home" | "search" | "library";

export interface NavItemConfig {
  tab: NavTab;
  label: string;
  href: string;
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface ExploreAlbumsState {
  /** Indices into the ALBUMS array – 4 are displayed at once */
  selectedIndices: number[];
}
