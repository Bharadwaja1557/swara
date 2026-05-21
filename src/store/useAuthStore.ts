/**
 * src/store/useAuthStore.ts
 *
 * Auth store. Deliberately does NOT trigger liked-song sync here.
 * Sync is orchestrated by AppLayout after BOTH auth AND library are ready.
 * Calling syncFromCloud() from onAuthStateChange was the root cause of the
 * cross-device sync failure (library not loaded at that point).
 *
 * LOGOUT CORRECTNESS:
 *   logout() calls clearUserState() which resets every user-specific store
 *   before the Supabase session is invalidated. This prevents state leakage
 *   between account switches.
 *
 *   Stale-state bugs that existed before this fix:
 *     1. User A liked songs remained in Zustand AND localStorage after logout.
 *        User B would see User A's liked songs until startup sync completed.
 *     2. User A's profile (username, display_name) stayed in useProfileStore.
 *        Any component reading getDisplayName() showed the wrong name.
 *     3. User A's user library remained in useUserLibraryStore.
 *        User B's library page showed User A's saved albums.
 *   All three are now cleared synchronously before the Supabase signOut call.
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

/**
 * Clears all user-specific Zustand state and localStorage caches.
 * Called synchronously at the start of logout before the Supabase session
 * is invalidated — ensures no stale data is visible during the sign-out flow.
 *
 * Uses dynamic imports to avoid circular dependencies at module parse time.
 */
async function clearUserState(): Promise<void> {
  try {
    // Liked songs: clear Zustand + swara_liked localStorage
    const { useLikedStore } = await import('@/store/likedStore');
    useLikedStore.getState().reset();
  } catch (e) { console.warn('[Auth] clearUserState: likedStore reset failed', e); }

  try {
    // User library: clear Zustand + swara_user_library_v1 localStorage
    const { useUserLibraryStore } = await import('@/store/useUserLibraryStore');
    useUserLibraryStore.getState().reset();
  } catch (e) { console.warn('[Auth] clearUserState: userLibraryStore reset failed', e); }

  try {
    // Playlists: clear Zustand + swara_playlists_v1 localStorage
    const { usePlaylistStore } = await import('@/store/usePlaylistStore');
    usePlaylistStore.getState().reset();
  } catch (e) { console.warn('[Auth] clearUserState: playlistStore reset failed', e); }

  try {
    // Profile: clear Zustand (no localStorage to clear)
    const { useProfileStore } = await import('@/store/useProfileStore');
    useProfileStore.getState().clearProfile();
  } catch (e) { console.warn('[Auth] clearUserState: profileStore clear failed', e); }

  console.log('[Auth] User state cleared ✓');
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
      // Step 1: clear all user-specific state BEFORE invalidating the session.
      // This ensures no stale data is visible during the sign-out transition
      // and prevents User A's data leaking to User B on the same device.
      await clearUserState();

      // Step 2: invalidate the Supabase session (clears localStorage JWT)
      await AuthService.logout();

      set({ user: null, session: null, isAuthenticated: false });
      console.log('[Auth] Logout complete ✓');
    } finally {
      set({ isLoading: false });
    }
  },
}));
