'use client';

import { useEffect, useRef } from 'react';
import { getAudioEngine } from '@/lib/audioEngine';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';

/**
 * Mounts the audio engine event listener once at the app root.
 * Bridges HTMLAudioElement events → Zustand playerStore state.
 *
 * Uses refs for values that change frequently to avoid stale closures
 * without re-creating the engine subscription.
 */
export function useAudio() {
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration    = usePlayerStore((s) => s.setDuration);
  const setIsPlaying   = usePlayerStore((s) => s.setIsPlaying);
  const setIsLoading   = usePlayerStore((s) => s.setIsLoading);
  const next           = usePlayerStore((s) => s.next);

  // Ref so engine listener always has latest addRecentlyPlayed
  const addRecentRef     = useRef(useLibraryStore.getState().addRecentlyPlayed);
  const recentAddedRef   = useRef(false);
  const prevTrackIdRef   = useRef<string | null>(null);

  // Keep addRecentRef in sync
  useEffect(() => {
    const unsub = useLibraryStore.subscribe((s) => {
      addRecentRef.current = s.addRecentlyPlayed;
    });
    return unsub;
  }, []);

  // Reset recentAdded flag when track changes
  useEffect(() => {
    const unsub = usePlayerStore.subscribe((s) => {
      const id = s.currentTrack?.id ?? null;
      if (id !== prevTrackIdRef.current) {
        prevTrackIdRef.current = id;
        recentAddedRef.current = false;
      }
    });
    return unsub;
  }, []);

  // Mount audio engine listener once
  useEffect(() => {
    const engine = getAudioEngine();

    const unsub = engine.on('*', (payload) => {
      switch (payload.type) {
        case 'timeupdate': {
          setCurrentTime(payload.currentTime);
          if (!recentAddedRef.current && payload.currentTime > 10) {
            const track = usePlayerStore.getState().currentTrack;
            if (track) {
              addRecentRef.current(track);
              recentAddedRef.current = true;
            }
          }
          break;
        }
        case 'durationchange':
          setDuration(payload.duration);
          break;
        case 'play':
          setIsPlaying(true);
          setIsLoading(false);
          break;
        case 'pause':
          setIsPlaying(false);
          break;
        case 'waiting':
          setIsLoading(true);
          break;
        case 'canplay':
          setIsLoading(false);
          break;
        case 'ended':
          setIsPlaying(false);
          recentAddedRef.current = false;
          next();
          break;
        case 'error':
          setIsPlaying(false);
          setIsLoading(false);
          console.error('[swara] Audio error:', payload.error);
          break;
      }
    });

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
