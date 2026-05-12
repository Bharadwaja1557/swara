"use client";

import { create } from "zustand";
import { pickFourAlbumIndices } from "@/data/mockData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UIStore {
  /** Current 4 album indices shown in Explore Albums section */
  albumIndices: number[];

  /** Shuffle to a new set of 4 albums */
  shuffleAlbums: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIStore>((set, get) => ({
  // Initialize with a random selection on first load
  albumIndices: pickFourAlbumIndices(),

  shuffleAlbums: () => {
    const current = get().albumIndices;
    const next = pickFourAlbumIndices(current);
    set({ albumIndices: next });
  },
}));
