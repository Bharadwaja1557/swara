/**
 * SongInfoPanel — right column, desktop only.
 * Shows current track info + next 5 from the actual queue.
 */
import { useNavigate } from 'react-router-dom';
import { usePlayerStore, getNextTracks } from '@/store/playerStore';
import { slugify } from '@/utils/library';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

const SongInfoPanel = () => {
  const { currentTrack, isPlaying } = usePlayerStore();
  const navigate = useNavigate();

  // Re-derive next tracks from actual engine queue on every render
  // (triggers whenever currentTrack or currentIndex changes via zustand)
  const nextTracks = getNextTracks(5);

  if (!currentTrack) {
    return (
      <aside
        className="flex flex-col flex-shrink-0 border-l items-center justify-center"
        style={{ width: '20%', minWidth: '180px', maxWidth: '260px', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-swara-elevated flex items-center justify-center text-swara-dim text-2xl">♪</div>
          <p className="text-[0.78rem] text-swara-dim">Nothing playing yet</p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="flex flex-col flex-shrink-0 border-l overflow-hidden"
      style={{ width: '20%', minWidth: '180px', maxWidth: '260px', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-5 pb-4">
        {/* Cover */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-swara-card mb-4"
          style={{ boxShadow: isPlaying ? '0 4px 32px rgba(0,0,0,0.7), 0 0 40px rgba(200,169,110,0.07)' : '0 4px 24px rgba(0,0,0,0.6)', transition: 'box-shadow 0.6s ease' }}>
          <img
            src={currentTrack.coverUrl || PH}
            alt={currentTrack.album}
            className={['w-full h-full object-cover', isPlaying ? 'animate-cover-breathe' : ''].join(' ')}
            loading="eager"
            onError={(e) => { (e.target as HTMLImageElement).src = PH; }}
          />
        </div>

        {/* Track info */}
        <div className="mb-4">
          <h3 className="text-[0.95rem] font-bold text-swara-text tracking-tight leading-snug mb-0.5 font-display line-clamp-2">
            {currentTrack.title}
          </h3>
          <p className="text-[0.78rem] text-swara-muted truncate">{currentTrack.artist}</p>
        </div>

        {/* Artists section */}
        <div className="border-t pt-4 mb-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[0.62rem] font-semibold text-swara-muted tracking-widest uppercase mb-2.5">Artists</p>

          {currentTrack.artists.length > 0 && (
            <div className="mb-3">
              <p className="text-[0.65rem] text-swara-dim mb-1.5 font-medium">Singers</p>
              <div className="flex flex-col gap-0.5">
                {currentTrack.artists.map((name) => (
                  <button key={name} type="button"
                    onClick={() => navigate(`/artist/${slugify(name)}`)}
                    className="text-[0.8rem] font-medium text-swara-text hover:text-swara-accent text-left transition-colors w-fit truncate max-w-full">
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentTrack.composer && (
            <div>
              <p className="text-[0.65rem] text-swara-dim mb-1.5 font-medium">Composer</p>
              <button type="button"
                onClick={() => navigate(`/artist/${slugify(currentTrack.composer)}`)}
                className="text-[0.8rem] font-medium text-swara-text hover:text-swara-accent text-left transition-colors truncate max-w-full">
                {currentTrack.composer}
              </button>
            </div>
          )}
        </div>

        {/* Next queue */}
        {nextTracks.length > 0 && (
          <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[0.62rem] font-semibold text-swara-muted tracking-widest uppercase mb-2.5">Next Playing</p>
            <div className="flex flex-col gap-0">
              {nextTracks.map((track, i) => (
                <div key={track.id}
                  className="flex items-center gap-2.5 py-2 px-1.5 rounded-xl"
                  style={{ background: i === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                  <img src={track.coverUrl || PH} alt=""
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = PH; }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.75rem] font-medium text-swara-text truncate">{track.title}</p>
                    <p className="text-[0.65rem] text-swara-muted truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SongInfoPanel;
