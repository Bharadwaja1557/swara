/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#080808',
          surface: '#111111',
          elevated: '#1a1a1a',
          modal: '#141414',
        },
        border: {
          DEFAULT: '#252525',
          subtle: '#1c1c1c',
        },
        accent: {
          DEFAULT: '#4f8ef7',
          dim: '#1d4ed8',
          glow: 'rgba(79,142,247,0.15)',
          muted: 'rgba(79,142,247,0.08)',
        },
        text: {
          DEFAULT: '#efefef',
          secondary: '#888888',
          muted: '#555555',
          accent: '#4f8ef7',
        },
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      spacing: {
        'player-h': '72px',
        'nav-h': '64px',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'player': '0 -1px 0 0 #252525, 0 -8px 32px 0 rgba(0,0,0,0.6)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'accent-glow': '0 0 20px rgba(79,142,247,0.3)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.4,0,0.2,1)',
        'spin-slow': 'spin 8s linear infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
