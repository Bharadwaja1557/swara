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
 * CURRENT: 9.9
 *   9.x = Creator Platform
 *   .9  = Simplified preloader: single-slot, 50% trigger, no advance buffer,
 *         no promotion, no notifySwapComplete, no canplay chain
 *
 * To update: change APP_VERSION here only. No other file needs to change.
 */
export const APP_VERSION = '9.9';
