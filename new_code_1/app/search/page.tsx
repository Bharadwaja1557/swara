// Search page – placeholder for future implementation.
// Search logic, filters, and results will be built in a dedicated phase.

import { TopBar } from "@/components/layout/TopBar";

export default function SearchPage() {
  return (
    <>
      <TopBar />

      <div className="flex flex-col items-center justify-center min-h-[60vh] px-5 text-center">
        {/* Search icon */}
        <svg
          viewBox="0 0 24 24"
          width="48"
          height="48"
          fill="none"
          aria-hidden="true"
          className="mb-4 text-swara-text-3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.4"/>
          <line x1="17" y1="17" x2="22" y2="22" stroke="currentColor" strokeWidth="1.4"/>
        </svg>

        <h2 className="font-display italic text-2xl font-medium text-swara-text-2 mb-2">
          Search
        </h2>
        <p className="font-sans text-sm text-swara-text-3">
          Coming soon — search will be built in the next phase.
        </p>
      </div>
    </>
  );
}
