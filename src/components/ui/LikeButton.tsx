'use client';

import { useLibraryStore } from '@/stores/libraryStore';

interface LikeButtonProps {
  trackId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: { button: 'w-8 h-8', icon: 16 },
  md: { button: 'w-10 h-10', icon: 20 },
  lg: { button: 'w-12 h-12', icon: 24 },
} as const;

export function LikeButton({ trackId, size = 'md', className = '' }: LikeButtonProps) {
  const isLiked = useLibraryStore((s) => s.isLiked(trackId));
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const { button, icon } = sizes[size];

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleLike(trackId);
      }}
      className={`
        ${button} flex items-center justify-center rounded-full
        transition-all duration-150 active:scale-90
        ${isLiked ? 'text-red-500' : 'text-text-muted hover:text-text-secondary'}
        ${className}
      `}
      aria-label={isLiked ? 'Unlike' : 'Like'}
      aria-pressed={isLiked}
    >
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 21C12 21 3 15 3 9a4.5 4.5 0 018.94-.89L12 9l.06-.89A4.5 4.5 0 0121 9c0 6-9 12-9 12z"
          fill={isLiked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
