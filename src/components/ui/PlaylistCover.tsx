/**
 * PlaylistCover — centralized cover renderer for all playlist contexts.
 *
 * VARIANT SYSTEM:
 *   Each built-in cover has a stable string key ('v1'–'v5').
 *   The Playlist type stores `coverVariant?: string`.
 *
 * RESOLUTION ORDER:
 *   1. coverUrl  (uploaded image — future)
 *   2. coverVariant  (built-in gradient design)
 *   3. default placeholder
 *
 * Designs are pure SVG/CSS — no image assets required.
 * All five are visually distinct and recognizable at 40px–280px.
 *
 * Add new variants to COVER_VARIANTS map without touching render logic.
 */

export type CoverVariantKey = 'v1' | 'v2' | 'v3' | 'v4' | 'v5';

interface CoverVariant {
  key: CoverVariantKey;
  label: string;
  render: (size: number) => React.ReactNode;
}

// ── Cover designs ─────────────────────────────────────────────────────────────

export const COVER_VARIANTS: CoverVariant[] = [
  {
    key: 'v1',
    label: 'Aurora',
    render: (s) => (
      <svg viewBox="0 0 100 100" width={s} height={s} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="v1a" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#1a0633" />
            <stop offset="50%"  stopColor="#0d2146" />
            <stop offset="100%" stopColor="#060e24" />
          </linearGradient>
          <linearGradient id="v1b" x1="0%" y1="100%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#c8a96e" stopOpacity="0.8" />
            <stop offset="60%"  stopColor="#9b59b6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1abc9c" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#v1a)" />
        {/* Aurora wave bands */}
        <ellipse cx="50" cy="110" rx="90" ry="55" fill="url(#v1b)" opacity="0.7" />
        <ellipse cx="30" cy="105" rx="70" ry="40" fill="#1abc9c" opacity="0.15" />
        <ellipse cx="70" cy="108" rx="65" ry="38" fill="#9b59b6" opacity="0.18" />
        {/* Stars */}
        {[[15,12],[42,8],[68,15],[82,7],[25,28],[58,22],[90,30]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="0.9" fill="white" opacity="0.7" />
        ))}
        {/* Music note */}
        <path d="M44 58 L44 72 M44 58 L56 55 L56 68 M44 72 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M56 68 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'v2',
    label: 'Ember',
    render: (s) => (
      <svg viewBox="0 0 100 100" width={s} height={s} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="v2a" cx="35%" cy="40%" r="65%">
            <stop offset="0%"   stopColor="#c0392b" />
            <stop offset="45%"  stopColor="#8b1a0e" />
            <stop offset="100%" stopColor="#1a0505" />
          </radialGradient>
          <radialGradient id="v2b" cx="70%" cy="65%" r="45%">
            <stop offset="0%"   stopColor="#e67e22" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#e67e22" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#v2a)" />
        <rect width="100" height="100" fill="url(#v2b)" />
        {/* Abstract flame shape */}
        <path d="M50 80 C35 65 28 52 38 38 C42 32 46 26 44 18 C52 26 56 34 52 44 C62 36 64 24 60 16 C72 28 76 48 64 62 C72 56 76 62 72 72 C66 80 56 84 50 80 Z" fill="rgba(255,200,80,0.3)" />
        <path d="M50 80 C38 68 34 56 42 44 C46 38 48 30 46 22 C54 30 56 40 52 48 C60 42 62 32 58 24 C68 36 70 52 60 64 C66 60 68 66 64 74 C58 80 52 82 50 80 Z" fill="rgba(255,160,40,0.2)" />
        {/* Glow dot */}
        <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,200,100,0.25)" strokeWidth="8" />
        <circle cx="50" cy="50" r="4" fill="rgba(255,220,140,0.4)" />
      </svg>
    ),
  },
  {
    key: 'v3',
    label: 'Ocean',
    render: (s) => (
      <svg viewBox="0 0 100 100" width={s} height={s} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="v3a" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#0a1628" />
            <stop offset="100%" stopColor="#061428" />
          </linearGradient>
          <linearGradient id="v3b" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#1a7fbf" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0d3d6e" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#v3a)" />
        {/* Wave layers */}
        <path d="M0 70 Q25 60 50 70 Q75 80 100 70 L100 100 L0 100 Z" fill="url(#v3b)" opacity="0.6" />
        <path d="M0 78 Q25 68 50 78 Q75 88 100 78 L100 100 L0 100 Z" fill="#1a7fbf" opacity="0.35" />
        <path d="M0 85 Q30 77 60 85 Q80 91 100 85 L100 100 L0 100 Z" fill="#0d3d6e" opacity="0.5" />
        {/* Surface shimmer lines */}
        <path d="M10 62 Q30 56 50 62" fill="none" stroke="rgba(100,200,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M20 66 Q45 59 70 66" fill="none" stroke="rgba(100,200,255,0.25)" strokeWidth="1" strokeLinecap="round" />
        {/* Moon reflection */}
        <circle cx="72" cy="28" r="12" fill="none" stroke="rgba(200,220,255,0.2)" strokeWidth="1.5" />
        <circle cx="72" cy="28" r="8" fill="rgba(180,210,255,0.12)" />
        <circle cx="72" cy="28" r="3" fill="rgba(220,235,255,0.3)" />
        {/* Reflection streak */}
        <path d="M72 40 L68 70 M72 40 L76 72" fill="none" stroke="rgba(180,210,255,0.12)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'v4',
    label: 'Prism',
    render: (s) => (
      <svg viewBox="0 0 100 100" width={s} height={s} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="v4a" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#0a0a12" />
            <stop offset="100%" stopColor="#12101a" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#v4a)" />
        {/* Prism triangle */}
        <polygon points="50,15 85,78 15,78" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        {/* Refracted beams from apex */}
        <line x1="50" y1="15" x2="8"  y2="95" stroke="#e74c3c" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
        <line x1="50" y1="15" x2="18" y2="95" stroke="#e67e22" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
        <line x1="50" y1="15" x2="32" y2="95" stroke="#f1c40f" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
        <line x1="50" y1="15" x2="50" y2="95" stroke="#2ecc71" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
        <line x1="50" y1="15" x2="68" y2="95" stroke="#3498db" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
        <line x1="50" y1="15" x2="82" y2="95" stroke="#9b59b6" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
        <line x1="50" y1="15" x2="92" y2="95" stroke="#e91e8c" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
        {/* Incoming white beam */}
        <line x1="12" y1="8" x2="50" y2="15" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'v5',
    label: 'Cosmos',
    render: (s) => (
      <svg viewBox="0 0 100 100" width={s} height={s} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="v5a" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#12082e" />
            <stop offset="100%" stopColor="#05030f" />
          </radialGradient>
          <radialGradient id="v5b" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="v5c" cx="72%" cy="35%" r="30%">
            <stop offset="0%"   stopColor="#ec4899" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#v5a)" />
        <rect width="100" height="100" fill="url(#v5b)" />
        <rect width="100" height="100" fill="url(#v5c)" />
        {/* Star field */}
        {[[8,14],[22,8],[36,18],[55,6],[70,14],[85,9],[92,22],[78,32],[14,38],[28,42],[62,38],[88,45],[6,58],[18,65],[44,55],[74,60],[90,68],[12,80],[38,85],[60,78],[82,85]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 1.2 : 0.7} fill="white" opacity={i % 3 === 0 ? 0.9 : 0.5} />
        ))}
        {/* Nebula swirl */}
        <path d="M50 50 m-20,0 a20,20 0 1,1 40,0 a20,20 0 1,1 -40,0" fill="none" stroke="rgba(124,58,237,0.3)" strokeWidth="12" />
        <path d="M50 50 m-14,0 a14,14 0 1,1 28,0 a14,14 0 1,1 -28,0" fill="none" stroke="rgba(236,72,153,0.2)" strokeWidth="6" />
        {/* Central star */}
        <circle cx="50" cy="50" r="3.5" fill="rgba(255,255,255,0.9)" />
        <line x1="50" y1="43" x2="50" y2="57" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <line x1="43" y1="50" x2="57" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      </svg>
    ),
  },
];

