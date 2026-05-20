/**
 * src/version.ts — Single source of truth for the app version.
 *
 * VERSIONING RULES:
 *   - First digit (major): significant architectural changes or large feature additions
 *     e.g. queue architecture, playlist system, cloud sync
 *   - Second digit (minor): small features, bugfixes, UI refinements, polish passes
 *     e.g. search UX fixes, toast system, stats section
 *
 * CURRENT: 3.1
 *   3.x = Queue Architecture phase
 *   .1  = initial release of this phase
 *
 * To update: change APP_VERSION here only. No other file needs to change.
 */
export const APP_VERSION = '3.1';
