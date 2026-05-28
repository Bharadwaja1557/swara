/**
 * useSearchHistoryStore — entity-based search history.
 *
 * REDESIGN (refinement pass 4):
 *   History no longer stores raw query text.
 *   Instead, it stores the ACTUAL ENTITY the user clicked in search results:
 *     • A song  (type: 'track')  → clicking plays the song
 *     • An album (type: 'album') → clicking navigates to album page
 *     • An artist (type: 'artist') → clicking navigates to artist page
 *
 *   This creates a meaningful "recent items" UX instead of raw partial queries.
 *
 * DATA MODEL:
 *   HistoryEntity — minimal denormalized metadata for rendering + interaction.
 *     type:     'track' | 'album' | 'artist'
 *     id:       entity's stable ID (track.id / album.id / artist.id)
 *     title:    display name
 *     coverUrl: artwork URL
 *     subtitle: secondary line (artist name / composer / album count)
 *
 *   SearchHistoryEntry — one entry in the history list.
 *     id:      stable React key
 *     entity:  the entity that was clicked
 *     savedAt: unix ms timestamp — for ordering and deduplication
 *
 * MIGRATION:
 *   Old key ('swara_search_history') stored raw query strings.
 *   New key ('swara_search_history_v2') is a clean slate — old entries
 *   are not migrated because there's no way to reconstruct which entity
 *   the user originally clicked from a partial query string.
 *
 * DEDUPLICATION:
 *   By entity.id — clicking the same entity again moves it to the front.
 *
 * CLEAR:
 *   Wipes the ENTIRE store (localStorage + Zustand), not just visible items.
 */
import { create } from 'zustand';

const KEY = 'swara_search_history_v2';
const MAX = 5;

export type HistoryEntityType = 'track' | 'album' | 'artist';

export interface HistoryEntity {
  type:     HistoryEntityType;
  /** Stable entity ID: track.id / album.id / artist.id */
  id:       string;
  title:    string;
  coverUrl: string;
  /** Secondary line: artist name, composer, "N albums", etc. */
  subtitle: string;
}

export interface SearchHistoryEntry {
  id:      string;        // `${entity.type}-${entity.id}-${savedAt}` — stable React key
  entity:  HistoryEntity;
  savedAt: number;        // unix ms
}

interface SearchHistoryState {
  entries: SearchHistoryEntry[];

  /**
   * Record an entity click. Deduplicates by entity.id (same entity moves
   * to front). Trims to MAX items.
   */
  pushEntity(entity: HistoryEntity): void;

  /** Remove a single entry by its id. */
  remove(id: string): void;

  /** CLEAR ENTIRE history — both Zustand state and localStorage. */
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

  pushEntity: (entity) => {
    if (!entity.id || !entity.title) return;
    // Remove existing entry for the same entity (dedup)
    let entries = get().entries.filter((e) => !(e.entity.type === entity.type && e.entity.id === entity.id));
    const savedAt = Date.now();
    entries.unshift({
      id:      `${entity.type}-${entity.id}-${savedAt}`,
      entity,
      savedAt,
    });
    entries = entries.slice(0, MAX);
    write(entries);
    set({ entries });
  },

  remove: (id) => {
    const entries = get().entries.filter((e) => e.id !== id);
    write(entries);
    set({ entries });
  },

  clear: () => {
    try { localStorage.removeItem(KEY); } catch {}
    set({ entries: [] });
  },

  getRecent: (limit = MAX) => get().entries.slice(0, limit),
}));
