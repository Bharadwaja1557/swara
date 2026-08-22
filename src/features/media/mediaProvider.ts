/**
 * src/features/media/mediaProvider.ts
 * Audio and cover assets are served directly from GitHub Release downloads;
 * jsDelivr serves only the two JSON manifests and cannot serve Release assets.
 * ACTIVE_PROVIDER exists so the origin can be swapped for real object storage.
 */

export type MediaProviderName = 'jsdelivr' | 'github-raw';

// ── Repository identity (storage layer — never changes) ───────────────────────

const GITHUB_ORG  = 'gajala-sonic-solutions';
const GITHUB_REPO = 'm4a-db';
const GITHUB_REF  = 'main';

// ── Active provider ───────────────────────────────────────────────────────────

/**
 * Change this ONE constant to switch the entire delivery layer.
 * 'jsdelivr' = CDN delivery via cdn.jsdelivr.net (recommended, active).
 * 'github-raw' = direct raw.githubusercontent.com (fallback for debugging).
 */
const ACTIVE_PROVIDER: MediaProviderName = 'jsdelivr';
export { ACTIVE_PROVIDER };

// ── Base URL builders ─────────────────────────────────────────────────────────

function jsDelivrBase(): string {
  // jsDelivr GitHub CDN format: https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/
  // Note: @ref can be a branch name, tag, or commit SHA.
  // Using 'main' means latest commit on main — content is cached per commit by jsDelivr.
  return `https://cdn.jsdelivr.net/gh/${GITHUB_ORG}/${GITHUB_REPO}@${GITHUB_REF}/`;
}

function githubRawBase(): string {
  return `https://raw.githubusercontent.com/${GITHUB_ORG}/${GITHUB_REPO}/${GITHUB_REF}/`;
}

function getBase(): string {
  switch (ACTIVE_PROVIDER) {
    case 'jsdelivr':   return jsDelivrBase();
    case 'github-raw': return githubRawBase();
    default:           return jsDelivrBase();
  }
}

const BASE = getBase();

// ── GitHub URL rewriter ───────────────────────────────────────────────────────

/**
 * Rewrite any absolute raw.githubusercontent.com URL for this repo to the
 * active provider URL. This handles asset DB entries that store absolute URLs.
 *
 * Non-GitHub URLs and URLs from other repos pass through unchanged.
 */
function rewriteGithubUrl(url: string): string {
  if (!url) return url;

  // raw.githubusercontent.com/{org}/{repo}/{ref}/{path} → BASE{path}
  const rawPrefix = `https://raw.githubusercontent.com/${GITHUB_ORG}/${GITHUB_REPO}/${GITHUB_REF}/`;
  if (url.startsWith(rawPrefix)) {
    return `${BASE}${url.slice(rawPrefix.length)}`;
  }

  // Already a jsDelivr URL for this repo — return as-is (idempotent)
  const jsDelivrPrefix = `https://cdn.jsdelivr.net/gh/${GITHUB_ORG}/${GITHUB_REPO}@${GITHUB_REF}/`;
  if (url.startsWith(jsDelivrPrefix)) {
    return ACTIVE_PROVIDER === 'jsdelivr' ? url : `${BASE}${url.slice(jsDelivrPrefix.length)}`;
  }

  return url; // external URL — leave unchanged
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * URL for the main library manifest.
 */
export function resolveLibraryUrl(): string {
  return `${BASE}library.json`;
}

/**
 * URL for an album's track list JSON.
 * @param tracksFile  Relative path e.g. "albums/SS-Dhurandhar-2025.json"
 */
export function resolveAlbumJsonUrl(tracksFile: string): string {
  return `${BASE}${tracksFile}`;
}

/**
 * Resolve an audio stream URL.
 *
 * Three cases handled:
 *   1. Relative path (e.g. "audio/track.m4a") → prefixed with BASE
 *   2. Absolute GitHub raw URL for this repo   → rewritten to CDN URL
 *   3. Any other absolute URL                  → passed through unchanged
 */
export function resolveAudioUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return rewriteGithubUrl(url);
  }
  return `${BASE}${url}`;
}

/**
 * Resolve a cover image URL.
 * Same three-case logic as resolveAudioUrl.
 */
export function resolveCoverUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return rewriteGithubUrl(url);
  }
  return `${BASE}${url}`;
}
