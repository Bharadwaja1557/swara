/**
 * DesktopPlayer — full-width bottom player bar, desktop only.
 * Reuses all playback logic from playerStore (no duplication).
 */
import { useState, useEffect } from 'react';
import { usePlayerStore, setAudioVolume, getAudioVolume } from '@/store/playerStore';
import { formatDuration } from '@/utils/greeting';
import ShuffleIcon from '@/components/ui/ShuffleIcon';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

const DesktopPlayer = () => {
  const {
    currentTrack, isPlaying, isShuffle, repeat,
    progress, duration,
    togglePlay, next, prev,
    toggleShuffle, toggleRepeat,
    seekTo, isExpanded, toggleFullscreen,
  } = usePlayerStore();

  const [volume, setVolume]   = useState(() => getAudioVolume());
  const [coverErr, setCoverErr] = useState(false);

  useEffect(() => { setCoverErr(false); }, [currentTrack?.id]);

  const handleVolume = (v: number) => {
    setVolume(v);
    setAudioVolume(v);
  };

  if (!currentTrack) {
    return (
      <div className="flex-shrink-0 h-[88px] flex items-center justify-center border-t"
        style={{ background: 'rgba(10,10,12,0.98)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[0.78rem] text-swara-dim">Select a track to start playing</p>
      </div>
    );
  }

  const coverSrc = coverErr || !currentTrack.coverUrl ? PH : currentTrack.coverUrl;

  const RepeatIcon = () => (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ opacity: repeat !== 'off' ? 1 : 0.4 }}>
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
      <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
      {repeat === 'one' && <text x="9.5" y="14.5" fontSize="7" fill="currentColor" stroke="none" fontFamily="DM Sans" fontWeight="700">1</text>}
    </svg>
  );

  const VolumeIcon = ({ v }: { v: number }) => {
    if (v === 0) return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
      </svg>
    );
    if (v < 0.5) return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/>
      </svg>
    );
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
      </svg>
    );
  };

  return (
    <div
      className="flex-shrink-0 border-t"
      style={{ background: 'rgba(10,10,12,0.98)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', height: '88px' }}
    >
      <div className="flex items-center h-full px-5 gap-4 pb-1">

        {/* LEFT — cover + track info */}
        <div className="flex items-center gap-3 w-[22%] min-w-0 flex-shrink-0">
          <button type="button" onClick={toggleFullscreen} aria-label="Open now playing">
            <img src={coverSrc} alt={currentTrack.album}
              className="w-12 h-12 rounded-xl object-cover bg-swara-elevated flex-shrink-0 hover:opacity-80 transition-opacity"
              loading="eager"
              onError={() => setCoverErr(true)} />
          </button>
          <div className="flex-1 min-w-0">
            <button type="button" onClick={toggleFullscreen}
              className="block w-full text-left hover:text-swara-accent transition-colors">
              <p className="text-[0.92rem] font-semibold text-swara-text truncate leading-snug">{currentTrack.title}</p>
              <p className="text-[0.76rem] text-swara-muted truncate">{currentTrack.artist}</p>
            </button>
          </div>
        </div>

        {/* CENTER — controls + seek */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1.5 min-w-0">
          {/* Control buttons */}
          <div className="flex items-center gap-3">
            {/* Shuffle */}
            <button type="button" onClick={toggleShuffle}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ color: isShuffle ? '#c8a96e' : '#5c5650' }} aria-label="Shuffle">
              <ShuffleIcon active={isShuffle} size={17} />
            </button>

            {/* Prev */}
            <button type="button" onClick={prev}
              className="w-9 h-9 flex items-center justify-center text-swara-text hover:text-swara-accent active:scale-90 transition-all"
              aria-label="Previous">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <polygon points="19 20 9 12 19 4 19 20"/>
                <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Play/Pause */}
            <button type="button" onClick={togglePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: '#c8a96e', color: '#0a0a0a', boxShadow: '0 2px 16px rgba(200,169,110,0.4)' }}
              aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )}
            </button>

            {/* Next */}
            <button type="button" onClick={next}
              className="w-9 h-9 flex items-center justify-center text-swara-text hover:text-swara-accent active:scale-90 transition-all"
              aria-label="Next">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <polygon points="5 4 15 12 5 20 5 4"/>
                <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Repeat */}
            <button type="button" onClick={toggleRepeat}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ color: repeat !== 'off' ? '#c8a96e' : '#5c5650' }} aria-label={`Repeat: ${repeat}`}>
              <RepeatIcon />
            </button>
          </div>

          {/* Seek bar */}
          <div className="flex items-center gap-2.5 w-full max-w-lg">
            <span className="text-[0.7rem] tabular-nums flex-shrink-0" style={{ color: '#5c5650' }}>
              {formatDuration(progress * duration)}
            </span>
            <div className="relative flex-1 h-1 rounded-full cursor-pointer group"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
                style={{ width: `${progress * 100}%`, background: '#c8a96e', transition: 'width 0.25s linear' }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progress * 100}% - 6px)`, background: '#c8a96e' }} />
              <input type="range" min={0} max={1} step={0.001} value={progress}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="seek-bar absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Seek" />
            </div>
            <span className="text-[0.7rem] tabular-nums flex-shrink-0" style={{ color: '#5c5650' }}>
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* RIGHT — volume + fullscreen */}
        <div className="flex items-center gap-3 w-[22%] justify-end flex-shrink-0">
          {/* Volume */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleVolume(volume > 0 ? 0 : 1)}
              className="text-swara-muted hover:text-swara-text transition-colors flex-shrink-0"
              aria-label={volume > 0 ? 'Mute' : 'Unmute'}>
              <VolumeIcon v={volume} />
            </button>
            <div className="relative w-28 h-1 rounded-full cursor-pointer group"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
                style={{ width: `${volume * 100}%`, background: 'rgba(255,255,255,0.5)' }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${volume * 100}% - 5px)`, background: '#fff' }} />
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={(e) => handleVolume(parseFloat(e.target.value))}
                className="seek-bar absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Volume" />
            </div>
          </div>

          {/* Fullscreen toggle — expand when closed, collapse when open */}
          <button type="button" onClick={toggleFullscreen}
            className="w-8 h-8 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text transition-colors"
            aria-label={isExpanded ? 'Close now playing' : 'Open now playing'}
            aria-pressed={isExpanded}>
            {isExpanded ? (
              /* Collapse / minimize icon */
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
              </svg>
            ) : (
              /* Expand / fullscreen icon */
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
              </svg>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DesktopPlayer;
