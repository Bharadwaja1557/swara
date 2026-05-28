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
 * CURRENT: 8.2
 *   8.x = Search + Playlist architecture
 *   .2  = Profile resolution audit: centralized resolveCreatorUsernames(),
 *         profiles RLS fixed (SELECT open to all authenticated users),
 *         auth trigger for auto profile creation, backfill migration,
 *         eliminated 'unknown' / UUID-fragment fallbacks everywhere
 *
 * To update: change APP_VERSION here only. No other file needs to change.
 */
export const APP_VERSION = '8.2';
