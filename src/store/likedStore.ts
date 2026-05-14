import { create } from 'zustand';
import type { Track } from '@/types/music';

const KEY = 'swara_liked';

function load(): Record<string, Track> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}
function save(data: Record<string, Track>) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

interface LikedState {
  liked: Record<string, Track>; // trackId → Track
  isLiked: (id: string) => boolean;
  toggleLike: (track: Track) => boolean; // returns new liked state
  getLikedTracks: () => Track[];
}

export const useLikedStore = create<LikedState>((set, get) => ({
  liked: load(),
  isLiked: (id) => !!get().liked[id],
  toggleLike: (track) => {
    const liked = { ...get().liked };
    const wasLiked = !!liked[track.id];
    if (wasLiked) { delete liked[track.id]; }
    else { liked[track.id] = track; }
    save(liked);
    set({ liked });
    return !wasLiked;
  },
  getLikedTracks: () => Object.values(get().liked),
}));
