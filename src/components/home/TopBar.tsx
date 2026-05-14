import { useNavigate } from 'react-router-dom';

const TopBar = () => {
  const navigate = useNavigate();
  return (
    <header className="flex items-center justify-between px-5 pt-6 pb-2">
      <div className="flex flex-col leading-none">
        <span className="text-[1.85rem] font-bold text-swara-accent tracking-[-0.04em] leading-none font-display">
          swara
        </span>
        <span className="text-[0.625rem] font-medium tracking-[0.22em] uppercase text-swara-muted mt-[5px] ml-[2px]">
          Music for{' '}
          <span className="text-swara-accent">Soul</span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => navigate('/profile')}
        className="w-9 h-9 rounded-full bg-swara-elevated border border-swara-border flex items-center justify-center text-swara-muted hover:text-swara-text transition-colors duration-200 active:scale-95"
        aria-label="Profile"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM20.59 22c0-3.63-3.85-6.57-8.59-6.57S3.41 18.37 3.41 22"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </header>
  );
};

export default TopBar;
