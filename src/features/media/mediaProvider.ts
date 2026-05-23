/**
 * src/features/media/mediaProvider.ts
 *
 * Swappable media delivery provider.
 *
 * ALL GitHub asset URLs are constructed here — this is the ONLY file
 * that knows about raw.githubusercontent.com or release download paths.
 * A CDN migration changes only this file.
 *
 * ── Provider types ────────────────────────────────────────────────────────────
 *   github-raw      raw.githubusercontent.com (current, default)
 *   github-release  github.com/…/releases/download/… (via redirect)
 *   future-cdn      placeholder for future migration
 *
 * ── Why GitHub Releases are fragile for streaming ────────────────────────────
 *   1. Multiple HTTP redirects (302 → 302 → S3/Azure blob)
 *   2. The final redirect target uses a short-lived signed URL
 *   3. Privacy extensions (uBlock, Brave) block github.com release URLs
 *      because they appear in EasyPrivacy and similar block lists
 *   4. CORS headers on redirected responses are inconsistent across browsers
 *   5. Some CDN edges return wrong Content-Type for .m4a files
 *
 * ── Why raw.githubusercontent.com is also fragile ────────────────────────────
 *   1. Also appears in many ad-blocker lists as a "tracking" host
 *   2. No streaming-optimised headers (no Accept-Ranges)
 *   3. Rate-limited per IP — large libraries can hit limits
 *
 * ── Future CDN recommendation ─────────────────────────────────────────────────
 *   jsDelivr (https://cdn.jsdelivr.net/gh/org/repo@main/path) is NOT blocked
 *   by most ad blockers, serves proper CORS headers, and provides global edge
 *   caching. Migration = change PROVIDER to 'jsDelivr' and add the branch below.
 *   jsDelivr GitHub CDN: https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}
 */

export type MediaProviderName =
  | 'github-raw'
  | 'github-release'
  | 'future-cdn';

// ── Configuration ─────────────────────────────────────────────────────────────

const GITHUB_ORG  = 'gajala-sonic-solutions';
const GITHUB_REPO = 'm4a-db';
const GITHUB_REF  = 'main';

/**
 * Active provider — change this one constant to migrate the entire app.
 * 'github-raw' = current behaviour (raw.githubusercontent.com).
 */
const ACTIVE_PROVIDER: MediaProviderName = 'github-raw';

// ── Base URL builders ─────────────────────────────────────────────────────────

function githubRawBase(): string {
  return `https://raw.githubusercontent.com/${GITHUB_ORG}/${GITHUB_REPO}/${GITHUB_REF}/`;
}

// jsDelivr CDN — not blocked by most ad blockers, proper CORS, global edge cache
// Uncomment when ready to migrate:
// function jsDelivrBase(): string {
//   return `https://cdn.jsdelivr.net/gh/${GITHUB_ORG}/${GITHUB_REPO}@${GITHUB_REF}/`;
// }

function getBase(): string {
  switch (ACTIVE_PROVIDER) {
    case 'github-raw':
    // case 'future-cdn': return jsDelivrBase();
    default:
      return githubRawBase();
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

const BASE = getBase();

/**
 * Resolve the URL for the main library manifest (library.json).
 */
export function resolveLibraryUrl(): string {
  return `${BASE}library.json`;
}

/**
 * Resolve the URL for an album's track list JSON.
 * @param tracksFile  e.g. "albums/SS-Dhurandhar-2025.json"
 */
export function resolveAlbumJsonUrl(tracksFile: string): string {
  return `${BASE}${tracksFile}`;
}

/**
 * Resolve an audio stream URL.
 * The raw url from the DB may already be absolute — if so, return as-is.
 * If relative, prefix with the provider base.
 */
export function resolveAudioUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE}${url}`;
}

/**
 * Resolve a cover image URL.
 * Same logic: absolute URLs pass through; relative paths get the provider base.
 */
export function resolveCoverUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE}${url}`;
}

/**
 * Expose the active provider name for diagnostics / logging.
 */
export { ACTIVE_PROVIDER };
