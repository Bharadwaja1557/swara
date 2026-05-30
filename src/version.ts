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
 * CURRENT: 9.5
 *   9.x = Creator Platform
 *   .5  = Full avatar system: upload, resize/WebP, progress ring, cache-busting,
 *         UserAvatar component, avatars bucket, migration-010
 *
 * To update: change APP_VERSION here only. No other file needs to change.
 */
export const APP_VERSION = '9.5';