// ── Helper ────────────────────────────────────────────────────────────────────

export function getVariant(key: string): CoverVariant | undefined {
  return COVER_VARIANTS.find((v) => v.key === key);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PlaylistCoverProps {
  coverUrl?:      string;
  coverVariant?:  string;
  title?:         string;
  size:           number;
  className?:     string;
  style?:         React.CSSProperties;
}

const PlaylistCover = ({
  coverUrl, coverVariant, title, size, className = '', style,
}: PlaylistCoverProps) => {
  // Resolution order: uploaded image → built-in variant → default placeholder
  const content = (() => {
    if (coverUrl) {
      return (
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      );
    }
    const variant = coverVariant ? getVariant(coverVariant) : undefined;
    if (variant) {
      // When size=0, render with 100% fill — parent className controls sizing
      const renderSize = size > 0 ? size : 100;
      return (
        <div className="w-full h-full">
          {variant.render(renderSize)}
        </div>
      );
    }
    // Default placeholder
    const iconSize = size > 0 ? size * 0.42 : 40;
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ background: 'rgba(200,169,106,0.08)' }}
      >
        <svg
          viewBox="0 0 24 24"
          width={iconSize}
          height={iconSize}
          fill="none"
          stroke="rgba(200,169,106,0.4)"
          strokeWidth="1.25"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
      </div>
    );
  })();

  return (
    <div
      className={`overflow-hidden flex-shrink-0 ${className}`}
      style={size > 0 ? { width: size, height: size, ...style } : style}
    >
      {content}
    </div>
  );
};

export default PlaylistCover;
