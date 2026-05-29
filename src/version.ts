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
 * CURRENT: 9.0
 *   9.x = Creator Platform
 *   .0  = 3-theme system (dark/semi-dark/light), PublicUserPage (/user/:username),
 *         ProfilePage dashboard+stats+refresh, CreatorLink component, slug URLs,
 *         soft-delete playlists, PlaylistArtwork memory cache
 *
 * To update: change APP_VERSION here only. No other file needs to change.
 */
export const APP_VERSION = '9.0';
