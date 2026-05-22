/**
 * BottomSheet — responsive overlay primitive.
 *
 * Mobile  → classic slide-up bottom sheet (existing behaviour, unchanged).
 * Desktop → centered floating panel with scale+fade entrance animation.
 *
 * The responsive switch uses useIsDesktop (>= 1024px).
 * Both variants share the same isOpen / onClose / children API so all
 * callers (TrackMenuSheet, PlaylistPickerSheet, ArtistPickerSheet) work
 * automatically with no prop changes needed.
 *
 * Desktop panel design:
 *   • 380px wide, max 68vh tall, rounded-2xl
 *   • Elevated surface (#1a1a24) with subtle border + deep shadow
 *   • Enter: scale(0.96)+opacity(0) → scale(1)+opacity(1) in 200ms
 *   • Backdrop closes on click (same as mobile)
 *   • No drag handle — it's a modal, not a sheet
 */
import { useEffect, useRef } from 'react';
import { useIsDesktop } from '@/hooks/useIsDesktop';

interface BottomSheetProps {
  isOpen:   boolean;
  onClose:  () => void;
  children: React.ReactNode;
}

const BottomSheet = ({ isOpen, onClose, children }: BottomSheetProps) => {
  const isDesktop = useIsDesktop();
  const mounted   = useRef(false);
  useEffect(() => { mounted.current = true; }, []);

  // ── Desktop: centered floating panel ────────────────────────────────────
  if (isDesktop) {
    return (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center"
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        role="dialog"
        aria-modal={isOpen}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          style={{ opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s ease' }}
          onClick={onClose}
        />
        {/* Floating panel */}
        <div
          className="relative rounded-2xl overflow-hidden flex flex-col"
          style={{
            background:   '#1a1a24',
            border:       '1px solid rgba(255,255,255,0.09)',
            boxShadow:    '0 24px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)',
            width:        '380px',
            maxHeight:    '68vh',
            transform:    isOpen ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
            opacity:      isOpen ? 1 : 0,
            transition:   'transform 0.2s cubic-bezier(0.32,0.72,0,1), opacity 0.18s ease',
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

  // ── Mobile: bottom sheet (original behaviour) ────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[90]"
      style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      aria-modal={isOpen}
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        style={{ opacity: isOpen ? 1 : 0, transition: 'opacity 0.28s ease' }}
        onClick={onClose}
      />
      {/* Sheet panel */}
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          background:  '#18181F',
          borderTop:   '1px solid rgba(255,255,255,0.07)',
          maxHeight:   '55vh',
          transform:   isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition:  'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
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
