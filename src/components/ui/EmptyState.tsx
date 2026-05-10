// ─── Spinner ──────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-2',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`
        ${sizes[size]}
        rounded-full border-border border-t-accent animate-spin
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  );
}

// ─── EmptyState ────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      {icon && <div className="mb-4 text-text-muted opacity-50">{icon}</div>}
      <h3 className="text-base font-semibold text-text-secondary">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-text-muted max-w-xs">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
