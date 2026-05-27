/**
 * src/features/playlists/PlaylistEditModal.tsx
 *
 * Edit playlist: name, visibility, cover (preset / upload), delete.
 *
 * COVER PRIORITY (preserved from existing architecture):
 *   1. Uploaded custom image (coverImageUrl)
 *   2. Selected built-in preset (coverId)
 *   3. Auto-generated collage (resolvePlaylistArtwork)
 *   Removing a custom cover or preset returns to auto-generated collage.
 *
 * COVER UPLOAD PIPELINE:
 *   File → resizeToWebp (512×512, q=0.82) → Supabase Storage → coverImageUrl in DB
 *   Bucket: 'playlist-covers', path: '{userId}/{playlistId}.webp'
 *   Optimistic: shows preview immediately; uploads in background.
 *
 * VISIBILITY:
 *   isPublic boolean mapped to 'private' | 'public' radio control.
 *   Small muted pill display on PlaylistPage.
 *
 * DELETE:
 *   Two-step inline confirmation, no second modal.
 *   On confirm → deletePlaylist → onDeleted callback → caller navigates.
 */
import { useState, useEffect, useRef } from 'react';
import { usePlaylistStore } from '@/store/usePlaylistStore';
import { useAuthStore }     from '@/store/useAuthStore';
import { supabase }         from '@/lib/supabase';
import { resizeToWebp, validateImageMime } from '@/lib/image/resizeToWebp';
import BottomSheet          from '@/components/ui/BottomSheet';
import { PLAYLIST_COVERS }  from './coverRegistry';
import type { Playlist }    from '@/store/usePlaylistStore';

const COVER_BUCKET = 'playlist-covers';

interface PlaylistEditModalProps {
  playlist:   Playlist;
  isOpen:     boolean;
  onClose:    () => void;
  onDeleted?: () => void;
}

