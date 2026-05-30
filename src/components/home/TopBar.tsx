/**
 * Mobile top bar — shows Swara logo + user avatar button linking to /profile.
 * Avatar is live from Zustand so it updates immediately after upload.
 */
import { useNavigate }     from 'react-router-dom';
import { useProfileStore } from '@/store/useProfileStore';
import UserAvatar          from '@/components/profile/UserAvatar';

const TopBar = () => {
  const navigate  = useNavigate();
  const username  = useProfileStore((s) => s.getUsername());
  const avatarUrl = useProfileStore((s) => s.getAvatarUrl());

  return (
    <header className="flex items-center justify-between px-5 pt-6 pb-2 lg:hidden">
      <div className="flex flex-col leading-none">
        <span className="text-[1.85rem] font-bold text-swara-accent tracking-[-0.04em] leading-none font-display">
          swara
        </span>
        <span className="text-[0.625rem] font-medium tracking-[0.22em] uppercase text-swara-muted mt-[5px] ml-[2px]">
          Music for{' '}<span className="text-swara-accent">Soul</span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => navigate('/profile')}
        className="rounded-full active:scale-95 transition-transform"
        aria-label="Profile"
      >
        <UserAvatar username={username || '?'} avatarUrl={avatarUrl} size={36} />
      </button>
    </header>
  );
};

export default TopBar;
