/**
 * useToastStore — lightweight ephemeral toast queue.
 *
 * Max 3 toasts visible simultaneously. Each auto-dismisses after `duration` ms.
 * Adding a toast while 3 are visible replaces the oldest one (no infinite stack).
 *
 * Usage:
 *   import { useToastStore } from '@/store/useToastStore';
 *   useToastStore.getState().show('Added to Liked Songs', 'heart');
 *
 *   // Or with the hook inside components:
 *   const toast = useToast();
 *   toast.show('Queue updated');
 */
import { create } from 'zustand';

export type ToastIcon =
  | 'heart'       // liked songs
  | 'library'     // add/remove library
  | 'playlist'    // playlist actions
  | 'queue'       // queue changes
  | 'check'       // generic success
  | 'info'        // informational
  | 'error';      // error

export interface ToastItem {
  id:       string;
  message:  string;
  icon?:    ToastIcon;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  show:   (message: string, icon?: ToastIcon, duration?: number) => void;
  hide:   (id: string) => void;
}

const MAX_TOASTS = 3;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, icon, duration = 2600) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => {
      const next = [...state.toasts, { id, message, icon, duration }];
      // Cap at MAX_TOASTS — drop oldest if over limit
      return { toasts: next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next };
    });
    // Auto-dismiss
    setTimeout(() => {
      get().hide(id);
    }, duration);
  },

  hide: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience hook — same API as calling useToastStore.getState().show() */
export function useToast() {
  const show = useToastStore((s) => s.show);
  return { show } as const;
}
