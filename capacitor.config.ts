import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for Swara.
 *
 * webDir points to the Vite output directory.
 * The Android build uses `npm run build:android` (mode=android, base="/")
 * so that all asset paths resolve correctly inside the WebView.
 *
 * server.androidScheme = 'https' ensures the WebView runs under
 * https://localhost rather than http://localhost. This is required for:
 *   - Supabase auth (secure cookies / localStorage same-origin behaviour)
 *   - Modern Web Crypto API availability (subtle crypto needs a secure context)
 *   - Parity with how Capacitor 6+ initialises WebViews by default
 */
const config: CapacitorConfig = {
  appId: 'com.swara.app',
  appName: 'Swara',
  webDir: 'dist',

  android: {
    // Minimum API level 22 (Android 5.1) — covers 99%+ of active devices.
    // m4a/AAC audio is supported from API 16+, so no audio concerns here.
    minWebViewVersion: 60,
  },

  server: {
    // Use https scheme so localStorage, Supabase auth, and Web Crypto work
    // identically to a real HTTPS origin. No cleartext traffic is involved —
    // 'https' here refers only to the local WebView scheme, not a remote server.
    androidScheme: 'https',
  },

  plugins: {
    StatusBar: {
      // Match the app's near-black background; prevents a white flash on launch.
      backgroundColor: '#09090C',
      style: 'DARK',
      // false = status bar occupies its own space; the WebView starts below it.
      // This prevents app content from rendering underneath the notification bar.
      overlaysWebView: false,
    },
  },
};

export default config;
