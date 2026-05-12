import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        swara: {
          bg:       '#09090C',
          surface:  '#101014',
          card:     '#18181F',
          elevated: '#20202A',
          border:   '#26262F',
          accent:   '#C8A96A',
          'accent-bright': '#E2C485',
          text:     '#F0EDE4',
          muted:    '#88857B',
          dim:      '#3E3D3A',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.025em',
        tight:   '-0.015em',
      },
      borderRadius: {
        'xl':  '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card':       '0 2px 12px rgba(0,0,0,0.45)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.6)',
        'nav':        '0 -1px 0 rgba(255,255,255,0.04), 0 -8px 24px rgba(0,0,0,0.5)',
        'player':     '0 -4px 40px rgba(0,0,0,0.8)',
      },
      transitionTimingFunction: {
        'swara': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
};

export default config;
