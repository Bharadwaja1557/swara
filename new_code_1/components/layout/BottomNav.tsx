"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemConfig } from "@/types";

// ─── Nav Config ───────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItemConfig[] = [
  { tab: "home",    label: "Home",    href: "/" },
  { tab: "search",  label: "Search",  href: "/search" },
  { tab: "library", label: "Library", href: "/library" },
];

// ─── SVG Icons ────────────────────────────────────────────────────────────────
// Inline SVGs – no icon library dependency.

function IconHome({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {filled ? (
        <>
          <path
            d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H15v-5h-6v5H4a1 1 0 0 1-1-1V10.5z"
            fill="currentColor"
          />
        </>
      ) : (
        <>
          <path
            d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H15v-5h-6v5H4a1 1 0 0 1-1-1V10.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </>
      )}
    </svg>
  );
}

function IconSearch({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7.5"
        fill={filled ? "none" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? "2" : "1.6"}
        strokeLinecap="round"
      />
      <line
        x1="17"
        y1="17"
        x2="21.5"
        y2="21.5"
        stroke="currentColor"
        strokeWidth={filled ? "2.5" : "1.6"}
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLibrary({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Stacked record/library icon */}
      <rect
        x="3"
        y="4"
        width="5"
        height="16"
        rx="1"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="10"
        y="4"
        width="5"
        height="16"
        rx="1"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M17.5 4.5l3.5 1-4 15-3.5-1 4-15z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────

function NavIcon({
  tab,
  filled,
}: {
  tab: NavItemConfig["tab"];
  filled: boolean;
}) {
  switch (tab) {
    case "home":    return <IconHome filled={filled} />;
    case "search":  return <IconSearch filled={filled} />;
    case "library": return <IconLibrary filled={filled} />;
  }
}

// ─── BottomNav Component ──────────────────────────────────────────────────────

export function BottomNav() {
  const pathname = usePathname();

  /** Determine the active tab from current path */
  const getActiveTab = (): NavItemConfig["tab"] => {
    if (pathname.startsWith("/search"))  return "search";
    if (pathname.startsWith("/library")) return "library";
    return "home";
  };

  const activeTab = getActiveTab();

  return (
    <nav
      aria-label="Main navigation"
      className={[
        // Layout
        "fixed bottom-0 left-0 right-0 z-50",
        // Height – 4.5rem + safe area for notch phones
        "h-nav pb-[env(safe-area-inset-bottom)]",
        // Appearance
        "bg-swara-surface border-t border-swara-border",
        "shadow-nav",
      ].join(" ")}
    >
      <ul className="flex items-stretch justify-around h-full px-2">
        {NAV_ITEMS.map(({ tab, label, href }) => {
          const isActive = tab === activeTab;

          return (
            <li key={tab} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  // Full-height touch target
                  "relative flex flex-col items-center justify-center gap-[3px]",
                  "h-full w-full",
                  // Typography
                  "text-[0.65rem] font-medium tracking-wide uppercase",
                  // Colour transitions
                  "transition-colors duration-200",
                  isActive
                    ? "text-swara-accent"
                    : "text-swara-text-3 hover:text-swara-text-2",
                ].join(" ")}
              >
                {/* Icon wrapper with subtle scale on active */}
                <span
                  className={[
                    "transition-transform duration-200",
                    isActive ? "scale-110" : "scale-100",
                  ].join(" ")}
                >
                  <NavIcon tab={tab} filled={isActive} />
                </span>

                {/* Label */}
                <span>{label}</span>

                {/* Active dot indicator – sits at the very top of the tab */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-swara-accent"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
