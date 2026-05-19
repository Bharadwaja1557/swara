/**
 * useDesktopSearchStore — ephemeral (session-only) store that bridges
 * the DesktopTopBar search input with SearchPage's result rendering.
 *
 * On desktop, the search input lives in DesktopTopBar.
 * SearchPage reads this store instead of maintaining its own input state.
 * On mobile, this store is unused (SearchPage has its own inline input).
 */
import { create } from 'zustand';

interface DesktopSearchState {
  query: string;
  setQuery: (q: string) => void;
  clearQuery: () => void;
}

export const useDesktopSearchStore = create<DesktopSearchState>((set) => ({
  query: '',
  setQuery: (q) => set({ query: q }),
  clearQuery: () => set({ query: '' }),
}));
