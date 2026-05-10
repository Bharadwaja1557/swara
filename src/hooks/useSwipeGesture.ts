'use client';

import { useRef, useCallback } from 'react';

interface SwipeOptions {
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  threshold?: number;   // px to trigger swipe (default: 80)
}

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function useSwipeGesture({
  onSwipeDown,
  onSwipeUp,
  threshold = 80,
}: SwipeOptions): SwipeHandlers {
  const startY = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? null;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (startY.current === null) return;
      const endY = e.changedTouches[0]?.clientY ?? 0;
      const delta = endY - startY.current;

      if (delta > threshold && onSwipeDown) {
        onSwipeDown();
      } else if (delta < -threshold && onSwipeUp) {
        onSwipeUp();
      }

      startY.current = null;
    },
    [onSwipeDown, onSwipeUp, threshold],
  );

  return { onTouchStart, onTouchEnd };
}
