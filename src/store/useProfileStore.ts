/**
 * src/store/useProfileStore.ts
 *
 * Profile state store. Fetches and caches the authenticated user's profile.
 * The app uses profile.username / profile.display_name for all identity UI —
 * never auth.user.email.
 *
 * Startup: AppLayout calls fetchProfile() after auth is confirmed.
 */
import { create } from 'zustand';
import { ProfileRepository, type Profile } from '@/repositories/profile/ProfileRepository';

interface ProfileState {
  profile:    Profile | null;
  isLoading:  boolean;

  /** Fetch and cache profile. Uses getOrCreate — safe even if trigger missed. */
  fetchProfile: () => Promise<void>;
  /** Returns display_name if set, otherwise username, otherwise empty string. */
  getDisplayName: () => string;
  /** Returns the username portion (what user typed at login). */
  getUsername: () => string;
  /** Clear profile on logout. */
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile:   null,
  isLoading: false,

  fetchProfile: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const profile = await ProfileRepository.getOrCreate();
      console.log('[Profile] Loaded:', profile?.username ?? 'none');
      set({ profile });
    } catch (err) {
      console.error('[Profile] fetchProfile error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  getDisplayName: () => {
    const { profile } = get();
    return profile?.display_name || profile?.username || '';
  },

  getUsername: () => get().profile?.username ?? '',

  clearProfile: () => set({ profile: null }),
}));
