// ─── Core Domain Types ─────────────────────────────────────────────────────

export interface Track {
  id: string;          // "{albumId}:{trackNumber}"
  albumId: string;
  trackNumber: number;
  title: string;
  artists: string[];   // parsed from filename
  artistsDisplay: string; // "Arijit Singh, Shreya Ghoshal"
  streamUrl: string;   // direct .m4a URL
  duration?: number;   // seconds, loaded from audio element
  albumTitle?: string; // denormalized for player display
  albumCover?: string; // denormalized for player display
}

export interface Album {
  id: string;           // GitHub release tag
  title: string;
  coverUrl: string;
  year?: string;
  trackCount: number;
  metaUrl: string;      // URL to per-album JSON
  primaryArtist?: string;
  genre?: string;
}

export interface AlbumDetail extends Album {
  tracks: Track[];
  description?: string;
}

// ─── JSON Schema Types (as stored in CDN) ──────────────────────────────────

export interface AlbumsJson {
  generated: string;    // ISO timestamp
  repo: string;
  albums: AlbumJsonEntry[];
}

export interface AlbumJsonEntry {
  id: string;
  title: string;
  coverUrl: string;
  year?: string;
  trackCount: number;
  metaUrl: string;
  primaryArtist?: string;
  genre?: string;
}

export interface AlbumMetaJson {
  id: string;
  title: string;
  coverUrl: string;
  year?: string;
  primaryArtist?: string;
  genre?: string;
  description?: string;
  tracks: TrackJsonEntry[];
}

export interface TrackJsonEntry {
  trackNumber: number;
  filename: string;    // raw filename without extension
  title: string;
  artists: string[];
  artistsDisplay: string;
  streamUrl: string;
}

// ─── Player Types ───────────────────────────────────────────────────────────

export type RepeatMode = 'off' | 'one' | 'all';

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  originalQueue: Track[];  // for un-shuffle
  queueIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  currentTime: number;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  isFullPlayerOpen: boolean;
  volume: number;
}

export interface PlayerActions {
  playTrack: (track: Track, queue?: Track[]) => void;
  playAlbum: (tracks: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleFullPlayer: () => void;
  setDuration: (d: number) => void;
  setCurrentTime: (t: number) => void;
  setIsPlaying: (v: boolean) => void;
  setIsLoading: (v: boolean) => void;
}

// ─── Library Types ──────────────────────────────────────────────────────────

export interface LibraryState {
  albums: Album[];
  albumDetails: Record<string, AlbumDetail>;
  isLoadingAlbums: boolean;
  isLoadingDetail: Record<string, boolean>;
  error: string | null;
  likedTrackIds: Set<string>;
  recentlyPlayed: Track[];
  searchQuery: string;
}

export interface LibraryActions {
  fetchAlbums: () => Promise<void>;
  fetchAlbumDetail: (albumId: string) => Promise<AlbumDetail>;
  toggleLike: (trackId: string) => void;
  isLiked: (trackId: string) => boolean;
  addRecentlyPlayed: (track: Track) => void;
  setSearchQuery: (q: string) => void;
}

// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface AuthState {
  isUnlocked: boolean;
  unlock: (passphrase: string) => Promise<boolean>;
  lock: () => void;
}

// ─── Utility Types ──────────────────────────────────────────────────────────

export interface ParsedFilename {
  trackNumber: number;
  artists: string[];
  artistsDisplay: string;
  title: string;
}
