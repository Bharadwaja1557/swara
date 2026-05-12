import { useParams, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { formatDuration } from '@/utils/greeting';
import { slugify } from '@/utils/library';
import type { Track } from '@/types/music';

// ─── Track row ────────────────────────────────────────────────────────────────
const TrackItem = ({ track, index, queue }: { track: Track; index: number; queue: Track[] }) => {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isActive = currentTrack?.id === track.id;

  return (
    <button
      type="button"
      onClick={() => playTrack(track, queue)}
      className={[
        'flex items-center gap-4 w-full py-3 px-3 rounded-xl text-left',
        'hover:bg-swara-card active:scale-[0.98] transition-all duration-150',
        isActive ? 'bg-swara-card' : '',
      ].join(' ')}
      aria-label={`Play ${track.title}`}
    >
      {/* Track number or equalizer */}
      <span
        className={[
          'w-6 text-center text-[0.8125rem] font-medium tabular-nums flex-shrink-0',
          isActive ? 'text-swara-accent' : 'text-swara-dim',
        ].join(' ')}
      >
        {isActive && isPlaying ? (
          <span className="flex gap-[2px] items-end justify-center h-4">
            <span className="w-[3px] bg-swara-accent rounded-full" style={{ height: '60%', animation: 'eq 0.8s ease-in-out infinite' }} />
            <span className="w-[3px] bg-swara-accent rounded-full" style={{ height: '100%', animation: 'eq 0.8s ease-in-out 0.2s infinite' }} />
            <span className="w-[3px] bg-swara-accent rounded-full" style={{ height: '40%', animation: 'eq 0.8s ease-in-out 0.4s infinite' }} />
          </span>
        ) : (
          index + 1
        )}
      </span>

      {/* Title + artist */}
      <div className="flex-1 min-w-0">
        <p className={[
          'text-[0.8125rem] font-medium leading-snug truncate tracking-tight',
          isActive ? 'text-swara-accent' : 'text-swara-text',
        ].join(' ')}>
          {track.title}
        </p>
        <p className="text-[0.6875rem] text-swara-muted truncate">{track.artist}</p>
      </div>

      {/* Duration */}
      <span className="text-[0.6875rem] text-swara-dim tabular-nums flex-shrink-0">
        {formatDuration(track.duration)}
      </span>
    </button>
  );
};

// ─── AlbumPage ───────────────────────────────────────────────────────────────

const AlbumPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { albums, loading, loaded } = useLibraryStore();
  const { playAlbum, playTrack } = usePlayerStore();

  const album = albums.find((a) => a.id === id);

  if (loading && !loaded) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-6 h-6 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <p className="text-swara-muted text-sm">Album not found</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-swara-accent text-sm font-medium"
        >
          Go back
        </button>
      </div>
    );
  }

  const handlePlayAll = () => playAlbum(album.tracks, 0);
  const handleShuffle = () => {
    const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  const composerArtistId = slugify(album.composer);

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      {/* Back button sticky */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 pt-5 pb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all duration-100"
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-swara-text tracking-tight truncate">Album</h1>
      </div>

      {/* Album hero */}
      <div className="px-6 pb-2">
        {/* Cover art */}
        <div className="mb-5 flex justify-center">
          <div className="w-[220px] h-[220px] rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)] bg-swara-card">
            <img
              src={album.coverUrl}
              alt={`${album.title} cover`}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="text-center mb-5">
          <h2 className="text-xl font-bold text-swara-text tracking-tight leading-tight mb-1">
            {album.title}
          </h2>
          <button
            type="button"
            onClick={() => navigate(`/artist/${composerArtistId}`)}
            className="text-sm text-swara-accent font-medium hover:text-swara-accent-bright transition-colors"
          >
            {album.composer}
          </button>
          <p className="text-xs text-swara-muted mt-0.5">
            {album.year} · {album.trackCount} songs
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={handlePlayAll}
            className={[
              'flex-1 flex items-center justify-center gap-2',
              'py-2.5 rounded-xl',
              'bg-swara-accent text-swara-bg text-sm font-semibold',
              'active:scale-[0.97] transition-transform duration-100',
            ].join(' ')}
            aria-label="Play album"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 4.75v14.5a.75.75 0 0 0 1.14.64l11.5-7.25a.75.75 0 0 0 0-1.28L7.14 4.11A.75.75 0 0 0 6 4.75Z" />
            </svg>
            Play
          </button>
          <button
            type="button"
            onClick={handleShuffle}
            className={[
              'flex-1 flex items-center justify-center gap-2',
              'py-2.5 rounded-xl',
              'bg-swara-elevated border border-swara-border text-swara-text text-sm font-medium',
              'active:scale-[0.97] transition-transform duration-100',
            ].join(' ')}
            aria-label="Shuffle album"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 3h5v5M4 20 21 3M16 21h5v-5M4 4l5 5M15 15l6 6" />
            </svg>
            Shuffle
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-swara-border opacity-60 mb-2" aria-hidden="true" />

        {/* Track list */}
        <div>
          {album.tracks.map((track, i) => (
            <TrackItem key={track.id} track={track} index={i} queue={album.tracks} />
          ))}
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-6" />
    </div>
  );
};

export default AlbumPage;
