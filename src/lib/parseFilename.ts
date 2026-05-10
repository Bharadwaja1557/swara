import type { ParsedFilename } from '@/types';

/**
 * Parse a Swara m4a filename into structured metadata.
 *
 * Format:  TRACK--SINGERS--TITLE.m4a
 * Example: 01--Arijit_Singh+Shreya_Ghoshal--Tum_Hi_Ho.m4a
 *
 * Rules:
 *   "_"  → space (in names and title)
 *   "+"  → multiple artist separator
 *   "."  → preserved as-is (e.g. A.R. Rahman)
 *   "-"  → preserved as-is (e.g. K-Pop, mid-word hyphens)
 *   "--" → segment separator ONLY (two hyphens)
 */

/**
 * Reconstruct a human-readable name from a filename segment.
 * Only replaces underscores with spaces; preserves all other chars.
 */
function decodeSegment(segment: string): string {
  // Replace underscores with spaces, but preserve consecutive underscores
  // as multiple spaces only if that was intentional (rare edge case, handle gracefully)
  return segment.replace(/_/g, ' ').trim();
}

/**
 * Parse the SINGERS segment (may contain "+" for multiple artists).
 * Each artist name has underscores decoded.
 * Examples:
 *   "Arijit_Singh"                    → ["Arijit Singh"]
 *   "Arijit_Singh+Shreya_Ghoshal"     → ["Arijit Singh", "Shreya Ghoshal"]
 *   "A.R_Rahman"                      → ["A.R Rahman"]
 *   "Sid_Sriram+Anurag_Kulkarni"      → ["Sid Sriram", "Anurag Kulkarni"]
 */
function parseArtists(singersSegment: string): string[] {
  if (!singersSegment) return ['Unknown Artist'];

  return singersSegment
    .split('+')
    .map((a) => decodeSegment(a))
    .filter(Boolean);
}

/**
 * Format artists array to display string.
 * ["Arijit Singh", "Shreya Ghoshal"] → "Arijit Singh, Shreya Ghoshal"
 */
export function formatArtistsDisplay(artists: string[]): string {
  if (artists.length === 0) return 'Unknown Artist';
  if (artists.length === 1) return artists[0];
  if (artists.length === 2) return artists.join(' & ');
  return artists.slice(0, -1).join(', ') + ' & ' + artists[artists.length - 1];
}

/**
 * Parse a filename (with or without .m4a extension) into structured data.
 *
 * Returns a default object if parsing fails — never throws.
 */
export function parseFilename(filename: string): ParsedFilename {
  // Strip extension
  const base = filename.replace(/\.m4a$/i, '');

  // Split on "--" (double hyphen = segment separator)
  const parts = base.split('--');

  if (parts.length < 3) {
    // Malformed filename — return best-effort defaults
    console.warn(`[swara] Could not parse filename: "${filename}"`);
    return {
      trackNumber: 0,
      artists: ['Unknown Artist'],
      artistsDisplay: 'Unknown Artist',
      title: decodeSegment(base) || filename,
    };
  }

  // parts[0] = track number (e.g. "01", "12")
  const trackNumber = parseInt(parts[0], 10) || 0;

  // parts[1] = singers segment
  const artists = parseArtists(parts[1]);
  const artistsDisplay = formatArtistsDisplay(artists);

  // parts[2..] = title (join remaining with "--" in case title had "--" in it)
  // This is an edge case but we handle it gracefully
  const titleRaw = parts.slice(2).join('--');
  const title = decodeSegment(titleRaw) || 'Unknown Title';

  return { trackNumber, artists, artistsDisplay, title };
}

/**
 * Build a stable track ID from albumId and track number.
 */
export function buildTrackId(albumId: string, trackNumber: number): string {
  return `${albumId}:${String(trackNumber).padStart(3, '0')}`;
}

/**
 * Extract just the base filename from a URL or full path.
 */
export function filenameFromUrl(url: string): string {
  return url.split('/').pop() || url;
}
