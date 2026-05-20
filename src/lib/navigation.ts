/**
 * src/lib/navigation.ts — Centralized route navigation helpers.
 *
 * All route strings live here. Components call these functions instead of
 * string-concatenating paths directly, so future route changes are one-line fixes.
 *
 * Works with HashRouter — all paths are relative (no leading #).
 * useNavigate() from react-router-dom handles the hash prefix internally.
 *
 * Usage:
 *   import { useNav } from '@/lib/navigation';
 *   const nav = useNav();
 *   nav.toAlbum(album.id);
 */
import { useNavigate } from 'react-router-dom';
import { useCallback }  from 'react';
import { usePlayerStore } from '@/store/playerStore';

// ── Raw route builders (use these when you already have a NavigateFn) ─────────

export const routes = {
  home:     ()          => '/',
  search:   ()          => '/search',
  library:  ()          => '/library',
  liked:    ()          => '/liked',
  profile:  ()          => '/profile',
  queue:    ()          => '/queue',
  album:    (id: string) => `/album/${id}`,
  artist:   (id: string) => `/artist/${id}`,
  playlist: (id: string) => `/playlist/${id}`,   // future
} as const;

// ── Hook: returns typed navigation helpers bound to useNavigate ───────────────

export function useNav() {
  const navigate = useNavigate();

  return {
    toHome:    useCallback(() => navigate(routes.home()),          [navigate]),
    toSearch:  useCallback(() => navigate(routes.search()),        [navigate]),
    toLibrary: useCallback(() => navigate(routes.library()),       [navigate]),
    toLiked:   useCallback(() => navigate(routes.liked()),         [navigate]),
    toProfile: useCallback(() => navigate(routes.profile()),       [navigate]),

    toAlbum:   useCallback((id: string) => navigate(routes.album(id)),   [navigate]),
    toArtist:  useCallback((id: string) => navigate(routes.artist(id)),  [navigate]),
    toPlaylist: useCallback((id: string) => navigate(routes.playlist(id)), [navigate]),

    back: useCallback(() => navigate(-1),                          [navigate]),

    /** Navigate to album, collapsing the fullscreen player first. */
    toAlbumFromPlayer: useCallback((id: string, delay = 300) => {
      usePlayerStore.getState().setExpanded(false);
      setTimeout(() => navigate(routes.album(id)), delay);
    }, [navigate]),

    /** Navigate to artist, collapsing the fullscreen player first. */
    toArtistFromPlayer: useCallback((id: string, delay = 300) => {
      usePlayerStore.getState().setExpanded(false);
      setTimeout(() => navigate(routes.artist(id)), delay);
    }, [navigate]),
  } as const;
}
