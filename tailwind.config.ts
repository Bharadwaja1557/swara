import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // ─── Swara Color Palette ───────────────────────────────────────────────
      colors: {
        swara: {
          bg:       '#09090C',   // deepest background
          surface:  '#101014',   // page surface
          card:     '#18181F',   // card background
          elevated: '#20202A',   // elevated elements
          border:   '#26262F',   // subtle borders
          accent:   '#C8A96A',   // warm gold — primary accent
          'accent-bright': '#E2C485', // hover / highlight gold
          text:     '#F0EDE4',   // primary text
          muted:    '#88857B',   // secondary text
          dim:      '#3E3D3A',   // disabled / placeholder
        },
      },
      // ─── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        display: ['Cormorant', 'Georgia', 'serif'],   // logo, headings
        body:    ['Outfit', 'system-ui', 'sans-serif'], // all UI text
      },
      // ─── Spacing & Sizing ──────────────────────────────────────────────────
      borderRadius: {
        'xl':  '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      // ─── Shadows ───────────────────────────────────────────────────────────
      boxShadow: {
        'card':   '0 2px 12px rgba(0,0,0,0.45)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.6)',
        'nav':    '0 -1px 0 rgba(255,255,255,0.04), 0 -8px 24px rgba(0,0,0,0.5)',
      },
      // ─── Transitions ───────────────────────────────────────────────────────
      transitionTimingFunction: {
        'swara': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
};

export default config;
