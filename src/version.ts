/**
 * src/version.ts — Single source of truth for the app version.
 *
 * VERSIONING RULES:
 *   - First digit (major): significant architectural changes or large feature additions
 *     e.g. queue architecture, playlist system, cloud sync
 *   - Second digit (minor): small features, bugfixes, UI refinements, polish passes
 *     e.g. search UX fixes, toast system, stats section, queue UX polish
 *
 * CURRENT: 3.6
 *   3.x = Queue Architecture phase
 *   .6  = QueuePage mobile architecture rewrite — fixed inset-0 sheet,
 *          own scroll container, identical compositor model to FullscreenPlayer
 *
 * To update: change APP_VERSION here only. No other file needs to change.
 */
export const APP_VERSION = '3.6';
