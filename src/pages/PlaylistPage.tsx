/**
 * PlaylistPage — full playlist view with manage/reorder mode.
 *
 * MANAGE MODE (manageMode state):
 *   Off: normal SongRow with play/like/menu controls
 *   On:  drag-handle + title/artist + delete button (no playback controls)
 *        "Reorder" button → "Done"
 *
 * REORDER:
 *   Uses @dnd-kit/sortable for touch-friendly drag.
 *   Optimistic: local entries array reordered immediately.
 *   Persisted via reorderPlaylistTracks (entryId order) fire-and-forget.
 *
 * DELETE IN MANAGE MODE:
 *   Immediate optimistic removal, no confirmation per song.
 *   Same removeTrackFromPlaylist path as the 3-dots menu.
 *
 * DELETE REDIRECT (Issue 4):
 *   navigate('/') — home is the neutral fallback on both mobile + desktop.
 *
 * VISIBILITY:
 *   isPublic displayed as muted "Private" / "Public" badge in hero.
 *   Toggled in PlaylistEditModal.
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate }           from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLibraryStore }    from '@/store/libraryStore';
import { usePlayerStore }     from '@/store/playerStore';
import { usePlaylistStore }   from '@/store/usePlaylistStore';
import { trackActions }       from '@/lib/trackActions';
import SongRow                from '@/components/ui/SongRow';
import { PlaylistArtwork }    from '@/features/artwork';
import PlaylistEditModal      from '@/features/playlists/PlaylistEditModal';
import FolderPickerSheet      from '@/components/ui/FolderPickerSheet';
import ShuffleIcon            from '@/components/ui/ShuffleIcon';
import type { Track }         from '@/types/music';
import type { PlaylistTrackEntry } from '@/store/usePlaylistStore';

// ── Sortable manage-mode row ──────────────────────────────────────────────────

interface SortableManageRowProps {
  entry:    PlaylistTrackEntry;
  track:    Track;
  onDelete: (entryId: string) => void;
}

const SortableManageRow = ({ entry, track, onDelete }: SortableManageRowProps) => {
  const {
    attributes, listeners,
    setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: entry.entryId });

  const style: React.CSSProperties = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.5 : 1,
    zIndex:     isDragging ? 999 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-swara-card transition-colors">
      {/* Drag handle — also whole-row drag via listeners */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="w-8 h-8 flex items-center justify-center rounded text-swara-dim hover:text-swara-muted transition-colors flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <line x1="4" y1="8"  x2="20" y2="8"/>
          <line x1="4" y1="16" x2="20" y2="16"/>
        </svg>
      </button>

      {/* Track info */}
      <img src={track.coverUrl} alt="" loading="lazy"
        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-swara-elevated" />
      <div className="flex-1 min-w-0">
        <p className="text-[0.88rem] font-medium text-swara-text truncate">{track.title}</p>
        <p className="text-[0.72rem] text-swara-muted truncate">{track.artist}</p>
      </div>

      {/* Delete button — no drag listeners so tap doesn't start drag */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(entry.entryId); }}
        className="w-8 h-8 flex items-center justify-center rounded-full text-swara-dim hover:text-red-400 transition-colors flex-shrink-0"
        aria-label={`Remove ${track.title}`}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
};

// ── PlaylistPage ──────────────────────────────────────────────────────────────

