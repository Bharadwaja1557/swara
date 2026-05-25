/**
 * src/store/useLibraryPrefsStore.ts
 *
 * Persists all library UI preferences to localStorage.
 * Uses manual persist (not zustand/middleware) to avoid the hydration flash
 * that the official persist middleware can cause on first render.
 *
 * PERSISTED FIELDS:
 *   sort  — 'Recently Added' | 'A-Z' | 'Z-A'
 *   view  — 'grid' | 'list'
 *   tab   — 'All' | 'Playlists' | 'Albums' | 'Artists'
 *
 * NOT PERSISTED (derived / ephemeral):
 *   sortOpen dropdown state
 *   hover states
 *   scroll positions
 *
 * MIGRATION:
 *   On first read, migrates from the old swara_library_prefs and
 *   swara_panel_prefs keys used by the component-local loadPrefs() functions.
 */
import { create } from 'zustand';

const KEY = 'swara:library_prefs_v1';

export type LibrarySortMode = 'Recently Added' | 'A-Z' | 'Z-A';
export type LibraryViewMode = 'grid' | 'list';
export type LibraryTab      = 'All' | 'Playlists' | 'Albums' | 'Artists';

export interface LibraryPrefs {
  sort: LibrarySortMode;
  view: LibraryViewMode;
  tab:  LibraryTab;
}

const DEFAULTS: LibraryPrefs = {
  sort: 'Recently Added',
  view: 'list',
  tab:  'All',
};

const VALID_SORTS: LibrarySortMode[] = ['Recently Added', 'A-Z', 'Z-A'];
const VALID_VIEWS: LibraryViewMode[] = ['grid', 'list'];
const VALID_TABS:  LibraryTab[]      = ['All', 'Playlists', 'Albums', 'Artists'];

function readPrefs(): LibraryPrefs {
  try {
    // Check new key first
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<LibraryPrefs>;
      return {
        sort: VALID_SORTS.includes(p.sort as LibrarySortMode) ? (p.sort as LibrarySortMode) : DEFAULTS.sort,
        view: VALID_VIEWS.includes(p.view as LibraryViewMode) ? (p.view as LibraryViewMode) : DEFAULTS.view,
        tab:  VALID_TABS.includes(p.tab as LibraryTab)        ? (p.tab  as LibraryTab)       : DEFAULTS.tab,
      };
    }

    // Migrate from old component-local key (swara_library_prefs)
    const legacy = localStorage.getItem('swara_library_prefs');
    if (legacy) {
      const p = JSON.parse(legacy) as { sort?: string; view?: string };
      return {
        sort: VALID_SORTS.includes(p.sort as LibrarySortMode) ? (p.sort as LibrarySortMode) : DEFAULTS.sort,
        view: VALID_VIEWS.includes(p.view as LibraryViewMode) ? (p.view as LibraryViewMode) : DEFAULTS.view,
        tab:  DEFAULTS.tab,
      };
    }
  } catch {}
  return { ...DEFAULTS };
}

function writePrefs(p: LibraryPrefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}

interface LibraryPrefsState extends LibraryPrefs {
  setSort: (s: LibrarySortMode) => void;
  setView: (v: LibraryViewMode) => void;
  setTab:  (t: LibraryTab) => void;
}

export const useLibraryPrefsStore = create<LibraryPrefsState>((set, get) => ({
  ...readPrefs(),

  setSort: (sort) => {
    set({ sort });
    writePrefs({ ...get(), sort });
  },
  setView: (view) => {
    set({ view });
    writePrefs({ ...get(), view });
  },
  setTab: (tab) => {
    set({ tab });
    writePrefs({ ...get(), tab });
  },
}));
