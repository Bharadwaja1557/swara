# Swara 🎵

> *Your music, elevated.*

A premium, dark-mode music streaming web app built with Next.js 15 App Router, TypeScript, Tailwind CSS, and Zustand.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

```
swara/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout – fonts, metadata, BottomNav
│   ├── page.tsx                # Home page
│   ├── globals.css             # Tailwind imports + custom utilities
│   ├── search/page.tsx         # Search (placeholder)
│   └── library/page.tsx        # Library (placeholder)
│
├── components/
│   ├── layout/
│   │   ├── BottomNav.tsx       # Persistent fixed bottom navigation
│   │   └── TopBar.tsx          # Wordmark + profile icon
│   ├── home/
│   │   ├── GreetingSection.tsx # Time-based personal greeting
│   │   ├── RecentlyPlayed.tsx  # Horizontal scroll song strip
│   │   ├── QuickPicks.tsx      # Playlist shortcut cards row
│   │   └── ExploreAlbums.tsx   # 2×2 album grid with shuffle
│   └── ui/
│       ├── SectionHeader.tsx   # Reusable section title + action
│       ├── SongCard.tsx        # Compact song card (artwork + info)
│       ├── QuickPickCard.tsx   # Playlist shortcut card
│       └── AlbumCard.tsx       # Album card (artwork + info)
│
├── data/
│   └── mockData.ts             # Sample songs, albums, quick picks + helpers
│
├── store/
│   └── uiStore.ts              # Zustand: album shuffle state
│
└── types/
    └── index.ts                # All shared TypeScript types
```

---

## Design System

| Token | Value | Usage |
|---|---|---|
| `swara-bg` | `#0D0D0F` | Deepest background |
| `swara-surface` | `#131316` | BottomNav, cards |
| `swara-card` | `#191920` | Card backgrounds |
| `swara-accent` | `#C8943A` | Active states, highlights |
| `swara-text-1` | `#EDE9E2` | Primary text |
| `swara-text-2` | `#888480` | Secondary text |
| `swara-text-3` | `#4C4A47` | Muted / disabled |

**Fonts**
- **Cormorant Garamond** – wordmark logo only (display serif)
- **DM Sans** – all UI text (geometric sans)

---

## What's Built (Phase 1)

- [x] App shell + root layout
- [x] Google Fonts (Cormorant Garamond + DM Sans)
- [x] Tailwind design tokens
- [x] `BottomNav` – fixed, path-aware active states, safe area support
- [x] `TopBar` – wordmark + profile icon
- [x] Home page with 4 sections:
  - [x] Time-based greeting
  - [x] Recently Played (horizontal scroll, 10 tracks)
  - [x] Quick Picks (3 playlist shortcuts)
  - [x] Explore Albums (2×2 grid, shuffle via Zustand)
- [x] All mock data
- [x] Mobile-first responsive layout
- [x] Search + Library placeholder pages

## Next Phases (not yet built)

- [ ] Search UI + search logic
- [ ] Library grid + playlist management
- [ ] Audio engine (Howler.js or Web Audio API)
- [ ] Player bar + full-screen player
- [ ] Zustand audio store
- [ ] Backend / data layer
