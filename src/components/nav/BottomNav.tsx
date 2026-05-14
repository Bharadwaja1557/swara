/**
 * BottomNav — copied exactly from git-play structure and icons.
 */
import { NavLink } from 'react-router-dom';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const LibraryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
);

const NAV_ITEMS = [
  { to: '/', end: true,  label: 'Home',    Icon: HomeIcon    },
  { to: '/search',       label: 'Search',  Icon: SearchIcon  },
  { to: '/library',      label: 'Library', Icon: LibraryIcon },
];

export const BottomNav = () => (
  <nav
    className="flex flex-shrink-0 border-t border-swara-border pb-safe"
    style={{
      background: 'rgba(10,10,10,0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      height: '64px',
    }}
    aria-label="Primary navigation"
  >
    {NAV_ITEMS.map(({ to, end, label, Icon }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        className={({ isActive }) => [
          'flex flex-col items-center justify-center gap-1 flex-1 py-2',
          'text-[0.68rem] font-medium tracking-[0.04em]',
          'transition-colors duration-200',
          isActive ? 'text-swara-accent' : 'text-swara-dim',
        ].join(' ')}
        aria-label={label}
      >
        <Icon />
        <span>{label}</span>
      </NavLink>
    ))}
  </nav>
);

export default BottomNav;
