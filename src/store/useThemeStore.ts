/**
 * src/store/useThemeStore.ts
 *
 * Centralized theme state. Theme is applied via [data-theme] on <html>.
 * CSS variables in index.css map each theme to the swara-* color tokens,
 * so no component ever needs to change — they all use bg-swara-bg etc.
 *
 * PERSISTENCE STRATEGY:
 *   localStorage  — always written (works logged-out, survives refresh)
 *   Supabase       — written on change if logged in (cross-device sync)
 *
 * HYDRATION ORDER (AppLayout):
 *   1. Read localStorage → apply immediately (no flash)
 *   2. After login + profile fetch → read cloud theme → apply if different
 *
 * LOGOUT:
 *   Theme is preserved locally — user keeps their last theme.
 *
 * NEVER show a theme-flash:
 *   applyTheme() is called synchronously from initTheme() before the
 *   first render. AppLayout calls initTheme() in its module scope (outside
 *   useEffect) so it fires before React paints.
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type Theme = 'dark' | 'semi-dark' | 'light';

const LS_KEY   = 'swara:theme';
const DEFAULT: Theme = 'dark';

// Themes in display order for the switcher UI
export const THEMES: { id: Theme; label: string; desc: string }[] = [
  { id: 'dark',      label: 'Dark',      desc: 'Deep black background' },
  { id: 'semi-dark', label: 'Semi Dark', desc: 'Softer contrast' },
  { id: 'light',     label: 'Light',     desc: 'Full light theme' },
];

function readLocal(): Theme {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === 'dark' || v === 'semi-dark' || v === 'light') return v;
  } catch {}
  return DEFAULT;
}

function writeLocal(t: Theme) {
  try { localStorage.setItem(LS_KEY, t); } catch {}
}

/** Directly sets data-theme on <html> — pure DOM, no React. */
export function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  // Also keep body bg in sync so there's no flash during hard reloads
  const bgMap: Record<Theme, string> = {
    'dark':      '#09090C',
    'semi-dark': '#12121A',
    'light':     '#F5F3EE',
  };
  document.body.style.backgroundColor = bgMap[t];
}

/** Call this at module load time (before first React paint) to apply saved theme. */
export function initTheme() {
  applyTheme(readLocal());
}

// ── Cloud persistence helpers (profiles table) ────────────────────────────────

async function readCloudTheme(): Promise<Theme | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('theme')
    .eq('id', user.id)
    .single();
  const v = (data as { theme?: string } | null)?.theme;
  if (v === 'dark' || v === 'semi-dark' || v === 'light') return v;
  return null;
}

async function writeCloudTheme(t: Theme): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('profiles').update({ theme: t }).eq('id', user.id);
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface ThemeState {
  theme: Theme;

  /** Change theme: updates DOM, localStorage, and Supabase (if logged in). */
  setTheme: (t: Theme) => void;

  /** Called by AppLayout after profile fetch — applies cloud theme if different. */
  hydrateFromCloud: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: readLocal(),

  setTheme: (t) => {
    if (get().theme === t) return;
    set({ theme: t });
    applyTheme(t);
    writeLocal(t);
    // Fire-and-forget cloud write (non-blocking)
    writeCloudTheme(t).catch((e) =>
      console.warn('[Theme] cloud write failed:', e)
    );
  },

  hydrateFromCloud: async () => {
    const cloud = await readCloudTheme();
    if (!cloud || cloud === get().theme) return;
    console.log('[Theme] applying cloud theme:', cloud);
    set({ theme: cloud });
    applyTheme(cloud);
    writeLocal(cloud);
  },
}));
