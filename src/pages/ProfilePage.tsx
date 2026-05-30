/**
 * src/pages/ProfilePage.tsx — Own profile (/profile)
 * Full dashboard: avatar upload, stats, playlists, theme, refresh, logout.
 */
import { useRef }               from 'react';
import { useNavigate }          from 'react-router-dom';
import { useAuthStore }         from '@/store/useAuthStore';
import { useProfileStore }      from '@/store/useProfileStore';
import { useLikedStore }        from '@/store/likedStore';
import { usePlaylistStore }     from '@/store/usePlaylistStore';
import { useThemeStore, THEMES, type Theme } from '@/store/useThemeStore';
import { useToastStore }        from '@/store/useToastStore';
import UserAvatar               from '@/components/profile/UserAvatar';
import { APP_VERSION }          from '@/version';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPT         = 'image/jpeg,image/jpg,image/png,image/webp';

const ProfilePage = () => {
  const navigate          = useNavigate();
  const fileInputRef      = useRef<HTMLInputElement>(null);

  const logout            = useAuthStore((s) => s.logout);
  const isAuthLoading     = useAuthStore((s) => s.isLoading);

  const displayName       = useProfileStore((s) => s.getDisplayName());
  const username          = useProfileStore((s) => s.getUsername());
  const avatarUrl         = useProfileStore((s) => s.getAvatarUrl());
  const profile           = useProfileStore((s) => s.profile);
  const isProfileLoading  = useProfileStore((s) => s.isLoading);
  const isUploadingAvatar = useProfileStore((s) => s.isUploadingAvatar);
  const uploadProgress    = useProfileStore((s) => s.uploadProgress);
  const uploadAvatar      = useProfileStore((s) => s.uploadAvatar);

  const likedCount        = useLikedStore((s) => s.getLikedTracks().length);
  const playlists         = usePlaylistStore((s) => s.playlists);
  const theme             = useThemeStore((s) => s.theme);
  const setTheme          = useThemeStore((s) => s.setTheme);
  const showToast         = useToastStore((s) => s.show);

  const ownedPlaylists    = playlists.filter((p) => p.isOwned !== false);
  const savedPlaylists    = playlists.filter((p) => p.isSaved);
  const publicPlaylists   = ownedPlaylists.filter((p) => p.isPublic);
  const totalTracks       = ownedPlaylists.reduce((sum, p) => sum + p.trackCount, 0);
  const joinedDate        = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  const loading = isProfileLoading && !displayName;

  // ── Avatar upload ──────────────────────────────────────────────────────────

  const handleAvatarClick = () => {
    if (isUploadingAvatar) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so the same file can be re-selected after an error
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      showToast('Image must be under 5 MB', 'error');
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Please use a JPG, PNG, or WebP image', 'error');
      return;
    }

    try {
      await uploadAvatar(file);
      showToast('Avatar updated', 'check');
    } catch {
      showToast('Upload failed — try again', 'error');
    }
  };

  // ── Refresh metadata ───────────────────────────────────────────────────────

  const handleRefreshMetadata = async () => {
    try {
      const { useLibraryStore } = await import('@/store/libraryStore');
      await useLibraryStore.getState().refreshLibrary();
      const { invalidateAllPlaylistArtwork } = await import('@/features/artwork/playlistArtworkCache');
      invalidateAllPlaylistArtwork();
      showToast('Library metadata refreshed', 'check');
    } catch {
      showToast('Refresh failed — try again', 'error');
    }
  };

  const handleLogout = async () => { await logout(); };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">
      {/* Back bar */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 lg:px-8 pt-5 pb-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all" aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-[1rem] font-semibold text-swara-text tracking-tight">Profile</h1>
      </div>

      <div className="flex flex-col items-center pt-8 px-6 lg:px-10 gap-5 pb-10">

        {/* ── Avatar upload zone ── */}
        <div className="relative">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            aria-label="Upload avatar"
            onChange={handleFileChange}
          />

          {/* Clickable avatar */}
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={isUploadingAvatar || loading}
            className="relative group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swara-accent"
            aria-label="Change avatar"
          >
            {loading ? (
              <div className="w-24 h-24 rounded-full bg-swara-elevated border-2 border-swara-border flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
              </div>
            ) : (
              <UserAvatar
                username={username || '?'}
                avatarUrl={avatarUrl}
                size={96}
                className="border-2 border-swara-border"
              />
            )}

            {/* Camera overlay on hover */}
            {!loading && (
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-colors">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className="opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            )}
          </button>

          {/* Upload progress ring */}
          {isUploadingAvatar && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none">
              <svg className="absolute inset-0" viewBox="0 0 100 100" width="96" height="96">
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="4"/>
                <circle cx="50" cy="50" r="46" fill="none" stroke="var(--sw-accent)" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  strokeDashoffset={`${2 * Math.PI * 46 * (1 - uploadProgress / 100)}`}
                  style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 0.2s' }}
                />
              </svg>
              <span className="text-[0.7rem] font-semibold text-white z-10">
                {uploadProgress < 100 ? `${uploadProgress}%` : '✓'}
              </span>
            </div>
          )}
        </div>

        {/* ── Identity ── */}
        <div className="text-center -mt-1">
          {loading ? (
            <><div className="h-7 w-32 rounded-lg bg-swara-card animate-pulse mb-2" /><div className="h-4 w-20 rounded-lg bg-swara-card animate-pulse mx-auto" /></>
          ) : (
            <>
              <h2 className="text-[1.3rem] font-bold text-swara-text font-display tracking-tight">{displayName || username}</h2>
              {displayName && username && displayName !== username &&
                <p className="text-[0.82rem] text-swara-muted mt-0.5">@{username}</p>}
              {joinedDate && <p className="text-[0.72rem] text-swara-dim mt-1">Joined {joinedDate}</p>}
              <p className="text-[0.68rem] text-swara-dim/60 mt-1">Tap avatar to change</p>
            </>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="flex items-stretch bg-swara-card border border-swara-border rounded-2xl overflow-hidden divide-x divide-swara-border w-full max-w-sm">
          {[
            { value: likedCount,              label: 'Liked' },
            { value: ownedPlaylists.length,   label: 'Playlists' },
            { value: publicPlaylists.length,  label: 'Public' },
            { value: totalTracks,             label: 'Tracks' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center px-3 py-2 flex-1">
              <p className="text-[1.1rem] font-bold text-swara-text">{value}</p>
              <p className="text-[0.65rem] text-swara-muted mt-0.5 whitespace-nowrap">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Nav links ── */}
        <div className="w-full bg-swara-card border border-swara-border rounded-2xl overflow-hidden">
          {[
            { label: 'Liked Songs', value: likedCount, route: '/liked',
              icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> },
            { label: 'My Library', value: undefined as number | undefined, route: '/library',
              icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
            ...(savedPlaylists.length > 0
              ? [{ label: 'Saved Playlists', value: savedPlaylists.length, route: '/library',
                  icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> }]
              : []),
          ].map((item) => (
            <button key={item.label} type="button" onClick={() => navigate(item.route)}
              className="flex items-center gap-4 w-full px-5 py-4 border-b border-swara-border last:border-0 hover:bg-swara-elevated transition-colors text-left">
              <span className="text-swara-muted flex-shrink-0">{item.icon}</span>
              <span className="text-[0.9rem] text-swara-text font-medium flex-1">{item.label}</span>
              {item.value !== undefined && <span className="text-[0.78rem] text-swara-muted mr-1">{item.value}</span>}
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-swara-dim flex-shrink-0" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          ))}
        </div>

        {/* ── Theme ── */}
        <div className="w-full">
          <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-2 px-1">Appearance</p>
          <div className="bg-swara-card border border-swara-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-swara-border">
              <p className="text-[0.82rem] font-medium text-swara-text">Theme</p>
            </div>
            <div className="flex items-stretch divide-x divide-swara-border">
              {THEMES.map((t) => {
                const active = theme === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => setTheme(t.id as Theme)}
                    className={`flex-1 flex flex-col items-center justify-center py-4 px-2 gap-1.5 transition-colors ${active ? 'bg-swara-elevated' : 'hover:bg-swara-elevated/50'}`}
                    aria-pressed={active}>
                    <ThemeSwatch id={t.id as Theme} active={active} />
                    <p className={`text-[0.7rem] font-semibold mt-0.5 ${active ? 'text-swara-accent' : 'text-swara-muted'}`}>{t.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Account actions ── */}
        <div className="w-full bg-swara-card border border-swara-border rounded-2xl overflow-hidden">
          <button type="button" onClick={handleRefreshMetadata}
            className="flex items-center gap-4 w-full px-5 py-4 border-b border-swara-border hover:bg-swara-elevated transition-colors text-left">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-swara-muted flex-shrink-0" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            <span className="text-[0.9rem] text-swara-text font-medium flex-1">Refresh Library Metadata</span>
          </button>
          <button type="button" onClick={handleLogout} disabled={isAuthLoading}
            className="flex items-center gap-4 w-full px-5 py-4 hover:bg-swara-elevated transition-colors text-left disabled:opacity-50">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-red-400/70 flex-shrink-0" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span className="text-[0.9rem] text-red-400/80 font-medium flex-1">{isAuthLoading ? 'Signing out…' : 'Sign Out'}</span>
          </button>
        </div>

        <p className="text-[0.68rem] text-swara-dim text-center mt-2">swara · v{APP_VERSION}</p>
      </div>
    </div>
  );
};

// Theme swatch
const swatchBg:     Record<Theme, string> = { 'dark': '#09090C', 'semi-dark': '#12121A', 'light': '#F5F3EE' };
const swatchCard:   Record<Theme, string> = { 'dark': '#18181F', 'semi-dark': '#22222E', 'light': '#E4E0D7' };
const swatchAccent: Record<Theme, string> = { 'dark': '#C8A96A', 'semi-dark': '#C8A96A', 'light': '#A07A30' };
const ThemeSwatch = ({ id, active }: { id: Theme; active: boolean }) => (
  <div className={`w-10 h-7 rounded-lg flex items-end p-1 gap-0.5 ${active ? 'ring-1 ring-swara-accent' : ''}`}
    style={{ background: swatchBg[id] }} aria-hidden="true">
    <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ background: swatchCard[id] }} />
    <div className="h-1.5 flex-1 rounded-sm" style={{ background: swatchAccent[id] }} />
  </div>
);

export default ProfilePage;
