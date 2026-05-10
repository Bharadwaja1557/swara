'use client';

import { create } from 'zustand';
import type { AuthState } from '@/types';
import { PASSPHRASE_HASH, STORAGE_KEYS } from '@/lib/constants';
import { storage } from '@/lib/storage';

async function sha256hex(message: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface InternalAuthState extends AuthState {
  _hydrated: boolean;
  hydrate: () => void;
}

export const useAuthStore = create<InternalAuthState>((set) => ({
  isUnlocked: false,
  _hydrated: false,

  hydrate: () => {
    const persisted = storage.session.get<boolean>(STORAGE_KEYS.AUTH_UNLOCKED, false);
    set({ isUnlocked: persisted, _hydrated: true });
  },

  unlock: async (passphrase: string): Promise<boolean> => {
    const hash = await sha256hex(passphrase.trim());
    const correct = hash === PASSPHRASE_HASH.toLowerCase();
    if (correct) {
      storage.session.set(STORAGE_KEYS.AUTH_UNLOCKED, true);
      set({ isUnlocked: true });
    }
    return correct;
  },

  lock: () => {
    storage.session.remove(STORAGE_KEYS.AUTH_UNLOCKED);
    set({ isUnlocked: false });
  },
}));
