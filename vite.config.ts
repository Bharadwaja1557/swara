import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
//
// Base path strategy:
//   mode=android  → base "/" — Capacitor WebView serves from root
//   default        → base "/swara/" — GitHub Pages sub-path deployment
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  base: mode === "android" ? "/" : "/swara/",

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));