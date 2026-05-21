/**
 * PlaylistPage — full playlist view.
 *
 * Route: /playlist/:id
 *
 * Features:
 *   - Playlist header with artwork, title, track count, play/shuffle
 *   - Full ordered track list
 *   - Remove track from playlist
 *   - Track context menu (TrackMenuSheet context='playlist')
 *   - Empty state
 *   - Refresh-safe loading (fetches full track list on mount)
 *   - Invalid playlist gracefully handled
 *
 * Playback: uses buildPlaylistQueue → playerStore.playQueue
 * Track resolution: O(1) via trackMap from libraryStore
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibraryStore }    from '@/store/libraryStore';
import { usePlaylistStore }   from '@/store/usePlaylistStore';
import { trackActions }       from '@/lib/trackActions';
import TrackMenuSheet         from '@/components/ui/TrackMenuSheet';
import type { Track }         from '@/types/music';
import type { PlaylistTrackEntry } from '@/store/usePlaylistStore';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♫</text></svg>';

// ── PlaylistPage ──────────────────────────────────────────────────────────────
const PlaylistPage = () => {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const { trackMap } = useLibraryStore();
  const { getPlaylist, loadPlaylistTracks, removeTrackFromPlaylist } = usePlaylistStore();

  const [entries,   setEntries]   = useState<PlaylistTrackEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [menuTrack, setMenuTrack] = useState<{ track: Track; entryId: string } | null>(null);

  // Resolve Track objects from entries via O(1) trackMap
  const resolvedTracks = entries
    .map((e) => ({ entry: e, track: trackMap.get(e.trackId) }))
    .filter((x): x is { entry: PlaylistTrackEntry; track: Track } => x.track !== undefined);

  const playlist = id ? getPlaylist(id) : undefined;

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
    trackActions.playFromPlaylist(tracks, playlist, startTrack);
  }, [playlist, resolvedTracks]);

  const handleShuffle = useCallback(() => {
    if (!playlist || resolvedTracks.length === 0) return;
    const tracks     = resolvedTracks.map((x) => x.track);
    const shuffled   = [...tracks].sort(() => Math.random() - 0.5);
    trackActions.playFromPlaylist(shuffled, playlist);
  }, [playlist, resolvedTracks]);

  const handleRemoveTrack = useCallback((entryId: string) => {
    if (!id) return;
    setEntries((prev) => prev.filter((e) => e.entryId !== entryId));
    removeTrackFromPlaylist(id, entryId);
  }, [id, removeTrackFromPlaylist]);

  // ── Not found / invalid ID ────────────────────────────────────────────────
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

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* Back button */}
      <div className="flex items-center px-4 pt-4 pb-0 lg:px-8">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text transition-colors -ml-1"
          aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      {/* Header */}
      <div className="px-5 pt-3 pb-6 lg:px-8 flex flex-col items-center gap-4 lg:flex-row lg:items-end lg:gap-6">
        {/* Artwork */}
        <div className="w-40 h-40 lg:w-48 lg:h-48 rounded-2xl flex-shrink-0 overflow-hidden bg-swara-elevated shadow-2xl">
          {playlist?.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist?.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'rgba(200,169,106,0.08)' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="rgba(200,169,106,0.4)" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex-1 min-w-0 text-center lg:text-left">
          <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-1.5">Playlist</p>
          <h1 className="text-[1.6rem] lg:text-[2rem] font-bold text-swara-text tracking-tight font-display leading-tight mb-1 line-clamp-2">
            {playlist?.title ?? '…'}
          </h1>
          {playlist?.description && (
            <p className="text-[0.82rem] text-swara-muted mb-2 line-clamp-2">{playlist.description}</p>
          )}
          <p className="text-[0.75rem] text-swara-dim">
            {playlist?.trackCount ?? 0} track{(playlist?.trackCount ?? 0) !== 1 ? 's' : ''}
            {playlist?.isPublic ? ' · Public' : ''}
          </p>

          {/* Play controls */}
          <div className="flex items-center justify-center lg:justify-start gap-3 mt-4">
            <button type="button" onClick={() => handlePlay()}
              disabled={resolvedTracks.length === 0}
              className="flex items-center justify-center w-[52px] h-[52px] rounded-full active:scale-95 transition-transform disabled:opacity-40"
              style={{ background: '#c8a96e', color: '#0a0a0a' }}
              aria-label="Play playlist">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </button>
            <button type="button" onClick={handleShuffle}
              disabled={resolvedTracks.length === 0}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-swara-border text-swara-muted hover:text-swara-text active:scale-95 transition-all disabled:opacity-40"
              aria-label="Shuffle play">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 1.9-1.7 3.3-1.7H22"/>
                <path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.5 2.2"/>
                <path d="m18 14 4 4-4 4"/><path d="M21.7 16.4c-.3.5-.8.8-1.3 1.1l-.9.5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Track list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
        </div>
      ) : resolvedTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
          <div className="w-16 h-16 rounded-2xl bg-swara-elevated flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <p className="text-[0.9rem] font-semibold text-swara-muted">No tracks yet</p>
          <p className="text-[0.78rem] text-swara-dim text-center max-w-[230px] leading-relaxed">
            Open any track's menu and tap "Add to Playlist" to add songs here.
          </p>
        </div>
      ) : (
        <div className="px-3 lg:px-6 pb-8">
          {resolvedTracks.map(({ entry, track }, i) => (
            <PlaylistTrackRow
              key={entry.entryId}
              track={track}
              index={i}
              entryId={entry.entryId}
              playlistId={id!}
              allTracks={resolvedTracks.map((x) => x.track)}
              onPlay={() => handlePlay(track)}
              onMenu={() => setMenuTrack({ track, entryId: entry.entryId })}
            />
          ))}
        </div>
      )}

      {/* Track context menu */}
      {menuTrack && (
        <TrackMenuSheet
          track={menuTrack.track}
          isOpen={!!menuTrack}
          onClose={() => setMenuTrack(null)}
          context="playlist"
          playlistId={id}
          entryId={menuTrack.entryId}
          onRemoveFromPlaylist={handleRemoveTrack}
        />
      )}
    </div>
  );
};

// ── PlaylistTrackRow ──────────────────────────────────────────────────────────

const PlaylistTrackRow = ({
  track, index, entryId, playlistId, allTracks,
  onPlay, onMenu,
}: {
  track: Track; index: number; entryId: string; playlistId: string;
  allTracks: Track[]; onPlay: () => void; onMenu: () => void;
}) => {
  void entryId; void playlistId; void allTracks; // reserved for future drag-reorder

  return (
    <div className="flex items-center gap-3 w-full py-2.5 px-2 rounded-xl hover:bg-swara-card/60 group transition-colors">
      {/* Track number */}
      <span className="text-[0.72rem] text-swara-dim w-5 text-right flex-shrink-0 tabular-nums">
        {index + 1}
      </span>

      <img src={track.coverUrl || PH} alt=""
        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-swara-elevated cursor-pointer"
        onClick={onPlay} loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).src = PH; }} />

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onPlay}>
        <p className="text-[0.87rem] font-medium text-swara-text truncate leading-snug">{track.title}</p>
        <p className="text-[0.72rem] text-swara-muted truncate mt-[1px]">{track.artist}</p>
      </div>

      {/* Three-dot menu */}
      <button type="button" onClick={onMenu}
        className="w-8 h-8 flex items-center justify-center rounded-full text-swara-dim opacity-0 group-hover:opacity-100 hover:text-swara-muted transition-all flex-shrink-0"
        aria-label="Track options">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
    </div>
  );
};

export default PlaylistPage;
