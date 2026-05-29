import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initTheme } from '@/store/useThemeStore';

// Apply saved theme before first paint — prevents flash
initTheme();

const root = document.getElementById('root');

if (!root) {
  throw new Error('[Swara] Root element #root not found in DOM.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
