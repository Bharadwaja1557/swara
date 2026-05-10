'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'surface' | 'accent';
  active?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const variantClasses = {
  ghost: 'text-text-secondary hover:text-text active:bg-bg-surface',
  surface: 'bg-bg-surface border border-border text-text-secondary hover:text-text active:bg-bg-elevated',
  accent: 'bg-accent text-white shadow-accent-glow active:opacity-90',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size = 'md', variant = 'ghost', active, children, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        aria-pressed={active}
        className={`
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          flex items-center justify-center rounded-full
          transition-all duration-150 active:scale-90 no-select
          ${active && variant === 'ghost' ? 'text-accent' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
