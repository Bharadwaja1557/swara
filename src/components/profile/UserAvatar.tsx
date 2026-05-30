/**
 * src/components/profile/UserAvatar.tsx
 *
 * Canonical avatar component. Renders either the avatar image OR the
 * fallback initial letter — never both simultaneously.
 *
 * STATE MACHINE:
 *   avatarUrl missing          → show letter (no img element mounted)
 *   avatarUrl present, loading → show letter (img loading in background)
 *   avatarUrl present, loaded  → show image only (letter unmounted)
 *   avatarUrl present, error   → show letter (img removed, error handled)
 *
 * The letter is shown during loading to prevent layout shift — the
 * container dimensions are always fixed (width/height from the `size` prop).
 * Once the image fires onLoad, imgState flips to 'loaded' and the letter
 * is unmounted. If the image fires onError, imgState flips to 'error' and
 * the letter stays.
 *
 * Root cause of the original bug:
 *   The letter <span> was rendered unconditionally with absolute+inset-0
 *   and the img was rendered on top. Both were always in the DOM. In certain
 *   compositing scenarios (Safari, partial load, some Android OEMs) the
 *   absolute span was visible above the img. The onError handler only hid
 *   the img via style.display='none' — it never removed the span.
 *   Fix: explicit load state drives a mutual-exclusion render path.
 */
import { useState, useEffect } from 'react';

interface UserAvatarProps {
  username:   string;
  avatarUrl?: string | null;
  size:       number;
  className?: string;
}

type ImgState = 'loading' | 'loaded' | 'error';

const UserAvatar = ({ username, avatarUrl, size, className = '' }: UserAvatarProps) => {
  const initial  = (username || '?')[0].toUpperCase();
  const fontSize = Math.round(size * 0.42);

  // Track whether the current avatarUrl has loaded or errored.
  // Reset to 'loading' whenever avatarUrl changes so we don't flash a
  // stale loaded-state while the new URL is being fetched.
  const [imgState, setImgState] = useState<ImgState>(() =>
    avatarUrl ? 'loading' : 'error',
  );

  useEffect(() => {
    setImgState(avatarUrl ? 'loading' : 'error');
  }, [avatarUrl]);

  const showImage  = !!avatarUrl && imgState === 'loaded';
  const showLetter = !showImage; // letter visible in all states except loaded

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-swara-elevated flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label={username}
      role="img"
    >
      {/* Fallback letter — shown while loading, on error, or when no URL */}
      {showLetter && (
        <span
          className="absolute inset-0 flex items-center justify-center font-bold text-swara-accent font-display leading-none select-none"
          style={{ fontSize }}
          aria-hidden="true"
        >
          {initial}
        </span>
      )}

      {/* Avatar image — only mounted when URL exists */}
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt={username}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          onLoad={()  => setImgState('loaded')}
          onError={() => setImgState('error')}
          // Hide from layout while loading — letter fills the space instead.
          // opacity-0 → no flash; the onLoad callback makes it visible.
          style={{ opacity: imgState === 'loaded' ? 1 : 0 }}
        />
      )}
    </div>
  );
};

export default UserAvatar;
