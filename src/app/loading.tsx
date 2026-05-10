/**
 * Global loading UI shown by Next.js during page-level Suspense.
 * Kept minimal — most loading states are handled within each page.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-border" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
        </div>
        <p className="text-text-muted text-xs tracking-widest uppercase">Loading</p>
      </div>
    </div>
  );
}
