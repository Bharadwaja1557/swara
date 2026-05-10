/**
 * Safe localStorage wrapper — all operations are no-ops during SSR.
 */

const isClient = typeof window !== 'undefined';

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (!isClient) return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    if (!isClient) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or private mode — silently ignore
    }
  },

  remove(key: string): void {
    if (!isClient) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },

  session: {
    get<T>(key: string, fallback: T): T {
      if (!isClient) return fallback;
      try {
        const raw = sessionStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },

    set<T>(key: string, value: T): void {
      if (!isClient) return;
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore
      }
    },

    remove(key: string): void {
      if (!isClient) return;
      try {
        sessionStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
  },
};
