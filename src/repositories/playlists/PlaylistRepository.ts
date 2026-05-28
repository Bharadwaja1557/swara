/**
 * src/repositories/playlists/PlaylistRepository.ts
 *
 * All Supabase calls for playlists and playlist_tracks.
 * Follows the exact style of LikedSongsRepository and UserLibraryRepository.
 *
 * SECURITY:
 *   user_id is NEVER passed from the client.
 *   The DB column has DEFAULT auth.uid() and RLS enforces ownership.
 *
 * ORDERING:
 *   Tracks are stored with an integer `position` (1-based).
 *   Reorder writes all affected positions in a single batch upsert.
 *
 * LOGGING:
 *   Every method logs entry, key params, and success/error outcome.
 */
import { supabase } from '@/lib/supabase';
import type { Playlist, PlaylistTrackEntry } from '@/store/usePlaylistStore';

// Row shapes returned from Supabase ─────────────────────────────────────────

interface PlaylistRow {
  id:          string;
  title:       string;
  description: string | null;
  cover_url:   string | null;
  cover_id:    string | null;   // built-in cover key, e.g. 'aurora'
  is_public:   boolean;
  track_count: number;
  created_at:  string;
  updated_at:  string;
  user_id:     string;          // creator UUID — used for ownership checks
}

interface PlaylistTrackRow {
  id:         string;
  track_id:   string;
  position:   number;
  added_at:   string;
}

// Row → domain type converters ───────────────────────────────────────────────

function rowToPlaylist(r: PlaylistRow): Playlist {
  return {
    id:             r.id,
    title:          r.title,
    description:    r.description    ?? undefined,
    coverImageUrl:  r.cover_url      ?? undefined,
    coverId:        r.cover_id       ?? undefined,
    isPublic:       r.is_public,
    trackCount:     r.track_count,
    createdAt:      r.created_at,
    updatedAt:      r.updated_at,
    trackIds:       [], // populated separately by getPlaylist
  };
}

function rowToTrackEntry(r: PlaylistTrackRow): PlaylistTrackEntry {
  return {
    entryId:  r.id,
    trackId:  r.track_id,
    position: r.position,
    addedAt:  r.added_at,
  };
}

// Repository ─────────────────────────────────────────────────────────────────

