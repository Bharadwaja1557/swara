/**
 * PlaylistPickerSheet — "Add to Playlist" bottom sheet / floating modal.
 *
 * CHANGES:
 *
 * Issue 3 — Sticky header with cover image:
 *   The selected song info (cover + title + artist) is rendered in a sticky
 *   div that stays visible while the user scrolls through long playlist lists.
 *
 * Issue 5 — Toggle-based membership:
 *   Each playlist row acts as a toggle. If the track is already in the playlist,
 *   clicking it removes the track. If not, clicking adds it. The checkmark
 *   appears/disappears immediately via optimistic update from the live store.
 *   The sheet does NOT close after a selection — the user can toggle multiple
 *   playlists before dismissing.
 *
 * Issue 6 — Sorted by recency:
 *   Playlists are sorted by updatedAt descending (most recently modified first).
 *   `updatedAt` is already bumped by addTrackToPlaylist and removeTrackFromPlaylist,
 *   so playlists the user interacts with naturally rise to the top.
 *   Sorting is memoized and never re-computed during the open session unless
 *   the playlists array reference changes (i.e., when the store updates).
 */
import { useState, useMemo, useRef } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import { usePlaylistStore } from '@/store/usePlaylistStore';
import { useToastStore } from '@/store/useToastStore';
import { PlaylistArtwork } from '@/features/artwork';
import { sortPlaylistsByRecency } from '@/features/playlists/playlistSort';

interface PlaylistPickerSheetProps {
  isOpen:          boolean;
  onClose:         () => void;
  trackId:         string;
  trackTitle?:     string;
  trackCoverUrl?:  string;
}

const PlaylistPickerSheet = ({
  isOpen, onClose, trackId, trackTitle, trackCoverUrl,
}: PlaylistPickerSheetProps) => {
  const { playlists, addTrackToPlaylist, createPlaylist } = usePlaylistStore();
  const showToast = useToastStore((s) => s.show);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle,    setNewTitle]    = useState('');
  const [isCreating,  setIsCreating]  = useState(false);

  // Dedup protection: don't stack identical toasts from rapid taps.
  // Stores the last toast message + timestamp; if the same message was shown
  // within 800ms we skip showing it again.
  const lastToastRef = useRef<{ msg: string; at: number }>({ msg: '', at: 0 });

  const fireToast = (msg: string) => {
    const now = Date.now();
    if (lastToastRef.current.msg === msg && now - lastToastRef.current.at < 800) return;
    lastToastRef.current = { msg, at: now };
    showToast(msg, 'playlist');
  };

  // Issue 2: use centralized sort — 4-field priority (lastInteractedAt → lastPlayedAt → updatedAt → alpha)
  const sortedPlaylists = useMemo(
    () => sortPlaylistsByRecency(playlists),
    [playlists],
  );

  const isInPlaylist = (playlistId: string) =>
    playlists.find((p) => p.id === playlistId)?.trackIds.includes(trackId) ?? false;

  // Issue 4: toast feedback on toggle, with dedup guard
  const handleToggle = (playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    if (isInPlaylist(playlistId)) {
      usePlaylistStore.getState().removeTrackByTrackId(playlistId, trackId);
      fireToast(`Removed from ${playlist.title}`);
    } else {
      addTrackToPlaylist(playlistId, trackId);
      fireToast(`Added to ${playlist.title}`);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newTitle.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const created = await createPlaylist(newTitle.trim());
      if (created) {
        addTrackToPlaylist(created.id, trackId);
        setNewTitle('');
        setShowNewForm(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setShowNewForm(false);
    setNewTitle('');
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>

      {/* Issue 3: Sticky header — song cover + title + artist */}
      {/* sticky top-0: sticks to the top of the scrollable BottomSheet container */}
      <div className="sticky top-0 z-10 bg-[#18181F] border-b border-swara-border px-5 pt-3 pb-3 flex items-center gap-3 flex-shrink-0">
        {/* Track cover — small, elegant, left-aligned */}
        {trackCoverUrl && (
          <img
            src={trackCoverUrl}
            alt=""
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
            loading="lazy"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] font-semibold text-swara-text">Add to Playlist</p>
          {trackTitle && (
            <p className="text-[0.75rem] text-swara-muted mt-0.5 truncate">{trackTitle}</p>
          )}
        </div>
      </div>

      <div className="py-2">
        {/* New Playlist button / inline form */}
        {!showNewForm ? (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-4 w-full px-5 py-3.5 text-[0.9rem] font-medium text-swara-accent hover:bg-white/5 transition-colors text-left"
          >
            <span className="w-5 flex items-center justify-center flex-shrink-0 text-swara-accent">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </span>
            New Playlist
          </button>
        ) : (
          <div className="px-5 py-3 flex gap-2 items-center border-b border-swara-border/40">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateAndAdd();
                if (e.key === 'Escape') setShowNewForm(false);
              }}
              placeholder="Playlist name…"
              autoFocus
              className="flex-1 bg-swara-elevated rounded-lg px-3 py-2 text-[0.88rem] text-swara-text placeholder:text-swara-dim focus:outline-none focus:ring-1 focus:ring-swara-accent/40"
            />
            <button
              type="button"
              onClick={handleCreateAndAdd}
              disabled={!newTitle.trim() || isCreating}
              className="px-3 py-2 rounded-lg bg-swara-accent text-swara-bg text-[0.82rem] font-semibold disabled:opacity-50 transition-opacity active:scale-95"
            >
              {isCreating ? '…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setNewTitle(''); }}
              className="px-2 py-2 text-swara-dim hover:text-swara-muted transition-colors"
              aria-label="Cancel"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}

        {/* Empty state */}
        {playlists.length === 0 && !showNewForm && (
          <p className="px-5 py-6 text-[0.82rem] text-swara-dim text-center">
            No playlists yet. Create one above.
          </p>
        )}

        {/* Issue 5+6: sorted, toggle-based playlist rows */}
        {sortedPlaylists.map((playlist) => {
          const inPlaylist = isInPlaylist(playlist.id);
          return (
            <button
              key={playlist.id}
              type="button"
              onClick={() => handleToggle(playlist.id)}
              className="flex items-center gap-3.5 w-full px-5 py-3 text-left transition-colors hover:bg-white/5 active:bg-white/10"
            >
              {/* Playlist thumbnail */}
              <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden">
                <PlaylistArtwork playlist={playlist} size={0} className="w-full h-full" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[0.88rem] font-medium text-swara-text truncate">{playlist.title}</p>
                <p className="text-[0.72rem] text-swara-muted">{playlist.trackCount} tracks</p>
              </div>

              {/* Toggle checkmark — filled when in playlist, empty ring when not */}
              <div className={[
                'w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border transition-colors',
                inPlaylist
                  ? 'bg-swara-accent border-swara-accent'
                  : 'border-swara-border',
              ].join(' ')}>
                {inPlaylist && (
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none"
                    stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
};

export default PlaylistPickerSheet;
