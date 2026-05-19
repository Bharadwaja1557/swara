/**
 * ArtistPickerSheet — a sub-sheet shown when a track has multiple artists.
 *
 * Design: slides up over the parent bottom sheet. Shows Singers + Composer
 * as individually tappable rows. Each row navigates to the artist page.
 *
 * Used by:
 *   - FullscreenPlayer → TrackMenu
 *   - AlbumPage → TrackMenu
 */
import BottomSheet from '@/components/ui/BottomSheet';
import { useNavigate } from 'react-router-dom';
import { slugify } from '@/utils/library';

interface ArtistPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after navigation so parent can close itself too */
  onNavigate: () => void;
  singers: string[];
  composer?: string;
}

const ArtistPickerSheet = ({
  isOpen, onClose, onNavigate, singers, composer,
}: ArtistPickerSheetProps) => {
  const navigate = useNavigate();

  const goToArtist = (name: string) => {
    onClose();
    onNavigate();
    setTimeout(() => navigate(`/artist/${slugify(name)}`), 280);
  };

  const ArtistRow = ({ name, role }: { name: string; role: string }) => (
    <button
      type="button"
      onClick={() => goToArtist(name)}
      className="flex items-center gap-3.5 w-full px-5 py-3 hover:bg-white/5 active:bg-white/10 transition-colors duration-150 text-left"
    >
      {/* Avatar placeholder circle */}
      <div className="w-9 h-9 rounded-full bg-swara-elevated flex-shrink-0 flex items-center justify-center text-swara-dim">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.88rem] font-medium text-swara-text truncate">{name}</p>
        <p className="text-[0.72rem] text-swara-dim">{role}</p>
      </div>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </button>
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="px-5 pt-1 pb-3 border-b border-swara-border">
        <p className="text-[0.82rem] font-semibold text-swara-text">Artists</p>
      </div>

      <div className="py-1">
        {singers.length > 0 && (
          <>
            {singers.length > 0 && (
              <p className="text-[0.63rem] font-semibold text-swara-muted tracking-widest uppercase px-5 pt-3 pb-1">
                Singers
              </p>
            )}
            {singers.map((name) => (
              <ArtistRow key={name} name={name} role="Singer" />
            ))}
          </>
        )}

        {composer && (
          <>
            <p className="text-[0.63rem] font-semibold text-swara-muted tracking-widest uppercase px-5 pt-3 pb-1">
              Composer
            </p>
            <ArtistRow name={composer} role="Composer" />
          </>
        )}
      </div>
    </BottomSheet>
  );
};

export default ArtistPickerSheet;
