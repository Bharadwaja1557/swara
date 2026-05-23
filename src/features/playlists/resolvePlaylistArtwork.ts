/**
 * src/features/playlists/resolvePlaylistArtwork.ts
 *
 * Pure TypeScript resolver — no React, no side-effects.
 * Returns a discriminated union describing which artwork variant to render.
 *
 * PRIORITY ORDER (matches Spotify/Apple Music behaviour):
 *   1. uploaded    — playlist.coverImageUrl is set
 *   2. preset      — playlist.coverId is set → resolves via coverRegistry
 *   3. collage     — 4+ track covers available → 2×2 grid of first four
 *   4. single      — 1–3 track covers available → first track cover only
 *   5. placeholder — no tracks / covers unavailable
 *
 * This is the ONLY place where playlist cover priority logic lives.
 * Every UI component calls this and renders the result — no inline decisions.
 */

import type { Track }    from '@/types/music';
import type { Playlist } from '@/store/usePlaylistStore';
import { resolveCoverUrl } from './coverRegistry';

// ── Result type ────────────────────────────────────────────────────────────────

export type PlaylistArtworkType =
  | 'uploaded'
  | 'preset'
  | 'collage'
  | 'single'
  | 'placeholder';

export interface PlaylistArtworkResult {
  type:          PlaylistArtworkType;
  /** Single URL — set for uploaded, preset, single. */
  url?:          string;
  /** Array of 4 URLs — set only when type === 'collage'. */
  collageUrls?:  string[];
}

// ── Resolver ──────────────────────────────────────────────────────────────────

/**
 * Resolve the canonical artwork descriptor for a playlist.
 *
 * @param playlist  The playlist object from the store.
 * @param trackMap  Full catalog trackMap (id → Track).
 *                  Used to resolve cover URLs from trackIds.
 */
export function resolvePlaylistArtwork(
  playlist: Playlist,
  trackMap: Map<string, Track>,
): PlaylistArtworkResult {
  // ── Priority 1: user-uploaded custom image ──────────────────────────────
  if (playlist.coverImageUrl) {
    return { type: 'uploaded', url: playlist.coverImageUrl };
  }

  // ── Priority 2: user-selected built-in preset ───────────────────────────
  const presetUrl = resolveCoverUrl(playlist.coverId);
  if (presetUrl) {
    return { type: 'preset', url: presetUrl };
  }

  // ── Priority 3 & 4: derive from track covers ────────────────────────────
  // Collect unique cover URLs from the playlist's trackIds, in order.
  // De-duplicate so repeated albums don't fill all 4 slots.
  const seen  = new Set<string>();
  const covers: string[] = [];

  for (const trackId of playlist.trackIds) {
    const track = trackMap.get(trackId);
    if (track?.coverUrl && !seen.has(track.coverUrl)) {
      seen.add(track.coverUrl);
      covers.push(track.coverUrl);
      if (covers.length === 4) break;  // stop after 4 unique covers
    }
  }

  if (covers.length >= 4) {
    return { type: 'collage', collageUrls: covers.slice(0, 4) };
  }

  if (covers.length >= 1) {
    return { type: 'single', url: covers[0] };
  }

  // ── Priority 5: nothing available ──────────────────────────────────────
  return { type: 'placeholder' };
}
