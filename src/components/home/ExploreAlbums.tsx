import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Album } from '@/types/music';
import { pickRandom } from '@/utils/greeting';

const STAGGER = [
  'stagger-1','stagger-2','stagger-3','stagger-4',
] as const;

// ─── Album card — no track count ─────────────────────────────────────────────
const AlbumCard = ({ album, index }: { album: Album; index: number }) => {
  const navigate = useNavigate();
  const stagger  = STAGGER[Math.min(index, STAGGER.length - 1)];

  return (
    <button
      className={[
        'flex flex-col gap-2.5 text-left group cursor-pointer',
        'active:scale-[0.97] transition-transform duration-150',
        'animate-card-in', stagger,
      ].join(' ')}
      type="button"
      onClick={() => navigate(`/album/${album.id}`)}
      aria-label={`Open ${album.title} by ${album.composer}`}
    >
      {/* Cover */}
      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-swara-elevated shadow-card">
        <img
          src={album.coverUrl}
          alt={`${album.title}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>

      {/* Info — name, composer, year only */}
      <div className="flex flex-col gap-0.5 px-0.5">
        <p className="text-[0.8125rem] font-semibold text-swara-text truncate leading-snug font-display tracking-tight">
          {album.title}
        </p>
        <p className="text-[0.6875rem] text-swara-muted truncate">
          {album.composer}
        </p>
        <p className="text-[0.625rem] text-swara-dim mt-0.5">
          {album.year}
        </p>
      </div>
    </button>
  );
};

// ─── ExploreAlbums ────────────────────────────────────────────────────────────
interface ExploreAlbumsProps {
  albumPool: Album[];
}

const ExploreAlbums = ({ albumPool }: ExploreAlbumsProps) => {
  // Show 8 albums: mobile displays first 4 (2x2), desktop shows all 8 (4x2)
  const [visible,  setVisible]  = useState<Album[]>(() => pickRandom(albumPool, 8));
  const [spinning, setSpinning] = useState(false);
  const [animKey,  setAnimKey]  = useState(0);

  const handleShuffle = useCallback(() => {
    setSpinning(true);
    setTimeout(() => {
      setVisible(pickRandom(albumPool, 8));
      setAnimKey((k) => k + 1);
      setSpinning(false);
    }, 320);
  }, [albumPool]);

  return (
    <section className="px-5 lg:px-8 pt-6 pb-8" aria-labelledby="explore-albums-heading">
      <div className="flex items-center justify-between mb-4">
        <h2
          id="explore-albums-heading"
          className="text-base font-bold text-swara-text tracking-tight font-display"
        >
          Explore Albums
        </h2>

        <button
          onClick={handleShuffle}
          disabled={spinning}
          className={[
            'flex items-center gap-1.5',
            'text-[0.75rem] font-medium text-swara-muted',
            'hover:text-swara-accent transition-colors duration-200',
            'active:scale-95 transition-transform',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
          type="button"
          aria-label="Shuffle album selection"
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            className={spinning ? 'animate-spin' : ''}
            style={{ animationDuration: '400ms' }}
            aria-hidden="true"
          >
            <path d="M16 3h5v5M8 21H3v-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 3l-7 7M3 21l7-7"  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 16.5V21h-4.5M3 7.5V3h4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Shuffle
        </button>
      </div>

      {/* Mobile: 2 cols (first 4 visible), Desktop: 4 cols (all 8 visible) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {visible.map((album, i) => (
          // Items 4-7 hidden on mobile, shown on desktop
          <div key={`${animKey}-${album.id}`} className={i >= 4 ? 'hidden lg:contents' : ''}>
            <AlbumCard album={album} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExploreAlbums;
