'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useAudio } from '@/hooks/useAudio';
import { useMediaSession } from '@/hooks/useMediaSession';
import { PassphraseGate } from './PassphraseGate';
import { BottomNav } from './BottomNav';
import { BottomPlayer } from './player/BottomPlayer';
import { FullPlayer } from './player/FullPlayer';
import { usePlayerStore } from '@/stores/playerStore';

// ─── PWA install prompt ─────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      setInstallPrompt(prompt);
      // Only show banner if user hasn't dismissed it before
      const dismissed = sessionStorage.getItem('swara:install-dismissed');
      if (!dismissed) setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    setShowBanner(false);
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'dismissed') {
      sessionStorage.setItem('swara:install-dismissed', '1');
    }
    setInstallPrompt(null);
  };

  const dismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('swara:install-dismissed', '1');
  };

  return { showBanner, install, dismiss };
}

// ─── Install banner ─────────────────────────────────────────────────────────

function InstallBanner({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-bg-elevated border-b border-border px-4 py-3 flex items-center gap-3 animate-slide-up pt-safe">
      <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 3v13M8 12l4 4 4-4M5 19h14" stroke="#4f8ef7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text">Add Swara to home screen</p>
        <p className="text-xs text-text-muted">For the best experience</p>
      </div>
      <button
        onClick={onInstall}
        className="text-xs font-semibold text-accent flex-shrink-0 active:opacity-70"
      >
        Add
      </button>
      <button
        onClick={onDismiss}
        className="text-xs text-text-muted flex-shrink-0 active:opacity-70"
        aria-label="Dismiss install banner"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Main app content ────────────────────────────────────────────────────────

function AppContent({ children }: { children: React.ReactNode }) {
  useAudio();
  useMediaSession();

  const fetchAlbums     = useLibraryStore((s) => s.fetchAlbums);
  const currentTrack    = usePlayerStore((s) => s.currentTrack);
  const isFullPlayerOpen = usePlayerStore((s) => s.isFullPlayerOpen);
  const { showBanner, install, dismiss } = usePWAInstall();

  // Hydrate library on mount
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchAlbums();
  }, [fetchAlbums]);

  const bottomPad = currentTrack
    ? 'calc(var(--player-height) + var(--nav-height) + var(--safe-bottom) + 8px)'
    : 'calc(var(--nav-height) + var(--safe-bottom) + 8px)';

  const topPad = showBanner ? '56px' : '0px';

  return (
    <div className="relative min-h-screen bg-bg">
      {/* PWA install banner */}
      {showBanner && <InstallBanner onInstall={install} onDismiss={dismiss} />}

      {/* Page content */}
      <main style={{ paddingBottom: bottomPad, paddingTop: topPad }}>
        {children}
      </main>

      {/* Fixed bottom chrome */}
      {currentTrack && <BottomPlayer />}
      <BottomNav hasPlayer={!!currentTrack} />

      {/* Fullscreen player overlay */}
      {isFullPlayerOpen && <FullPlayer />}
    </div>
  );
}

// ─── Root shell with auth gate ────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const isUnlocked = useAuthStore((s) => s.isUnlocked);
  const _hydrated  = useAuthStore((s) => s._hydrated);
  const hydrate    = useAuthStore((s) => s.hydrate);

  useEffect(() => { hydrate(); }, [hydrate]);

  // Show nothing until auth state is known — prevents flash of locked screen
  if (!_hydrated) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-accent animate-spin" />
      </div>
    );
  }

  if (!isUnlocked) return <PassphraseGate />;

  return <AppContent>{children}</AppContent>;
}
