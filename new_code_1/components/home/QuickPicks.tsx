import { QUICK_PICKS } from "@/data/mockData";
import { QuickPickCard } from "@/components/ui/QuickPickCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

/**
 * "Quick Picks" section on the Home page.
 *
 * Displays 3 playlist shortcut cards in a horizontal row.
 * On very small screens (<360px), cards scroll horizontally.
 * On normal mobile and up, all 3 fit naturally in the row.
 */
export function QuickPicks() {
  return (
    <section aria-label="Quick Picks" className="mb-8">
      <SectionHeader title="Quick Picks" />

      {/* Card row – flex with equal sizing */}
      <div
        className={[
          "flex flex-row gap-3",
          // Horizontal scroll on very small screens
          "overflow-x-auto scrollbar-hide",
          "px-5",
        ].join(" ")}
      >
        {QUICK_PICKS.map((pick) => (
          <QuickPickCard key={pick.id} pick={pick} />
        ))}
      </div>
    </section>
  );
}
