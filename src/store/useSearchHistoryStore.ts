/**
 * useSearchHistoryStore — persistent search query history.
 *
 * Designed as the foundation for a future unified activity/history system:
 *   - Add type: 'search' | 'play' | 'album_view' | 'artist_view'
 *   - Add entityId for played tracks/albums
 *   - Sync to Supabase activity_log without changing this interface
 *
 * Survives refresh, relaunch, and logout/login on the same device.
 * Shared between mobile SearchPage and desktop SearchPage (same key).
 */
import { create } from 'zustand';

const KEY  = 'swara_search_history';
const MAX  = 5;

export interface SearchHistoryEntry {
  id:         string;   // `${query}-${timestamp}` — stable key for React lists
  query:      string;
  searchedAt: number;   // unix ms — available for future analytics/sorting
  // Future fields: type, entityId, filters, resultCount, etc.
}

interface SearchHistoryState {
  entries: SearchHistoryEntry[];

  /** Record a search query. Deduplicates (case-insensitive) and trims to MAX. */
  push(query: string): void;
  remove(id: string): void;
  clear(): void;
  getRecent(limit?: number): SearchHistoryEntry[];
}

function read(): SearchHistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}
function write(entries: SearchHistoryEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch {}
}

export const useSearchHistoryStore = create<SearchHistoryState>((set, get) => ({
  entries: read(),

  push: (query) => {
    const q = query.trim();
    if (!q) return;
    // Deduplicate case-insensitively so "Anirudh" and "anirudh" don't both persist
    let entries = get().entries.filter((e) => e.query.toLowerCase() !== q.toLowerCase());
    entries.unshift({ id: `${q}-${Date.now()}`, query: q, searchedAt: Date.now() });
    entries = entries.slice(0, MAX);
    write(entries);
    set({ entries });
  },

  remove: (id) => {
    const entries = get().entries.filter((e) => e.id !== id);
    write(entries);
    set({ entries });
  },

  clear: () => { write([]); set({ entries: [] }); },

  getRecent: (limit = MAX) => get().entries.slice(0, limit),
}));
