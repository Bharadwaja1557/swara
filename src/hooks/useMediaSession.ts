'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { getAudioEngine } from '@/lib/audioEngine';

/**
 * Syncs the Media Session API with the current player state.
 * Enables lockscreen controls, notification player, and headphone buttons.
 */
export function useMediaSession() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const seek = usePlayerStore((s) => s.seek);
  const duration = usePlayerStore((s) => s.duration);
  const currentTime = usePlayerStore((s) => s.currentTime);

  // Update metadata when track changes
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    const artwork: MediaImage[] = currentTrack.albumCover
      ? [
          { src: currentTrack.albumCover, sizes: '512x512', type: 'image/webp' },
          { src: currentTrack.albumCover, sizes: '256x256', type: 'image/webp' },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artistsDisplay,
      album: currentTrack.albumTitle || '',
      artwork,
    });
  }, [currentTrack]);

  // Update playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Update position state
  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch {
      // setPositionState not supported in all browsers — ignore
    }
  }, [currentTime, duration]);

  // Register action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => togglePlay()],
      ['pause', () => togglePlay()],
      ['nexttrack', () => next()],
      ['previoustrack', () => prev()],
      [
        'seekto',
        (details) => {
          if (details.seekTime != null) seek(details.seekTime);
        },
      ],
      [
        'seekforward',
        (details) => {
          seek(getAudioEngine().getCurrentTime() + (details.seekOffset ?? 10));
        },
      ],
      [
        'seekbackward',
        (details) => {
          seek(getAudioEngine().getCurrentTime() - (details.seekOffset ?? 10));
        },
      ],
    ];

    handlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some actions not supported — ignore
      }
    });

    return () => {
      handlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore
        }
      });
    };
  }, [next, prev, togglePlay, seek]);
}
