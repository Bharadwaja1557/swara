/**
 * src/features/playlists/coverRegistry.ts
 *
 * Single source of truth for all built-in playlist cover assets.
 *
 * ARCHITECTURE:
 *   Covers are static SVG files served from /public/playlist-covers/.
 *   No JSX rendering, no inline SVG, no CSS generation.
 *   All consumers reference covers via coverId key → resolved URL.
 *
 * ADDING A NEW COVER:
 *   1. Drop the SVG into /public/playlist-covers/<id>.svg
 *   2. Add one entry to PLAYLIST_COVERS below.
 *   That's it — all render paths inherit it automatically.
 *
 * COVER RESOLUTION ORDER (used by PlaylistCover component):
 *   1. coverImageUrl  — user-uploaded custom image (future)
 *   2. coverId        — built-in SVG asset
 *   3. default placeholder
 */

export interface PlaylistCoverMeta {
  /** Stable identifier stored in DB / localStorage. */
  id:    string;
  /** Human-readable label shown in the picker UI. */
  label: string;
  /** Absolute path served from /public — used directly as <img src>. */
  url:   string;
}

export const PLAYLIST_COVERS: PlaylistCoverMeta[] = [
  { id: 'aurora',   label: 'Aurora',   url: '/playlist-covers/aurora.svg'   },
  { id: 'pulse',    label: 'Pulse',    url: '/playlist-covers/pulse.svg'    },
  { id: 'gridflow', label: 'Gridflow', url: '/playlist-covers/gridflow.svg' },
  { id: 'eclipse',  label: 'Eclipse',  url: '/playlist-covers/eclipse.svg'  },
  { id: 'wavecore', label: 'Wavecore', url: '/playlist-covers/wavecore.svg' },
];

/**
 * Resolve a coverId to its static asset URL.
 * Returns undefined if the coverId is not in the registry.
 */
export function resolveCoverUrl(coverId: string | undefined): string | undefined {
  if (!coverId) return undefined;
  return PLAYLIST_COVERS.find((c) => c.id === coverId)?.url;
}
