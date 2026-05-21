/**
 * TrackMenuSheet — canonical track context menu, used everywhere in the app.
 *
 * ARCHITECTURE:
 *   Single source of truth for track actions. All pages that show track menus
 *   use this component instead of building their own.
 *
 * CONTEXT-AWARE ACTIONS:
 *   The `context` prop controls which actions appear:
 *
 *   'default'   → like, add-to-queue, library, divider, go-to-album, view-artists
 *   'player'    → like, add-to-playlist, library, divider, stash, go-to-album, view-artists
 *   'queue'     → like, divider, go-to-album, view-artists (no add-to-queue — already in queue)
 *   'liked'     → like (toggles unlike), go-to-album, view-artists
 *
 * FUTURE INTEGRATION:
 *   When playlists arrive, add:
 *     context: 'playlist'
 *     → show "Remove from Playlist" instead of add-to-queue
 *   No other files need to change.
 *
 * PROPS:
 *   track        — the Track to act on
 *   albumId      — used to look up full Album for library actions
 *   isOpen       — controls bottom sheet visibility
 *   onClose      — called on dismiss
 *   context      — which action set to render (defaults to 'default')
 *   onNavigate?  — called before any navigation (e.g. to collapse player)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLikedStore }       from '@/store/likedStore';
import { useUserLibraryStore } from '@/store/useUserLibraryStore';
import { useLibraryStore }     from '@/store/libraryStore';
import { trackActions }        from '@/lib/trackActions';
import { slugify }             from '@/utils/library';
import BottomSheet             from '@/components/ui/BottomSheet';
import ArtistPickerSheet       from '@/components/ui/ArtistPickerSheet';
import PlaylistPickerSheet     from '@/components/ui/PlaylistPickerSheet';
import type { Track }          from '@/types/music';

export type TrackMenuContext = 'default' | 'player' | 'queue' | 'liked' | 'playlist';

interface TrackMenuSheetProps {
  track:       Track;
  isOpen:      boolean;
  onClose:     () => void;
  context?:    TrackMenuContext;
  /** Called before any navigation action so caller can collapse player etc. */
  onNavigate?: () => void;
  /** Required when context='playlist' — the playlist this track belongs to */
  playlistId?: string;
  /** Callback when track is removed from playlist (context='playlist') */
  onRemoveFromPlaylist?: (entryId: string) => void;
  /** Entry ID of this track in the playlist (context='playlist') */
  entryId?: string;
}

// ── Icon SVGs (inline — no external deps) ────────────────────────────────────

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
);

const BookIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
);

const QueueIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <polyline points="3 6 4 7 6 5"/>
  </svg>
);

const PlaylistIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const AlbumIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18M9 21V9"/>
  </svg>
);

const ArtistIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

// ── MenuItem ─────────────────────────────────────────────────────────────────

const MenuItem = ({ icon, label, onClick, accent }: {
  icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'flex items-center gap-4 w-full px-5 py-3.5',
      'text-[0.9rem] font-medium text-left',
      'hover:bg-white/5 active:bg-white/10 transition-colors duration-150',
      accent ? 'text-swara-accent' : 'text-swara-text',
    ].join(' ')}
  >
    <span className="w-5 flex items-center justify-center flex-shrink-0 text-swara-muted">
      {icon}
    </span>
    {label}
  </button>
);

const Divider = () => <div className="mx-5 my-1 h-px bg-swara-border" />;

// ── TrackMenuSheet ────────────────────────────────────────────────────────────

