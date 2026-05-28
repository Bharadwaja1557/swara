/**
 * src/version.ts — Single source of truth for the app version.
 *
 * VERSIONING RULES:
 *   - First digit (major): significant architectural changes or large feature additions
 *     e.g. queue architecture, playlist system, cloud sync
 *   - Second digit (minor): small features, bugfixes, UI refinements, polish passes
 *     e.g. search UX fixes, toast system, stats section, queue UX polish
 *
/**
 * src/version.ts — Single source of truth for the app version.
 *
 * VERSIONING RULES:
 *   - First digit (major): significant architectural changes or large feature additions
 *     e.g. queue architecture, playlist system, cloud sync
 *   - Second digit (minor): small features, bugfixes, UI refinements, polish passes
 *
 * CURRENT: 8.1
 *   8.x = Search + Playlist architecture
 *   .1  = Root-cause fix: full Playlist objects from searchPlaylists,
 *         getPlaylist enriched with creator/ownership fields,
 *         loadPlaylistTracks upserts missing playlists into store,
 *         upsertPlaylist store method, realtime covers saved playlists
 *
 * To update: change APP_VERSION here only. No other file needs to change.
 */
export const APP_VERSION = '8.1';
