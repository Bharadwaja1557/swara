/**
 * src/features/playlists/playlistSort.ts
 *
 * Centralized playlist sorting utilities.
 * Import and use these everywhere instead of inline .sort() calls.
 *
 * ── Priority order ────────────────────────────────────────────────────────────
 *   1. lastInteractedAt  — broadest "any meaningful action" timestamp
 *   2. lastPlayedAt      — listened to recently
 *   3. updatedAt         — metadata edited recently
 *   4. alphabetical      — deterministic final tiebreaker
 *
 * Why this order:
 *   A playlist the user just added a song to (lastInteractedAt) is more
 *   "active" than one they merely played. lastPlayedAt captures listening
 *   behavior. updatedAt handles covers/renames. Alpha ensures stable ordering
 *   when all else is equal (new playlists, no interaction yet).
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *   const sorted = sortPlaylistsByRecency(playlists);
 *
 *   // In a component with memoization:
 *   const sorted = useMemo(() => sortPlaylistsByRecency(playlists), [playlists]);
 */

import type { Playlist } from '@/store/usePlaylistStore';

/** Parse an ISO timestamp string to ms. Returns 0 for undefined/invalid. */
function ts(iso: string | undefined): number {
  if (!iso) return 0;
  const n = new Date(iso).getTime();
  return isNaN(n) ? 0 : n;
}

/**
 * Sort playlists by recency using a 4-field priority chain.
 * Returns a new array — does NOT mutate the input.
 * Deterministic: identical timestamps fall back to alphabetical.
 */
export function sortPlaylistsByRecency(playlists: Playlist[]): Playlist[] {
  return [...playlists].sort((a, b) => {
    // 1. lastInteractedAt — most recent meaningful action
    const di = ts(b.lastInteractedAt) - ts(a.lastInteractedAt);
    if (di !== 0) return di;

    // 2. lastPlayedAt — most recently played
    const dp = ts(b.lastPlayedAt) - ts(a.lastPlayedAt);
    if (dp !== 0) return dp;

    // 3. updatedAt — most recently edited
    const du = ts(b.updatedAt) - ts(a.updatedAt);
    if (du !== 0) return du;

    // 4. Alphabetical tiebreaker — stable, deterministic
    return a.title.localeCompare(b.title);
  });
}
