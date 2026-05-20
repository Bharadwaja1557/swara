/**
 * EmptyState — canonical empty state component.
 *
 * Consistent spacing, typography, and icon sizing across all empty states.
 * Replaces one-off inline empty states in Library, Search, LikedSongs, etc.
 *
 * Usage:
 *   <EmptyState
 *     icon="heart"
 *     title="No liked songs yet"
 *     subtitle="Tap the heart on any track to save it here."
 *   />
 *
 *   <EmptyState
 *     icon="search"
 *     title="No results"
 *     subtitle='Try a different spelling or keyword.'
 *   />
 */

type EmptyStateIcon =
  | 'heart'
  | 'search'
  | 'library'
  | 'queue'
  | 'playlist'
  | 'music'
  | 'history';

interface EmptyStateProps {
  icon?: EmptyStateIcon;
  title: string;
  subtitle?: string;
  /** Optional CTA button */
  action?: string;
  onAction?: () => void;
  /** Extra vertical padding — defaults to py-20 */
  padding?: string;
}

const iconPaths: Record<EmptyStateIcon, React.ReactNode> = {
  heart: (
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  ),
  search: (
    <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>
  ),
  library: (
    <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>
  ),
  queue: (
    <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>
  ),
  playlist: (
    <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>
  ),
  music: (
    <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/></>
  ),
  history: (
    <><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/></>
  ),
};

const EmptyState = ({
  icon = 'music',
  title,
  subtitle,
  action,
  onAction,
  padding = 'py-20',
}: EmptyStateProps) => (
  <div className={`flex flex-col items-center justify-center ${padding} gap-3 px-6`}>
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <svg
        viewBox="0 0 24 24" width="26" height="26"
        fill="none" stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        {iconPaths[icon]}
      </svg>
    </div>
    <p className="text-[0.9rem] font-semibold text-swara-muted text-center">{title}</p>
    {subtitle && (
      <p className="text-[0.78rem] text-swara-dim text-center max-w-[260px] leading-relaxed">
        {subtitle}
      </p>
    )}
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-2 px-5 py-2 rounded-full text-[0.82rem] font-medium text-swara-bg bg-swara-accent hover:bg-swara-accent-bright transition-colors active:scale-95"
      >
        {action}
      </button>
    )}
  </div>
);

export default EmptyState;
