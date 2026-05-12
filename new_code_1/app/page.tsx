// Home page – Server Component
// Assembles all Home sections in order.
// Sections that need client interactivity are marked with "use client" internally.

import { TopBar }          from "@/components/layout/TopBar";
import { GreetingSection } from "@/components/home/GreetingSection";
import { RecentlyPlayed }  from "@/components/home/RecentlyPlayed";
import { QuickPicks }      from "@/components/home/QuickPicks";
import { ExploreAlbums }   from "@/components/home/ExploreAlbums";

export default function HomePage() {
  return (
    <>
      {/* ── Fixed-to-content Top Bar ── */}
      <TopBar />

      {/*
       * Page scroll container.
       * overflow-x-hidden prevents any horizontal bleed.
       */}
      <div className="overflow-x-hidden">

        {/* ① Greeting */}
        <GreetingSection />

        {/* ② Recently Played */}
        <RecentlyPlayed />

        {/* ③ Quick Picks */}
        <QuickPicks />

        {/* ④ Explore Albums */}
        <ExploreAlbums />

        {/* Bottom breathing room above nav */}
        <div className="h-4" aria-hidden="true" />
      </div>
    </>
  );
}
