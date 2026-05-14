import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { useLikedStore } from '@/store/likedStore';
import { useLibraryUserStore } from '@/store/libraryUserStore';
import { slugify } from '@/utils/library';
import BottomSheet from '@/components/ui/BottomSheet';
import type { Track, Album } from '@/types/music';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

// ─── 3-dots track menu ────────────────────────────────────────────────────────
const TrackMenu = ({ track, album, isOpen, onClose }: {
  track: Track; album: Album; isOpen: boolean; onClose: () => void;
}) => {
  const navigate = useNavigate();
  const { isLiked, toggleLike } = useLikedStore();
  const { hasTrack, addTrack, removeTrack } = useLibraryUserStore();
  const liked = isLiked(track.id);
  const inLib = hasTrack(track.id);

  const MI = ({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean }) => (
    <button type="button" onClick={onClick}
      className={['flex items-center gap-4 w-full px-5 py-3.5 text-[0.9rem] font-medium text-left hover:bg-white/5 active:bg-white/10 transition-colors', accent ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>
      <span className="w-5 flex items-center justify-center flex-shrink-0 text-swara-muted">{icon}</span>
      {label}
    </button>
  );
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pt-1 pb-3 border-b border-swara-border">
        <p className="text-[0.95rem] font-semibold text-swara-text truncate">{track.title}</p>
        <p className="text-[0.78rem] text-swara-muted mt-0.5 truncate">{album.title}</p>
      </div>
      <div className="py-1">
        <MI icon={<svg viewBox="0 0 24 24" width="18" height="18" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>}
          label={liked ? 'Added to Liked Songs' : 'Add to Liked Songs'} accent={liked} onClick={() => toggleLike(track)} />
        <MI icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          label="Add to Playlist" onClick={() => { onClose(); alert('Coming Soon'); }} />
        <MI icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>}
          label={inLib ? 'Remove from Library' : 'Add to Library'} onClick={() => { if (inLib) removeTrack(track); else addTrack(track, album); }} />
        <div className="mx-5 my-1 h-px bg-swara-border" />
        <MI icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>}
          label="Stash this Song" onClick={() => { onClose(); alert('Coming Soon'); }} />
        <MI icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
          label="View Artists" onClick={() => { onClose(); navigate(`/artist/${slugify(track.artists[0] ?? track.artist)}`); }} />
      </div>
    </BottomSheet>
  );
};

// ─── Playing bars ─────────────────────────────────────────────────────────────
const PlayingBars = () => (
  <div className="flex gap-[2px] items-end justify-center h-[14px]" aria-hidden="true">
    {[{ h: '55%', delay: '0s' }, { h: '100%', delay: '0.15s' }, { h: '40%', delay: '0.3s' }].map((b, i) => (
      <span key={i} className="w-[3px] bg-swara-accent rounded-full"
        style={{ height: b.h, animation: `eq 0.9s ease-in-out ${b.delay} infinite` }} />
    ))}
  </div>
);

