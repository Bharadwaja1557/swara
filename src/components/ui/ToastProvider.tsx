/**
 * ToastProvider — renders the global toast stack.
 *
 * Mount once at the app root (inside AppLayout, outside any scroll container).
 * Toasts appear as a bottom-floating stack above the mini player / bottom nav.
 *
 * Design: Spotify/Tidal-inspired — dark pill, subtle icon, smooth slide-up.
 * No heavy animations. No user interaction required.
 */
import { useToastStore } from '@/store/useToastStore';
import type { ToastIcon } from '@/store/useToastStore';

// ── Icon map ──────────────────────────────────────────────────────────────────

const Icon = ({ type }: { type: ToastIcon }) => {
  const cls = 'flex-shrink-0';
  const props = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, className: cls };

  switch (type) {
    case 'heart':
      return <svg {...props} fill="currentColor" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
    case 'library':
      return <svg {...props}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
    case 'playlist':
      return <svg {...props}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
    case 'queue':
      return <svg {...props}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 5"/></svg>;
    case 'error':
      return <svg {...props} stroke="#ef4444"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
    case 'info':
      return <svg {...props} stroke="#60a5fa"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    default: // 'check'
      return <svg {...props} stroke="#4ade80"><polyline points="20 6 9 17 4 12"/></svg>;
  }
};

// ── Single toast pill ─────────────────────────────────────────────────────────

const ToastPill = ({ message, icon }: { message: string; icon?: ToastIcon }) => (
  <div
    className="flex items-center gap-2.5 px-4 py-2.5 rounded-full"
    style={{
      background: '#23232e',
      border: '1px solid rgba(255,255,255,0.09)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
      animation: 'toastIn 0.22s ease-out both',
      maxWidth: '88vw',
      width: 'max-content',
    }}
    role="status"
    aria-live="polite"
  >
    {icon && (
      <span className="text-swara-accent">
        <Icon type={icon} />
      </span>
    )}
    <p className="text-[0.85rem] font-medium text-swara-text leading-none">{message}</p>
  </div>
);

// ── Provider ──────────────────────────────────────────────────────────────────

export const ToastProvider = () => {
  const toasts = useToastStore((s) => s.toasts);

  if (!toasts.length) return null;

  return (
    <>
      {/* Keyframe injection — one global style tag, idempotent */}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      {/* Fixed stack — z-[100] sits above bottom sheets (z-[90]), fullscreen player
          (z-[60]), and mini player (z-[55]). pointer-events-none so it never blocks
          touches on content below. */}
      <div
        className="fixed left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' }}
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastPill key={t.id} message={t.message} icon={t.icon} />
        ))}
      </div>
    </>
  );
};
