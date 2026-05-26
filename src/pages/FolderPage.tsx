/**
 * src/pages/FolderPage.tsx
 *
 * Route: /folder/:id
 *
 * Shows the playlists inside a folder.
 * Visually mirrors PlaylistPage: sticky back bar, hero, controls bar, content list.
 * No songs directly — folders contain playlists only.
 */
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFolderStore }    from '@/store/useFolderStore';
import { usePlaylistStore }  from '@/store/usePlaylistStore';
import LibraryRow            from '@/components/ui/LibraryRow';
import FolderArtwork         from '@/components/ui/FolderArtwork';
import PlaylistPickerForFolderSheet from '@/components/ui/PlaylistPickerForFolderSheet';

const FolderPage = () => {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const { getFolder, renameFolder, deleteFolder, removePlaylistFromFolder } = useFolderStore();
  const { playlists } = usePlaylistStore();

  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState('');
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [addOpen,     setAddOpen]     = useState(false);

  const folder = id ? getFolder(id) : undefined;

  // Resolve playlists from folder.playlistIds
  const folderPlaylists = (folder?.playlistIds ?? [])
    .map((pid) => playlists.find((p) => p.id === pid))
    .filter(Boolean) as typeof playlists;

  const handleRename = useCallback(() => {
    if (!id || !nameInput.trim()) return;
    renameFolder(id, nameInput.trim());
    setEditingName(false);
  }, [id, nameInput, renameFolder]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    deleteFolder(id);
    navigate('/library', { replace: true });
  }, [id, deleteFolder, navigate]);

  if (!folder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <p className="text-swara-muted text-sm">Folder not found</p>
        <button type="button" onClick={() => navigate(-1)} className="text-swara-accent text-sm">Go back</button>
      </div>
    );
  }

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
      <div className="px-6 lg:px-10 mb-4 lg:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:gap-10">
            <div className="flex justify-center lg:justify-start mb-5 lg:mb-0 flex-shrink-0">
              <FolderArtwork
                folder={folder}
                size={0}
                className="w-[200px] h-[200px] lg:w-[280px] lg:h-[280px] rounded-2xl"
                style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
              />
            </div>

          {/* Meta */}
          <div className="lg:flex-1 lg:min-w-0 lg:pb-1">
            <p className="hidden lg:block text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-swara-dim mb-2">
              Folder
            </p>

            {/* Editable name */}
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  autoFocus
                  className="flex-1 text-[1.3rem] lg:text-[2.6rem] font-bold bg-transparent border-b border-swara-accent text-swara-text focus:outline-none"
                />
                <button type="button" onClick={handleRename}
                  className="text-swara-accent text-[0.82rem] font-semibold">Save</button>
                <button type="button" onClick={() => setEditingName(false)}
                  className="text-swara-dim text-[0.82rem]">Cancel</button>
              </div>
            ) : (
              <h1 className="text-[1.3rem] lg:text-[2.6rem] font-bold text-swara-text tracking-tight font-display mb-0.5 lg:mb-2 lg:leading-none">
                {folder.name}
              </h1>
            )}

            <p className="text-xs lg:text-[0.92rem] text-swara-muted mt-0.5 lg:mt-1.5">
              {folderPlaylists.length} {folderPlaylists.length === 1 ? 'playlist' : 'playlists'}
            </p>

            {/* Action pills */}
            <div className="flex items-center gap-2 mt-2">
              <button type="button" onClick={() => { setNameInput(folder.name); setEditingName(true); }}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-swara-border text-swara-muted hover:text-swara-text text-[0.72rem] font-medium transition-all">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Rename
              </button>
              <button type="button" onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-swara-border text-swara-muted hover:text-swara-text text-[0.72rem] font-medium transition-all">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add playlists
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 lg:mx-10 h-px bg-swara-border opacity-50 mb-4" />

      {/* Content */}
      <div className="px-4 lg:px-8 pb-8">
        {folderPlaylists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
            <div className="w-16 h-16 rounded-2xl bg-swara-elevated flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none"
                stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <p className="text-[0.9rem] font-semibold text-swara-muted">No playlists yet</p>
            <p className="text-[0.78rem] text-swara-dim text-center max-w-[230px] leading-relaxed">
              Use "Add playlists" above to add playlists to this folder.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {folderPlaylists.map((pl) => (
              <div key={pl.id} className="flex items-center gap-0 group">
                <LibraryRow
                  title={pl.title}
                  subtitle={`${pl.trackCount} tracks`}
                  playlist={pl}
                  coverShape="square"
                  showChevron
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                />
                {/* Remove from folder button */}
                <button
                  type="button"
                  onClick={() => id && removePlaylistFromFolder(id, pl.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-swara-dim hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                  aria-label={`Remove ${pl.title} from folder`}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Delete folder — destructive, at bottom */}
        <div className="mt-8 border-t border-swara-border pt-5">
          {!confirmDel ? (
            <button type="button" onClick={() => setConfirmDel(true)}
              className="flex items-center gap-2 text-[0.82rem] text-red-400/70 hover:text-red-400 transition-colors mx-auto">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Delete folder
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="text-[0.82rem] text-swara-muted text-center">
                Delete "<span className="text-swara-text font-medium">{folder.name}</span>"? Playlists inside will not be deleted.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDel(false)}
                  className="px-4 h-9 rounded-xl border border-swara-border text-swara-muted text-[0.82rem] font-medium hover:text-swara-text">
                  Cancel
                </button>
                <button type="button" onClick={handleDelete}
                  className="px-4 h-9 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-[0.82rem] font-semibold hover:bg-red-500/25">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PlaylistPickerForFolderSheet — shows PLAYLISTS, toggles which belong to this folder.
          Distinct from FolderPickerSheet (which shows FOLDERS, for a given playlist). */}
      {folder && (
        <PlaylistPickerForFolderSheet
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          folderId={folder.id}
          folderName={folder.name}
        />
      )}
    </div>
  );
};

export default FolderPage;
