import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { slugify } from '@/utils/library';
import { formatDuration } from '@/utils/greeting';
import type { Track } from '@/types/music';

const PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

// ─── Playing bars animation (git-play style) ──────────────────────────────────
const PlayingBars = () => (
  <div className="flex gap-[2px] items-end justify-center h-4" aria-hidden="true">
    <span className="w-[3px] bg-swara-accent rounded-full" style={{ height: '55%', animation: 'eq 0.9s ease-in-out infinite' }} />
    <span className="w-[3px] bg-swara-accent rounded-full" style={{ height: '100%', animation: 'eq 0.7s ease-in-out 0.15s infinite' }} />
    <span className="w-[3px] bg-swara-accent rounded-full" style={{ height: '40%', animation: 'eq 1.1s ease-in-out 0.3s infinite' }} />
  </div>
);

// ─── Track row (git-play style) ───────────────────────────────────────────────
const TrackItem = ({
  track,
  queue,
}: {
  track: Track;
  queue: Track[];
}) => {
  const playTrack    = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying    = usePlayerStore((s) => s.isPlaying);
  const [liked, setLiked] = useState(false);

  const isActive = currentTrack?.id === track.id;

  return (
    <li
      className={[
        'flex items-center gap-3 px-4 py-3 rounded-xl',
        'transition-colors duration-150 cursor-pointer',
        'hover:bg-swara-card active:scale-[0.98]',
        isActive ? 'bg-swara-card' : '',
      ].join(' ')}
      onClick={() => playTrack(track, queue)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') playTrack(track, queue); }}
      aria-label={`Play ${track.title}`}
    >
      {/* Track number / playing indicator */}
      <div className="w-7 flex-shrink-0 flex items-center justify-center">
        {isActive && isPlaying ? (
          <PlayingBars />
        ) : (
          <span className={[
            'text-[0.8125rem] font-medium tabular-nums',
            isActive ? 'text-swara-accent' : 'text-swara-dim',
          ].join(' ')}>
            {track.trackNumber}
          </span>
        )}
      </div>

      {/* Title + artists (plain text, no boxes) */}
      <div className="flex-1 min-w-0">
        <p className={[
          'text-[0.8125rem] font-medium leading-snug truncate tracking-tight',
          isActive ? 'text-swara-accent' : 'text-swara-text',
        ].join(' ')}>
          {track.title}
        </p>
        {track.artists.length > 0 && (
          <p className="text-[0.6875rem] text-swara-muted truncate mt-[1px]">
            {track.artists.join(', ')}
          </p>
        )}
      </div>

      {/* Like + duration */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setLiked((l) => !l); }}
          className={[
            'w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200',
            liked ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted',
          ].join(' ')}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24"
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
        <span className="text-[0.6875rem] text-swara-dim tabular-nums w-9 text-right">
          {formatDuration(track.duration)}
        </span>
      </div>
    </li>
  );
};

// ─── AlbumPage ────────────────────────────────────────────────────────────────

const AlbumPage = () => {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { albums, loaded, loadAlbumTracks } = useLibraryStore();
  const { playAlbum, playTrack }            = usePlayerStore();

  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError,   setTracksError]   = useState<string | null>(null);
  const [coverError,    setCoverError]    = useState(false);

  const album = albums.find((a) => a.id === id);

  // Lazy-load tracks
  useEffect(() => {
    if (!id || !loaded) return;
    const current = albums.find((a) => a.id === id);
    if (!current || current.tracks.length > 0) return;

    setTracksLoading(true);
    setTracksError(null);
    loadAlbumTracks(id)
      .then((t) => { if (t.length === 0) setTracksError('No tracks available for this album.'); })
      .catch(() => setTracksError('Unable to load tracks for this album.'))
      .finally(() => setTracksLoading(false));
  }, [id, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setCoverError(false); }, [album?.id]);

  if (!loaded && !album) {
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
        <button type="button" onClick={() => navigate(-1)} className="text-swara-accent text-sm font-medium">Go back</button>
      </div>
    );
  }

  const coverSrc     = coverError || !album.coverUrl ? PLACEHOLDER : album.coverUrl;
  const composerId   = slugify(album.composer);
  const tracks       = album.tracks;

  const handlePlayAll = () => { if (tracks.length > 0) playAlbum(tracks, 0); };
  const handleShuffle = () => {
    if (!tracks.length) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      {/* ── Sticky back bar ── */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 pt-5 pb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all duration-100"
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p className="text-[0.8125rem] font-semibold text-swara-text tracking-tight truncate">{album.title}</p>
      </div>

      {/* ── Album hero ── */}
      <div className="px-6 pb-4">
        {/* Cover */}
        <div className="flex justify-center mb-5">
          <div
            className="w-[200px] h-[200px] rounded-2xl overflow-hidden bg-swara-card"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 80px rgba(200,169,110,0.06)' }}
          >
            <img
              src={coverSrc}
              alt={`${album.title} cover`}
              className="w-full h-full object-cover"
              loading="eager"
              onError={() => setCoverError(true)}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="text-center mb-5">
          <h1 className="text-[1.25rem] font-bold text-swara-text tracking-tight leading-tight mb-1 font-display">
            {album.title}
          </h1>
          <button
            type="button"
            onClick={() => navigate(`/artist/${composerId}`)}
            className="text-sm text-swara-accent font-medium hover:text-swara-accent-bright transition-colors"
          >
            {album.composer}
          </button>
          <p className="text-xs text-swara-muted mt-0.5">
            {album.year}
            {album.trackCount > 0 && ` · ${album.trackCount} songs`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-5">
          <button
            type="button"
            onClick={handlePlayAll}
            disabled={tracksLoading || tracks.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-swara-accent text-swara-bg text-sm font-semibold active:scale-[0.97] transition-transform duration-100 disabled:opacity-50"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Play
          </button>
          <button
            type="button"
            onClick={handleShuffle}
            disabled={tracksLoading || tracks.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-swara-elevated border border-swara-border text-swara-text text-sm font-medium active:scale-[0.97] transition-transform duration-100 disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
            </svg>
            Shuffle
          </button>
        </div>
      </div>

      {/* ── Track list ── */}
      <div className="px-2 pb-6">
        <div className="h-px bg-swara-border opacity-50 mx-4 mb-1" />

        {tracksLoading && (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
          </div>
        )}

        {tracksError && !tracksLoading && (
          <p className="text-swara-muted text-sm text-center py-10">{tracksError}</p>
        )}

        {!tracksLoading && !tracksError && (
          <ul className="space-y-0">
            {tracks.map((track) => (
              <TrackItem key={track.id} track={track} queue={tracks} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AlbumPage;
