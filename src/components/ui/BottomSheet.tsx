import { useEffect, useRef } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const BottomSheet = ({ isOpen, onClose, children }: BottomSheetProps) => {
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);

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
          background: '#18181F',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          maxHeight: '55vh',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
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
