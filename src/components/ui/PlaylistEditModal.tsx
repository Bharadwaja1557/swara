/**
 * PlaylistEditModal — edit playlist name + pick a built-in cover.
 *
 * Uses BottomSheet (already responsive: floating panel on desktop,
 * bottom sheet on mobile) as the surface.
 *
 * COVER SELECTION:
 *   Five built-in variants (v1–v5) rendered as selectable radio cards.
 *   A disabled "Upload your own — Coming soon" option sits above them.
 *
 *   Selection is optimistic: updateCoverVariant() writes to localStorage
 *   immediately and updates every consumer (PlaylistPage cover, LibraryPanel
 *   thumbnail, etc.) via Zustand subscription.
 *
 * SAVE:
 *   Name: calls renamePlaylist() on save if changed.
 *   Cover: applied immediately on card click (optimistic) so preview is live.
 */
import { useState, useEffect } from 'react';
import { usePlaylistStore } from '@/store/usePlaylistStore';
import BottomSheet from '@/components/ui/BottomSheet';
import { COVER_VARIANTS, type CoverVariantKey } from '@/components/ui/PlaylistCover';
import type { Playlist } from '@/store/usePlaylistStore';

interface PlaylistEditModalProps {
  playlist:  Playlist;
  isOpen:    boolean;
  onClose:   () => void;
}

const PlaylistEditModal = ({ playlist, isOpen, onClose }: PlaylistEditModalProps) => {
  const { renamePlaylist, updateCoverVariant } = usePlaylistStore();

  const [name, setName] = useState(playlist.title);

  // Keep local name in sync if the playlist prop changes (e.g. after a rename
  // from another surface) while the modal is closed.
  useEffect(() => {
    if (!isOpen) setName(playlist.title);
  }, [isOpen, playlist.title]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== playlist.title) {
      renamePlaylist(playlist.id, trimmed);
    }
    onClose();
  };

  const handleVariantSelect = (key: CoverVariantKey) => {
    // Optimistic — immediate update everywhere via Zustand
    updateCoverVariant(playlist.id, key);
  };

  const currentVariant = playlist.coverVariant;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pt-4 pb-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[0.95rem] font-semibold text-swara-text">Edit Playlist</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-swara-dim hover:text-swara-muted transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Name input */}
        <div className="mb-5">
          <label className="block text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-2">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            className="w-full bg-swara-card border border-swara-border rounded-xl px-3.5 py-2.5 text-[0.9rem] text-swara-text placeholder:text-swara-dim focus:outline-none focus:border-swara-accent/50 transition-colors"
            placeholder="Playlist name"
            maxLength={80}
            autoFocus
          />
        </div>

        {/* Cover section */}
        <div className="mb-5">
          <label className="block text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-3">
            Cover
          </label>

          {/* Upload — disabled, coming soon */}
          <button
            type="button"
            disabled
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl border border-swara-border text-swara-dim opacity-40 cursor-not-allowed mb-3"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span className="text-[0.82rem] font-medium">Upload your own</span>
            <span className="ml-auto text-[0.7rem] font-medium bg-swara-elevated px-2 py-0.5 rounded-full">
              Coming soon
            </span>
          </button>

          {/* Built-in variant grid */}
          <div className="grid grid-cols-5 gap-2">
            {COVER_VARIANTS.map((variant) => {
              const isSelected = currentVariant === variant.key;
              return (
                <button
                  key={variant.key}
                  type="button"
                  onClick={() => handleVariantSelect(variant.key)}
                  className={[
                    'relative flex flex-col items-center gap-1.5 p-1.5 rounded-xl border-2 transition-all',
                    isSelected
                      ? 'border-swara-accent'
                      : 'border-transparent hover:border-swara-border',
                  ].join(' ')}
                  aria-label={`Select ${variant.label} cover`}
                  aria-pressed={isSelected}
                >
                  {/* Cover preview */}
                  <div className="w-full aspect-square rounded-lg overflow-hidden">
                    {variant.render(64)}
                  </div>
                  {/* Label */}
                  <span className={[
                    'text-[0.6rem] font-medium truncate w-full text-center',
                    isSelected ? 'text-swara-accent' : 'text-swara-dim',
                  ].join(' ')}>
                    {variant.label}
                  </span>
                  {/* Selected checkmark */}
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

        {/* Actions */}
        <div className="flex gap-2 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-swara-border text-swara-muted hover:text-swara-text text-[0.85rem] font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 h-10 rounded-xl bg-swara-accent text-swara-bg text-[0.85rem] font-semibold active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default PlaylistEditModal;
