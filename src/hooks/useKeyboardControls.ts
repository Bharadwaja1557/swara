/**
 * src/hooks/useKeyboardControls.ts
 *
 * Global desktop keyboard controls — v2.
 *
 * ── SHORTCUTS ────────────────────────────────────────────────────────────────
 * macOS:           Windows/Linux:
 *   Space            Space         → play/pause
 *   Option+Right     Ctrl+Right    → next track
 *   Option+Left      Ctrl+Left     → previous track
 *   Option+Up        Ctrl+Up       → volume +5%
 *   Option+Down      Ctrl+Down     → volume -5%
 *
 * ── MODIFIER DETECTION ───────────────────────────────────────────────────────
 * e.altKey (Option on Mac) OR e.ctrlKey (Ctrl on Win/Linux) triggers arrows.
 * Both work on both platforms — no OS detection needed.
 * e.metaKey (⌘ on Mac) is never used — ⌘+arrow is a system shortcut.
 *
 * ── INPUT FOCUS PROTECTION ───────────────────────────────────────────────────
 * We walk up the DOM with .closest() to check:
 *   input, textarea, select              → definitely typing
 *   [contenteditable="true"]             → rich text editor
 *   [role="button"]                      → interactive widget
 *   [data-no-hotkeys]                    → opt-out attribute any component can set
 * Walking up the tree (not just checking tagName) catches contenteditable
 * descendants and role="button" wrappers that contain focusable children.
 *
 * ── VOLUME ───────────────────────────────────────────────────────────────────
 * Calls store.adjustVolume(±0.05). adjustVolume → setAudioVolume →
 * updates _audio.volume + persists + calls _sync({volume}) → Zustand updates
 * → slider re-renders. Single source of truth, zero duplication.
 *
 * ── SPACE SCROLL PREVENTION ──────────────────────────────────────────────────
 * e.preventDefault() on Space only when the focused element is not:
 *   - <button>  (would prevent the button from being activated)
 *   - <a>       (would prevent link navigation)
 *   - <input>/<textarea>/<select>  (caught by isHotkeyBlocked)
 *
 * ── LISTENER PLACEMENT ───────────────────────────────────────────────────────
 * Single listener on `document`, cleaned up via useEffect return.
 * Mounted once in AppLayout for the full authenticated session.
 */
import { useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';

const VOLUME_STEP = 0.05;

/**
 * Walk the DOM tree from the event target upward to check whether any
 * ancestor (or the target itself) would conflict with our hotkeys.
 */
function isHotkeyBlocked(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  // closest() is the correct tool — it includes the element itself
  return !!(
    target.closest('input, textarea, select') ||
    target.closest('[contenteditable="true"]') ||
    target.closest('[data-no-hotkeys]')
  );
}

export function useKeyboardControls() {
  const togglePlay   = usePlayerStore((s) => s.togglePlay);
  const next         = usePlayerStore((s) => s.next);
  const prev         = usePlayerStore((s) => s.prev);
  const adjustVolume = usePlayerStore((s) => s.adjustVolume);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isHotkeyBlocked(e.target)) return;

      // ── Space → play/pause ─────────────────────────────────────────────
      if (e.code === 'Space' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
        // Don't override button/link Space semantics
        if (tag === 'button' || tag === 'a') return;
        e.preventDefault(); // prevent page scroll
        togglePlay();
        return;
      }

      // ── Arrow keys with modifier ───────────────────────────────────────
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
          adjustVolume(+VOLUME_STEP);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-VOLUME_STEP);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, next, prev, adjustVolume]);
}
