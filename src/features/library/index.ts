/**
 * src/features/library/index.ts
 *
 * Library Domain — public API.
 *
 * Import library concerns from here, not from scattered store paths.
 * This barrel also documents the full scope of what "the Library" manages.
 *
 * ┌─────────────────────────────────────────────────────┐
 * │               LIBRARY DOMAIN                        │
 * │                                                     │
 * │  playlists        usePlaylistStore                  │
 * │  folders          useFolderStore                    │
 * │  favorite artists useFavoriteArtistsStore           │
 * │  liked tracks     useLikedStore                     │
 * │  user albums      useUserLibraryStore               │
 * │  UI preferences   useLibraryPrefsStore              │
 * │  sorting utils    playlistSort                      │
 * │  offline          resolveTrackSource                │
 * └─────────────────────────────────────────────────────┘
 *
 * FUTURE ADDITIONS (not yet implemented):
 *   downloads         useDownloadStore     — offline track management
 *   recents           already in playerStore.recentSongs
 *   pinned            usePinnedStore       — pinned items at top of library
 *   smart playlists   useSmartPlaylistStore
 */

// UI preferences
export { useLibraryPrefsStore }           from '@/store/useLibraryPrefsStore';
export type { LibraryPrefs, LibrarySortMode, LibraryViewMode, LibraryTab }
                                          from '@/store/useLibraryPrefsStore';

// Folders
export { useFolderStore }                 from '@/store/useFolderStore';
export type { PlaylistFolder }            from '@/store/useFolderStore';

// Favorite artists
export { useFavoriteArtistsStore }        from '@/store/useFavoriteArtistsStore';
export type { FavoriteArtist }            from '@/store/useFavoriteArtistsStore';

// Renderables pipeline
export { buildRenderables }               from '@/lib/libraryRenderables';
export type { LibraryRenderable, LibraryEntityType }
                                          from '@/lib/libraryRenderables';

// Sorting
export { sortPlaylistsByRecency }         from '@/features/playlists/playlistSort';
