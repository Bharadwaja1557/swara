import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initTheme } from '@/store/useThemeStore';
import { initCapacitor } from '@/lib/capacitor';

// Apply saved theme before first paint — prevents flash
initTheme();

// Initialise Capacitor integrations (back button, status bar).
// No-op on web — all native calls are guarded inside initCapacitor().
initCapacitor();

const root = document.getElementById('root');

if (!root) {
  throw new Error('[Swara] Root element #root not found in DOM.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
