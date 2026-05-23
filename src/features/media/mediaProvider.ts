/**
 * src/features/media/mediaProvider.ts
 *
 * ════════════════════════════════════════════════════════
 * MEDIA DELIVERY ARCHITECTURE
 * ════════════════════════════════════════════════════════
 *
 * Storage layer:  GitHub Releases / GitHub repository
 *   → gajala-sonic-solutions/m4a-db
 *   → contains library.json, album JSON files, audio .m4a files, cover images
 *   → GitHub is the FREE zero-cost storage backend — never changes
 *
 * Delivery layer: jsDelivr CDN  ← active provider
 *   → https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}
 *   → jsDelivr mirrors GitHub content at its global edge network
 *   → This is the URL the browser actually fetches
 *
 * ════════════════════════════════════════════════════════
 * WHY JSDELIVR INSTEAD OF DIRECT GITHUB URLS
 * ════════════════════════════════════════════════════════
 *
 * Direct raw.githubusercontent.com problems:
 *   1. Listed in EasyPrivacy and uBlock Origin default lists → ERR_BLOCKED_BY_CLIENT
 *   2. No Accept-Ranges header → browser cannot seek/scrub audio
 *   3. No global edge caching → high latency outside US
 *   4. Rate-limited per IP → large libraries hit limits
 *   5. Content-Type for .m4a is inconsistent → MEDIA_ELEMENT_ERROR: Format error
 *
 * Direct GitHub Releases (github.com/releases/download) problems:
 *   1. 2–4 HTTP redirects before reaching actual bytes → slow first byte
 *   2. Final redirect target is a short-lived signed URL → seek after pause fails
 *   3. github.com matched by Brave Shields and some corporate firewalls
 *   4. Inconsistent CORS headers across redirect chain
 *
 * jsDelivr advantages:
 *   ✓ NOT on any major ad-blocker list (it's a legitimate OSS CDN)
 *   ✓ Serves Accept-Ranges: bytes → full audio seeking/scrubbing works
 *   ✓ Returns correct Content-Type: audio/mp4 for .m4a files
 *   ✓ 100+ global PoPs → low latency worldwide
 *   ✓ Free for open-source repos, no rate limits for reasonable traffic
 *   ✓ Stable URLs — no signed URL expiry
 *   ✓ Proper CORS headers (Access-Control-Allow-Origin: *)
 *
 * ════════════════════════════════════════════════════════
 * URL REWRITING
 * ════════════════════════════════════════════════════════
 *
 * The asset DB (library.json, album JSON files) may store absolute
 * raw.githubusercontent.com URLs in the `url` and `cover` fields.
 * resolveAudioUrl() and resolveCoverUrl() rewrite these to jsDelivr
 * URLs so delivery always goes through the CDN, even for pre-existing
 * absolute URLs in the data.
 *
 * Rewrite rule:
 *   https://raw.githubusercontent.com/{org}/{repo}/{ref}/{path}
 *   → https://cdn.jsdelivr.net/gh/{org}/{repo}@{ref}/{path}
 *
 * ════════════════════════════════════════════════════════
 * FUTURE PROVIDER MIGRATION
 * ════════════════════════════════════════════════════════
 *
 * To switch provider (e.g. to a custom CDN):
 *   1. Change ACTIVE_PROVIDER constant below
 *   2. Add a new base-URL builder function
 *   3. Update rewriteGithubUrl() if needed
 *   That is the complete change — no other file needs modification.
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
