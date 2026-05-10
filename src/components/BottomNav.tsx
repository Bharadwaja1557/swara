'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
  hasPlayer: boolean;
}

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Home',
    icon: HomeIcon,
    activeIcon: HomeIconFilled,
  },
  {
    href: '/search',
    label: 'Search',
    icon: SearchIcon,
    activeIcon: SearchIcon,
  },
  {
    href: '/liked',
    label: 'Liked',
    icon: HeartIcon,
    activeIcon: HeartIconFilled,
  },
];

export function BottomNav({ hasPlayer }: BottomNavProps) {
  const pathname = usePathname();

  const bottom = hasPlayer
    ? 'bottom-[var(--player-height)]'
    : 'bottom-0';

  return (
    <nav
      className={`
        fixed left-0 right-0 z-40 ${bottom}
        h-[var(--nav-height)] glass border-t border-border
        pb-safe flex items-start
      `}
      style={{ paddingBottom: 0 }}
    >
      <div className="flex w-full h-16 items-center">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          const Icon = isActive ? item.activeIcon : item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1
                h-full no-select press-scale
                transition-colors duration-150
                ${isActive ? 'text-accent' : 'text-text-muted'}
              `}
            >
              <Icon size={22} />
              <span
                className={`
                  text-2xs font-medium tracking-wide
                  ${isActive ? 'text-accent' : 'text-text-muted'}
                `}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────

function HomeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 21V12h6v9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeIconFilled({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 21V12h6v9"
        stroke="var(--color-bg)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M16.5 16.5L21 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeartIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21C12 21 3 15 3 9a4.5 4.5 0 018.94-.89L12 9l.06-.89A4.5 4.5 0 0121 9c0 6-9 12-9 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIconFilled({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21C12 21 3 15 3 9a4.5 4.5 0 018.94-.89L12 9l.06-.89A4.5 4.5 0 0121 9c0 6-9 12-9 12z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
