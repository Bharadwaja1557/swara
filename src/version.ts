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
 * CURRENT: 9.4
 *   9.x = Creator Platform
 *   .4  = Fix TDZ crash: VOLUME_KEY/DEFAULT_VOL moved before usePlayerStore create();
 *         Fix manifest 404: relative icon paths for GitHub Pages /swara/ subpath
 *
 * To update: change APP_VERSION here only. No other file needs to change.
 */
export const APP_VERSION = '9.4';
