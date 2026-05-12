import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import HomePage from '@/pages/HomePage';
import SearchPage from '@/pages/SearchPage';
import LibraryPage from '@/pages/LibraryPage';

/**
 * App
 *
 * Sets up client-side routing with React Router v6.
 *
 * Route tree:
 *   /             → AppLayout
 *     /           → HomePage
 *     /search     → SearchPage
 *     /library    → LibraryPage
 *     *           → redirect to /
 */
const App = () => {
  return (
    <HashRouter>
      <Routes>
        {/* All routes share the persistent AppLayout (with BottomNav) */}
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
          {/* Catch-all: redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
