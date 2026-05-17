/**
 * ScrollRestorer — scrolls the main content column to top on every navigation.
 *
 * Both mobile (<main id="main-content">) and desktop (<main id="main-content">)
 * use the same ID, so a single querySelector finds the right element.
 *
 * Renders nothing — pure side-effect component.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollRestorer = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const el = document.getElementById('main-content');
    if (el) el.scrollTop = 0;
  }, [pathname]);

  return null;
};
