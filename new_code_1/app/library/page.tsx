// Library page – placeholder for future implementation.
// Library grid, filtering, and playlist management will be built separately.

import { TopBar } from "@/components/layout/TopBar";

export default function LibraryPage() {
  return (
    <>
      <TopBar />

      <div className="flex flex-col items-center justify-center min-h-[60vh] px-5 text-center">
        {/* Library icon */}
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
          <rect x="3"  y="4" width="5" height="16" rx="1"
                stroke="currentColor" strokeWidth="1.4"/>
          <rect x="10" y="4" width="5" height="16" rx="1"
                stroke="currentColor" strokeWidth="1.4"/>
          <path d="M17.5 4.5l3.5 1-4 15-3.5-1 4-15z"
                stroke="currentColor" strokeWidth="1.4"/>
        </svg>

        <h2 className="font-display italic text-2xl font-medium text-swara-text-2 mb-2">
          Library
        </h2>
        <p className="font-sans text-sm text-swara-text-3">
          Coming soon — library will be built in the next phase.
        </p>
      </div>
    </>
  );
}
