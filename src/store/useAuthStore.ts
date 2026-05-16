/**
 * src/store/useAuthStore.ts
 *
 * Centralized auth state.
 * - Restores session from localStorage on app startup (no flicker for returning users)
 * - Listens to Supabase auth state changes (login, logout, token refresh)
 * - Exposes minimal surface to the rest of the app
 *
 * Call `useAuthStore.getState().initialize()` once in AppLayout.
 */
import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { AuthService } from '@/services/auth/AuthService';

interface AuthState {
  user:            User | null;
  session:         Session | null;
  isLoading:       boolean;
  /** True once getSession() has resolved — prevents auth flicker */
  initialized:     boolean;
  isAuthenticated: boolean;

  /** Call once on app mount. Restores session and starts listener. */
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
    // Supabase reads from localStorage first — resolves in milliseconds for
    // returning users, so there is no visible flash before initialized=true.
    try {
      const session = await AuthService.getSession();
      set({
        session,
        user:            session?.user ?? null,
        isAuthenticated: !!session,
        initialized:     true,
      });
    } catch {
      set({ initialized: true }); // fail open — show login
    }

    // Keep store in sync with Supabase's own session management
    // (covers token refresh, signOut from another tab, etc.)
    AuthService.onAuthStateChange((_event, session) => {
      set({
        session,
        user:            session?.user ?? null,
        isAuthenticated: !!session,
      });

      // When a session becomes available, sync cloud liked songs.
      // Dynamic import breaks the circular dependency (auth ↛ liked ↛ auth).
      if (session) {
        import('@/store/likedStore').then(({ useLikedStore }) => {
          useLikedStore.getState().syncFromCloud();
        }).catch(() => {});
      }
    });
  },

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      await AuthService.login(username, password);
      // onAuthStateChange listener above will update user/session/isAuthenticated
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
