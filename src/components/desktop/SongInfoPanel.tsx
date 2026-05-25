/**
 * SongInfoPanel — right column, desktop only.
 * Shows current track info: cover, source label, track name,
 * artists, album, and a compact "Next up" queue preview → links to /queue.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore, getNextTracks } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useLikedStore } from '@/store/likedStore';
import { trackActions } from '@/lib/trackActions';
import { slugify } from '@/utils/library';
import PlaylistPickerSheet from '@/components/ui/PlaylistPickerSheet';
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
  const { isLiked } = useLikedStore();
  const navigate = useNavigate();
  const [playlistOpen, setPlaylistOpen] = useState(false);

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
        {/* Queue source label — above the cover so hierarchy reads:
            "where it's playing from" → cover → title → actions */}
        {queueContext && (
          <p className="text-[0.63rem] text-swara-dim tracking-wide text-center mb-2.5 uppercase font-medium">
            {CONTEXT_LABELS[queueContext.type] ?? 'Playing'}
            {queueContext.title ? ` · ${queueContext.title}` : ''}
          </p>
        )}

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

        {/* Track info */}
        <div className="mb-4">
          <h3 className="text-[1.02rem] font-bold text-swara-text tracking-tight leading-snug mb-2.5 font-display line-clamp-2">
            {currentTrack.title}
          </h3>

          {/* Action row — Like + Add to Playlist.
              Like uses trackActions so the toast fires.
              Add-to-Playlist opens PlaylistPickerSheet (same sheet as TrackMenuSheet). */}
          <div className="flex items-center gap-1.5">
            {/* Like */}
            <button
              type="button"
              onClick={() => trackActions.toggleLike(currentTrack)}
              className={[
                'flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[0.72rem] font-medium transition-all duration-200',
                isLiked(currentTrack.id)
                  ? 'bg-swara-accent/10 border-swara-accent text-swara-accent'
                  : 'border-swara-border text-swara-muted hover:border-swara-muted hover:text-swara-text',
              ].join(' ')}
              aria-label={isLiked(currentTrack.id) ? 'Unlike' : 'Like'}
            >
              <svg viewBox="0 0 24 24" width="12" height="12"
                fill={isLiked(currentTrack.id) ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
              {isLiked(currentTrack.id) ? 'Liked' : 'Like'}
            </button>

            {/* Add to Playlist */}
            <button
              type="button"
              onClick={() => setPlaylistOpen(true)}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-swara-border text-swara-muted hover:border-swara-muted hover:text-swara-text text-[0.72rem] font-medium transition-all duration-200"
              aria-label="Add to playlist"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Playlist
            </button>
          </div>
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

      {/* Playlist picker — mounted once the button is first clicked */}
      <PlaylistPickerSheet
        isOpen={playlistOpen}
        onClose={() => setPlaylistOpen(false)}
        trackId={currentTrack.id}
        trackTitle={currentTrack.title}
      />
    </aside>
  );
};

export default SongInfoPanel;
