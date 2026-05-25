/**
 * src/components/ui/CreateLibraryItemSheet.tsx
 *
 * Premium minimal sheet opened by the "+" button in the Library header.
 * Presents two options: "New Playlist" and "New Folder".
 * Inline name input for whichever the user picks.
 */
import { useState, useRef } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import { usePlaylistStore } from '@/store/usePlaylistStore';
import { useFolderStore }   from '@/store/useFolderStore';
import { useToastStore }    from '@/store/useToastStore';

interface CreateLibraryItemSheetProps {
  isOpen:  boolean;
  onClose: () => void;
}

type Mode = null | 'playlist' | 'folder';

const CreateLibraryItemSheet = ({ isOpen, onClose }: CreateLibraryItemSheetProps) => {
  const { createPlaylist } = usePlaylistStore();
  const { createFolder }   = useFolderStore();
  const showToast = useToastStore((s) => s.show);

  const [mode,       setMode]       = useState<Mode>(null);
  const [name,       setName]       = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setMode(null); setName(''); };
  const handleClose = () => { reset(); onClose(); };

  const pickMode = (m: Mode) => {
    setMode(m);
    // Focus after animation frame
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleCreate = async () => {
    if (!name.trim() || isCreating) return;
    setIsCreating(true);
    try {
      if (mode === 'playlist') {
        await createPlaylist(name.trim());
        showToast(`Playlist "${name.trim()}" created`, 'playlist');
      } else if (mode === 'folder') {
        createFolder(name.trim());
        showToast(`Folder "${name.trim()}" created`, 'check');
      }
      handleClose();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="px-5 pt-4 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[0.95rem] font-semibold text-swara-text">
            {mode === null ? 'Add to Library' : mode === 'playlist' ? 'New Playlist' : 'New Folder'}
          </h2>
          <button type="button" onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-swara-dim hover:text-swara-muted"
            aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {mode === null ? (
          /* Choice stage */
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => pickMode('playlist')}
              className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl bg-swara-card border border-swara-border hover:border-swara-border/80 hover:bg-swara-elevated text-left transition-all active:scale-[0.98]">
              <div className="w-9 h-9 rounded-xl bg-swara-elevated flex items-center justify-center flex-shrink-0 text-swara-accent">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
              <div>
                <p className="text-[0.88rem] font-semibold text-swara-text">New Playlist</p>
                <p className="text-[0.72rem] text-swara-dim mt-0.5">Collect your favorite tracks</p>
              </div>
            </button>

            <button type="button" onClick={() => pickMode('folder')}
              className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl bg-swara-card border border-swara-border hover:border-swara-border/80 hover:bg-swara-elevated text-left transition-all active:scale-[0.98]">
              <div className="w-9 h-9 rounded-xl bg-swara-elevated flex items-center justify-center flex-shrink-0 text-swara-muted">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                </svg>
              </div>
              <div>
                <p className="text-[0.88rem] font-semibold text-swara-text">New Folder</p>
                <p className="text-[0.72rem] text-swara-dim mt-0.5">Group playlists together</p>
              </div>
            </button>
          </div>
        ) : (
          /* Name input stage */
          <div className="flex flex-col gap-4">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') reset();
              }}
              placeholder={mode === 'playlist' ? 'Playlist name…' : 'Folder name…'}
              maxLength={80}
              className="w-full bg-swara-card border border-swara-border rounded-xl px-3.5 py-2.5 text-[0.9rem] text-swara-text placeholder:text-swara-dim focus:outline-none focus:border-swara-accent/50 transition-colors"
            />
            <div className="flex gap-2">
              <button type="button" onClick={reset}
                className="flex-1 h-10 rounded-xl border border-swara-border text-swara-muted text-[0.85rem] font-medium hover:text-swara-text transition-colors">
                Back
              </button>
              <button type="button" onClick={handleCreate}
                disabled={!name.trim() || isCreating}
                className="flex-1 h-10 rounded-xl bg-swara-accent text-swara-bg text-[0.85rem] font-semibold disabled:opacity-40 active:scale-95 transition-transform">
                {isCreating ? '…' : 'Create'}
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};

export default CreateLibraryItemSheet;
