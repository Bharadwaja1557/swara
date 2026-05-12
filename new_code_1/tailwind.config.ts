import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Swara Design Tokens ───────────────────────────────────────────
        swara: {
          // Backgrounds – layered depth
          bg:        "#0D0D0F", // deepest background
          surface:   "#131316", // default surface
          card:      "#191920", // card background
          elevated:  "#21212A", // popovers / hover states

          // Borders
          border:    "#252530",
          "border-light": "#2F2F3C",

          // Accent – warm amber-gold (the signature)
          accent:        "#C8943A",
          "accent-hover":"#D9A84A",
          "accent-muted":"#7A5A22",
          "accent-dim":  "#1E1608",

          // Text
          "text-1": "#EDE9E2", // primary – warm off-white
          "text-2": "#888480", // secondary
          "text-3": "#4C4A47", // muted / disabled

          // Quick Pick accent swatches (muted tones)
          sage:  "#3E6B46",
          slate: "#3B5870",
          rose:  "#7A3C50",
        },
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        sans:    ["var(--font-dm-sans)",   "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      spacing: {
        "nav": "4.5rem", // bottom nav height
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
      boxShadow: {
        "card":  "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.5)",
        "nav":   "0 -1px 0 rgba(255,255,255,0.04)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
