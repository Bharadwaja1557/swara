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

export const useUIStore = create<UIStore>((set) => ({
  // Initialize with deterministic selection
  albumIndices: pickFourAlbumIndices(),

  shuffleAlbums: () => {
    const next = pickFourAlbumIndices();
    set({ albumIndices: next });
  },
}));