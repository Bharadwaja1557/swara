/**
 * src/lib/playlistSlug.ts
 *
 * Centralized playlist URL slug utilities.
 *
 * DESIGN: Slug is cosmetic ONLY. The playlist ID remains canonical.
 * Route: /playlist/:id/:slug?
 *   - :id    is required for resolution
 *   - :slug  is optional / decorative; wrong slug still loads the playlist
 *
 * PlaylistPage reads only :id and replaces the URL with the correct slug
 * after load. This way shared links always normalize.
 */

/**
 * Convert a playlist title to a URL-safe slug.
 * Handles Unicode, diacritics, and special chars gracefully.
 * Examples:
 *   "Chill Telugu Nights"        →  "chill-telugu-nights"
 *   "Top 10 Songs! (2024)"       →  "top-10-songs-2024"
 *   "AR Rahman — Best"           →  "ar-rahman-best"
 */
export function slugifyPlaylistTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')                        // decompose diacritics
    .replace(/[\u0300-\u036f]/g, '')         // strip combining diacritics
    .replace(/[^a-z0-9\s-]/g, '')           // keep only alphanum + spaces + hyphens
    .trim()
    .replace(/\s+/g, '-')                   // spaces → hyphens
    .replace(/-{2,}/g, '-')                 // collapse multiple hyphens
    .slice(0, 60);                           // max length for aesthetics
}

/**
 * Build the canonical playlist route for navigation.
 * Example: playlistRoute('abc-123', 'Chill Telugu Nights')
 *          → '/playlist/abc-123/chill-telugu-nights'
 */
export function playlistRoute(id: string, title: string): string {
  const slug = slugifyPlaylistTitle(title);
  return slug ? `/playlist/${id}/${slug}` : `/playlist/${id}`;
}
