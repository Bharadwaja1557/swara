import type { QuickPick } from '@/types/music';

interface QuickPickCardProps {
  pick: QuickPick;
}

/**
 * Mosaic thumbnail: up to 4 images in a 2×2 grid, or single image.
 */
const MosaicCover = ({ urls, size = 56 }: { urls: string[]; size?: number }) => {
  const count = Math.min(urls.length, 4);

  if (count === 1) {
    return (
      <div className="rounded-lg overflow-hidden flex-shrink-0" style={{ width: size, height: size }}>
        <img src={urls[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden flex-shrink-0 grid grid-cols-2 gap-px bg-swara-border"
      style={{ width: size, height: size }}
    >
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <div key={i} className="overflow-hidden bg-swara-elevated">
          <img
            src={urls[i]}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
};

/**
 * Individual quick-pick card — minimal, horizontal layout.
 */
const QuickPickCard = ({ pick }: QuickPickCardProps) => {
  return (
    <button
      className={[
        'flex items-center gap-3.5 w-full',
        'bg-swara-card border border-swara-border',
        'rounded-xl px-3.5 py-3',
        'text-left cursor-pointer',
        'hover:border-swara-elevated hover:bg-swara-elevated',
        'active:scale-[0.98]',
        'transition-all duration-200',
        'shadow-card',
        'group',
      ].join(' ')}
      type="button"
      aria-label={`Play ${pick.title}`}
    >
      {/* Mosaic cover */}
      <MosaicCover urls={pick.coverUrls} size={52} />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[0.8125rem] font-semibold text-swara-text truncate leading-snug">
          {pick.title}
        </p>
        <p className="text-[0.6875rem] text-swara-muted mt-0.5 truncate">
          {pick.subtitle}
        </p>
        <p className="text-[0.625rem] text-swara-dim mt-1">
          {pick.trackCount} tracks
        </p>
      </div>

      {/* Play button */}
      <div
        className={[
          'w-8 h-8 rounded-full flex-shrink-0',
          'flex items-center justify-center',
          'opacity-0 group-hover:opacity-100',
          'transition-all duration-200',
          'bg-swara-accent',
        ].join(' ')}
        aria-hidden="true"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M4.5 3.5l9 4.5-9 4.5V3.5Z" fill="#09090C" />
        </svg>
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

interface QuickPicksProps {
  picks: QuickPick[];
}

/**
 * QuickPicks
 *
 * Vertical list of curated playlist cards for fast access.
 * Two-column grid on wider screens.
 */
const QuickPicks = ({ picks }: QuickPicksProps) => {
  return (
    <section className="px-5 pt-6 pb-2" aria-labelledby="quick-picks-heading">
      {/* Section header */}
      <h2
        id="quick-picks-heading"
        className="text-base font-semibold text-swara-text tracking-[-0.01em] mb-4"
      >
        Quick Picks
      </h2>

      {/* Cards — single column on mobile, 2-col on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {picks.map((pick) => (
          <QuickPickCard key={pick.id} pick={pick} />
        ))}
      </div>
    </section>
  );
};

export default QuickPicks;
