// ─── Music DB Config ────────────────────────────────────────────────────────

export const MUSIC_DB_REPO =
  process.env.NEXT_PUBLIC_MUSIC_DB_REPO || 'gajala-sonic-solutions/m4a-db';

// jsDelivr CDN for repo files (JSON metadata, not release assets)
export const CDN_BASE = `https://cdn.jsdelivr.net/gh/${MUSIC_DB_REPO}@main`;

// GitHub Releases base URL (direct download, no CDN)
export const RELEASES_BASE = `https://github.com/${MUSIC_DB_REPO}/releases/download`;

// Albums index JSON — served via jsDelivr for fast, cached delivery
export const ALBUMS_JSON_URL = `${CDN_BASE}/data/albums.json`;

// ─── Storage Keys ───────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  AUTH_UNLOCKED: 'swara:unlocked',
  LIKED_TRACKS: 'swara:liked',
  RECENTLY_PLAYED: 'swara:recent',
  VOLUME: 'swara:volume',
} as const;

// ─── Player Config ──────────────────────────────────────────────────────────

export const MAX_RECENTLY_PLAYED = 30;
export const DEFAULT_VOLUME = 1.0;

// ─── Passphrase ─────────────────────────────────────────────────────────────

// SHA-256 hex of passphrase — set NEXT_PUBLIC_PASSPHRASE_HASH in .env.local
export const PASSPHRASE_HASH =
  process.env.NEXT_PUBLIC_PASSPHRASE_HASH ||
  'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';

// ─── App Config ─────────────────────────────────────────────────────────────

export const APP_NAME = 'Swara';
export const APP_DESCRIPTION = 'Your personal music space';
