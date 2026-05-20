/**
 * SongInfoPanel — right column, desktop only.
 * Shows current track info: cover, source label, track name,
 * artists, album, and a compact "Next up" queue preview → links to /queue.
 */
import { useNavigate } from 'react-router-dom';
import { usePlayerStore, getNextTracks } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { slugify } from '@/utils/library';
import type { QueueContext } from '@/types/music';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

const CONTEXT_LABELS: Record<QueueContext['type'], string> = {
  album:    'Playing from Album',
  artist:   'Playing from Artist',
  liked:    'Playing from Liked Songs',
  library:  'Playing from Library',
  playlist: 'Playing from Playlist',
  search:   'Playing from Search',
  manual:   'Playing',
  unknown:  'Playing',
};

const SongInfoPanel = () => {
  const { currentTrack, isPlaying, queueContext } = usePlayerStore();
  const { albums } = useLibraryStore();
  const navigate = useNavigate();

  const nextTracks = getNextTracks(5);
  const currentAlbum = currentTrack
    ? albums.find((a) => a.id === currentTrack.albumId) ?? null
    : null;

  if (!currentTrack) {
    return (
      <aside
        className="flex flex-col flex-shrink-0 border-l items-center justify-center"
        style={{ width: '25%', minWidth: '200px', maxWidth: '320px', borderColor: 'rgba(255,255,255,0.06)' }}
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
      style={{ width: '25%', minWidth: '200px', maxWidth: '320px', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-5 pb-4">
        {/* Cover */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-swara-card mb-3"
          style={{ boxShadow: isPlaying ? '0 4px 32px rgba(0,0,0,0.7), 0 0 40px rgba(200,169,110,0.07)' : '0 4px 24px rgba(0,0,0,0.6)', transition: 'box-shadow 0.6s ease' }}>
          <img
            src={currentTrack.coverUrl || PH}
            alt={currentTrack.album}
            className={['w-full h-full object-cover', isPlaying ? 'animate-cover-breathe' : ''].join(' ')}
            loading="eager"
            onError={(e) => { (e.target as HTMLImageElement).src = PH; }}
          />
        </div>

        {/* Queue source label */}
        {queueContext && (
          <p className="text-[0.63rem] text-swara-dim tracking-wide text-center mb-3 uppercase font-medium">
            {CONTEXT_LABELS[queueContext.type] ?? 'Playing'}
            {queueContext.title ? ` · ${queueContext.title}` : ''}
          </p>
        )}

        {/* Track info */}
        <div className="mb-4">
          <h3 className="text-[1.02rem] font-bold text-swara-text tracking-tight leading-snug mb-0.5 font-display line-clamp-2">
            {currentTrack.title}
          </h3>
          <p className="text-[0.82rem] text-swara-muted truncate">{currentTrack.artist}</p>
        </div>

        {/* Artists section */}
        <div className="border-t pt-4 mb-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[0.67rem] font-semibold text-swara-muted tracking-widest uppercase mb-2.5">Artists</p>
          {currentTrack.artists.length > 0 && (
            <div className="mb-3">
              <p className="text-[0.68rem] text-swara-dim mb-1.5 font-medium">Singers</p>
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
              <p className="text-[0.68rem] text-swara-dim mb-1.5 font-medium">Composer</p>
              <button type="button"
                onClick={() => navigate(`/artist/${slugify(currentTrack.composer)}`)}
                className="text-[0.8rem] font-medium text-swara-text hover:text-swara-accent text-left transition-colors truncate max-w-full">
                {currentTrack.composer}
              </button>
            </div>
          )}
        </div>

        {/* Album section */}
        {currentAlbum && (
          <div className="border-t pt-4 mb-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[0.67rem] font-semibold text-swara-muted tracking-widest uppercase mb-2.5">Album</p>
            <button type="button" onClick={() => navigate(`/album/${currentAlbum.id}`)}
              className="flex items-center gap-2.5 w-full rounded-xl p-2 hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left group">
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-swara-elevated">
                <img src={currentAlbum.coverUrl || PH} alt={currentAlbum.title}
                  className="w-full h-full object-cover" loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = PH; }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.82rem] font-semibold text-swara-text truncate group-hover:text-swara-accent transition-colors">
                  {currentAlbum.title}
                </p>
                <p className="text-[0.7rem] text-swara-dim truncate">{currentAlbum.composer} · {currentAlbum.year}</p>
              </div>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round"
                className="text-swara-dim flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
        )}

        {/* Queue preview — links to /queue page */}
        {nextTracks.length > 0 && (
          <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[0.67rem] font-semibold text-swara-muted tracking-widest uppercase">Next Up</p>
              <button type="button" onClick={() => navigate('/queue')}
                className="text-[0.67rem] font-semibold text-swara-accent hover:text-swara-accent-bright transition-colors uppercase tracking-widest">
                View All
              </button>
            </div>
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
                    <p className="text-[0.8rem] font-medium text-swara-text truncate">{track.title}</p>
                    <p className="text-[0.7rem] text-swara-muted truncate">{track.artist}</p>
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
