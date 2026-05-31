/**
 * src/lib/capacitor.ts
 *
 * Thin wrapper around Capacitor platform utilities.
 *
 * PURPOSE
 * ───────
 * 1. isNative()     — guard that makes every Capacitor call a no-op on web.
 * 2. initCapacitor() — called once from main.tsx.
 *    • Registers the Android hardware back-button handler.
 *    • Applies StatusBar styling on Android.
 *
 * BACK BUTTON BEHAVIOUR (Android)
 * ────────────────────────────────
 * Without a handler, pressing the Android back button on the root route
 * closes the app immediately (Capacitor default). With this handler:
 *   • If there is browser history  → go back (mirrors web browser behaviour).
 *   • If at the root (no history)  → exit the app via App.exitApp().
 *
 * All Capacitor imports are dynamic so this module is a no-op in the web
 * build — the dynamic import() is never reached when !isNative().
 * This keeps the web bundle free of any Capacitor runtime overhead.
 */

import { Capacitor } from '@capacitor/core';

/** True when running inside a Capacitor native shell (iOS or Android). */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** True when running specifically on Android. */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Initialise Capacitor integrations.
 * Safe to call on web — all native calls are guarded by isNative().
 * Call once from main.tsx before React renders.
 */
export async function initCapacitor(): Promise<void> {
  if (!isNative()) return;

  // ── Android back button ─────────────────────────────────────────────────
  // Dynamic import keeps @capacitor/app out of the web bundle's critical path.
  const { App } = await import('@capacitor/app');

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  // ── StatusBar ────────────────────────────────────────────────────────────
  // Ensure the status bar style is correct regardless of system theme.
  // The backgroundColor is also set in capacitor.config.ts (applied at
  // launch before JS runs), but we re-apply here for robustness.
  if (isAndroid()) {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#09090C' });
    } catch {
      // StatusBar can throw on some emulators — fail silently.
    }
  }
}