export const TrackMenuSheet = ({
  track, isOpen, onClose, context = 'default', onNavigate,
  playlistId, onRemoveFromPlaylist, entryId,
}: TrackMenuSheetProps) => {
  const navigate = useNavigate();
  const liked    = useLikedStore((s) => s.isLiked(track.id));
  const { albums } = useLibraryStore();
  const inLib      = useUserLibraryStore((s) => s.hasTrack(track.albumId, track.id));

  const [artistPickerOpen,   setArtistPickerOpen]   = useState(false);
  const [playlistPickerOpen, setPlaylistPickerOpen]  = useState(false);

  const albumFull = albums.find((a) => a.id === track.albumId);

  const hasMultipleArtists =
    track.artists.length > 1 ||
    !!(track.composer && track.composer !== track.artists[0]);

  const doNavigate = (path: string, delay = 300) => {
    onClose();
    onNavigate?.();
    setTimeout(() => navigate(path), delay);
  };

  const handleGoToAlbum = () => doNavigate(`/album/${track.albumId}`);

  const handleViewArtists = () => {
    if (hasMultipleArtists) {
      setArtistPickerOpen(true);
    } else {
      const artistId = slugify(track.artists[0] ?? track.artist);
      doNavigate(`/artist/${artistId}`);
    }
  };

  const handleLike = () => {
    trackActions.toggleLike(track);
  };

  const handleLibrary = () => {
    if (!albumFull) return;
    trackActions.toggleTrackLibrary(track, albumFull);
    onClose();
  };

  const handleAddToQueue = () => {
    trackActions.addToQueue(track);
    onClose();
  };

  const handleAddToPlaylist = () => {
    onClose();
    setPlaylistPickerOpen(true);
  };

  // ── Action sets by context ────────────────────────────────────────────────

  const renderActions = () => {
    switch (context) {
      case 'player':
        return (
          <>
            <MenuItem icon={<HeartIcon filled={liked} />}
              label={liked ? 'Added to Liked Songs' : 'Add to Liked Songs'}
              accent={liked} onClick={handleLike} />
            <MenuItem icon={<PlaylistIcon />} label="Add to Playlist"
              onClick={handleAddToPlaylist} />
            <MenuItem icon={<BookIcon />}
              label={inLib ? 'Remove from Library' : 'Add to Library'}
              onClick={handleLibrary} />
            <Divider />
            <MenuItem icon={<AlbumIcon />} label="Go to Album" onClick={handleGoToAlbum} />
            <MenuItem icon={<ArtistIcon />} label="View Artists" onClick={handleViewArtists} />
          </>
        );

      case 'queue':
        return (
          <>
            <MenuItem icon={<HeartIcon filled={liked} />}
              label={liked ? 'Added to Liked Songs' : 'Add to Liked Songs'}
              accent={liked} onClick={handleLike} />
            <MenuItem icon={<PlaylistIcon />} label="Add to Playlist"
              onClick={handleAddToPlaylist} />
            <MenuItem icon={<BookIcon />}
              label={inLib ? 'Remove from Library' : 'Add to Library'}
              onClick={handleLibrary} />
            <Divider />
            <MenuItem icon={<AlbumIcon />} label="Go to Album" onClick={handleGoToAlbum} />
            <MenuItem icon={<ArtistIcon />} label="View Artists" onClick={handleViewArtists} />
          </>
        );

      case 'liked':
        return (
          <>
            <MenuItem icon={<HeartIcon filled={liked} />}
              label={liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
              accent={liked} onClick={handleLike} />
            <MenuItem icon={<PlaylistIcon />} label="Add to Playlist"
              onClick={handleAddToPlaylist} />
            <MenuItem icon={<QueueIcon />} label="Add to Queue" onClick={handleAddToQueue} />
            <Divider />
            <MenuItem icon={<AlbumIcon />} label="Go to Album" onClick={handleGoToAlbum} />
            <MenuItem icon={<ArtistIcon />} label="View Artists" onClick={handleViewArtists} />
          </>
        );

      case 'playlist':
        return (
          <>
            <MenuItem icon={<HeartIcon filled={liked} />}
              label={liked ? 'Added to Liked Songs' : 'Add to Liked Songs'}
              accent={liked} onClick={handleLike} />
            <MenuItem icon={<QueueIcon />} label="Add to Queue" onClick={handleAddToQueue} />
            {playlistId && entryId && onRemoveFromPlaylist && (
              <MenuItem
                icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>}
                label="Remove from Playlist"
                onClick={() => { onRemoveFromPlaylist(entryId); onClose(); }}
              />
            )}
            <Divider />
            <MenuItem icon={<AlbumIcon />} label="Go to Album" onClick={handleGoToAlbum} />
            <MenuItem icon={<ArtistIcon />} label="View Artists" onClick={handleViewArtists} />
          </>
        );

      default: // 'default' — album page, search, etc.
        return (
          <>
            <MenuItem icon={<HeartIcon filled={liked} />}
              label={liked ? 'Added to Liked Songs' : 'Add to Liked Songs'}
              accent={liked} onClick={handleLike} />
            <MenuItem icon={<QueueIcon />} label="Add to Queue" onClick={handleAddToQueue} />
            <MenuItem icon={<PlaylistIcon />} label="Add to Playlist"
              onClick={handleAddToPlaylist} />
            <MenuItem icon={<BookIcon />}
              label={inLib ? 'In My Library' : 'Add to My Library'}
              accent={inLib} onClick={handleLibrary} />
            <Divider />
            <MenuItem icon={<AlbumIcon />} label="Go to Album" onClick={handleGoToAlbum} />
            <MenuItem icon={<ArtistIcon />} label="View Artists" onClick={handleViewArtists} />
          </>
        );
    }
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        {/* Track header */}
        <div className="px-5 pt-1 pb-3 border-b border-swara-border">
          <p className="text-[0.95rem] font-semibold text-swara-text truncate">{track.title}</p>
          <p className="text-[0.78rem] text-swara-muted mt-0.5 truncate">{track.album}</p>
        </div>

        {/* Actions */}
        <div className="py-1">
          {renderActions()}
        </div>
      </BottomSheet>

      {/* Artist picker sub-sheet */}
      <ArtistPickerSheet
        isOpen={artistPickerOpen}
        onClose={() => setArtistPickerOpen(false)}
        onNavigate={() => {
          setArtistPickerOpen(false);
          onClose();
          onNavigate?.();
        }}
        singers={track.artists}
        composer={track.composer || undefined}
      />

      {/* Playlist picker sub-sheet */}
      <PlaylistPickerSheet
        isOpen={playlistPickerOpen}
        onClose={() => setPlaylistPickerOpen(false)}
        trackId={track.id}
        trackTitle={track.title}
      />
    </>
  );
};

export default TrackMenuSheet;
