/**
 * TopBar
 *
 * Home screen top bar with:
 *   Left  → "Swara" display logo (Cormorant, italic)
 *   Right → Profile icon button (no functionality yet)
 */
const TopBar = () => {
  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-2">
      {/* Swara logotype */}
      <div className="flex flex-col leading-none">
        <span
          className="font-display italic text-[2rem] font-medium text-swara-text tracking-wide leading-none"
          aria-label="Swara"
        >
          Swara
        </span>
        <span className="text-[9px] font-body font-medium tracking-[0.25em] uppercase text-swara-muted mt-0.5 ml-0.5">
          Music
        </span>
      </div>

      {/* Profile button */}
      <button
        className={[
          'w-9 h-9 rounded-full',
          'bg-swara-elevated border border-swara-border',
          'flex items-center justify-center',
          'text-swara-muted hover:text-swara-text',
          'transition-colors duration-200',
          'active:scale-95 transition-transform',
        ].join(' ')}
        aria-label="Open profile"
        type="button"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM20.59 22c0-3.63-3.85-6.57-8.59-6.57S3.41 18.37 3.41 22"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </header>
  );
};

export default TopBar;
