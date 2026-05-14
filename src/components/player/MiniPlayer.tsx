/**
 * MiniPlayer — git-play style, NOT floating.
 * Rendered as a flex child in AppLayout, directly above BottomNav.
 */
import { usePlayerStore } from '@/store/playerStore';

const PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

const MiniPlayer = () => {
  const { currentTrack, isPlaying, progress, togglePlay, next, prev, setExpanded } = usePlayerStore();
  if (!currentTrack) return null;

  return (
    <div
      className="flex-shrink-0 relative"
      style={{
        background: 'rgba(24,22,20,0.98)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Clickable area → open full player */}
      <div
        className="flex items-center gap-3 px-3.5 cursor-pointer"
        style={{ height: '70px' }}
        onClick={() => setExpanded(true)}
        role="button"
        aria-label="Open now playing"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') setExpanded(true); }}
      >
        {/* Cover */}
        <img
          src={currentTrack.coverUrl || PLACEHOLDER}
          alt={currentTrack.album}
          className="w-[46px] h-[46px] rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
          loading="eager"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-[0.9rem] font-medium text-swara-text leading-snug truncate">
            {currentTrack.title}
          </span>
          <span className="text-[0.78rem] text-swara-muted truncate">
            {currentTrack.artist}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={prev}
            className="w-10 h-10 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all"
            aria-label="Previous"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
              <polygon points="19 20 9 12 19 4 19 20"/>
              <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-[38px] h-[38px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'var(--tw-bg, #C8A96A)', backgroundColor: '#C8A96A', color: '#0a0a0a' }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={next}
            className="w-10 h-10 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all"
            aria-label="Next"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-swara-border">
        <div
          className="h-full bg-swara-accent"
          style={{ width: `${progress * 100}%`, transition: 'width 0.5s linear' }}
        />
      </div>
    </div>
  );
};

export default MiniPlayer;
