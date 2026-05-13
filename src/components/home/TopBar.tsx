/**
 * TopBar — Home screen header
 * Left:  "swara" in accent colour + "Music for Soul" tagline
 * Right: User profile icon (no functionality)
 */
const TopBar = () => (
  <header className="flex items-center justify-between px-5 pt-6 pb-2">
    {/* Logotype */}
    <div className="flex flex-col leading-none">
      <span
        className="text-[1.85rem] font-bold text-swara-accent tracking-[-0.04em] leading-none font-display"
        aria-label="Swara"
      >
        swara
      </span>
      <span className="text-[0.625rem] font-medium tracking-[0.22em] uppercase text-swara-muted mt-[5px] ml-[2px]">
        Music for Soul
      </span>
    </div>

    {/* Profile icon */}
    <button
      className={[
        'w-9 h-9 rounded-full',
        'bg-swara-elevated border border-swara-border',
        'flex items-center justify-center',
        'text-swara-muted hover:text-swara-text',
        'transition-colors duration-200 active:scale-95',
      ].join(' ')}
      aria-label="Profile"
      type="button"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

export default TopBar;
