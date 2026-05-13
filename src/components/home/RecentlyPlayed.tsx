import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import type { Album } from '@/types/music';

// ─── Single album card (git-play style) ──────────────────────────────────────
const RecentAlbumCard = ({ album }: { album: Album }) => {
  const navigate     = useNavigate();
  const loadAlbumTracks = useLibraryStore((s) => s.loadAlbumTracks);
  const playAlbum    = usePlayerStore((s)    => s.playAlbum);

  const handleClick = async () => {
    navigate(`/album/${album.id}`);
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let tracks = album.tracks;
    if (tracks.length === 0) {
      tracks = await loadAlbumTracks(album.id);
    }
    if (tracks.length > 0) playAlbum(tracks, 0);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        'flex-shrink-0 w-[110px]',
        'flex flex-col gap-0 text-left',
        'active:scale-[0.94] transition-transform duration-150',
        'group',
      ].join(' ')}
      aria-label={`Open ${album.title}`}
    >
      {/* Cover */}
      <div className="relative w-[110px] h-[110px] rounded-xl overflow-hidden bg-swara-elevated flex-shrink-0">
        {album.coverUrl ? (
          <img
            src={album.coverUrl}
            alt={album.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-swara-dim">
            ♪
          </div>
        )}
        {/* Tap-to-play overlay */}
        <div
          className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors duration-200 flex items-center justify-center"
          onClick={handlePlay}
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-8 h-8 rounded-full bg-swara-accent flex items-center justify-center shadow-card">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M5 3.5l8 4.5-8 4.5V3.5Z" fill="#09090C" />
            </svg>
          </div>
        </div>
      </div>

      {/* Text */}
      <p className="text-[0.78rem] font-medium text-swara-text mt-[6px] truncate w-full">
        {album.title}
      </p>
      <p className="text-[0.7rem] text-swara-muted truncate w-full">
        {album.composer}
      </p>
    </button>
  );
};

// ─── RecentlyPlayed ───────────────────────────────────────────────────────────
const RecentlyPlayed = () => {
  const { albums }       = useLibraryStore();
  const recentAlbumIds   = usePlayerStore((s) => s.recentAlbumIds);

  // Map ids → albums, preserve order, dedupe
  const recentAlbums = recentAlbumIds
    .map((id) => albums.find((a) => a.id === id))
    .filter(Boolean)
    .filter((a, i, arr): a is Album => arr.findIndex((x) => x?.id === a?.id) === i)
    .slice(0, 10);

  if (recentAlbums.length === 0) return null;

  return (
    <section className="pt-5 pb-2" aria-labelledby="recents-heading">
      <div className="flex items-center justify-between px-5 mb-3">
        <h2
          id="recents-heading"
          className="text-[0.8125rem] font-semibold text-swara-muted tracking-widest uppercase"
        >
          Recently Played
        </h2>
      </div>

      <div
        className="flex gap-3 px-5 overflow-x-auto scrollbar-none pb-1"
        role="list"
        aria-label="Recently played albums"
      >
        {recentAlbums.map((album) => (
          <div key={album.id} role="listitem">
            <RecentAlbumCard album={album} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentlyPlayed;
