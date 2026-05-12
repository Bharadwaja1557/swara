/**
 * SearchPage
 *
 * Placeholder — search functionality will be wired in a future step.
 * Renders the shell: header + search input + empty state.
 */
const SearchPage = () => {
  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto px-5 pt-5">
      {/* Page title */}
      <h1 className="font-body text-xl font-semibold text-swara-text tracking-[-0.01em] mb-5">
        Search
      </h1>

      {/* Search bar (non-functional placeholder) */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-swara-muted pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M11 20a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM20.97 20.97l-1.5-1.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <input
          type="search"
          placeholder="Songs, artists, albums…"
          className={[
            'w-full bg-swara-card border border-swara-border rounded-xl',
            'pl-10 pr-4 py-3',
            'font-body text-sm text-swara-text placeholder:text-swara-dim',
            'focus:outline-none focus:border-swara-accent',
            'transition-colors duration-200',
          ].join(' ')}
          disabled
          aria-label="Search (coming soon)"
        />
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center mt-24 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-swara-card border border-swara-border flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-swara-dim" aria-hidden="true">
            <path
              d="M11 20a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM20.97 20.97l-1.5-1.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="font-body text-sm font-medium text-swara-muted text-center">
          Search is coming soon
        </p>
        <p className="font-body text-xs text-swara-dim text-center max-w-[200px]">
          Find any song, artist, or album in your library
        </p>
      </div>
    </div>
  );
};

export default SearchPage;
