// TopBar is a Server Component – no client interactivity needed at this stage.

// ─── Profile Icon ─────────────────────────────────────────────────────────────

function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      aria-hidden="true"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Head */}
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      {/* Shoulders */}
      <path
        d="M4.5 20.5c0-4.142 3.358-7 7.5-7s7.5 2.858 7.5 7"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

/**
 * Persistent top bar shown on every screen.
 * - Left:  "Swara" wordmark in the display (Cormorant Garamond) font.
 * - Right: Profile icon button (no functionality in this phase).
 */
export function TopBar() {
  return (
    <header className="flex items-center justify-between px-5 pt-4 pb-2">
      {/* ── Wordmark ── */}
      <h1
        className={[
          // Display font (Cormorant Garamond)
          "font-display",
          // Scale & weight
          "text-3xl font-semibold tracking-wider",
          // Colour: warm off-white with a hint of amber
          "text-swara-text-1",
          // Italic for elegance
          "italic",
        ].join(" ")}
        aria-label="Swara"
      >
        Swara
      </h1>

      {/* ── Profile Button ── */}
      <button
        type="button"
        aria-label="Profile"
        className={[
          // Touch target
          "touch-target",
          // Appearance
          "w-9 h-9 rounded-full",
          "bg-swara-card border border-swara-border",
          // Icon colour
          "text-swara-text-2",
          // Interaction
          "transition-colors duration-150 active:bg-swara-elevated",
        ].join(" ")}
      >
        <ProfileIcon />
      </button>
    </header>
  );
}
