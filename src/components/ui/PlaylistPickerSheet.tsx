/**
 * PlaylistPickerSheet — bottom sheet for "Add to Playlist" action.
 *
 * Shows the user's existing playlists with checkmarks indicating which ones
 * already contain the track. Also provides "New Playlist" creation inline.
 *
 * Architecture:
 *   - Reads from usePlaylistStore (already synced on startup)
 *   - Optimistic adds via usePlaylistStore.addTrackToPlaylist()
 *   - "New Playlist" creates then immediately adds the track
 *   - Stacks on top of TrackMenuSheet via z-index layering (both use BottomSheet
 *     which is z-[90]; this sheet is also z-[90] but rendered after so it
 *     naturally sits on top with the backdrop covering the menu)
 */
import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import { usePlaylistStore } from '@/store/usePlaylistStore';

interface PlaylistPickerSheetProps {
  isOpen:   boolean;
  onClose:  () => void;
  trackId:  string;
  /** Optional: label shown in the header */
  trackTitle?: string;
}

const PlaylistPickerSheet = ({ isOpen, onClose, trackId, trackTitle }: PlaylistPickerSheetProps) => {
  const { playlists, addTrackToPlaylist, createPlaylist } = usePlaylistStore();

  const [showNewForm,    setShowNewForm]    = useState(false);
  const [newTitle,       setNewTitle]       = useState('');
  const [isCreating,     setIsCreating]     = useState(false);
  // Track which playlists were just added to in this session (optimistic feedback)
  const [justAdded,      setJustAdded]      = useState<Set<string>>(new Set());

  const handleAddToPlaylist = (playlistId: string) => {
    addTrackToPlaylist(playlistId, trackId);
    setJustAdded((prev) => new Set(prev).add(playlistId));
  };

  const handleCreateAndAdd = async () => {
    if (!newTitle.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const created = await createPlaylist(newTitle.trim());
      if (created) {
        addTrackToPlaylist(created.id, trackId);
        setJustAdded((prev) => new Set(prev).add(created.id));
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
    setJustAdded(new Set());
    onClose();
  };

  const isInPlaylist = (playlistId: string) =>
    justAdded.has(playlistId) ||
    (playlists.find((p) => p.id === playlistId)?.trackIds.includes(trackId) ?? false);

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      {/* Header */}
      <div className="px-5 pt-1 pb-3 border-b border-swara-border flex-shrink-0">
        <p className="text-[0.95rem] font-semibold text-swara-text">Add to Playlist</p>
        {trackTitle && (
          <p className="text-[0.75rem] text-swara-muted mt-0.5 truncate">{trackTitle}</p>
        )}
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
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndAdd(); if (e.key === 'Escape') setShowNewForm(false); }}
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

        {/* Existing playlists */}
        {playlists.length === 0 && !showNewForm && (
          <p className="px-5 py-6 text-[0.82rem] text-swara-dim text-center">
            No playlists yet. Create one above.
          </p>
        )}

        {playlists.map((playlist) => {
          const added = isInPlaylist(playlist.id);
          return (
            <button
              key={playlist.id}
              type="button"
              onClick={() => { if (!added) handleAddToPlaylist(playlist.id); }}
              className={[
                'flex items-center gap-3.5 w-full px-5 py-3 text-left transition-colors',
                added ? 'opacity-70 cursor-default' : 'hover:bg-white/5 active:bg-white/10',
              ].join(' ')}
            >
              {/* Playlist thumbnail */}
              <div
                className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center bg-swara-elevated"
                style={{ background: playlist.coverUrl ? undefined : 'rgba(200,169,106,0.12)' }}
              >
                {playlist.coverUrl ? (
                  <img src={playlist.coverUrl} alt="" className="w-full h-full rounded-lg object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(200,169,106,0.6)" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[0.88rem] font-medium text-swara-text truncate">{playlist.title}</p>
                <p className="text-[0.72rem] text-swara-muted">{playlist.trackCount} tracks</p>
              </div>

              {/* Checkmark if already in playlist */}
              {added && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#c8a96e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
};

export default PlaylistPickerSheet;