const PlaylistPage = () => {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const { trackMap } = useLibraryStore();
  const { getPlaylist, loadPlaylistTracks, removeTrackFromPlaylist, reorderPlaylistTracks } = usePlaylistStore();

  const [entries,     setEntries]     = useState<PlaylistTrackEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [editOpen,    setEditOpen]    = useState(false);
  const [folderOpen,  setFolderOpen]  = useState(false);
  const [manageMode,  setManageMode]  = useState(false);

  const isShuffle    = usePlayerStore((s) => s.isShuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);

  const playlist = id ? getPlaylist(id) : undefined;

  const resolvedTracks = entries
    .map((e) => ({ entry: e, track: trackMap.get(e.trackId) }))
    .filter((x): x is { entry: PlaylistTrackEntry; track: Track } => x.track !== undefined);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    loadPlaylistTracks(id)
      .then((fetched) => { setEntries(fetched); })
      .finally(() => setLoading(false));
  }, [id, loadPlaylistTracks]);

  // dnd-kit sensors — pointer for desktop, touch for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !id) return;

    setEntries((prev) => {
      const oldIdx = prev.findIndex((e) => e.entryId === active.id);
      const newIdx = prev.findIndex((e) => e.entryId === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      // Fire-and-forget cloud persistence
      reorderPlaylistTracks(id, reordered.map((e) => e.entryId));
      return reordered;
    });
  }, [id, reorderPlaylistTracks]);

  const handlePlay = useCallback((startTrack?: Track) => {
    if (!playlist || resolvedTracks.length === 0) return;
    const tracks = resolvedTracks.map((x) => x.track);
    if (isShuffle && !startTrack) {
      trackActions.playFromPlaylist([...tracks].sort(() => Math.random() - 0.5), playlist);
    } else {
      trackActions.playFromPlaylist(tracks, playlist, startTrack);
    }
  }, [playlist, resolvedTracks, isShuffle]);

  const handleRemoveTrack = useCallback((entryId: string) => {
    if (!id) return;
    setEntries((prev) => prev.filter((e) => e.entryId !== entryId));
    removeTrackFromPlaylist(id, entryId);
  }, [id, removeTrackFromPlaylist]);

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

      {/* Back bar */}
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

      {/* Hero */}
      <div className="px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:gap-10 mb-4 lg:mb-8">
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
              {/* Visibility badge */}
              {playlist && (
                <span className="ml-2 text-[0.68rem] font-semibold tracking-wider uppercase text-swara-dim">
                  · {playlist.isPublic ? 'Public' : 'Private'}
                </span>
              )}
            </p>

            {/* Action pills — Edit + Reorder */}
            <div className="flex items-center gap-2 mt-2">
              <button type="button" onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-swara-border text-swara-muted hover:border-swara-muted hover:text-swara-text text-[0.72rem] font-medium transition-all">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit playlist
              </button>

              {trackCount > 1 && !manageMode && (
                <button type="button" onClick={() => setManageMode(true)}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-swara-border text-swara-muted hover:border-swara-muted hover:text-swara-text text-[0.72rem] font-medium transition-all">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <line x1="4" y1="8"  x2="20" y2="8"/>
                    <line x1="4" y1="16" x2="20" y2="16"/>
                  </svg>
                  Reorder
                </button>
              )}

              {manageMode && (
                <button type="button" onClick={() => setManageMode(false)}
                  className="inline-flex items-center h-7 px-3 rounded-full bg-swara-accent text-swara-bg text-[0.72rem] font-semibold transition-all active:scale-95">
                  Done
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-between mb-4 py-2 border-t border-b border-swara-border">
          <span className="text-[0.82rem] text-swara-muted font-medium">
            {loading ? 'Loading…' : `${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}`}
            {manageMode && <span className="ml-2 text-swara-accent font-semibold">Editing</span>}
          </span>

          {/* Normal controls — hidden in manage mode */}
          {trackCount > 0 && !manageMode && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setFolderOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-swara-dim hover:text-swara-muted transition-colors"
                aria-label="Add to folder" title="Add to folder">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                  strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                  <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                </svg>
              </button>
              <button type="button" onClick={toggleShuffle}
                className={['w-9 h-9 flex items-center justify-center rounded-full transition-colors',
                  isShuffle ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
                aria-label={isShuffle ? 'Shuffle on' : 'Shuffle off'}>
                <ShuffleIcon active={isShuffle} size={18} />
              </button>
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
                <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <p className="text-[0.9rem] font-semibold text-swara-muted">No tracks yet</p>
            <p className="text-[0.78rem] text-swara-dim text-center max-w-[230px] leading-relaxed">
              Open any track's menu and tap "Add to Playlist" to add songs here.
            </p>
          </div>
        )}

        {/* Normal mode */}
        {!loading && resolvedTracks.length > 0 && !manageMode && (
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

        {/* Manage / reorder mode */}
        {!loading && resolvedTracks.length > 0 && manageMode && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={entries.map((e) => e.entryId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0">
                {resolvedTracks.map(({ entry, track }) => (
                  <SortableManageRow
                    key={entry.entryId}
                    entry={entry}
                    track={track}
                    onDelete={handleRemoveTrack}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Modals */}
      {playlist && editOpen && (
        <PlaylistEditModal
          playlist={playlist}
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onDeleted={() => navigate('/', { replace: true })}  // Issue 4: home, not /library
        />
      )}

      {playlist && (
        <FolderPickerSheet
          isOpen={folderOpen}
          onClose={() => setFolderOpen(false)}
          playlistId={playlist.id}
          playlistTitle={playlist.title}
        />
      )}
    </div>
  );
};

export default PlaylistPage;
