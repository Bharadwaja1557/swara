/**
 * src/components/profile/UserAvatar.tsx
 *
 * Single canonical avatar component used everywhere in Swara.
 *
 * BEHAVIOR:
 *   avatar exists  → <img> with object-cover, rounded-full
 *   avatar missing → circular fallback showing first letter of username
 *                    (same accent color as the rest of Swara's identity)
 *
 * CACHE BUSTING:
 *   The ?v= query param must be baked into avatarUrl by the caller
 *   (or call buildAvatarUrl() from ProfileRepository before passing).
 *   This component does not add cache-busting itself — the URL is canonical.
 *
 * USAGE:
 *   <UserAvatar username="neo" avatarUrl={getAvatarUrl()} size={40} />
 *
 * All avatar rendering in the app goes through this component.
 * Do NOT inline avatar rendering logic elsewhere.
 */

interface UserAvatarProps {
  username:   string;
  avatarUrl?: string | null;
  size:       number;
  className?: string;
}

const UserAvatar = ({ username, avatarUrl, size, className = '' }: UserAvatarProps) => {
  const initial = (username || '?')[0].toUpperCase();

  // font scales with size: ~42% of container diameter
  const fontSize = Math.round(size * 0.42);

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-swara-elevated border border-swara-border flex-shrink-0 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label={username}
      role="img"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className="w-full h-full object-cover"
          draggable={false}
          // On error fall through to the letter fallback below by hiding the img
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : null}

      {/* Letter fallback — always rendered, visually hidden when image loads */}
      <span
        className="absolute inset-0 flex items-center justify-center font-bold text-swara-accent font-display leading-none select-none"
        style={{ fontSize }}
        aria-hidden="true"
      >
        {initial}
      </span>
    </div>
  );
};

export default UserAvatar;
