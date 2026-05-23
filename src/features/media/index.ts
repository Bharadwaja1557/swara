/**
 * src/features/media/index.ts
 *
 * Public API for the media feature domain.
 * Import from here, not from sub-files.
 */
export { mediaLogger }                                 from './mediaLogger';
export { canBrowserPlay }                              from './canBrowserPlay';
export { classifyMediaError, MEDIA_ERROR_MESSAGES }    from './mediaErrors';
export type { MediaErrorCode }                         from './mediaErrors';
export {
  resolveLibraryUrl,
  resolveAlbumJsonUrl,
  resolveAudioUrl,
  resolveCoverUrl as resolveMediaCoverUrl,
  ACTIVE_PROVIDER,
}                                                      from './mediaProvider';
