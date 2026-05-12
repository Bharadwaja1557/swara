import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import type { Track, Album } from '@/types/music';
import { formatDuration } from '@/utils/greeting';

const INITIAL_COUNT = 5;

// ─── Track row ───────────────────────────────────────────────────────────────
const TrackItem = ({
  track,
  index,
  queue,
}: {
  track: Track;
  index: number;
  queue: Track[];
}) => {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isActive = currentTrack?.id === track.id;

  return (
    <button
      type="button"
      onClick={() => playTrack(track, queue)}
      className={[
        'flex items-center gap-3 w-full py-3 px-3 rounded-xl text-left',
        'hover:bg-swara-card active:scale-[0.98] transition-all duration-150',
        isActive ? 'bg-swara-card' : '',
      ].join(' ')}
      aria-label={`Play ${track.title}`}
    >
      <span
        className={[
          'w-6 text-center text-[0.8125rem] font-medium tabular-nums flex-shrink-0',
          isActive ? 'text-swara-accent' : 'text-swara-dim',
        ].join(' ')}
      >
        {isActive && isPlaying ? (
          <span className="flex gap-[2px] items-end justify-center h-4">
            <span className="w-[3px] bg-swara-accent rounded-full animate-[equalizer_0.8s_ease-in-out_infinite]" style={{ height: '60%' }} />
            <span className="w-[3px] bg-swara-accent rounded-full animate-[equalizer_0.8s_ease-in-out_0.2s_infinite]" style={{ height: '100%' }} />
            <span className="w-[3px] bg-swara-accent rounded-full animate-[equalizer_0.8s_ease-in-out_0.4s_infinite]" style={{ height: '40%' }} />
          </span>
        ) : (
          index + 1
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className={[
          'text-[0.8125rem] font-medium leading-snug truncate tracking-tight',
          isActive ? 'text-swara-accent' : 'text-swara-text',
        ].join(' ')}>
          {track.title}
        </p>
        <p className="text-[0.6875rem] text-swara-muted truncate">{track.album}</p>
      </div>
      <span className="text-[0.6875rem] text-swara-dim tabular-nums flex-shrink-0">
        {formatDuration(track.duration)}
      </span>
    </button>
  );
};

// ─── Album card (small) ───────────────────────────────────────────────────────
const AlbumCard = ({ album }: { album: Album }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/album/${album.id}`)}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left"
      aria-label={`Open album ${album.title}`}
    >
      <img
        src={album.coverUrl}
        alt={album.title}
        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[0.8125rem] font-medium text-swara-text leading-snug truncate tracking-tight">
          {album.title}
        </p>
        <p className="text-[0.6875rem] text-swara-muted truncate">
          {album.year} · {album.trackCount} tracks
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
};

// ─── ArtistPage ───────────────────────────────────────────────────────────────

const ArtistPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artists, tracks, albums, loading, loaded } = useLibraryStore();
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [showAllAlbums, setShowAllAlbums] = useState(false);

  const artist = artists.find((a) => a.id === id);

  if (loading && !loaded) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-6 h-6 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <p className="text-swara-muted text-sm">Artist not found</p>
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

  const artistTracks = artist.trackIds.map((id: string) => tracks.find((t) => t.id === id)).filter(Boolean) as Track[];
  const artistAlbums = artist.composerAlbumIds.map((id: string) => albums.find((a) => a.id === id)).filter(Boolean) as Album[];

  const visibleTracks = showAllTracks ? artistTracks : artistTracks.slice(0, INITIAL_COUNT);
  const visibleAlbums = showAllAlbums ? artistAlbums : artistAlbums.slice(0, INITIAL_COUNT);

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      {/* Back + header */}
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
        <h1 className="text-base font-semibold text-swara-text tracking-tight truncate">
          Artist
        </h1>
      </div>

      {/* Artist hero */}
      <div className="px-6 pb-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-swara-card flex-shrink-0 border border-swara-border">
            <img
              src={artist.coverUrl}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-swara-text tracking-tight leading-tight">
              {artist.name}
            </h2>
            <p className="text-sm text-swara-muted mt-0.5">
              {artistTracks.length} song{artistTracks.length !== 1 ? 's' : ''}
              {artistAlbums.length > 0 && ` · ${artistAlbums.length} album${artistAlbums.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Songs section */}
        {artistTracks.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[0.6875rem] font-semibold text-swara-muted tracking-widest uppercase mb-2 px-1">
              Songs
            </h3>
            <div>
              {visibleTracks.map((track, i) => (
                <TrackItem key={track.id} track={track} index={i} queue={artistTracks} />
              ))}
            </div>
            {artistTracks.length > INITIAL_COUNT && (
              <button
                type="button"
                onClick={() => setShowAllTracks((v) => !v)}
                className="mt-1 ml-3 text-[0.8125rem] font-medium text-swara-accent hover:text-swara-accent-bright transition-colors"
              >
                {showAllTracks ? 'Show less' : `Show ${artistTracks.length - INITIAL_COUNT} more`}
              </button>
            )}
          </div>
        )}

        {/* Albums section (only if composer) */}
        {artistAlbums.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[0.6875rem] font-semibold text-swara-muted tracking-widest uppercase mb-2 px-1">
              Albums
            </h3>
            <div>
              {visibleAlbums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
            {artistAlbums.length > INITIAL_COUNT && (
              <button
                type="button"
                onClick={() => setShowAllAlbums((v) => !v)}
                className="mt-1 ml-3 text-[0.8125rem] font-medium text-swara-accent hover:text-swara-accent-bright transition-colors"
              >
                {showAllAlbums ? 'Show less' : `Show ${artistAlbums.length - INITIAL_COUNT} more`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistPage;
