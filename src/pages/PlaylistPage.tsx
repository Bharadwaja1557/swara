/**
 * PlaylistPage — full playlist view.
 *
 * Route: /playlist/:id
 *
 * DESIGN:
 *   Mirrors AlbumPage layout exactly:
 *     - sticky back bar
 *     - side-by-side hero on desktop (cover left, meta right)
 *     - same controls bar pattern (track count + action buttons)
 *     - same track list spacing
 *     - same loading / error / empty states
 *
 *   Track rows use the canonical SongRow with showTrackNumber + menuContext='playlist'.
 *
 * EDIT:
 *   "Edit" button opens PlaylistEditModal (rename + cover variant picker).
 *
 * COVER:
 *   Rendered by PlaylistCover — handles uploaded URL, built-in variants, placeholder.
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibraryStore }    from '@/store/libraryStore';
import { usePlaylistStore }   from '@/store/usePlaylistStore';
import { trackActions }       from '@/lib/trackActions';
import SongRow                from '@/components/ui/SongRow';
import PlaylistArtwork        from '@/features/playlists/PlaylistArtwork';
import PlaylistEditModal      from '@/features/playlists/PlaylistEditModal';
import ShuffleIcon            from '@/components/ui/ShuffleIcon';
import type { Track }         from '@/types/music';
import type { PlaylistTrackEntry } from '@/store/usePlaylistStore';

// ── PlaylistPage ──────────────────────────────────────────────────────────────

const PlaylistPage = () => {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const { trackMap } = useLibraryStore();
  const { getPlaylist, loadPlaylistTracks, removeTrackFromPlaylist } = usePlaylistStore();

  const [entries,     setEntries]     = useState<PlaylistTrackEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [editOpen,    setEditOpen]    = useState(false);
  const [isShuffle,   setIsShuffle]   = useState(false);

  // Get fresh playlist from store on every render (reflects optimistic updates)
  const playlist = id ? getPlaylist(id) : undefined;

  // Resolve Track objects from entries via O(1) trackMap
  const resolvedTracks = entries
    .map((e) => ({ entry: e, track: trackMap.get(e.trackId) }))
    .filter((x): x is { entry: PlaylistTrackEntry; track: Track } => x.track !== undefined);

  // Load full track list on mount
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    loadPlaylistTracks(id)
      .then((fetched) => { setEntries(fetched); })
      .finally(() => setLoading(false));
  }, [id, loadPlaylistTracks]);

  const handlePlay = useCallback((startTrack?: Track) => {
    if (!playlist || resolvedTracks.length === 0) return;
    const tracks = resolvedTracks.map((x) => x.track);
    if (isShuffle && !startTrack) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      trackActions.playFromPlaylist(shuffled, playlist);
    } else {
      trackActions.playFromPlaylist(tracks, playlist, startTrack);
    }
  }, [playlist, resolvedTracks, isShuffle]);

  const handleRemoveTrack = useCallback((entryId: string) => {
    if (!id) return;
    setEntries((prev) => prev.filter((e) => e.entryId !== entryId));
    removeTrackFromPlaylist(id, entryId);
  }, [id, removeTrackFromPlaylist]);

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!loading && !playlist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <p className="text-[1rem] font-semibold text-swara-muted">Playlist not found</p>
        <button type="button" onClick={() => navigate(-1)}
          className="text-[0.85rem] text-swara-accent hover:text-swara-accent-bright transition-colors">
          Go back
        </button>
      </div>
    );
  }

  const trackCount = resolvedTracks.length;

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* Back bar — sticky, mirrors AlbumPage */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 lg:px-8 pt-5 pb-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all"
          aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      {/* ── Hero: cover + meta — stacked mobile, side-by-side desktop ── */}
      <div className="px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:gap-10 mb-4 lg:mb-8">

          {/* Cover */}
          <div className="flex justify-center lg:justify-start mb-5 lg:mb-0 flex-shrink-0">
            {playlist && (
              <PlaylistArtwork
                playlist={playlist}
                size={0}
                className="w-[200px] h-[200px] lg:w-[280px] lg:h-[280px] rounded-2xl"
                style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
              />
            )}
          </div>

          {/* Meta */}
          <div className="lg:flex-1 lg:min-w-0 lg:pb-1">
            <p className="hidden lg:block text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-swara-dim mb-2">
              Playlist
            </p>

            <h1 className="text-[1.3rem] lg:text-[2.6rem] font-bold text-swara-text tracking-tight font-display mb-0.5 lg:mb-2 lg:leading-none">
              {playlist?.title ?? '…'}
            </h1>

            {playlist?.description && (
              <p className="text-[0.85rem] text-swara-muted mb-1.5 line-clamp-2">
                {playlist.description}
              </p>
            )}

            <p className="text-xs lg:text-[0.92rem] text-swara-muted mt-0.5 lg:mt-1.5">
              {(playlist?.trackCount ?? 0)} {(playlist?.trackCount ?? 0) === 1 ? 'track' : 'tracks'}
              {playlist?.isPublic ? ' · Public' : ''}
            </p>

            {/* Edit link */}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="mt-2 text-[0.78rem] font-medium text-swara-accent hover:text-swara-accent-bright transition-colors inline-flex items-center gap-1"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
          </div>
        </div>

        {/* Controls bar — mirrors AlbumPage controls bar */}
        <div className="flex items-center justify-between mb-4 py-2 border-t border-b border-swara-border">
          <span className="text-[0.82rem] text-swara-muted font-medium">
            {loading ? 'Loading…' : `${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}`}
          </span>
          {trackCount > 0 && (
            <div className="flex items-center gap-2">
              {/* Shuffle toggle */}
              <button type="button" onClick={() => setIsShuffle((s) => !s)}
                className={['w-9 h-9 flex items-center justify-center rounded-full transition-colors', isShuffle ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
                aria-label={isShuffle ? 'Shuffle on' : 'Shuffle off'}>
                <ShuffleIcon active={isShuffle} size={18} />
              </button>
              {/* Play */}
              <button type="button" onClick={() => handlePlay()} disabled={loading}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-swara-accent text-swara-bg disabled:opacity-50 active:scale-95 transition-transform"
                aria-label="Play playlist">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Track list */}
      <div className="px-4 lg:px-8 pb-8">
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
          </div>
        )}

        {!loading && resolvedTracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
            <div className="w-16 h-16 rounded-2xl bg-swara-elevated flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none"
                stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <p className="text-[0.9rem] font-semibold text-swara-muted">No tracks yet</p>
            <p className="text-[0.78rem] text-swara-dim text-center max-w-[230px] leading-relaxed">
              Open any track's menu and tap "Add to Playlist" to add songs here.
            </p>
          </div>
        )}

        {!loading && resolvedTracks.length > 0 && (
          <ul className="space-y-0">
            {resolvedTracks.map(({ entry, track }, i) => (
              <SongRow
                key={entry.entryId}
                track={track}
                onPlay={() => handlePlay(track)}
                showTrackNumber
                trackNumber={i + 1}
                menuContext="playlist"
                playlistId={id}
                entryId={entry.entryId}
                onRemoveFromPlaylist={handleRemoveTrack}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Edit modal — ONLY mounted when open.
          This is the keyboard bug fix: if the modal were always mounted with
          isOpen=false, BottomSheet renders children in the DOM and autoFocus
          would fire on PlaylistPage mount, opening the mobile keyboard. */}
      {playlist && editOpen && (
        <PlaylistEditModal
          playlist={playlist}
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
};

export default PlaylistPage;
