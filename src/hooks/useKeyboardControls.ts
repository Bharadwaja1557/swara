/**
 * src/hooks/useKeyboardControls.ts
 *
 * Global desktop keyboard controls for Swara.
 *
 * ── SHORTCUTS ────────────────────────────────────────────────────────────────
 * macOS:           Windows/Linux:
 *   Space            Space         → play/pause
 *   Option+Right     Ctrl+Right    → next track
 *   Option+Left      Ctrl+Left     → previous track
 *   Option+Up        Ctrl+Up       → volume +10%
 *   Option+Down      Ctrl+Down     → volume -10%
 *
 * ── MODIFIER DETECTION ───────────────────────────────────────────────────────
 * We use event.altKey (Option on Mac) and event.ctrlKey (Ctrl on Win/Linux).
 * event.metaKey (⌘ on Mac) is intentionally NOT used — ⌘+arrow is a system
 * shortcut (beginning/end of line, spaces navigation) that we should never
 * override.
 *
 * Platform detection: navigator.platform.includes('Mac') is intentionally
 * avoided in favor of checking BOTH altKey and ctrlKey. This means the
 * shortcuts work regardless of OS misdetection and both modifier keys work
 * on both platforms as a bonus (Ctrl+Right works on Mac too).
 *
 * ── INPUT FOCUS PROTECTION ───────────────────────────────────────────────────
 * We check event.target before acting. If focus is on:
 *   - <input>           → skip (user is typing)
 *   - <textarea>        → skip
 *   - [contenteditable] → skip
 * This means the search bar, playlist title edit, and any other text field
 * is completely safe — no accidental playback control while typing.
 *
 * Space is additionally guarded: only fires on play/pause if the target
 * is NOT a button or link (those have their own Space/Enter semantics).
 * We also call preventDefault() on Space to stop the page from scrolling.
 *
 * ── LISTENER PLACEMENT ───────────────────────────────────────────────────────
 * Single listener on `document` (not `window`). This ensures:
 *   - It fires for ALL keyboard events regardless of which element has focus
 *   - It can be properly cleaned up via removeEventListener
 *   - It does not conflict with component-local handlers (those fire first
 *     via event bubbling and can call stopPropagation if needed)
 *
 * The hook is mounted once in AppLayout so it is active for the app's
 * entire authenticated session. It is cleaned up on unmount (logout).
 *
 * ── VOLUME STEP ──────────────────────────────────────────────────────────────
 * 0.1 (10% per keypress). Clamped to [0, 1] inside setAudioVolume.
 */
import { useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { setAudioVolume, getAudioVolume } from '@/store/playerStore';

const VOLUME_STEP = 0.1;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardControls() {
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next       = usePlayerStore((s) => s.next);
  const prev       = usePlayerStore((s) => s.prev);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore all keyboard events while a text field has focus
      if (isTypingTarget(e.target)) return;

      // Space → play/pause
      // Guard: not on buttons/links (they handle Space themselves)
      if (e.code === 'Space' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'button' || tag === 'a') return;
        e.preventDefault(); // prevent page scroll
        togglePlay();
        return;
      }

      // Arrow keys with Alt (macOS Option) or Ctrl (Windows/Linux)
      const withModifier = e.altKey || e.ctrlKey;
      if (!withModifier) return;

      switch (e.code) {
        case 'ArrowRight':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prev();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setAudioVolume(getAudioVolume() + VOLUME_STEP);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setAudioVolume(getAudioVolume() - VOLUME_STEP);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, next, prev]);
}
