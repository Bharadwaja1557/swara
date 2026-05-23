/**
 * src/features/artwork/index.ts
 *
 * Public API for the artwork feature domain.
 *
 * All consumers import from here — never from sub-files directly.
 * This lets us refactor internals without touching every import site.
 *
 * FUTURE additions (when ready):
 *   export { useDominantColor }  from './useDominantColor';
 *   export { BlurredBackdrop }   from './BlurredBackdrop';
 */

export { default as PlaylistArtwork }    from './PlaylistArtwork';
export { resolvePlaylistArtwork }        from './resolvePlaylistArtwork';
export { getUniqueCoverUrls }            from './resolvePlaylistArtwork';
export type {
  PlaylistArtworkResult,
  PlaylistArtworkType,
} from './resolvePlaylistArtwork';
