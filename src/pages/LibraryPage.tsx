/**
 * LibraryPage
 *
 * Placeholder — library functionality will be wired in a future step.
 * Renders the shell: header + filter tabs + empty state.
 */

const TABS = ['All', 'Albums', 'Artists', 'Playlists'] as const;
type LibraryTab = (typeof TABS)[number];

import { useState } from 'react';

const LibraryPage = () => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('All');

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-5 pt-5">
        <h1 className="text-xl font-bold text-swara-text tracking-tight font-display">
          My Library
        </h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-none pb-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'flex-shrink-0 px-4 py-1.5 rounded-full',
                'text-[0.8125rem] font-medium',
                'border transition-all duration-200',
                activeTab === tab
                  ? 'bg-swara-accent border-swara-accent text-swara-bg'
                  : 'bg-transparent border-swara-border text-swara-muted hover:text-swara-text hover:border-swara-elevated',
              ].join(' ')}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 mt-4 h-px bg-swara-border opacity-60" aria-hidden="true" />

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center mt-20 gap-3 px-5">
        <div className="w-14 h-14 rounded-2xl bg-swara-card border border-swara-border flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-swara-dim" aria-hidden="true">
            <path d="M2 6h4v15H2zM7 3h4v18H7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path
              d="m13.45 3.07 3.87 14.44-3.87.86L9.58 3.93l3.87-.86Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-swara-muted text-center">
          Library is coming soon
        </p>
        <p className="text-xs text-swara-dim text-center max-w-[220px]">
          Your albums, playlists, and artists will live here
        </p>
      </div>
    </div>
  );
};

export default LibraryPage;
