/**
 * ShuffleIcon — canonical reusable shuffle icon.
 *
 * Design: two curved crossing arrows.
 *   Upper arrow: bottom-left → top-right (complete curve + arrowhead)
 *   Lower arrow: top-left → bottom-right (split into two segments with a
 *     small visual gap at the crossing point — gives depth without looking
 *     broken. Gap is ~1.5 units wide centered at the intersection).
 *
 * Single source of truth used across:
 *   FullscreenPlayer, DesktopPlayer, DesktopNowPlaying, AlbumPage.
 * No props except size — colour and opacity are driven by parent via
 *   the `style` and className the caller wraps around it.
 */

interface ShuffleIconProps {
  /** Whether shuffle is active — controls opacity. Default false. */
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
    {/* ── Upper arrow: bottom-left → top-right ── */}
    <path d="M2 18 C7 18 17 6 22 6" />
    <polyline points="18 2 22 6 18 10" />

    {/* ── Lower arrow: top-left → bottom-right, gap at crossing ── */}
    {/* First half — stops just before the crossing point */}
    <path d="M2 6 C6 6 9 10 10.5 12" />
    {/* Second half — resumes just after the crossing point */}
    <path d="M13.5 13 C15.5 15.5 18 18 22 18" />
    <polyline points="18 14 22 18 18 22" />
  </svg>
);

export default ShuffleIcon;
