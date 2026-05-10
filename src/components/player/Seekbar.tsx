'use client';

import { useState, useCallback, ChangeEvent } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface SeekbarProps {
  showTimes?: boolean;
  className?: string;
}

export function Seekbar({ showTimes = true, className = '' }: SeekbarProps) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);

  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  const displayTime = dragging ? dragValue : currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setDragValue(val);
    },
    [],
  );

  const handleMouseDown = useCallback(() => {
    setDragging(true);
    setDragValue(currentTime);
  }, [currentTime]);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
      setDragging(false);
      const val = dragValue;
      seek(val);
    },
    [dragValue, seek],
  );

  return (
    <div className={`w-full flex flex-col gap-1 ${className}`}>
      <div className="relative w-full h-8 flex items-center group">
        {/* Progress track */}
        <div className="absolute left-0 right-0 h-1 rounded-full bg-border overflow-hidden pointer-events-none">
          <div
            className="h-full rounded-full bg-accent transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Range input */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={displayTime}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp as React.MouseEventHandler<HTMLInputElement>}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp as React.TouchEventHandler<HTMLInputElement>}
          className="seekbar relative z-10"
          style={{
            background: 'transparent',
          }}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={displayTime}
        />
      </div>

      {showTimes && (
        <div className="flex justify-between text-text-muted text-2xs font-mono tabular-nums">
          <span>{formatTime(displayTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </div>
  );
}
