/**
 * src/store/useProfileStore.ts
 *
 * Profile state store.
 *
 * Contains: username, display_name, theme, avatar_url, avatar_updated_at, bio.
 *
 * AVATAR CACHE BUSTING:
 *   getAvatarUrl() appends ?v={avatar_updated_at ms} so browsers immediately
 *   invalidate their cached image after a new upload. The same v= value for
 *   the same upload version allows CDN caching between updates.
 */
import { create } from 'zustand';
import { ProfileRepository, buildAvatarUrl, type Profile } from '@/repositories/profile/ProfileRepository';

interface ProfileState {
  profile:         Profile | null;
  isLoading:       boolean;
  isUploadingAvatar: boolean;
  uploadProgress:  number;

  fetchProfile:    () => Promise<void>;
  getDisplayName:  () => string;
  getUsername:     () => string;
  /** Returns avatar URL with cache-busting ?v= param, or null if no avatar. */
  getAvatarUrl:    () => string | null;
  clearProfile:    () => void;

  /**
   * Upload a new avatar.
   * Handles client-side resize/WebP conversion, upload, and Zustand update.
   * After completion, the new avatar is immediately visible everywhere
   * without a page reload — Zustand state is updated optimistically.
   */
  uploadAvatar:    (file: File) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile:           null,
  isLoading:         false,
  isUploadingAvatar: false,
  uploadProgress:    0,

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

  getAvatarUrl: () => {
    const { profile } = get();
    if (!profile?.avatar_url) return null;
    return buildAvatarUrl(profile.avatar_url, profile.avatar_updated_at);
  },

  clearProfile: () => set({ profile: null, isUploadingAvatar: false, uploadProgress: 0 }),

  uploadAvatar: async (file: File) => {
    if (get().isUploadingAvatar) return;
    set({ isUploadingAvatar: true, uploadProgress: 0 });

    try {
      // 1. Client-side resize + WebP conversion via canvas
      const webpBlob = await resizeAndConvertToWebP(file, 512);
      set({ uploadProgress: 5 });

      // 2. Upload via repository
      const updated = await ProfileRepository.uploadAvatar(webpBlob, (pct) => {
        set({ uploadProgress: pct });
      });

      if (!updated) throw new Error('Upload returned null profile');

      // 3. Immediately update Zustand — avatar visible everywhere without reload
      set({ profile: updated });
      console.log('[Profile] Avatar uploaded successfully');
    } catch (err) {
      console.error('[Profile] uploadAvatar error:', err);
      throw err; // re-throw so UI can show error toast
    } finally {
      set({ isUploadingAvatar: false, uploadProgress: 0 });
    }
  },
}));

// ── Client-side image processing ───────────────────────────────────────────────
// Runs entirely in the browser — no server-side image processing required.
// Canvas resize is synchronous-ish (wrapped in Promise for async ergonomics).

async function resizeAndConvertToWebP(file: File, targetSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }

        // Cover-crop: center the image, fill the square without distortion
        const { naturalWidth: sw, naturalHeight: sh } = img;
        const scale  = Math.max(targetSize / sw, targetSize / sh);
        const dw     = sw * scale;
        const dh     = sh * scale;
        const dx     = (targetSize - dw) / 2;
        const dy     = (targetSize - dh) / 2;

        ctx.drawImage(img, dx, dy, dw, dh);

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('canvas.toBlob returned null')); return; }
            resolve(blob);
          },
          'image/webp',
          0.92, // quality 92% — visually lossless at this size
        );
      } catch (e) { reject(e); }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
}
