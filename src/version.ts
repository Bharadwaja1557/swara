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
 * CURRENT: 8.0
 *   8.x = Search + Playlist architecture
 *   .0  = Entity-based search history, browse layout refinement,
 *         playlist search results, shared playlist architecture
 *         (reference-model saves, creator attribution, save/unsave)
 *
 * To update: change APP_VERSION here only. No other file needs to change.
 */
export const APP_VERSION = '8.0';