// ─── Track row ────────────────────────────────────────────────────────────────
const TrackRow = ({ track, queue, album }: { track: Track; queue: Track[]; album: Album }) => {
  const { playTrack, currentTrack, isPlaying } = usePlayerStore();
  const { isLiked, toggleLike } = useLikedStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = currentTrack?.id === track.id;
  const liked    = isLiked(track.id);

  return (
    <>
      <li className={['flex items-center gap-3 px-2 py-3 rounded-xl transition-colors duration-150 cursor-pointer hover:bg-swara-card active:scale-[0.98]', isActive ? 'bg-swara-card' : ''].join(' ')}
        onClick={() => playTrack(track, queue)}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') playTrack(track, queue); }}>
        {/* Track number / bars */}
        <div className="w-7 flex items-center justify-center flex-shrink-0">
          {isActive && isPlaying ? <PlayingBars /> : (
            <span className={['text-[0.82rem] font-medium tabular-nums', isActive ? 'text-swara-accent' : 'text-swara-dim'].join(' ')}>
              {track.trackNumber}
            </span>
          )}
        </div>

        {/* Title + artists */}
        <div className="flex-1 min-w-0">
          <p className={['text-[0.88rem] font-medium truncate leading-snug', isActive ? 'text-swara-accent' : 'text-swara-text'].join(' ')}>
            {track.title}
          </p>
          {track.artists.length > 0 && (
            <p className="text-[0.72rem] text-swara-muted truncate mt-[1px]">
              {track.artists.join(', ')}
            </p>
          )}
        </div>

        {/* Heart + 3 dots */}
        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => toggleLike(track)}
            className={['w-9 h-9 flex items-center justify-center rounded-full transition-colors', liked ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
            aria-label={liked ? 'Unlike' : 'Like'}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
          <button type="button" onClick={() => setMenuOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-swara-dim hover:text-swara-muted transition-colors"
            aria-label="Track options">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
        </div>
      </li>
      <TrackMenu track={track} album={album} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
};

// ─── AlbumPage ────────────────────────────────────────────────────────────────
const AlbumPage = () => {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { albums, loaded, loadAlbumTracks } = useLibraryStore();
  const { playAlbum, playTrack }            = usePlayerStore();

  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [coverErr,   setCoverErr]   = useState(false);
  const [isShuffle,  setIsShuffle]  = useState(false);

  const album = albums.find((a) => a.id === id);

  useEffect(() => {
    if (!id || !loaded) return;
    const a = albums.find((x) => x.id === id);
    if (!a || a.tracks.length > 0) return;
    setLoading(true); setError(null);
    loadAlbumTracks(id)
      .then((t) => { if (!t.length) setError('No tracks available.'); })
      .catch(() => setError('Unable to load tracks.'))
      .finally(() => setLoading(false));
  }, [id, loaded]); // eslint-disable-line

  useEffect(() => { setCoverErr(false); }, [album?.id]);

  if (!album) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-swara-muted text-sm">Album not found</p>
      <button type="button" onClick={() => navigate(-1)} className="text-swara-accent text-sm">Go back</button>
    </div>
  );

  const tracks    = album.tracks;
  const coverSrc  = coverErr || !album.coverUrl ? PH : album.coverUrl;
  const composerId = slugify(album.composer);

  const handlePlay = () => {
    if (!tracks.length) return;
    if (isShuffle) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    } else {
      playAlbum(tracks, 0);
    }
  };

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">
      {/* Back bar */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 pt-5 pb-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all"
          aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      <div className="px-6">
        {/* Cover */}
        <div className="flex justify-center mb-5">
          <div className="w-[200px] h-[200px] lg:w-[280px] lg:h-[280px] rounded-2xl overflow-hidden bg-swara-card flex-shrink-0"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
            <img src={coverSrc} alt={album.title} className="w-full h-full object-cover" loading="eager"
              onError={() => setCoverErr(true)} />
          </div>
        </div>

        {/* Meta */}
        <div className="mb-4">
          <h1 className="text-[1.3rem] font-bold text-swara-text tracking-tight font-display mb-0.5">{album.title}</h1>
          <button type="button" onClick={() => navigate(`/artist/${composerId}`)}
            className="text-[0.88rem] text-swara-accent font-medium hover:text-swara-accent-bright transition-colors">
            {album.composer}
          </button>
          <p className="text-xs text-swara-muted mt-0.5">{album.year}</p>
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-between mb-4 py-2 border-t border-b border-swara-border">
          <span className="text-[0.82rem] text-swara-muted font-medium">
            Tracks {tracks.length > 0 ? tracks.length : '…'}
          </span>
          <div className="flex items-center gap-2">
            {/* Shuffle toggle */}
            <button type="button" onClick={() => setIsShuffle((s) => !s)}
              className={['w-9 h-9 flex items-center justify-center rounded-full transition-colors', isShuffle ? 'text-swara-accent' : 'text-swara-dim hover:text-swara-muted'].join(' ')}
              aria-label={isShuffle ? 'Shuffle on' : 'Shuffle off'}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                style={{ opacity: isShuffle ? 1 : 0.5 }}>
                <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
              </svg>
            </button>

            {/* Play */}
            <button type="button" onClick={handlePlay} disabled={loading || !tracks.length}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-swara-accent text-swara-bg disabled:opacity-50 active:scale-95 transition-transform"
              aria-label="Play">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="px-4 pb-8">
        {loading && <div className="flex justify-center py-10"><div className="w-5 h-5 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" /></div>}
        {error && !loading && <p className="text-swara-muted text-sm text-center py-10">{error}</p>}
        {!loading && !error && (
          <ul className="space-y-0">
            {tracks.map((track) => (
              <TrackRow key={track.id} track={track} queue={tracks} album={album} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AlbumPage;
