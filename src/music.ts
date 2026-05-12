export interface Track {
  id: string;
  title: string;
  artists: string[];
  artist: string;
  album: string;
  albumId: string;
  trackNumber: number;
  coverUrl: string;
  streamUrl: string;
  year: number;
  composer: string;
  duration: number;
}

export interface Album {
  id: string;
  title: string;
  composer: string;
  year: number;
  coverUrl: string;
  tracks: Track[];
  trackCount: number;
  tracksFile?: string;
}

export interface Artist {
  id: string;
  name: string;
  trackIds: string[];
  albumIds: string[];
  composerAlbumIds: string[];
  coverUrl: string;
}

export interface QuickPick {
  id: string;
  title: string;
  subtitle: string;
  coverUrls: string[];
  trackCount: number;
  accentColor: string;
}

export type NavTab = 'home' | 'search' | 'library';

export interface RawTrack {
  track: number;
  title: string;
  artists: string[];
  url: string;
  duration?: number;
}

export interface RawLibraryAlbum {
  id: string;
  artist: string;
  title: string;
  year: number;
  cover: string;
  tracksFile: string;
}

export interface RawAlbumData {
  tracks: RawTrack[];
}

export interface RawLibrary {
  albums: RawLibraryAlbum[];
}

export type RepeatMode = 'off' | 'all' | 'one';
