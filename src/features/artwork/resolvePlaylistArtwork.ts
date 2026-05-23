/**
 * src/features/artwork/resolvePlaylistArtwork.ts
 *
 * SINGLE SOURCE OF TRUTH for all playlist cover resolution.
 *
 * ── Priority order ────────────────────────────────────────────────────────────
 *   1. uploaded    — playlist.coverImageUrl is set (custom user upload)
 *   2. preset      — playlist.coverId is set (built-in SVG asset)
 *   3. collage-4   — ≥4 unique track covers → 2×2 grid
 *   4. collage-3   — exactly 3 unique covers → asymmetric (left-large + right-stack)
 *   5. collage-2   — exactly 2 unique covers → vertical split
 *   6. single      — exactly 1 unique cover  → full image
 *   7. placeholder — 0 track covers available
 *
 * ── Determinism guarantee ─────────────────────────────────────────────────────
 *   Covers are selected by iterating playlist.trackIds in their stored order.
 *   Dedup preserves this order — first occurrence wins.
 *   No sorting, no randomisation. Same playlist → same collage on every device.
 *
 * ── Stable artwork key ────────────────────────────────────────────────────────
 *   artworkKey is a stable string consumers can use as a useMemo dependency
 *   instead of the full result object. Key changes only when artwork changes.
 *
 * ── Future extensibility ──────────────────────────────────────────────────────
 *   The PlaylistArtworkResult type is designed to carry future fields without
 *   breaking existing consumers:
 *     dominantColor?  — extracted palette colour for blurred backgrounds
 *     animated?       — animated cover (live album art, etc.)
 *     blurDataUrl?    — low-quality placeholder blur hash
 */

import type { Track }    from '@/types/music';
import type { Playlist } from '@/store/usePlaylistStore';
import { resolveCoverUrl } from '@/features/playlists/coverRegistry';

// ── Public types ───────────────────────────────────────────────────────────────

export type PlaylistArtworkType =
  | 'uploaded'     // custom uploaded image
  | 'preset'       // built-in SVG cover
  | 'collage-4'    // 2×2 grid
  | 'collage-3'    // asymmetric: left-large + right-stack
  | 'collage-2'    // vertical split
  | 'single'       // one full image
  | 'placeholder'; // music note SVG

export interface PlaylistArtworkResult {
  type:         PlaylistArtworkType;
  /** Single image URL — set for uploaded, preset, single. */
  url?:         string;
  /** 2, 3, or 4 unique cover URLs — set for all collage types. */
  collageUrls?: string[];
  /**
   * Stable string key — use as useMemo / useEffect dependency.
   * Changes only when the displayed artwork actually changes.
   * Guaranteed to be a plain string (safe to compare with ===).
   */
  artworkKey:   string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extract unique cover URLs from a list of trackIds.
 * Deterministic: preserves trackId order, first occurrence of each URL wins.
 * Skips undefined / empty URLs.
 * Stops after collecting `limit` unique URLs (default 4).
 */
export function getUniqueCoverUrls(
  trackIds: string[],
  trackMap: Map<string, Track>,
  limit = 4,
): string[] {
  const seen    = new Set<string>();
  const results: string[] = [];

  for (const id of trackIds) {
    const url = trackMap.get(id)?.coverUrl;
    if (url && !seen.has(url)) {
      seen.add(url);
      results.push(url);
      if (results.length === limit) break;
    }
  }

  return results;
}

// ── Resolver ──────────────────────────────────────────────────────────────────

/**
 * Resolve the canonical artwork descriptor for a playlist.
 * Pure function — no React, no side-effects. Safe to call anywhere.
 *
 * @param playlist  Playlist from the store.
 * @param trackMap  Catalog trackMap (id → Track). Used for collage resolution.
 */
export function resolvePlaylistArtwork(
  playlist: Playlist,
  trackMap: Map<string, Track>,
): PlaylistArtworkResult {

  // ── Priority 1: user-uploaded image ────────────────────────────────────
  if (playlist.coverImageUrl) {
    return {
      type:       'uploaded',
      url:        playlist.coverImageUrl,
      artworkKey: `uploaded:${playlist.coverImageUrl}`,
    };
  }

  // ── Priority 2: built-in preset cover ──────────────────────────────────
  const presetUrl = resolveCoverUrl(playlist.coverId);
  if (presetUrl) {
    return {
      type:       'preset',
      url:        presetUrl,
      artworkKey: `preset:${playlist.coverId}`,
    };
  }

  // ── Priority 3–6: auto-generate from track covers ──────────────────────
  const covers = getUniqueCoverUrls(playlist.trackIds, trackMap, 4);
  const key    = covers.join('|');

  if (covers.length >= 4) {
    return {
      type:        'collage-4',
      collageUrls: covers,
      artworkKey:  `c4:${key}`,
    };
  }

  if (covers.length === 3) {
    return {
      type:        'collage-3',
      collageUrls: covers,
      artworkKey:  `c3:${key}`,
    };
  }

  if (covers.length === 2) {
    return {
      type:        'collage-2',
      collageUrls: covers,
      artworkKey:  `c2:${key}`,
    };
  }

  if (covers.length === 1) {
    return {
      type:       'single',
      url:        covers[0],
      artworkKey: `single:${covers[0]}`,
    };
  }

  // ── Priority 7: placeholder ─────────────────────────────────────────────
  return {
    type:       'placeholder',
    artworkKey: 'placeholder',
  };
}
