/**
 * src/store/useAuthStore.ts
 *
 * Auth store. Deliberately does NOT trigger liked-song sync here.
 * Sync is orchestrated by AppLayout after BOTH auth AND library are ready.
 * Calling syncFromCloud() from onAuthStateChange was the root cause of the
 * cross-device sync failure (library not loaded at that point).
 */
import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { AuthService } from '@/services/auth/AuthService';

interface AuthState {
  user:            User | null;
  session:         Session | null;
  isLoading:       boolean;
  initialized:     boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  login:      (username: string, password: string) => Promise<void>;
  logout:     () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  session:         null,
  isLoading:       false,
  initialized:     false,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const session = await AuthService.getSession();
      console.log('[Auth] Session restored:', session ? `user=${session.user.email}` : 'none');
      set({
        session,
        user:            session?.user ?? null,
        isAuthenticated: !!session,
        initialized:     true,
      });
    } catch {
      console.warn('[Auth] getSession failed — showing login');
      set({ initialized: true });
    }

    // Keep store in sync with token refresh / sign-out from another tab.
    // NOTE: we deliberately do NOT call syncFromCloud() here.
    // That call was the root cause of the cross-device sync bug:
    // the library (and therefore all track metadata) was not yet loaded
    // when this listener fired, so syncFromCloud resolved zero tracks
    // and the hydration silently produced nothing.
    // Sync is now orchestrated by AppLayout after library is confirmed ready.
    AuthService.onAuthStateChange((_event, session) => {
      console.log('[Auth] State change:', _event, session?.user?.email ?? 'signed out');
      set({
        session,
        user:            session?.user ?? null,
        isAuthenticated: !!session,
      });
    });
  },

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      await AuthService.login(username, password);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await AuthService.logout();
      set({ user: null, session: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
