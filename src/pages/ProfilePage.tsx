/**
 * ProfilePage — user identity and account page.
 * Uses useProfileStore for display — never auth.user.email.
 * Username is what the user typed at login (the app's identity, not the
 * internal @swara.app credential).
 */
import { useNavigate } from 'react-router-dom';
import { useAuthStore }    from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useLikedStore }   from '@/store/likedStore';

const ProfilePage = () => {
  const navigate      = useNavigate();
  const logout        = useAuthStore((s) => s.logout);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const displayName   = useProfileStore((s) => s.getDisplayName());
  const username      = useProfileStore((s) => s.getUsername());
  const isProfileLoading = useProfileStore((s) => s.isLoading);
  const likedCount    = useLikedStore((s) => s.getLikedTracks().length);

  const handleLogout = async () => {
    await logout();
    // Auth state change will unmount the app and show LoginModal automatically
  };

  const loading = isProfileLoading && !displayName;

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">
      {/* Back bar */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 lg:px-8 pt-5 pb-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all"
          aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-[1rem] font-semibold text-swara-text tracking-tight">Profile</h1>
      </div>

      <div className="flex flex-col items-center pt-10 px-6 lg:px-10 gap-5">

        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-swara-elevated border-2 border-swara-border flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1a1a24 0%, #222230 100%)' }}>
          {loading ? (
            <div className="w-8 h-8 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
          ) : (
            <span className="text-[2rem] font-bold text-swara-accent font-display leading-none">
              {(displayName || username || '?')[0].toUpperCase()}
            </span>
          )}
        </div>

        {/* Identity — uses profile, never email */}
        <div className="text-center">
          {loading ? (
            <>
              <div className="h-7 w-32 rounded-lg bg-swara-card animate-pulse mb-2" />
              <div className="h-4 w-20 rounded-lg bg-swara-card animate-pulse mx-auto" />
            </>
          ) : (
            <>
              <h2 className="text-[1.3rem] font-bold text-swara-text font-display tracking-tight">
                {displayName || username}
              </h2>
              {/* Show username separately only if display_name is set and differs */}
              {displayName && username && displayName !== username && (
                <p className="text-[0.82rem] text-swara-muted mt-0.5">@{username}</p>
              )}
              {!displayName && username && (
                <p className="text-[0.78rem] text-swara-dim mt-0.5">Swara User</p>
              )}
            </>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-8 py-3">
          <div className="text-center">
            <p className="text-[1.1rem] font-bold text-swara-text">{likedCount}</p>
            <p className="text-[0.72rem] text-swara-muted mt-0.5">Liked</p>
          </div>
        </div>

        {/* Menu items */}
        <div className="w-full mt-2 bg-swara-card border border-swara-border rounded-2xl overflow-hidden">
          <button type="button" onClick={() => navigate('/liked')}
            className="flex items-center gap-4 w-full px-5 py-4 border-b border-swara-border hover:bg-swara-elevated transition-colors text-left">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-swara-accent flex-shrink-0" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            <span className="text-[0.9rem] text-swara-text font-medium flex-1">Liked Songs</span>
            <span className="text-[0.78rem] text-swara-muted">{likedCount}</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim" aria-hidden="true">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>

          <button type="button" onClick={() => navigate('/library')}
            className="flex items-center gap-4 w-full px-5 py-4 border-b border-swara-border hover:bg-swara-elevated transition-colors text-left">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-swara-muted flex-shrink-0" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span className="text-[0.9rem] text-swara-text font-medium flex-1">My Library</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim" aria-hidden="true">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>

          {/* Logout */}
          <button type="button" onClick={handleLogout} disabled={isAuthLoading}
            className="flex items-center gap-4 w-full px-5 py-4 hover:bg-swara-elevated transition-colors text-left disabled:opacity-50">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-swara-muted flex-shrink-0" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="text-[0.9rem] text-swara-text font-medium flex-1">
              {isAuthLoading ? 'Signing out…' : 'Sign Out'}
            </span>
          </button>
        </div>

        <p className="text-[0.72rem] text-swara-dim text-center mt-4">
          swara · Music for <span className="text-swara-accent">Soul</span>
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;
