/**
 * src/services/auth/AuthService.ts
 *
 * Thin service wrapper around Supabase auth.
 * UI always works with plain usernames — the @swara.app email convention
 * is an internal implementation detail hidden here.
 *
 * Users are manually created in Supabase with email: <username>@swara.app
 * No public registration exists.
 */
import { supabase } from '@/lib/supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

/** Convert a plain username to the internal email convention. */
const toEmail = (username: string): string =>
  `${username.trim().toLowerCase()}@swara.app`;

export const AuthService = {
  /**
   * Sign in with username + password.
   * Converts username → username@swara.app before calling Supabase.
   * Throws if credentials are invalid.
   */
  async login(username: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    });
    if (error) throw error;
    return data;
  },

  /** Sign out the current user and clear local session. */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Read the current session.
   * Supabase resolves this from localStorage first (synchronous path),
   * then validates with the server. Very fast for cached sessions.
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Subscribe to auth state changes (login, logout, token refresh).
   * Returns an unsubscribe function — call it in useEffect cleanup.
   */
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return () => data.subscription.unsubscribe();
  },
};
