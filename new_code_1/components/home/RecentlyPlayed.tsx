import { RECENTLY_PLAYED } from "@/data/mockData";
import { SongCard } from "@/components/ui/SongCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

/**
 * "Recently Played" horizontal scroll section.
 *
 * Implementation notes:
 * - Uses native horizontal overflow scroll for buttery-smooth touch experience.
 * - Padding on left/right aligns with the page grid but fades out visually.
 * - scrollbar-hide removes the scrollbar without disabling scroll.
 * - The right-side fade-out gradient hints that there's more content.
 */
export function RecentlyPlayed() {
  return (
    <section aria-label="Recently Played" className="mb-8">
      <SectionHeader title="Recently Played" />

      {/*
       * Wrapper with relative positioning hosts the right-side fade gradient.
       * overflow-hidden clips the fade, not the scrollable list.
       */}
      <div className="relative">
        {/* Right fade – subtle visual cue that list is scrollable */}
        <div
          aria-hidden="true"
          className={[
            "pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10",
            "bg-gradient-to-l from-swara-bg to-transparent",
          ].join(" ")}
        />

        {/* Scrollable track */}
        <div
          className={[
            "flex flex-row gap-3",
            "overflow-x-auto scrollbar-hide",
            // Padding: align first card with page, allow last card to breathe
            "px-5 pb-1",
          ].join(" ")}
        >
          {RECENTLY_PLAYED.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}

          {/* Trailing spacer so last card doesn't sit right at the edge */}
          <div className="w-4 flex-shrink-0" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