const PlaylistEditModal = ({
  playlist, isOpen, onClose, onDeleted,
}: PlaylistEditModalProps) => {
  const { renamePlaylist, updateCoverId, updateCover, deletePlaylist, togglePublic } = usePlaylistStore();
  const userId = useAuthStore((s) => s.user?.id);

  const [name,         setName]         = useState(playlist.title);
  const [confirmDel,   setConfirmDel]   = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState<string | null>(null);
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { setName(playlist.title); }, [playlist.title]);
  useEffect(() => {
    if (!isOpen) { setConfirmDel(false); setUploadError(null); setPreviewUrl(null); }
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => requestAnimationFrame(() => inputRef.current?.focus()), 320);
    return () => clearTimeout(t);
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== playlist.title) renamePlaylist(playlist.id, trimmed);
    onClose();
  };

  const handleCoverSelect = (id: string) => {
    // Clicking selected preset deselects it → restores collage
    updateCoverId(playlist.id, playlist.coverId === id ? null : id);
    // Clear any uploaded cover if preset is selected
    if (playlist.coverId !== id && playlist.coverImageUrl) {
      updateCover(playlist.id, null);
    }
  };

  const handleClearCover = () => {
    updateCoverId(playlist.id, null);
    updateCover(playlist.id, null);
    setPreviewUrl(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Reset file input immediately so the same file can be re-selected after an error
    if (fileRef.current) fileRef.current.value = '';

    // ── MIME validation BEFORE showing preview ────────────────────────────
    // validateImageMime throws a human-readable string on unsupported formats.
    try {
      validateImageMime(file);
    } catch (msg) {
      setUploadError(typeof msg === 'string' ? msg : 'Unsupported file type.');
      return;
    }

    // Show local preview optimistically — only AFTER format is confirmed valid
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);
    setUploadError(null);

    try {
      const { blob, extension, mimeType } = await resizeToWebp(file);
      const storagePath = `${userId}/${playlist.id}.${extension}`;

      const { error: uploadErr } = await supabase.storage
        .from(COVER_BUCKET)
        .upload(storagePath, blob, {
          contentType:  mimeType,
          upsert:       true,
          cacheControl: '3600',
        });

      if (uploadErr) throw uploadErr.message;

      const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(storagePath);
      const publicUrl = data.publicUrl;

      // Persist to store + DB; clear preset — custom cover takes priority 1
      updateCover(playlist.id, publicUrl);
      updateCoverId(playlist.id, null);
      // Preview served its purpose — real URL is now in playlist.coverImageUrl
      URL.revokeObjectURL(localUrl);
      setPreviewUrl(null);
    } catch (err) {
      console.error('[PlaylistEdit] cover upload failed:', err);
      const msg = typeof err === 'string' ? err : 'Upload failed — please try again.';
      setUploadError(msg);
      // Clean up preview — do NOT leave a broken object URL in the UI
      URL.revokeObjectURL(localUrl);
      setPreviewUrl(null);
      // Important: do NOT call updateCover here — previous cover stays intact
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = () => {
    deletePlaylist(playlist.id);
    onClose();
    onDeleted?.();
  };

  const currentCoverId = playlist.coverId;
  const hasCustomCover = !!(playlist.coverImageUrl || currentCoverId);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pt-4 pb-1">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[0.95rem] font-semibold text-swara-text">Edit Playlist</h2>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-swara-dim hover:text-swara-muted transition-colors"
            aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
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

        {/* Visibility */}
        <div className="mb-5">
          <label className="block text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-2">
            Visibility
          </label>
          <div className="flex gap-2">
            {(['private', 'public'] as const).map((v) => {
              const active = v === 'public' ? playlist.isPublic : !playlist.isPublic;
              return (
                <button key={v} type="button"
                  onClick={() => { if ((v === 'public') !== playlist.isPublic) togglePublic(playlist.id); }}
                  className={[
                    'flex-1 h-9 rounded-xl border text-[0.82rem] font-medium capitalize transition-all',
                    active
                      ? 'bg-swara-accent/10 border-swara-accent text-swara-accent'
                      : 'border-swara-border text-swara-muted hover:text-swara-text',
                  ].join(' ')}
                  aria-pressed={active}>
                  {v === 'private' ? '🔒 Private' : '🌐 Public'}
                </button>
              );
            })}
          </div>
          <p className="text-[0.68rem] text-swara-dim mt-1.5">
            {playlist.isPublic ? 'Visible to others (shareable in future)' : 'Only visible to you'}
          </p>
        </div>

        {/* Cover */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase">
              Cover
            </label>
            {hasCustomCover && (
              <button type="button" onClick={handleClearCover}
                className="text-[0.7rem] text-swara-dim hover:text-swara-muted transition-colors">
                Use auto-generated
              </button>
            )}
          </div>

          {/* Upload button */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            aria-label="Upload cover image"
          />
          <button type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || !userId}
            className={[
              'flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl border text-left mb-3 transition-all',
              uploading
                ? 'border-swara-accent/40 text-swara-accent opacity-70 cursor-wait'
                : 'border-swara-border text-swara-muted hover:text-swara-text hover:border-swara-border/80',
            ].join(' ')}>
            {/* Preview or icon */}
            {(previewUrl || playlist.coverImageUrl) ? (
              <img src={previewUrl ?? playlist.coverImageUrl}
                alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-[0.82rem] font-medium">
                {uploading ? 'Uploading…' : playlist.coverImageUrl ? 'Change photo' : 'Upload photo'}
              </span>
              {!uploading && (
                <p className="text-[0.68rem] text-swara-dim">Resized to 512×512 WebP automatically</p>
              )}
            </div>
          </button>
          {uploadError && (
            <p className="text-[0.72rem] text-red-400 mb-2">{uploadError}</p>
          )}

          {/* Preset grid */}
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
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="black"
                        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

        {/* Delete */}
        <div className="border-t border-swara-border pt-4 pb-5">
          {!confirmDel ? (
            <button type="button" onClick={() => setConfirmDel(true)}
              className="flex items-center gap-2 text-[0.82rem] text-red-400/70 hover:text-red-400 transition-colors w-full justify-center py-1">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
