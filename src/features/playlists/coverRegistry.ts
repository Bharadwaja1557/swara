/**
 * src/features/playlists/coverRegistry.ts
 *
 * Single source of truth for all built-in playlist cover assets.
 *
 * BASE_URL FIX:
 *   Vite replaces `import.meta.env.BASE_URL` at build time with the value
 *   of the `base` option in vite.config.ts.
 *
 *   Local dev  → base = '/'  → BASE_URL = '/'   → '/playlist-covers/pulse.svg'
 *   GitHub Pages → base = '/swara/' → BASE_URL = '/swara/' → '/swara/playlist-covers/pulse.svg'
 *   Custom domain → base = '/' → BASE_URL = '/'  → '/playlist-covers/pulse.svg'
 *
 *   Hardcoding '/playlist-covers/...' always resolves from the origin root,
 *   which on GitHub Pages is https://bharadwaja1557.github.io/ — missing the
 *   /swara/ repo sub-path and causing 404s. BASE_URL is the correct fix
 *   because it is set by the build config, not the runtime environment.
 *
 * NOTE: BASE_URL always ends with '/'. Joining as `${BASE}playlist-covers/...`
 *   (no leading slash on the second segment) produces a correct path regardless
 *   of whether BASE is '/' or '/swara/'.
 *
 * ADDING A NEW COVER:
 *   1. Drop the SVG into /public/playlist-covers/<id>.svg
 *   2. Add one entry to PLAYLIST_COVERS below.
 *   Everything else inherits it automatically.
 */

const BASE = import.meta.env.BASE_URL;

export interface PlaylistCoverMeta {
  /** Stable identifier stored in DB / localStorage. */
  id:    string;
  /** Human-readable label shown in the picker UI. */
  label: string;
  /** Fully resolved URL including Vite base path — safe for <img src>. */
  url:   string;
}

export const PLAYLIST_COVERS: PlaylistCoverMeta[] = [
  { id: 'aurora',   label: 'Aurora',   url: `${BASE}playlist-covers/aurora.svg`   },
  { id: 'pulse',    label: 'Pulse',    url: `${BASE}playlist-covers/pulse.svg`    },
  { id: 'gridflow', label: 'Gridflow', url: `${BASE}playlist-covers/gridflow.svg` },
  { id: 'eclipse',  label: 'Eclipse',  url: `${BASE}playlist-covers/eclipse.svg`  },
  { id: 'wavecore', label: 'Wavecore', url: `${BASE}playlist-covers/wavecore.svg` },
];

/**
 * Resolve a coverId to its static asset URL (including Vite base path).
 * Returns undefined if the coverId is not in the registry.
 * This is the single call-site for all cover URL resolution — never construct
 * playlist cover paths manually anywhere else in the codebase.
 */
export function resolveCoverUrl(coverId: string | undefined): string | undefined {
  if (!coverId) return undefined;
  return PLAYLIST_COVERS.find((c) => c.id === coverId)?.url;
}
