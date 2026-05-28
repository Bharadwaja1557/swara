/**
 * src/version.ts — Single source of truth for the app version.
 *
 * VERSIONING RULES:
 *   - First digit (major): significant architectural changes or large feature additions
 *     e.g. queue architecture, playlist system, cloud sync
 *   - Second digit (minor): small features, bugfixes, UI refinements, polish passes
 *     e.g. search UX fixes, toast system, stats section, queue UX polish
 *
 * CURRENT: 7.8
 *   7.x = UI/UX refinement passes
 *   .8  = Compact menu artwork, logout cleanup, recently played tile grid,
 *         artist page hero + album grid + similar artists section
 *
 * To update: change APP_VERSION here only. No other file needs to change.
 */
export const APP_VERSION = '7.8';
