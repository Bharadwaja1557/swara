import type { QuickPick } from "@/types";

// ─── Icons ────────────────────────────────────────────────────────────────────

function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" stroke="currentColor" strokeWidth="1.8"/>
      <line x1="4" y1="20" x2="21" y2="3" stroke="currentColor" strokeWidth="1.8"/>
      <polyline points="21 16 21 21 16 21" stroke="currentColor" strokeWidth="1.8"/>
      <line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="3"  y="12" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="10" y="7"  width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="17" y="3"  width="4" height="18" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
      strokeLinecap="round" strokeLinejoin="round">
      <polygon
        points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PickIcon({ type }: { type: QuickPick["iconType"] }) {
  switch (type) {
    case "shuffle":   return <ShuffleIcon />;
    case "chart-bar": return <ChartBarIcon />;
    case "bolt":      return <BoltIcon />;
  }
}

// ─── Accent colours per icon type ─────────────────────────────────────────────

const ICON_ACCENT: Record<QuickPick["iconType"], string> = {
  "shuffle":   "text-swara-accent",
  "chart-bar": "text-[#6DBF7A]",
  "bolt":      "text-[#7AADDB]",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface QuickPickCardProps {
  pick: QuickPick;
}

/**
 * Premium playlist shortcut card.
 * A bordered card with a left-accent strip, icon, title, and metadata.
 */
export function QuickPickCard({ pick }: QuickPickCardProps) {
  return (
    <article
      className={[
        // Layout
        "flex flex-col justify-between",
        "p-3.5",
        // Size – equal flex children in a row
        "min-w-[140px] flex-1",
        // Appearance
        "rounded-2xl",
        "border",
        pick.accentClass,
        // Interaction
        "cursor-pointer",
        "transition-all duration-150 active:scale-[0.97]",
      ].join(" ")}
      aria-label={pick.title}
    >
      {/* ── Icon ── */}
      <div
        className={[
          "w-8 h-8 rounded-xl",
          "flex items-center justify-center",
          "bg-swara-surface/60",
          "mb-3",
          ICON_ACCENT[pick.iconType],
        ].join(" ")}
      >
        <PickIcon type={pick.iconType} />
      </div>

      {/* ── Title ── */}
      <div>
        <p className="text-[0.82rem] font-semibold text-swara-text-1 leading-tight line-clamp-1">
          {pick.title}
        </p>
        <p className="mt-0.5 text-[0.68rem] font-normal text-swara-text-2 leading-tight">
          {pick.subtitle}
        </p>
        <p className="mt-1 text-[0.62rem] font-normal text-swara-text-3">
          {pick.songCount.toLocaleString()} tracks
        </p>
      </div>
    </article>
  );
}
