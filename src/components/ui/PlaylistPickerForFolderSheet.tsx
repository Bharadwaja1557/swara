/**
 * src/components/ui/PlaylistPickerForFolderSheet.tsx
 *
 * "Add playlists to folder" bottom sheet.
 * INVERSE of FolderPickerSheet:
 *   FolderPickerSheet       = given a playlist, pick which FOLDERS contain it
 *   PlaylistPickerForFolder = given a folder,   pick which PLAYLISTS belong to it
 *
 * Shows all user playlists. Each row toggles membership in the target folder.
 * Sorted by recency (lastInteractedAt → updatedAt).
 * Checkmark appears when playlist is in the folder.
 * Sheet stays open — user can toggle multiple playlists before closing.
 */
import { useMemo, useRef } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import { usePlaylistStore } from '@/store/usePlaylistStore';
import { useFolderStore }   from '@/store/useFolderStore';
import { useToastStore }    from '@/store/useToastStore';
import { PlaylistArtwork }  from '@/features/artwork';
import { sortPlaylistsByRecency } from '@/features/playlists/playlistSort';

interface PlaylistPickerForFolderSheetProps {
  isOpen:       boolean;
  onClose:      () => void;
  folderId:     string;
  folderName?:  string;
}

const PlaylistPickerForFolderSheet = ({
  isOpen, onClose, folderId, folderName,
}: PlaylistPickerForFolderSheetProps) => {
  const { playlists }           = usePlaylistStore();
  const { getFolder, togglePlaylistInFolder } = useFolderStore();
  const showToast               = useToastStore((s) => s.show);

  // Dedup toast guard
  const lastToastRef = useRef<{ msg: string; at: number }>({ msg: '', at: 0 });
  const fireToast = (msg: string) => {
    const now = Date.now();
    if (lastToastRef.current.msg === msg && now - lastToastRef.current.at < 800) return;
    lastToastRef.current = { msg, at: now };
    showToast(msg, 'playlist');
  };

  // Sorted playlists — recency first
  const sorted = useMemo(() => sortPlaylistsByRecency(playlists), [playlists]);

  // Live membership from folder store (reactive)
  const isInFolder = (playlistId: string) =>
    getFolder(folderId)?.playlistIds.includes(playlistId) ?? false;

  const handleToggle = (playlistId: string, playlistTitle: string) => {
    const nowIn = togglePlaylistInFolder(folderId, playlistId);
    fireToast(nowIn
      ? `Added "${playlistTitle}" to folder`
      : `Removed "${playlistTitle}" from folder`);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#18181F] border-b border-swara-border px-5 pt-3 pb-3 flex-shrink-0">
        <p className="text-[0.95rem] font-semibold text-swara-text">Add Playlists</p>
        {folderName && (
          <p className="text-[0.75rem] text-swara-muted mt-0.5 truncate">to "{folderName}"</p>
        )}
      </div>

      <div className="py-2">
        {sorted.length === 0 && (
          <p className="px-5 py-6 text-[0.82rem] text-swara-dim text-center">
            No playlists yet. Create one from your library.
          </p>
        )}

        {sorted.map((playlist) => {
          const inFolder = isInFolder(playlist.id);
          return (
            <button
              key={playlist.id}
              type="button"
              onClick={() => handleToggle(playlist.id, playlist.title)}
              className="flex items-center gap-3.5 w-full px-5 py-3 text-left hover:bg-white/5 active:bg-white/10 transition-colors"
            >
              {/* Playlist artwork */}
              <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden">
                <PlaylistArtwork playlist={playlist} size={0} className="w-full h-full" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[0.88rem] font-medium text-swara-text truncate">{playlist.title}</p>
                <p className="text-[0.72rem] text-swara-muted">
                  {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}
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

export default PlaylistPickerForFolderSheet;
