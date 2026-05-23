/**
 * src/features/playlists/PlaylistEditModal.tsx
 *
 * Edit playlist name, cover, and destructive delete action.
 *
 * COVER TOGGLE (Issue 3):
 *   Clicking a selected preset again DESELECTS it → restores adaptive collage.
 *   updateCoverId(id, null) clears the coverId, falling back to collage/placeholder.
 *   An explicit "Auto-generated" option makes the reset behavior discoverable.
 *
 * DELETE (Issue 2):
 *   Two-step confirmation inline in the modal (no second modal).
 *   Destructive red accent, separated by a divider.
 *   On confirm: deletePlaylist → caller navigates away.
 *
 * KEYBOARD BUG FIX (preserved):
 *   Component only mounted when editOpen=true.
 *   No autoFocus — input focused via ref after animation (320ms).
 */
import { useState, useEffect, useRef } from 'react';
import { usePlaylistStore } from '@/store/usePlaylistStore';
import BottomSheet from '@/components/ui/BottomSheet';
import { PLAYLIST_COVERS } from './coverRegistry';
import type { Playlist } from '@/store/usePlaylistStore';

interface PlaylistEditModalProps {
  playlist:   Playlist;
  isOpen:     boolean;
  onClose:    () => void;
  /** Called after successful deletion so caller can navigate away. */
  onDeleted?: () => void;
}

const PlaylistEditModal = ({
  playlist, isOpen, onClose, onDeleted,
}: PlaylistEditModalProps) => {
  const { renamePlaylist, updateCoverId, deletePlaylist } = usePlaylistStore();
  const [name,        setName]        = useState(playlist.title);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync name on external changes (e.g. renamed from another surface)
  useEffect(() => { setName(playlist.title); }, [playlist.title]);

  // Reset confirm state when modal closes
  useEffect(() => {
    if (!isOpen) setConfirmDel(false);
  }, [isOpen]);

  // Focus input after open animation — never on page mount
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      requestAnimationFrame(() => inputRef.current?.focus());
    }, 320);
    return () => clearTimeout(t);
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== playlist.title) renamePlaylist(playlist.id, trimmed);
    onClose();
  };

  // Issue 3: toggle — same cover clicked → deselect (null) → restores collage
  const handleCoverSelect = (id: string) => {
    updateCoverId(playlist.id, playlist.coverId === id ? null : id);
  };

  const handleClearCover = () => {
    updateCoverId(playlist.id, null);
  };

  const handleDelete = () => {
    deletePlaylist(playlist.id);
    onClose();
    onDeleted?.();
  };

  const currentCoverId = playlist.coverId;
  const hasCustomCover = !!currentCoverId || !!playlist.coverImageUrl;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pt-4 pb-1">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[0.95rem] font-semibold text-swara-text">Edit Playlist</h2>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-swara-dim hover:text-swara-muted transition-colors"
            aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Name */}
        <div className="mb-5">
          <label className="block text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-2">
            Name
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            className="w-full bg-swara-card border border-swara-border rounded-xl px-3.5 py-2.5 text-[0.9rem] text-swara-text placeholder:text-swara-dim focus:outline-none focus:border-swara-accent/50 transition-colors"
            placeholder="Playlist name"
            maxLength={80}
          />
        </div>

        {/* Cover picker */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase">
              Cover
            </label>
            {/* Issue 3: explicit "reset to auto-generated" when a cover is set */}
            {hasCustomCover && (
              <button type="button" onClick={handleClearCover}
                className="text-[0.7rem] text-swara-dim hover:text-swara-muted transition-colors">
                Use auto-generated
              </button>
            )}
          </div>

          {/* Upload — disabled coming soon */}
          <button type="button" disabled
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl border border-swara-border text-swara-dim opacity-40 cursor-not-allowed mb-3">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span className="text-[0.82rem] font-medium">Upload your own</span>
            <span className="ml-auto text-[0.7rem] font-medium bg-swara-elevated px-2 py-0.5 rounded-full">Coming soon</span>
          </button>

          {/* Preset grid — click same = deselect */}
          <div className="grid grid-cols-5 gap-2">
            {PLAYLIST_COVERS.map((cover) => {
              const isSelected = currentCoverId === cover.id;
              return (
                <button key={cover.id} type="button"
                  onClick={() => handleCoverSelect(cover.id)}
                  className={['relative flex flex-col items-center gap-1.5 p-1.5 rounded-xl border-2 transition-all',
                    isSelected ? 'border-swara-accent' : 'border-transparent hover:border-swara-border'].join(' ')}
                  aria-label={`${isSelected ? 'Deselect' : 'Select'} ${cover.label} cover`}
                  aria-pressed={isSelected}>
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-swara-elevated">
                    <img src={cover.url} alt={cover.label} className="w-full h-full object-cover" draggable={false} />
                  </div>
                  <span className={['text-[0.6rem] font-medium truncate w-full text-center',
                    isSelected ? 'text-swara-accent' : 'text-swara-dim'].join(' ')}>
                    {cover.label}
                  </span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-swara-accent rounded-full flex items-center justify-center">
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-swara-border text-swara-muted hover:text-swara-text text-[0.85rem] font-medium transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={!name.trim()}
            className="flex-1 h-10 rounded-xl bg-swara-accent text-swara-bg text-[0.85rem] font-semibold active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed">
            Save
          </button>
        </div>

        {/* Delete — destructive, separated by divider */}
        <div className="border-t border-swara-border pt-4 pb-5">
          {!confirmDel ? (
            <button type="button" onClick={() => setConfirmDel(true)}
              className="flex items-center gap-2 text-[0.82rem] text-red-400/70 hover:text-red-400 transition-colors w-full justify-center py-1">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Delete playlist
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[0.8rem] text-swara-muted text-center">
                Delete "<span className="text-swara-text font-medium">{playlist.title}</span>"? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDel(false)}
                  className="flex-1 h-9 rounded-xl border border-swara-border text-swara-muted text-[0.82rem] font-medium transition-colors hover:text-swara-text">
                  Cancel
                </button>
                <button type="button" onClick={handleDelete}
                  className="flex-1 h-9 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-[0.82rem] font-semibold hover:bg-red-500/25 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </BottomSheet>
  );
};

export default PlaylistEditModal;
