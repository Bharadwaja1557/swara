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
  is_public:   boolean;
  track_count: number;
  created_at:  string;
  updated_at:  string;
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
    id:          r.id,
    title:       r.title,
    description: r.description ?? undefined,
    coverUrl:    r.cover_url   ?? undefined,
    isPublic:    r.is_public,
    trackCount:  r.track_count,
    createdAt:   r.created_at,
    updatedAt:   r.updated_at,
    trackIds:    [], // populated separately by getPlaylist
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
   * Fetch all playlists for the current user (stubs, no track lists).
   * Ordered by most recently updated first.
   */
  async getAllPlaylists(): Promise<Playlist[]> {
    console.log('[PlaylistRepo] getAllPlaylists: fetching...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.warn('[PlaylistRepo] getAllPlaylists: not authenticated'); return []; }

    const { data, error } = await supabase
      .from('playlists')
      .select('id, title, description, cover_url, is_public, track_count, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[PlaylistRepo] getAllPlaylists ERROR:', error.code, error.message);
      return [];
    }

    const playlists = (data ?? []).map(rowToPlaylist);
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
        .select('id, title, description, cover_url, is_public, track_count, created_at, updated_at')
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
      .select('id, title, description, cover_url, is_public, track_count, created_at, updated_at')
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
   * Set or remove a playlist cover.
   */
  async updateCover(playlistId: string, coverUrl: string | null): Promise<void> {
    console.log('[PlaylistRepo] updateCover:', playlistId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('playlists')
      .update({ cover_url: coverUrl })
      .eq('id', playlistId);

    if (error) console.error('[PlaylistRepo] updateCover ERROR:', error.message);
    else       console.log('[PlaylistRepo] updateCover SUCCESS');
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
   * Reorder tracks by writing new positions for a batch of entry IDs.
   * orderedEntryIds: array of entry row IDs in the desired order.
   * Writes sequential positions (1, 2, 3...) to maintain clean ordering.
   */
  async reorderTracks(playlistId: string, orderedEntryIds: string[]): Promise<void> {
    console.log('[PlaylistRepo] reorderTracks:', playlistId, '| entries:', orderedEntryIds.length);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Build upsert payload: each entry gets its new 1-based position
    const updates = orderedEntryIds.map((entryId, idx) => ({
      id:          entryId,
      playlist_id: playlistId,
      position:    idx + 1,
    }));

    const { error } = await supabase
      .from('playlist_tracks')
      .upsert(updates, { onConflict: 'id' });

    if (error) console.error('[PlaylistRepo] reorderTracks ERROR:', error.message);
    else       console.log('[PlaylistRepo] reorderTracks SUCCESS');
  },
};