export const PlaylistRepository = {

  // ── Read ──────────────────────────────────────────────────────────────────

  /**
   * Fetch all playlists for the current user with their track ID lists.
   *
   * Uses TWO queries — not N+1:
   *   Q1: all playlist stubs
   *   Q2: all playlist_tracks for those playlist IDs (single IN query)
   * Then groups track IDs by playlist_id client-side.
   *
   * This is what makes playlist artwork work immediately in Library without
   * requiring the user to open each playlist first.
   * trackIds on each playlist drives resolvePlaylistArtwork() → collage.
   */
  async getAllPlaylists(): Promise<Playlist[]> {
    console.log('[PlaylistRepo] getAllPlaylists: fetching...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.warn('[PlaylistRepo] getAllPlaylists: not authenticated'); return []; }

    // ── Q0: saved playlist IDs for the current user ──────────────────────
    const { data: savedRows } = await supabase
      .from('playlist_saves')
      .select('playlist_id');
    const savedIdSet = new Set((savedRows ?? []).map((r: { playlist_id: string }) => r.playlist_id));
    const savedIds = [...savedIdSet];

    // ── Q1a: own playlists (all visibility levels) ───────────────────────
    const { data: ownData, error: ownErr } = await supabase
      .from('playlists')
      .select('id, title, description, cover_url, cover_id, is_public, track_count, created_at, updated_at, user_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (ownErr) {
      console.error('[PlaylistRepo] getAllPlaylists own ERROR:', ownErr.message);
      return [];
    }

    // ── Q1b: saved playlists (owned by others, public) ───────────────────
    let savedData: PlaylistRow[] = [];
    if (savedIds.length > 0) {
      const { data: sd, error: sdErr } = await supabase
        .from('playlists')
        .select('id, title, description, cover_url, cover_id, is_public, track_count, created_at, updated_at, user_id')
        .in('id', savedIds)
        .neq('user_id', user.id)           // exclude own (already in Q1a)
        .order('updated_at', { ascending: false });
      if (sdErr) {
        console.error('[PlaylistRepo] getAllPlaylists saved ERROR:', sdErr.message);
      } else {
        savedData = (sd ?? []) as PlaylistRow[];
      }
    }

    const allRows = [...(ownData ?? []) as PlaylistRow[], ...savedData];
    if (allRows.length === 0) return [];

    // ── Q2: batch-fetch all track IDs (for artwork collages) ─────────────
    const playlistIds = allRows.map((r) => r.id);
    const { data: trackRows, error: trackErr } = await supabase
      .from('playlist_tracks')
      .select('playlist_id, track_id')
      .in('playlist_id', playlistIds)
      .order('playlist_id', { ascending: true })
      .order('position',    { ascending: true });

    if (trackErr) {
      console.error('[PlaylistRepo] getAllPlaylists track entries ERROR:', trackErr.message);
    }

    const trackMap = new Map<string, string[]>();
    for (const row of ((trackRows ?? []) as { playlist_id: string; track_id: string }[])) {
      const list = trackMap.get(row.playlist_id) ?? [];
      list.push(row.track_id);
      trackMap.set(row.playlist_id, list);
    }

    // ── Q3: batch-resolve creator usernames ───────────────────────────────
    const uniqueUserIds = [...new Set(allRows.map((r) => r.user_id))];
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', uniqueUserIds);
    const profileMap = new Map((profileRows ?? []).map((p: { id: string; username: string }) => [p.id, p.username]));

    // ── Merge ─────────────────────────────────────────────────────────────
    const playlists = allRows.map((r) => ({
      ...rowToPlaylist(r),
      trackIds:        trackMap.get(r.id) ?? [],
      creatorUserId:   r.user_id,
      creatorUsername: profileMap.get(r.user_id) ?? 'unknown',
      isOwned:         r.user_id === user.id,
      isSaved:         !!(r.user_id !== user.id && savedIdSet.has(r.id)),
    }));

    console.log('[PlaylistRepo] getAllPlaylists: fetched', playlists.length, 'playlists');
    return playlists;
  },

  /**
   * Fetch a single playlist with its full ordered track list.
   */
  async getPlaylist(playlistId: string): Promise<(Playlist & { entries: PlaylistTrackEntry[] }) | null> {
    console.log('[PlaylistRepo] getPlaylist:', playlistId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.warn('[PlaylistRepo] getPlaylist: not authenticated'); return null; }

    const [playlistRes, tracksRes] = await Promise.all([
      supabase
        .from('playlists')
        .select('id, title, description, cover_url, cover_id, is_public, track_count, created_at, updated_at')
        .eq('id', playlistId)
        .single(),
      supabase
        .from('playlist_tracks')
        .select('id, track_id, position, added_at')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true }),
    ]);

    if (playlistRes.error) {
      console.error('[PlaylistRepo] getPlaylist playlist ERROR:', playlistRes.error.message);
      return null;
    }
    if (tracksRes.error) {
      console.error('[PlaylistRepo] getPlaylist tracks ERROR:', tracksRes.error.message);
      return null;
    }

    const playlist = rowToPlaylist(playlistRes.data as PlaylistRow);
    const entries  = (tracksRes.data ?? []).map(rowToTrackEntry);
    playlist.trackIds = entries.map((e) => e.trackId);

    console.log('[PlaylistRepo] getPlaylist: found', playlist.title, '|', entries.length, 'tracks');
    return { ...playlist, entries };
  },

  // ── Playlist CRUD ─────────────────────────────────────────────────────────

  /**
   * Create a new playlist. user_id set by DB DEFAULT auth.uid().
   */
  async createPlaylist(title: string, description?: string): Promise<Playlist | null> {
    console.log('[PlaylistRepo] createPlaylist:', title);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.warn('[PlaylistRepo] createPlaylist: not authenticated'); return null; }

    const { data, error } = await supabase
      .from('playlists')
      .insert({ title: title.trim(), description: description?.trim() })
      .select('id, title, description, cover_url, cover_id, is_public, track_count, created_at, updated_at')
      .single();

    if (error) {
      console.error('[PlaylistRepo] createPlaylist ERROR:', error.code, error.message);
      return null;
    }

    const playlist = rowToPlaylist(data as PlaylistRow);
    console.log('[PlaylistRepo] createPlaylist SUCCESS: id =', playlist.id);
    return playlist;
  },

  /**
   * Rename a playlist.
   */
  async renamePlaylist(playlistId: string, title: string): Promise<void> {
    console.log('[PlaylistRepo] renamePlaylist:', playlistId, '→', title);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlists')
      .update({ title: title.trim() })
      .eq('id', playlistId);

    if (error) console.error('[PlaylistRepo] renamePlaylist ERROR:', error.message);
    else       console.log('[PlaylistRepo] renamePlaylist SUCCESS');
  },

  /**
   * Delete a playlist (CASCADE removes all playlist_tracks rows).
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    console.log('[PlaylistRepo] deletePlaylist:', playlistId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (error) console.error('[PlaylistRepo] deletePlaylist ERROR:', error.message);
    else       console.log('[PlaylistRepo] deletePlaylist SUCCESS');
  },

  /**
   * Toggle is_public on a playlist.
   */
  async togglePublic(playlistId: string, isPublic: boolean): Promise<void> {
    console.log('[PlaylistRepo] togglePublic:', playlistId, '→', isPublic);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlists')
      .update({ is_public: isPublic })
      .eq('id', playlistId);

    if (error) console.error('[PlaylistRepo] togglePublic ERROR:', error.message);
    else       console.log('[PlaylistRepo] togglePublic SUCCESS');
  },

  /**
   * Set or remove a playlist uploaded cover image URL.
   */
  async updateCover(playlistId: string, coverImageUrl: string | null): Promise<void> {
    console.log('[PlaylistRepo] updateCover:', playlistId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlists')
      .update({ cover_url: coverImageUrl })
      .eq('id', playlistId);

    if (error) console.error('[PlaylistRepo] updateCover ERROR:', error.message);
    else       console.log('[PlaylistRepo] updateCover SUCCESS');
  },

  /**
   * Set or clear a built-in cover ID (e.g. 'aurora', 'pulse').
   * Writes to cover_id column — synced to all devices via syncFromCloud.
   */
  async updateCoverId(playlistId: string, coverId: string | null): Promise<void> {
    console.log('[PlaylistRepo] updateCoverId:', playlistId, '→', coverId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlists')
      .update({ cover_id: coverId })
      .eq('id', playlistId);

    if (error) console.error('[PlaylistRepo] updateCoverId ERROR:', error.message);
    else       console.log('[PlaylistRepo] updateCoverId SUCCESS');
  },

  // ── Track mutations ───────────────────────────────────────────────────────

  /**
   * Append a track to the end of a playlist.
   * Returns the new entry's ID and position.
   */
  async addTrack(playlistId: string, trackId: string): Promise<{ entryId: string; position: number } | null> {
    console.log('[PlaylistRepo] addTrack:', playlistId, trackId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.warn('[PlaylistRepo] addTrack: not authenticated'); return null; }

    // Get current max position to append after
    const { data: maxData } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxData?.position ?? 0) + 1;

    const { data, error } = await supabase
      .from('playlist_tracks')
      .insert({ playlist_id: playlistId, track_id: trackId, position: nextPosition })
      .select('id, position')
      .single();

    if (error) {
      console.error('[PlaylistRepo] addTrack ERROR:', error.code, error.message);
      return null;
    }

    console.log('[PlaylistRepo] addTrack SUCCESS: position =', data.position);
    return { entryId: data.id, position: data.position };
  },

  /**
   * Remove a track entry by its entry row ID (not track_id — supports duplicate tracks).
   */
  async removeTrack(entryId: string): Promise<void> {
    console.log('[PlaylistRepo] removeTrack: entryId =', entryId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('id', entryId);

    if (error) console.error('[PlaylistRepo] removeTrack ERROR:', error.message);
    else       console.log('[PlaylistRepo] removeTrack SUCCESS');
  },

  /**
   * Remove the first occurrence of a track by track_id within a playlist.
   * Used by PlaylistPickerSheet toggle where entry IDs are not available.
   */
  async removeTrackByTrackId(playlistId: string, trackId: string): Promise<void> {
    console.log('[PlaylistRepo] removeTrackByTrackId:', playlistId, trackId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find the first matching entry row ID, then delete it
    const { data, error: fetchErr } = await supabase
      .from('playlist_tracks')
      .select('id')
      .eq('playlist_id', playlistId)
      .eq('track_id',    trackId)
      .limit(1)
      .single();

    if (fetchErr || !data) {
      console.error('[PlaylistRepo] removeTrackByTrackId: entry not found', fetchErr?.message);
      return;
    }

    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('id', data.id);

    if (error) console.error('[PlaylistRepo] removeTrackByTrackId ERROR:', error.message);
    else       console.log('[PlaylistRepo] removeTrackByTrackId SUCCESS');
  },

  /**
   * Reorder tracks by writing new positions for a batch of entry IDs.
   * orderedEntryIds: array of entry row IDs in the desired order.
   * Writes sequential positions (1, 2, 3...) to maintain clean ordering.
   */
  async reorderTracks(playlistId: string, orderedEntryIds: string[]): Promise<void> {
    console.log('[PlaylistRepo] reorderTracks:', playlistId, '| entries:', orderedEntryIds.length);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use individual UPDATE calls, NOT upsert.
    //
    // WHY UPSERT FAILS UNDER RLS:
    //   PostgreSQL / Supabase evaluates BOTH INSERT and UPDATE policies when
    //   executing an upsert, even when every row already exists and only UPDATEs
    //   occur at the storage layer. Our INSERT policy on playlist_tracks is scoped
    //   to adding new tracks (not reordering), so the upsert hits a policy
    //   violation and fails with "new row violates row-level security policy"
    //   even though no new row is actually being inserted.
    //
    // WHY PLAIN UPDATE WORKS:
    //   A plain UPDATE only consults the UPDATE policy, which correctly permits
    //   the playlist owner to modify position on their own rows. No INSERT
    //   policy is evaluated at all.
    //
    // PERFORMANCE:
    //   All updates run in parallel via Promise.all — no serial waiting.
    //   Network round-trips are the same order as a bulk upsert.
    const results = await Promise.all(
      orderedEntryIds.map((entryId, idx) =>
        supabase
          .from('playlist_tracks')
          .update({ position: idx + 1 })
          .eq('id', entryId)
      )
    );

    const failed = results.filter((r) => r.error);
    if (failed.length > 0) {
      console.error('[PlaylistRepo] reorderTracks: some position updates failed:',
        failed.map((r) => r.error?.message).join(', '));
      return;
    }

    // Bump playlist.updated_at so:
    //   1. Other devices re-fetch trackIds in the new order on next syncFromCloud
    //   2. Realtime broadcasts a playlists UPDATE as a secondary delivery signal
    const { error: tsErr } = await supabase
      .from('playlists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', playlistId);

    if (tsErr) console.error('[PlaylistRepo] reorderTracks bump updated_at ERROR:', tsErr.message);
    else       console.log('[PlaylistRepo] reorderTracks SUCCESS');
  },

  // ── Shared playlists: save / unsave ───────────────────────────────────────

  /**
   * Save a reference to a public playlist owned by another user.
   * Idempotent (upsert). user_id set by DEFAULT auth.uid().
   */
  async savePlaylist(playlistId: string): Promise<void> {
    console.log('[PlaylistRepo] savePlaylist:', playlistId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlist_saves')
      .upsert({ playlist_id: playlistId });
    if (error) console.error('[PlaylistRepo] savePlaylist ERROR:', error.message);
    else       console.log('[PlaylistRepo] savePlaylist SUCCESS');
  },

  /**
   * Remove the current user's saved reference to a playlist.
   * RLS ensures only the saver can remove their own save row.
   */
  async unsavePlaylist(playlistId: string): Promise<void> {
    console.log('[PlaylistRepo] unsavePlaylist:', playlistId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlist_saves')
      .delete()
      .eq('playlist_id', playlistId);
    if (error) console.error('[PlaylistRepo] unsavePlaylist ERROR:', error.message);
    else       console.log('[PlaylistRepo] unsavePlaylist SUCCESS');
  },

  /**
   * Search playlists by title for the search results page.
   *
   * Returns:
   *   1. Current user's own playlists (public + private) matching the query
   *   2. Other users' public playlists matching the query (RLS-gated)
   *   3. Does NOT include private playlists from other users
   *
   * The RLS policy `user_id = auth.uid() OR is_public = true` means the
   * ILIKE query automatically returns the correct union without extra filters.
   *
   * Creator usernames are resolved via a separate batch profiles query.
   * isSaved is resolved by checking playlist_saves for the current user.
   */
  async searchPlaylists(q: string): Promise<PlaylistSearchResult[]> {
    console.log('[PlaylistRepo] searchPlaylists:', q);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !q.trim()) return [];

    // RLS handles privacy: returns own (all) + others' public only
    const { data, error } = await supabase
      .from('playlists')
      .select('id, title, cover_url, cover_id, is_public, track_count, user_id, updated_at')
      .ilike('title', `%${q.trim()}%`)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[PlaylistRepo] searchPlaylists ERROR:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];

    // Batch-resolve creator usernames
    const uniqueUserIds = [...new Set((data as PlaylistRow[]).map((r) => r.user_id))];
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', uniqueUserIds);
    const profileMap = new Map((profileRows ?? []).map((p: { id: string; username: string }) => [p.id, p.username]));

    // Check which of these the user has saved
    const { data: savedRows } = await supabase
      .from('playlist_saves')
      .select('playlist_id')
      .in('playlist_id', (data as PlaylistRow[]).map((r) => r.id));
    const savedIdSet = new Set((savedRows ?? []).map((r: { playlist_id: string }) => r.playlist_id));

    return (data as PlaylistRow[]).map((r) => ({
      id:              r.id,
      title:           r.title,
      coverUrl:        r.cover_url ?? undefined,
      coverId:         r.cover_id  ?? undefined,
      trackCount:      r.track_count,
      isPublic:        r.is_public,
      creatorUsername: profileMap.get(r.user_id) ?? 'unknown',
      isOwned:         r.user_id === user.id,
      isSaved:         savedIdSet.has(r.id),
    }));
  },
};

// ── Exported types ────────────────────────────────────────────────────────────

export interface PlaylistSearchResult {
  id:              string;
  title:           string;
  coverUrl?:       string;
  coverId?:        string;
  trackCount:      number;
  isPublic:        boolean;
  creatorUsername: string;
  isOwned:         boolean;
  isSaved:         boolean;
}
