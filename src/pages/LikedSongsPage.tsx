/**
 * src/pages/LikedSongsPage.tsx
 *
 * Liked Songs collection — like an album page but for the user's cloud-backed
 * liked tracks. Heart buttons and menus work identically to AlbumPage.
 *
 * Uses the same memo + fine-grained selector pattern as AlbumPage to prevent
 * re-render loops on progress ticks.
 */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLikedStore } from '@/store/likedStore';
import { trackActions } from '@/lib/trackActions';
import SongRow from '@/components/ui/SongRow';
import ShuffleIcon from '@/components/ui/ShuffleIcon';
// ── Heart artwork cover ────────────────────────────────────────────────────────
const HeartCover = ({ size }: { size: 'sm' | 'lg' }) => {
  const px = size === 'lg' ? 280 : 200;
  return (
    <div
      className="rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{
        width: px, height: px,
        background: 'linear-gradient(135deg, #1e0b0b 0%, #2d1212 45%, #1a0808 100%)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.65)',
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 24 24" width={px * 0.42} height={px * 0.42}
        fill="#c8a96e" stroke="#c8a96e" strokeWidth="0.5"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    </div>
  );
};

// ── LikedSongsPage ────────────────────────────────────────────────────────────
const LikedSongsPage = () => {
  const navigate       = useNavigate();
  const getLikedTracks = useLikedStore((s) => s.getLikedTracks);
  const [isShuffle, setIsShuffle] = useState(false);

  const tracks = getLikedTracks();

  const handlePlay = useCallback(() => {
    if (!tracks.length) return;
    if (isShuffle) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      trackActions.playManual(shuffled, shuffled[0]);
    } else {
      trackActions.playLiked();
    }
  }, [tracks, isShuffle]);

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">

      {/* Back */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 lg:px-8 pt-5 pb-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all"
          aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      {/* Hero — same side-by-side layout as AlbumPage on desktop */}
      <div className="px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:gap-10 mb-4 lg:mb-8">

          {/* Cover */}
          <div className="flex justify-center lg:justify-start mb-5 lg:mb-0">
            <HeartCover size="sm" />
          </div>

          {/* Meta */}
          <div className="lg:flex-1 lg:min-w-0 lg:pb-1">
            <p className="hidden lg:block text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-swara-dim mb-2">Playlist</p>
            <h1 className="text-[1.3rem] lg:text-[2.6rem] font-bold text-swara-text tracking-tight font-display mb-0.5 lg:mb-2 lg:leading-none">
              Liked Songs
            </h1>
            <p className="text-xs lg:text-[0.92rem] text-swara-muted mt-0.5 lg:mt-1.5">
              {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4 py-2 border-t border-b border-swara-border">
          <span className="text-[0.82rem] text-swara-muted font-medium">
            {tracks.length > 0 ? `${tracks.length} tracks` : 'No liked songs yet'}
          </span>
          {tracks.length > 0 && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setIsShuffle((s) => !s)}
                className={['w-9 h-9 flex items-center justify-center rounded-full transition-colors', isShuffle ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
                aria-label={isShuffle ? 'Shuffle on' : 'Shuffle off'}>
                <ShuffleIcon active={isShuffle} size={18} />
              </button>
              <button type="button" onClick={handlePlay}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-swara-accent text-swara-bg active:scale-95 transition-transform"
                aria-label="Play liked songs">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Track list */}
      <div className="px-4 lg:px-8 pb-8">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e0b0b, #2d1212)' }}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </div>
            <p className="text-[0.88rem] font-semibold text-swara-muted">No liked songs yet</p>
            <p className="text-[0.76rem] text-swara-dim text-center max-w-[220px]">
              Tap the heart icon on any track to save it here.
            </p>
          </div>
        ) : (
          <ul className="space-y-0">
            {tracks.map((track) => (
              <SongRow
                key={track.id}
                track={track}
                onPlay={() => trackActions.playFromLiked(track)}
                menuContext="liked"
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LikedSongsPage;
