/**
 * ShuffleIcon — canonical reusable shuffle icon.
 *
 * Design: two straight crossing diagonals — clean, geometric, Spotify-like.
 *
 *   Upper arrow: (2,17) → (22,7)  — diagonal going up-right, arrowhead at right end.
 *   Lower arrow: (2,7) → (22,17)  — diagonal going down-right, split into two
 *     segments with a ~4-unit gap centred on the crossing point (12,12).
 *     The gap makes the lower path appear to pass UNDER the upper arrow,
 *     giving clear visual depth without breaking the shape.
 *
 * Straight L paths (no cubic curves) produce sharp, readable geometry
 * at all sizes from 16px to 24px.
 *
 * Single source of truth used across:
 *   FullscreenPlayer, DesktopPlayer, DesktopNowPlaying, AlbumPage.
 * Colour and opacity are controlled by the parent via className / style.
 */

interface ShuffleIconProps {
  /** Whether shuffle is active — drives opacity. Default false. */
  active?: boolean;
  /** Rendered size in px. Default 20. */
  size?: number;
}

const ShuffleIcon = ({ active = false, size = 20 }: ShuffleIconProps) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: active ? 1 : 0.45 }}
    aria-hidden="true"
  >
    {/* Upper arrow — straight diagonal, bottom-left → top-right */}
    <path d="M2 17 L22 7" />
    <polyline points="17 4 22 7 17 10" />

    {/* Lower arrow — straight diagonal, top-left → bottom-right.
        Split into two segments; gap centred on the (12,12) crossing point
        so the lower path reads as passing beneath the upper arrow. */}
    <path d="M2 7 L10 11" />
    <path d="M14 13 L22 17" />
    <polyline points="17 14 22 17 17 20" />
  </svg>
);

export default ShuffleIcon;

