import { usePlayerStore } from '@/store/playerStore';

/**
 * MiniPlayer
 *
 * Persistent strip above the BottomNav when a track is loaded.
 * Tap → expand to fullscreen player.
 */
const MiniPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    setExpanded,
    progress,
  } = usePlayerStore();

  if (!currentTrack) return null;

  return (
    <div
      className="fixed bottom-[4rem] left-0 right-0 z-40 px-2"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className={[
          'relative flex items-center gap-3',
          'bg-swara-elevated border border-swara-border',
          'rounded-2xl px-3 py-2.5 mx-0',
          'shadow-player',
          'overflow-hidden',
        ].join(' ')}
      >
        {/* Progress bar at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-swara-border rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-swara-accent transition-all duration-1000 ease-linear rounded-t-2xl"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Tap area to expand */}
        <button
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          onClick={() => setExpanded(true)}
          aria-label="Open now playing"
          type="button"
        >
          {/* Cover */}
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-swara-card">
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.album}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>

          {/* Track info */}
          <div className="flex flex-col min-w-0">
            <span className="text-[0.8125rem] font-medium text-swara-text leading-snug truncate tracking-tight">
              {currentTrack.title}
            </span>
            <span className="text-[0.6875rem] text-swara-muted leading-snug truncate">
              {currentTrack.artist}
            </span>
          </div>
        </button>

        {/* Play/Pause */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className={[
            'flex-shrink-0 w-9 h-9 rounded-full',
            'flex items-center justify-center',
            'bg-swara-accent text-swara-bg',
            'active:scale-95 transition-transform duration-100',
          ].join(' ')}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          type="button"
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 4.75v14.5a.75.75 0 0 0 1.14.64l11.5-7.25a.75.75 0 0 0 0-1.28L7.14 4.11A.75.75 0 0 0 6 4.75Z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default MiniPlayer;
