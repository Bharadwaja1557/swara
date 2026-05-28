/**
 * TrackMenuSheet — canonical track context menu, used everywhere in the app.
 *
 * UNIFIED ACTION SET (Issue 4):
 *   Every context shows the same core actions in the same order:
 *     1. Play Next          ← NEW (Issue 1)
 *     2. Add to Queue       (omitted in 'queue' context — redundant)
 *     3. Like / Unlike
 *     4. Add to Playlist
 *     5. ─── divider ───
 *     6. Go to Album
 *     7. View Artists
 *     8. ─── divider ───
 *     9. Hide Song          ← disabled "Coming Soon" (Issue 2)
 *    10. Remove from Playlist (playlist context only)
 *
 * CONTEXT-AWARE DIFFERENCES:
 *   'queue'    → omits "Add to Queue" (track is already in the queue)
 *   'playlist' → adds "Remove from Playlist" before the Hide Song divider
 *   All other contexts → full set
 *
 * This component is the single source of truth for track actions.
 * SongRow, QueuePage, FullscreenPlayer, SongInfoPanel all use it.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLikedStore }   from '@/store/likedStore';
import { trackActions }    from '@/lib/trackActions';
import { slugify }         from '@/utils/library';
import BottomSheet         from '@/components/ui/BottomSheet';
import ArtistPickerSheet   from '@/components/ui/ArtistPickerSheet';
import PlaylistPickerSheet from '@/components/ui/PlaylistPickerSheet';
import type { Track }      from '@/types/music';

export type TrackMenuContext = 'default' | 'player' | 'queue' | 'liked' | 'playlist';

// Fallback artwork for when track has no coverUrl
const MENU_PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

interface TrackMenuSheetProps {
  track:       Track;
  isOpen:      boolean;
  onClose:     () => void;
  context?:    TrackMenuContext;
  onNavigate?: () => void;
  playlistId?: string;
  onRemoveFromPlaylist?: (entryId: string) => void;
  entryId?: string;
}

// ── Icon SVGs ─────────────────────────────────────────────────────────────────

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
);

const PlayNextIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="5 3 15 12 5 21 5 3"/>
    <line x1="19" y1="5" x2="19" y2="19"/>
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

const HideIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const RemoveIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
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

/** Disabled / Coming Soon variant — muted appearance, no click feedback */
const MenuItemDisabled = ({ icon, label, badge = 'Coming Soon' }: {
  icon: React.ReactNode; label: string; badge?: string;
}) => (
  <div
    className="flex items-center gap-4 w-full px-5 py-3.5 text-[0.9rem] font-medium text-left opacity-35 cursor-default select-none"
    aria-disabled="true"
  >
    <span className="w-5 flex items-center justify-center flex-shrink-0 text-swara-muted">
      {icon}
    </span>
    <span className="flex-1 text-swara-text">{label}</span>
    <span className="text-[0.65rem] font-semibold text-swara-dim bg-swara-elevated px-1.5 py-0.5 rounded-full tracking-wide uppercase">
      {badge}
    </span>
  </div>
);

const Divider = () => <div className="mx-5 my-1 h-px bg-swara-border" />;

// ── TrackMenuSheet ────────────────────────────────────────────────────────────

export const TrackMenuSheet = ({
  track, isOpen, onClose, context = 'default', onNavigate,
  playlistId, onRemoveFromPlaylist, entryId,
}: TrackMenuSheetProps) => {
  const navigate = useNavigate();
  const liked    = useLikedStore((s) => s.isLiked(track.id));

  const [artistPickerOpen,   setArtistPickerOpen]  = useState(false);
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);

  const hasMultipleArtists =
    track.artists.length > 1 ||
    !!(track.composer && track.composer !== track.artists[0]);

  const doNavigate = (path: string, delay = 300) => {
    onClose();
    onNavigate?.();
    setTimeout(() => navigate(path), delay);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePlayNext      = () => { trackActions.playNext(track); onClose(); };
  const handleAddToQueue    = () => { trackActions.addToQueue(track); onClose(); };
  const handleLike          = () => { trackActions.toggleLike(track); };
  const handleAddToPlaylist = () => { onClose(); setPlaylistPickerOpen(true); };
  const handleGoToAlbum     = () => doNavigate(`/album/${track.albumId}`);

  const handleViewArtists = () => {
    if (hasMultipleArtists) {
      setArtistPickerOpen(true);
    } else {
      const artistId = slugify(track.artists[0] ?? track.artist);
      doNavigate(`/artist/${artistId}`);
    }
  };

  // ── Canonical action set ─────────────────────────────────────────────────
  // All contexts share the same skeleton. Only two differences:
  //   1. 'queue' context: omit "Add to Queue" (already in queue)
  //   2. 'playlist' context: show "Remove from Playlist"

  const isQueueContext    = context === 'queue';
  const isPlaylistContext = context === 'playlist';

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        {/* Track header — compact artwork + title/album */}
        <div className="px-5 pt-1 pb-3 border-b border-swara-border flex items-center gap-3">
          {/* Compact cover — matches text block height, no visual weight */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-swara-elevated">
            <img
              src={track.coverUrl || MENU_PH}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).src = MENU_PH; }}
            />
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[0.95rem] font-semibold text-swara-text truncate">{track.title}</p>
            <p className="text-[0.78rem] text-swara-muted mt-0.5 truncate">{track.album}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="py-1">

          {/* Play Next — always shown */}
          <MenuItem icon={<PlayNextIcon />} label="Play Next" onClick={handlePlayNext} />

          {/* Add to Queue — omitted when already in queue context */}
          {!isQueueContext && (
            <MenuItem icon={<QueueIcon />} label="Add to Queue" onClick={handleAddToQueue} />
          )}

          {/* Like */}
          <MenuItem
            icon={<HeartIcon filled={liked} />}
            label={liked ? 'Added to Liked Songs' : 'Add to Liked Songs'}
            accent={liked}
            onClick={handleLike}
          />

          {/* Add to Playlist */}
          <MenuItem icon={<PlaylistIcon />} label="Add to Playlist" onClick={handleAddToPlaylist} />

          <Divider />

          {/* Navigation */}
          <MenuItem icon={<AlbumIcon />} label="Go to Album"    onClick={handleGoToAlbum} />
          <MenuItem icon={<ArtistIcon />} label="View Artists"  onClick={handleViewArtists} />

          <Divider />

          {/* Remove from Playlist (playlist context only) */}
          {isPlaylistContext && playlistId && entryId && onRemoveFromPlaylist && (
            <>
              <MenuItem
                icon={<RemoveIcon />}
                label="Remove from Playlist"
                onClick={() => { onRemoveFromPlaylist(entryId); onClose(); }}
              />
              <Divider />
            </>
          )}

          {/* Hide Song — disabled, coming soon */}
          <MenuItemDisabled icon={<HideIcon />} label="Hide Song" />

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
        trackCoverUrl={track.coverUrl}
      />
    </>
  );
};

export default TrackMenuSheet;
