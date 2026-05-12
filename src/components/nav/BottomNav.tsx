import { NavLink } from 'react-router-dom';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const HomeIcon = ({ filled }: { filled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {filled ? (
      <path
        d="M9.02 2.84L3.63 7.04C2.73 7.74 2 9.23 2 10.36v7.41c0 2.32 1.89 4.22 4.21 4.22h11.58c2.32 0 4.21-1.9 4.21-4.21v-7.3c0-1.21-.81-2.76-1.8-3.45l-6.18-4.33c-1.4-.98-3.65-.93-5.01.14Z"
        fill="currentColor"
      />
    ) : (
      <>
        <path
          d="M9.02 2.84L3.63 7.04C2.73 7.74 2 9.23 2 10.36v7.41c0 2.32 1.89 4.22 4.21 4.22h11.58c2.32 0 4.21-1.9 4.21-4.21v-7.3c0-1.21-.81-2.76-1.8-3.45l-6.18-4.33c-1.4-.98-3.65-.93-5.01.14Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 17.99v-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )}
  </svg>
);

const SearchIcon = ({ filled }: { filled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M11 20a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      fill={filled ? 'currentColor' : 'none'}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={filled ? 0.9 : 1}
    />
    {filled && (
      <path
        d="M11 20a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
    <path
      d="m20.97 20.97-1.5-1.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LibraryIcon = ({ filled }: { filled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {filled ? (
      <>
        <path d="M2 6h4v15H2z" fill="currentColor" />
        <path d="M7 3h4v18H7z" fill="currentColor" />
        <path
          d="m13.45 3.07 3.87 14.44-3.87.86L9.58 3.93l3.87-.86Z"
          fill="currentColor"
        />
        <path
          d="M19.1 4.35a1.88 1.88 0 1 0-1 3.62 1.88 1.88 0 0 0 1-3.62Z"
          fill="currentColor"
        />
      </>
    ) : (
      <>
        <path d="M2 6h4v15H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M7 3h4v18H7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path
          d="m13.45 3.07 3.87 14.44-3.87.86L9.58 3.93l3.87-.86Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M19.1 4.35a1.88 1.88 0 1 0-1 3.62 1.88 1.88 0 0 0 1-3.62Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </>
    )}
  </svg>
);

// ─── Nav Item ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  to: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  end?: boolean;
}

const NavItem = ({ to, label, icon, end }: NavItemProps) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      [
        'flex flex-col items-center justify-center gap-1 flex-1 py-2 min-h-[52px]',
        'transition-colors duration-200 ease-out',
        isActive
          ? 'text-swara-accent'
          : 'text-swara-muted hover:text-swara-text',
      ].join(' ')
    }
    aria-label={label}
  >
    {({ isActive }) => (
      <>
        <span className="transition-transform duration-200 ease-out">
          {icon(isActive)}
        </span>
        <span
          className={[
            'text-[10px] font-body font-medium tracking-wide leading-none',
            'transition-colors duration-200',
          ].join(' ')}
        >
          {label}
        </span>
      </>
    )}
  </NavLink>
);

// ─── BottomNav ────────────────────────────────────────────────────────────────

/**
 * Persistent bottom navigation bar.
 * Fixed to the bottom of the viewport, mobile-first.
 * Active route is highlighted in swara-accent (warm gold).
 */
export const BottomNav = () => {
  return (
    <nav
      className={[
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-swara-surface border-t border-swara-border',
        'shadow-nav',
        'flex items-stretch',
        'pb-safe', // handle notched devices
      ].join(' ')}
      aria-label="Primary navigation"
    >
      <NavItem to="/"        label="Home"    icon={(a) => <HomeIcon    filled={a} />} end />
      <NavItem to="/search"  label="Search"  icon={(a) => <SearchIcon  filled={a} />} />
      <NavItem to="/library" label="Library" icon={(a) => <LibraryIcon filled={a} />} />
    </nav>
  );
};

export default BottomNav;
