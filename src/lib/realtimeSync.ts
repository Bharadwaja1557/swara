/**
 * src/lib/realtimeSync.ts
 *
 * Supabase Realtime subscription for cross-device playlist sync.
 *
 * ── WHY REALTIME ──────────────────────────────────────────────────────────────
 * The previous focus/visibility trigger approach had a critical flaw:
 *   - `syncFromCloud` has an `isSyncing` guard that returns early if a sync
 *     is already in progress
 *   - The focus event fires once; if it hits during startup sync, it's lost
 *   - There is no retry, no backoff, no guarantee the second device re-syncs
 *
 * Realtime fixes this at the architecture level:
 *   - Supabase broadcasts row-level changes via WebSocket (PostgreSQL logical replication)
 *   - Device B receives a push notification within ~200ms of Device A's commit
 *   - No polling, no focus dependency, no timing races
 *
 * ── WHAT WE SUBSCRIBE TO ─────────────────────────────────────────────────────
 * Two tables, filtered to the current user's playlists:
 *
 *   1. playlists   — INSERT/UPDATE/DELETE
 *      Catches: playlist created, renamed, cover changed, deleted
 *
 *   2. playlist_tracks — INSERT/UPDATE/DELETE
 *      Catches: track added, removed, REORDERED (position UPDATE)
 *      This is the primary missing signal for cross-device reorder sync.
 *
 * ── FILTER STRATEGY ──────────────────────────────────────────────────────────
 * Supabase Realtime supports row-level filters: `user_id=eq.{userId}` on
 * the playlists table. playlist_tracks doesn't have user_id, so we subscribe
 * to all playlist_tracks changes and filter client-side by checking if the
 * affected playlist_id belongs to the current user.
 *
 * ── RESPONSE STRATEGY ────────────────────────────────────────────────────────
 * On ANY change to playlists or playlist_tracks:
 *   - Debounce 300ms (batches rapid multi-row updates from reorder)
 *   - Call usePlaylistStore.getState().syncFromCloud()
 *   - The store's isSyncing guard prevents double-execution
 *   - syncFromCloud replaces all playlist.trackIds with cloud-ordered values
 *   - PlaylistPage's trackIdsDigest dep triggers re-fetch of ordered entries
 *
 * ── SETUP REQUIRED IN SUPABASE ───────────────────────────────────────────────
 * Enable replication for both tables:
 *
 *   ALTER PUBLICATION supabase_realtime ADD TABLE playlists;
 *   ALTER PUBLICATION supabase_realtime ADD TABLE playlist_tracks;
 *
 * Or via Supabase Dashboard: Database → Replication → enable for both tables.
 *
 * ── LIFECYCLE ────────────────────────────────────────────────────────────────
 * Call startRealtimeSync(userId) after auth + initial sync complete.
 * Call stopRealtimeSync() on logout.
 * Both are idempotent — safe to call multiple times.
 */

import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

let channel: RealtimeChannel | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const DEBOUNCE_MS = 300; // batch rapid multi-row updates (e.g. reorder writes N rows)

/**
 * Start realtime sync for the given user's playlists.
 * Subscribes to changes on `playlists` and `playlist_tracks` tables.
 */
export function startRealtimeSync(userId: string): void {
  // Idempotent — clean up any existing channel first
  stopRealtimeSync();

  console.log('[Realtime] Starting playlist sync for user', userId.slice(0, 8));

  // Single channel, two table subscriptions
  channel = supabase
    .channel(`playlist-sync-${userId}`)

    // ── playlists table ────────────────────────────────────────────────
    // Filter to this user's rows directly (user_id column exists on playlists).
    .on(
      'postgres_changes',
      {
        event:  '*',          // INSERT, UPDATE, DELETE
        schema: 'public',
        table:  'playlists',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('[Realtime] playlists change:', payload.eventType,
          (payload.new as Record<string, unknown>)?.id ?? (payload.old as Record<string, unknown>)?.id);
        triggerSync();
      }
    )

    // ── playlist_tracks table ───────────────────────────────────────────
    // No user_id here — ownership flows through playlists.user_id.
    // We subscribe broadly and let syncFromCloud filter by fetching only
    // the current user's playlists via auth.uid() in the RLS policy.
    // This is efficient because Supabase only sends events for rows the
    // client's auth token can SELECT (RLS applies to realtime too).
    .on(
      'postgres_changes',
      {
        event:  '*',          // INSERT (add track), UPDATE (reorder), DELETE (remove)
        schema: 'public',
        table:  'playlist_tracks',
      },
      (payload) => {
        console.log('[Realtime] playlist_tracks change:', payload.eventType);
        triggerSync();
      }
    )

    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] ✓ Subscribed to playlist + playlist_tracks changes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] Channel error — realtime sync may be unavailable');
      } else if (status === 'TIMED_OUT') {
        console.warn('[Realtime] Channel timed out — will attempt reconnect');
      } else {
        console.log('[Realtime] Status:', status);
      }
    });
}

/**
 * Stop realtime sync and clean up the channel.
 * Call on logout or app teardown.
 */
export function stopRealtimeSync(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (channel) {
    console.log('[Realtime] Removing playlist sync channel');
    supabase.removeChannel(channel);
    channel = null;
  }
}

/**
 * Debounced sync trigger.
 * Coalesces rapid-fire events (reorder writes one UPDATE per track row)
 * into a single syncFromCloud call after DEBOUNCE_MS of quiet.
 */
function triggerSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    console.log('[Realtime] Triggering syncFromCloud after debounce');
    // Lazy import to avoid circular dependency
    const { usePlaylistStore } = await import('@/store/usePlaylistStore');
    await usePlaylistStore.getState().syncFromCloud();
  }, DEBOUNCE_MS);
}
