'use client';

import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary shown when a page throws during rendering.
 * Must be a Client Component to receive the error prop.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to console in dev; swap for Sentry/etc in production
    console.error('[Swara] Unhandled page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <div className="mb-6 w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-text mb-2">Something went wrong</h1>
      <p className="text-text-muted text-sm mb-8 max-w-xs">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={reset}
          className="h-12 rounded-2xl bg-accent text-white font-semibold text-sm active:scale-[0.97] transition-transform"
        >
          Try again
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          className="h-12 rounded-2xl bg-bg-surface border border-border text-text font-semibold text-sm active:scale-[0.97] transition-transform"
        >
          Back to library
        </button>
      </div>
    </div>
  );
}
