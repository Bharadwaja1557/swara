/**
 * DesktopNowPlaying — fullscreen now-playing experience for desktop.
 * Rendered inside DesktopLayout when isExpanded is true.
 * Reuses centralized playerStore — no separate playback engine.
 * ESC key and close button exit the view.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore, getNextTracks } from '@/store/playerStore';
import { useLikedStore } from '@/store/likedStore';
import { formatDuration } from '@/utils/greeting';
import { slugify } from '@/utils/library';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

const DesktopNowPlaying = () => {
  const {
    currentTrack, isPlaying, isShuffle, repeat,
    progress, duration,
    togglePlay, next, prev, toggleShuffle, toggleRepeat,
    seekTo, setExpanded,
  } = usePlayerStore();
  const { isLiked, toggleLike } = useLikedStore();
  const navigate = useNavigate();

  const [coverErr, setCoverErr] = useState(false);
  useEffect(() => { setCoverErr(false); }, [currentTrack?.id]);

  // ESC key exits fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setExpanded]);

  if (!currentTrack) return null;

  const liked      = isLiked(currentTrack.id);
  const coverSrc   = coverErr || !currentTrack.coverUrl ? PH : currentTrack.coverUrl;
  const nextTracks = getNextTracks(6);

  const RepeatIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ opacity: repeat !== 'off' ? 1 : 0.4 }}>
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
      <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
      {repeat === 'one' && (
        <text x="9.5" y="14.5" fontSize="7" fill="currentColor" stroke="none"
          fontFamily="DM Sans" fontWeight="700">1</text>
      )}
    </svg>
  );

  return (
    <div
      className="flex-1 flex overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0f0e0d 0%, #0a0a0c 100%)' }}
      role="region"
      aria-label="Now playing fullscreen"
    >
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 30% 40%, rgba(200,169,110,0.06), transparent)' }}
        aria-hidden="true"
      />

      {/* ── LEFT: Album Art Panel ── */}
      <div className="flex items-center justify-center flex-shrink-0 relative"
        style={{ width: '42%', padding: '3rem 2.5rem 3rem 4rem' }}>

        {/* Close button (top-left) */}
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="absolute top-5 left-5 w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text hover:bg-white/5 transition-all"
          aria-label="Exit fullscreen (Esc)"
          title="Exit fullscreen (Esc)"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"/>
          </svg>
        </button>

        {/* Album cover */}
        <div
          className="w-full max-w-[420px] aspect-square rounded-[28px] overflow-hidden flex-shrink-0"
          style={{
            boxShadow: isPlaying
              ? '0 0 0 1px rgba(255,255,255,0.05), 0 40px 100px rgba(0,0,0,0.85), 0 0 100px rgba(200,169,110,0.07)'
              : '0 0 0 1px rgba(255,255,255,0.05), 0 32px 80px rgba(0,0,0,0.75)',
            transition: 'box-shadow 0.7s ease',
          }}
        >
          <img
            key={currentTrack.id}
            src={coverSrc}
            alt={currentTrack.album || 'Album art'}
            className={['w-full h-full object-cover bg-swara-card', isPlaying ? 'animate-cover-breathe' : ''].join(' ')}
            loading="eager"
            onError={() => setCoverErr(true)}
          />
        </div>
      </div>

      {/* ── RIGHT: Info + Controls Panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden"
        style={{ padding: '3rem 4rem 2rem 1.5rem' }}>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scrollbar-none pr-1">

          {/* Album name (small label) */}
          <p className="text-[0.7rem] font-semibold tracking-[0.12em] uppercase mb-3"
            style={{ color: '#5c5650' }}>
            {currentTrack.album}
          </p>

          {/* Track title + like */}
          <div className="flex items-start justify-between gap-4 mb-1.5">
            <h2 className="text-[1.75rem] font-bold text-swara-text tracking-tight leading-tight font-display flex-1">
              {currentTrack.title}
            </h2>
            <button
              type="button"
              onClick={() => toggleLike(currentTrack)}
              className={[
                'w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 mt-1 transition-colors duration-200',
                liked ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted',
              ].join(' ')}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <svg viewBox="0 0 24 24" width="22" height="22"
                fill={liked ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </button>
          </div>

          <p className="text-[0.95rem] text-swara-muted mb-6">{currentTrack.artist}</p>

          {/* Seek bar */}
          <div className="mb-6">
            <div className="relative h-1 rounded-full cursor-pointer group"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
                style={{ width: `${progress * 100}%`, background: '#c8a96e', transition: 'width 0.25s linear' }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progress * 100}% - 7px)`, background: '#c8a96e', boxShadow: '0 0 0 4px rgba(200,169,110,0.2)' }} />
              <input type="range" min={0} max={1} step={0.001} value={progress}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="seek-bar absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Seek" />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[0.72rem] tabular-nums" style={{ color: '#5c5650' }}>
                {formatDuration(progress * duration)}
              </span>
              <span className="text-[0.72rem] tabular-nums" style={{ color: '#5c5650' }}>
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-start gap-4 mb-7">
            {/* Shuffle */}
            <button type="button" onClick={toggleShuffle}
              className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
              style={{ color: isShuffle ? '#c8a96e' : '#5c5650' }} aria-label="Shuffle">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                style={{ opacity: isShuffle ? 1 : 0.45 }}>
                <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
              </svg>
            </button>

            {/* Prev */}
            <button type="button" onClick={prev}
              className="w-11 h-11 flex items-center justify-center text-swara-text hover:text-swara-accent active:scale-90 transition-all"
              aria-label="Previous">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                <polygon points="19 20 9 12 19 4 19 20"/>
                <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Play/Pause */}
            <button type="button" onClick={togglePlay}
              className="w-14 h-14 rounded-full flex items-center justify-center active:scale-[0.93] transition-transform"
              style={{ background: '#c8a96e', color: '#0a0a0a', boxShadow: '0 4px 24px rgba(200,169,110,0.45)' }}
              aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )}
            </button>

            {/* Next */}
            <button type="button" onClick={next}
              className="w-11 h-11 flex items-center justify-center text-swara-text hover:text-swara-accent active:scale-90 transition-all"
              aria-label="Next">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                <polygon points="5 4 15 12 5 20 5 4"/>
                <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Repeat */}
            <button type="button" onClick={toggleRepeat}
              className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
              style={{ color: repeat !== 'off' ? '#c8a96e' : '#5c5650' }} aria-label={`Repeat: ${repeat}`}>
              <RepeatIcon />
            </button>
          </div>

          {/* Artists section */}
          {(currentTrack.artists.length > 0 || currentTrack.composer) && (
            <div className="border-t pt-5 mb-5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-[0.65rem] font-semibold tracking-widest uppercase mb-3"
                style={{ color: '#5c5650' }}>Artists</p>

              {currentTrack.artists.length > 0 && (
                <div className="mb-3">
                  <p className="text-[0.7rem] text-swara-muted mb-1.5 font-medium">Singers</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {currentTrack.artists.map((name) => (
                      <button key={name} type="button"
                        onClick={() => { setExpanded(false); setTimeout(() => navigate(`/artist/${slugify(name)}`), 200); }}
                        className="text-[0.88rem] font-medium text-swara-text hover:text-swara-accent text-left transition-colors">
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentTrack.composer && (
                <div>
                  <p className="text-[0.7rem] text-swara-muted mb-1.5 font-medium">Composer</p>
                  <button type="button"
                    onClick={() => { setExpanded(false); setTimeout(() => navigate(`/artist/${slugify(currentTrack.composer)}`), 200); }}
                    className="text-[0.88rem] font-medium text-swara-text hover:text-swara-accent text-left transition-colors">
                    {currentTrack.composer}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Next Playing */}
          {nextTracks.length > 0 && (
            <div className="border-t pt-5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-[0.65rem] font-semibold tracking-widest uppercase mb-3"
                style={{ color: '#5c5650' }}>Next Playing</p>
              <div className="flex flex-col gap-0">
                {nextTracks.map((track, i) => (
                  <div key={track.id}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-xl"
                    style={{ background: i === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    <img src={track.coverUrl || PH} alt=""
                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = PH; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.82rem] font-medium text-swara-text truncate">{track.title}</p>
                      <p className="text-[0.7rem] text-swara-muted truncate">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DesktopNowPlaying;
