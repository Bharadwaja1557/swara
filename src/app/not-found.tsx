'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Custom not-found page.
 *
 * For GitHub Pages static hosting, the SPA fallback (scripts/spa-fallback.js)
 * copies out/index.html → out/404.html, which means GitHub Pages will serve
 * the React app for any unmatched URL. React Router then renders this page
 * for truly unknown routes.
 */
export default function NotFoundPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home after brief delay
    const t = setTimeout(() => router.replace('/'), 2500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <p className="text-6xl mb-4">🎵</p>
      <h1 className="text-2xl font-bold text-text mb-2">Page not found</h1>
      <p className="text-text-muted text-sm">Redirecting you to the library…</p>
    </div>
  );
}
