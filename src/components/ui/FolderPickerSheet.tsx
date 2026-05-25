/**
 * src/components/ui/FolderPickerSheet.tsx
 *
 * "Add to Folder" bottom sheet / floating modal.
 * Allows toggling a playlist's membership in one or more folders.
 * Follows the same pattern as PlaylistPickerSheet.
 */
import { useState, useMemo } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import { useFolderStore } from '@/store/useFolderStore';
import { useToastStore }  from '@/store/useToastStore';
import { useRef } from 'react';

interface FolderPickerSheetProps {
  isOpen:       boolean;
  onClose:      () => void;
  playlistId:   string;
  playlistTitle?: string;
}

const FolderPickerSheet = ({
  isOpen, onClose, playlistId, playlistTitle,
}: FolderPickerSheetProps) => {
  const { folders, togglePlaylistInFolder, createFolder } = useFolderStore();
  const showToast = useToastStore((s) => s.show);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName,     setNewName]     = useState('');
  const [isCreating,  setIsCreating]  = useState(false);

  const lastToastRef = useRef<{ msg: string; at: number }>({ msg: '', at: 0 });
  const fireToast = (msg: string) => {
    const now = Date.now();
    if (lastToastRef.current.msg === msg && now - lastToastRef.current.at < 800) return;
    lastToastRef.current = { msg, at: now };
    showToast(msg, 'check');
  };

  // Sort folders: most recently updated first
  const sortedFolders = useMemo(() =>
    [...folders].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
  [folders]);

  const isInFolder = (folderId: string) =>
    folders.find((f) => f.id === folderId)?.playlistIds.includes(playlistId) ?? false;

  const handleToggle = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    const nowIn = togglePlaylistInFolder(folderId, playlistId);
    fireToast(nowIn ? `Added to ${folder.name}` : `Removed from ${folder.name}`);
  };

  const handleCreate = () => {
    if (!newName.trim() || isCreating) return;
    setIsCreating(true);
    const folder = createFolder(newName.trim());
    togglePlaylistInFolder(folder.id, playlistId);
    fireToast(`Added to ${folder.name}`);
    setNewName('');
    setShowNewForm(false);
    setIsCreating(false);
  };

  const handleClose = () => {
    setShowNewForm(false);
    setNewName('');
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#18181F] border-b border-swara-border px-5 pt-3 pb-3 flex-shrink-0">
        <p className="text-[0.95rem] font-semibold text-swara-text">Add to Folder</p>
        {playlistTitle && (
          <p className="text-[0.75rem] text-swara-muted mt-0.5 truncate">{playlistTitle}</p>
        )}
      </div>

      <div className="py-2">
        {/* New Folder button / inline form */}
        {!showNewForm ? (
          <button type="button" onClick={() => setShowNewForm(true)}
            className="flex items-center gap-4 w-full px-5 py-3.5 text-[0.9rem] font-medium text-swara-accent hover:bg-white/5 transition-colors text-left">
            <span className="w-5 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </span>
            New Folder
          </button>
        ) : (
          <div className="px-5 py-3 flex gap-2 items-center border-b border-swara-border/40">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setShowNewForm(false);
              }}
              placeholder="Folder name…"
              autoFocus
              className="flex-1 bg-swara-elevated rounded-lg px-3 py-2 text-[0.88rem] text-swara-text placeholder:text-swara-dim focus:outline-none focus:ring-1 focus:ring-swara-accent/40"
            />
            <button type="button" onClick={handleCreate}
              disabled={!newName.trim() || isCreating}
              className="px-3 py-2 rounded-lg bg-swara-accent text-swara-bg text-[0.82rem] font-semibold disabled:opacity-50 active:scale-95">
              Create
            </button>
            <button type="button" onClick={() => { setShowNewForm(false); setNewName(''); }}
              className="px-2 py-2 text-swara-dim hover:text-swara-muted" aria-label="Cancel">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}

        {folders.length === 0 && !showNewForm && (
          <p className="px-5 py-6 text-[0.82rem] text-swara-dim text-center">
            No folders yet. Create one above.
          </p>
        )}

        {sortedFolders.map((folder) => {
          const inFolder = isInFolder(folder.id);
          return (
            <button key={folder.id} type="button" onClick={() => handleToggle(folder.id)}
              className="flex items-center gap-3.5 w-full px-5 py-3 text-left hover:bg-white/5 active:bg-white/10 transition-colors">
              {/* Folder icon */}
              <div className="w-10 h-10 rounded-lg bg-swara-elevated flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                  stroke={inFolder ? '#c8a96e' : 'currentColor'}
                  strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim" aria-hidden="true">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.88rem] font-medium text-swara-text truncate">{folder.name}</p>
                <p className="text-[0.72rem] text-swara-muted">
                  {folder.playlistIds.length} playlist{folder.playlistIds.length !== 1 ? 's' : ''}
                </p>
              </div>
              {/* Toggle indicator */}
              <div className={[
                'w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border transition-colors',
                inFolder ? 'bg-swara-accent border-swara-accent' : 'border-swara-border',
              ].join(' ')}>
                {inFolder && (
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

export default FolderPickerSheet;
