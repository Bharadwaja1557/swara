/**
 * src/components/ui/CreatorLink.tsx
 *
 * Centralized clickable creator attribution.
 * Used on PlaylistPage, SearchPage, LibraryPage, and any future playlist surface.
 *
 * Behavior:
 *   own username  → navigates to /profile
 *   other user    → navigates to /user/:username
 *
 * Single implementation — change routing here, it updates everywhere.
 */
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '@/store/useProfileStore';

interface CreatorLinkProps {
  username: string;
  prefix?: string;               // default "by"
  className?: string;
}

const CreatorLink = ({ username, prefix = 'by', className = '' }: CreatorLinkProps) => {
  const navigate    = useNavigate();
  const ownUsername = useProfileStore((s) => s.getUsername());

  if (!username) return null;

  const isOwn = ownUsername && username === ownUsername;
  const route = isOwn ? '/profile' : `/user/${encodeURIComponent(username)}`;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); navigate(route); }}
      className={`hover:text-swara-accent transition-colors ${className}`}
      aria-label={`View profile of ${username}`}
    >
      {prefix && <span className="text-swara-dim mr-1">{prefix}</span>}
      <span className="font-medium">{username}</span>
    </button>
  );
};

export default CreatorLink;
