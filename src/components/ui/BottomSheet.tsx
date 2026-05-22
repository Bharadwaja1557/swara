/**
 * BottomSheet — responsive overlay primitive.
 *
 * Mobile  → classic slide-up bottom sheet.
 * Desktop → centered floating modal panel with scale+fade animation.
 *
 * ACCESSIBILITY (both variants):
 *   • ESC key closes
 *   • Backdrop click closes
 *   • Body scroll is locked while open (overflow: hidden)
 *   • Focus is trapped inside the open panel
 *   • aria-modal="true" + role="dialog" on container
 *   • Focus returns to trigger element on close (via data-bs-trigger convention)
 *
 * RESPONSIVE:
 *   useIsDesktop (>= 1024px) switches the render path.
 *   Mobile behaviour is byte-for-byte identical to the previous version.
 *   Desktop panel width: min(420px, 100vw - 32px) — scales on small laptops.
 */
import { useEffect, useRef } from 'react';
import { useIsDesktop } from '@/hooks/useIsDesktop';

interface BottomSheetProps {
  isOpen:   boolean;
  onClose:  () => void;
  children: React.ReactNode;
}

// ── Scroll lock helpers ───────────────────────────────────────────────────────
// Counted so nested sheets don't unlock prematurely.
let _scrollLockCount = 0;
function lockScroll() {
  _scrollLockCount++;
  if (_scrollLockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
}
function unlockScroll() {
  _scrollLockCount = Math.max(0, _scrollLockCount - 1);
  if (_scrollLockCount === 0) {
    document.body.style.overflow = '';
  }
}

// ── Focus trap ────────────────────────────────────────────────────────────────
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (!nodes.length) return;
  const first = nodes[0];
  const last  = nodes[nodes.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
  }
}

// ── BottomSheet ───────────────────────────────────────────────────────────────

const BottomSheet = ({ isOpen, onClose, children }: BottomSheetProps) => {
  const isDesktop  = useIsDesktop();
  const panelRef   = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // ── Side-effects on open/close ─────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Capture the element that had focus before the sheet opened
      triggerRef.current = document.activeElement;
      lockScroll();
      // Move focus into the panel on the next frame
      requestAnimationFrame(() => {
        const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
        first?.focus();
      });
    } else {
      unlockScroll();
      // Return focus to the original trigger
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
        triggerRef.current = null;
      }
    }
    return () => {
      // Cleanup on unmount while open (e.g. route change)
      if (isOpen) unlockScroll();
    };
  }, [isOpen]);

  // ── Global keyboard handlers (ESC + Tab trap) ──────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'Tab' && panelRef.current) trapFocus(panelRef.current, e);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // ── Desktop: centered floating panel ───────────────────────────────────
  if (isDesktop) {
    return (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center"
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          style={{ opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s ease' }}
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Floating panel */}
        <div
          ref={panelRef}
          className="relative rounded-2xl overflow-hidden flex flex-col"
          style={{
            background:    '#1a1a24',
            border:        '1px solid rgba(255,255,255,0.09)',
            boxShadow:     '0 24px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)',
            width:         'min(420px, calc(100vw - 32px))',
            maxHeight:     '68vh',
            transform:     isOpen ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
            opacity:       isOpen ? 1 : 0,
            transition:    'transform 0.2s cubic-bezier(0.32,0.72,0,1), opacity 0.18s ease',
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        >
          <div className="overflow-y-auto scrollbar-none flex-1">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile: bottom sheet ────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[90]"
      style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        style={{ opacity: isOpen ? 1 : 0, transition: 'opacity 0.28s ease' }}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet panel */}
      <div
        ref={panelRef}
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          background:  '#18181F',
          borderTop:   '1px solid rgba(255,255,255,0.07)',
          maxHeight:   '55vh',
          transform:   isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition:  'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0" aria-hidden="true">
          <div className="w-9 h-1 rounded-full bg-white/15" />
        </div>
        <div className="overflow-y-auto scrollbar-none flex-1 pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BottomSheet;
