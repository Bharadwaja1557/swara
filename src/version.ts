/**
 * src/version.ts — Single source of truth for the app version.
 *
 * VERSIONING RULES:
 *   - First digit (major): significant architectural changes or large feature additions
 *     e.g. queue architecture, playlist system, cloud sync
 *   - Second digit (minor): small features, bugfixes, UI refinements, polish passes
 *     e.g. search UX fixes, toast system, stats section, queue UX polish
 *
 * CURRENT: 4.0
 *   4.x = Stabilization pass
 *   .0  = Playback invariants, persistence versioning, menu unification
 *
 * To update: change APP_VERSION here only. No other file needs to change.
 */
export const APP_VERSION = '4.0';
