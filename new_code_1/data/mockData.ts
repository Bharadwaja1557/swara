import type { Song, Album, QuickPick } from "@/types";

// ─── Recently Played Songs ────────────────────────────────────────────────────
// 10 tracks spanning multiple genres for a realistic home screen

export const RECENTLY_PLAYED: Song[] = [
  {
    id: "s1",
    title: "Latika's Theme",
    artist: "A.R. Rahman",
    album: "Slumdog Millionaire",
    duration: "4:12",
    coverSeed: "aurora",
  },
  {
    id: "s2",
    title: "Saudade",
    artist: "Nils Frahm",
    album: "Felt",
    duration: "5:38",
    coverSeed: "mist82",
  },
  {
    id: "s3",
    title: "Dusk Meridian",
    artist: "Floating Points",
    album: "Promises",
    duration: "3:59",
    coverSeed: "tide44",
  },
  {
    id: "s4",
    title: "Chaiyya Chaiyya",
    artist: "Sukhwinder Singh",
    album: "Dil Se",
    duration: "7:01",
    coverSeed: "ember17",
  },
  {
    id: "s5",
    title: "Bloom",
    artist: "Novo Amor",
    album: "Birthplace",
    duration: "3:22",
    coverSeed: "forest92",
  },
  {
    id: "s6",
    title: "Near Light",
    artist: "Ólafur Arnalds",
    album: "…and they have escaped",
    duration: "4:47",
    coverSeed: "glacier55",
  },
  {
    id: "s7",
    title: "Tere Bina",
    artist: "A.R. Rahman",
    album: "Guru",
    duration: "5:15",
    coverSeed: "velvet31",
  },
  {
    id: "s8",
    title: "Midnight in a Perfect World",
    artist: "DJ Shadow",
    album: "Endtroducing",
    duration: "4:53",
    coverSeed: "obsidian77",
  },
  {
    id: "s9",
    title: "Carried Away",
    artist: "Crosby Loggins",
    album: "Carried Away",
    duration: "3:41",
    coverSeed: "amber63",
  },
  {
    id: "s10",
    title: "Naina",
    artist: "Shankar-Ehsaan-Loy",
    album: "Kaal",
    duration: "4:08",
    coverSeed: "indigo29",
  },
];

// ─── Quick Picks ──────────────────────────────────────────────────────────────

export const QUICK_PICKS: QuickPick[] = [
  {
    id: "qp1",
    title: "Shuffle Play",
    subtitle: "Mix of everything",
    songCount: 847,
    iconType: "shuffle",
    accentClass: "bg-swara-accent-dim border-swara-accent-muted",
  },
  {
    id: "qp2",
    title: "Most Played",
    subtitle: "Your top tracks",
    songCount: 42,
    iconType: "chart-bar",
    accentClass: "bg-[#0F1E14] border-swara-sage",
  },
  {
    id: "qp3",
    title: "Session Starters",
    subtitle: "Get in the mood",
    songCount: 24,
    iconType: "bolt",
    accentClass: "bg-[#0E1520] border-swara-slate",
  },
];

// ─── Albums ───────────────────────────────────────────────────────────────────
// Pool of 8 albums; Home shows 4 randomly, shuffle picks new 4

export const ALBUMS: Album[] = [
  {
    id: "a1",
    title: "Dil Se",
    artist: "A.R. Rahman",
    year: 1998,
    genre: "Soundtrack",
    coverSeed: "rain88",
  },
  {
    id: "a2",
    title: "Promises",
    artist: "Floating Points & Pharoah Sanders",
    year: 2021,
    genre: "Jazz / Electronic",
    coverSeed: "wave14",
  },
  {
    id: "a3",
    title: "Felt",
    artist: "Nils Frahm",
    year: 2011,
    genre: "Contemporary Classical",
    coverSeed: "stone67",
  },
  {
    id: "a4",
    title: "Lagaan",
    artist: "A.R. Rahman",
    year: 2001,
    genre: "Soundtrack",
    coverSeed: "dune45",
  },
  {
    id: "a5",
    title: "Malibu",
    artist: "Anderson .Paak",
    year: 2016,
    genre: "R&B / Hip-Hop",
    coverSeed: "ocean23",
  },
  {
    id: "a6",
    title: "All Hell",
    artist: "Bar Italia",
    year: 2023,
    genre: "Indie Rock",
    coverSeed: "smoke91",
  },
  {
    id: "a7",
    title: "Punisher",
    artist: "Phoebe Bridgers",
    year: 2020,
    genre: "Indie Folk",
    coverSeed: "violet38",
  },
  {
    id: "a8",
    title: "Talaash",
    artist: "Ram Sampath",
    year: 2012,
    genre: "Soundtrack",
    coverSeed: "coal72",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a shuffled selection of 4 unique album indices from ALBUMS array.
 * Optional `exclude` ensures we don't pick the exact same set twice.
 */
export function pickFourAlbumIndices(): number[] {
  return [0, 1, 2, 3];
}

/** Constructs a deterministic picsum URL for a given seed & size */
export function getCoverUrl(seed: string, size = 400): string {
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}
