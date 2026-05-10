'use client';

import { useState, useCallback } from 'react';
import { storage } from '@/lib/storage';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() =>
    storage.get<T>(key, initialValue),
  );

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const newValue = value instanceof Function ? value(storedValue) : value;
      storage.set(key, newValue);
      setStoredValue(newValue);
    },
    [key, storedValue],
  );

  return [storedValue, setValue] as const;
}
