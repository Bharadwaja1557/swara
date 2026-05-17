/**
 * QuickPicks — 3 cards:
 *  1. Shuffle Play  — random from entire library
 *  2. Latest Uploads — tracks from 3 most recent albums
 *  3. Most Played   — Coming Soon
 */
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore }  from '@/store/playerStore';
import { useLikedStore }   from '@/store/likedStore';
import { useNavigate }     from 'react-router-dom';
import { pickRandom }      from '@/utils/greeting';
import type { Track }      from '@/types/music';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

// Mosaic cover: 1, 2, or 4 images
const MosaicCover = ({ urls }: { urls: string[] }) => {
  const count = Math.min(urls.filter(Boolean).length, 4);
  const imgs  = urls.filter(Boolean).slice(0, 4);

  if (count <= 1) return (
    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-swara-elevated">
      <img src={imgs[0] || PH} alt="" className="w-full h-full object-cover" loading="lazy" />
    </div>
  );
  return (
    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-swara-border grid grid-cols-2 gap-[1px]">
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <div key={i} className="overflow-hidden bg-swara-elevated">
          <img src={imgs[i]} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ))}
    </div>
  );
};

interface PickCardProps {
  icon?: React.ReactNode;
  coverUrls?: string[];
  title: string;
  subtitle: string;
  trackCount: number | null;
  comingSoon?: boolean;
  onClick?: () => void;
}

const PickCard = ({ icon, coverUrls, title, subtitle, trackCount, comingSoon, onClick }: PickCardProps) => (
  <button
    type="button"
    onClick={comingSoon ? undefined : onClick}
    disabled={comingSoon}
    className={[
      'flex items-center gap-3.5 w-full text-left',
      'bg-swara-card border border-swara-border rounded-xl px-3.5 py-3',
      'transition-all duration-200 shadow-card group',
      comingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:border-swara-elevated hover:bg-swara-elevated active:scale-[0.98]',
    ].join(' ')}
    aria-label={title}
  >
    {/* Cover / icon */}
    {icon ? (
      <div className="w-14 h-14 rounded-lg flex-shrink-0 bg-swara-elevated flex items-center justify-center text-swara-accent">
        {icon}
      </div>
    ) : (
      <MosaicCover urls={coverUrls ?? []} />
    )}

    {/* Text */}
    <div className="flex-1 min-w-0">
      <p className="text-[0.88rem] font-semibold text-swara-text truncate leading-snug">
        {title}
      </p>
      <p className="text-[0.72rem] text-swara-muted mt-0.5 truncate">{subtitle}</p>
      {comingSoon ? (
        <span className="inline-block mt-1 text-[0.65rem] font-semibold text-swara-dim uppercase tracking-widest">
          Coming Soon
        </span>
      ) : trackCount !== null ? (
        <p className="text-[0.66rem] text-swara-dim mt-1">{trackCount} tracks</p>
      ) : null}
    </div>

    {/* Play arrow */}
    {!comingSoon && (
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-swara-accent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <svg viewBox="0 0 16 16" width="10" height="10" fill="#0a0a0a" aria-hidden="true">
          <path d="M4.5 3.5l9 4.5-9 4.5V3.5Z"/>
        </svg>
      </div>
    )}
  </button>
);

const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
    <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
);

// Bar-chart icon: three columns of increasing height — visually "most/top"
const MostPlayedIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
    <rect x="3"  y="14" width="4" height="7" rx="1" opacity="0.5"/>
    <rect x="10" y="9"  width="4" height="12" rx="1" opacity="0.75"/>
    <rect x="17" y="3"  width="4" height="18" rx="1"/>
  </svg>
);

const QuickPicks = () => {
  const { albums, tracks, loadAlbumTracks } = useLibraryStore();
  const { playTrack } = usePlayerStore();
  const navigate       = useNavigate();
  const getLikedTracks = useLikedStore((s) => s.getLikedTracks);
  const likedTracks    = getLikedTracks();

  const ensureAllTracks = async (): Promise<Track[]> => {
    const unloaded = albums.filter((a) => a.tracks.length === 0);
    await Promise.all(unloaded.map((a) => loadAlbumTracks(a.id)));
    return useLibraryStore.getState().tracks;
  };

  const handleShufflePlay = async () => {
    const allTracks = await ensureAllTracks();
    if (!allTracks.length) return;
    const shuffled = pickRandom(allTracks, allTracks.length);
    playTrack(shuffled[0], shuffled);
  };

  return (
    <section className="px-5 pt-5 pb-2" aria-labelledby="quick-picks-heading">
      <h2 id="quick-picks-heading"
        className="text-base font-bold text-swara-text tracking-tight mb-3.5 font-display">
        Quick Picks
      </h2>
      <div className="flex flex-col gap-2.5">
        <PickCard
          icon={<ShuffleIcon />}
          title="Shuffle Play"
          subtitle="Random songs from the entire library"
          trackCount={tracks.length || null}
          onClick={handleShufflePlay}
        />
        <PickCard
          icon={<HeartIcon />}
          title="Liked Songs"
          subtitle="Your saved favorites"
          trackCount={likedTracks.length > 0 ? likedTracks.length : null}
          onClick={() => navigate('/liked')}
        />
        <PickCard
          icon={<MostPlayedIcon />}
          title="Most Played"
          subtitle="Your top tracks"
          trackCount={null}
          comingSoon
        />
      </div>
    </section>
  );
};

export default QuickPicks;
