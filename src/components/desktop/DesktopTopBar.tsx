/**
 * DesktopTopBar — desktop-only top navigation bar.
 * Left: swara logo  |  Center: home icon + search  |  Right: user icon
 *
 * Search behaviour:
 *   - Clicking the input from any page navigates to /search.
 *   - While on /search, typing updates useDesktopSearchStore, which SearchPage
 *     reads to render history / browse / results inside the main content area.
 *   - There is NO floating dropdown / popup. All results live in SearchPage.
 *   - useDesktopSearchStore is the single source of truth for the query value.
 */
import { useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDesktopSearchStore } from '@/store/useDesktopSearchStore';
import { useSearchHistoryStore } from '@/store/useSearchHistoryStore';

// ─── DesktopTopBar ────────────────────────────────────────────────────────────
const DesktopTopBar = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  // App uses HashRouter — check hash, not pathname
  const isSearchPage = location.hash.startsWith('#/search');

  // Store is the single source of truth: TopBar writes, SearchPage reads
  const query            = useDesktopSearchStore((s) => s.query);
  const setDesktopQuery  = useDesktopSearchStore((s) => s.setQuery);
  const clearDesktopQuery = useDesktopSearchStore((s) => s.clearQuery);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when landing on /search (covers click-from-other-page and
  // direct navigation via bottom nav / URL).
  useEffect(() => {
    if (!isSearchPage) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isSearchPage]);

  // Clear query when leaving /search so the bar resets for the next visit
  useEffect(() => {
    if (!isSearchPage) clearDesktopQuery();
  }, [isSearchPage, clearDesktopQuery]);

  const handleFocusOrClick = useCallback(() => {
    if (!isSearchPage) navigate('/search');
  }, [isSearchPage, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      useSearchHistoryStore.getState().push(query.trim());
    }
    if (e.key === 'Escape') {
      clearDesktopQuery();
      inputRef.current?.blur();
    }
  }, [query, clearDesktopQuery]);

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between gap-6 px-6 h-[59px] border-b z-40 relative"
      style={{ background: 'rgba(12,12,16,0.98)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}
    >
      {/* Logo */}
      <button type="button" onClick={() => navigate('/')}
        className="flex-shrink-0 text-[1.5rem] font-bold text-swara-accent tracking-[-0.04em] font-display hover:text-swara-accent-bright transition-colors">
        swara
      </button>

      {/* Center: home + search */}
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        {/* Home icon */}
        <button type="button" onClick={() => navigate('/')}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text transition-colors"
          aria-label="Home">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>

        {/* Search input — no dropdown, results render inside SearchPage */}
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-swara-muted pointer-events-none">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.75"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            ref={inputRef}
            type="search"
            placeholder="Search catalog…"
            value={query}
            onChange={(e) => setDesktopQuery(e.target.value)}
            onFocus={handleFocusOrClick}
            onClick={handleFocusOrClick}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl pl-9 pr-8 py-2 text-[0.9rem] text-swara-text placeholder:text-swara-dim focus:outline-none transition-all duration-200"
            style={{
              background: '#1e1e28',
              border: `1px solid ${isSearchPage ? 'rgba(200,169,106,0.35)' : 'rgba(255,255,255,0.07)'}`,
              cursor: 'text',
            }}
            autoComplete="off"
          />
          {query && isSearchPage && (
            <button
              type="button"
              onClick={() => { clearDesktopQuery(); inputRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-swara-muted hover:text-swara-text transition-colors"
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* User icon */}
      <button type="button" onClick={() => navigate('/profile')}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-swara-elevated border border-swara-border flex items-center justify-center text-swara-muted hover:text-swara-text transition-colors"
        aria-label="Profile">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM20.59 22c0-3.63-3.85-6.57-8.59-6.57S3.41 18.37 3.41 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </header>
  );
};

export default DesktopTopBar;
