import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";

// ─── Fonts ────────────────────────────────────────────────────────────────────

/**
 * Display font – used exclusively for the "Swara" wordmark logo.
 * Cormorant Garamond: refined, classical, unmistakably premium.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

/**
 * UI font – used for all body copy, labels, and interactive elements.
 * DM Sans: geometric, clean, highly legible at small sizes.
 */
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Swara",
  description: "Your music, elevated.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Respect the notch and home bar on iOS
  viewportFit: "cover",
  themeColor: "#0D0D0F",
};

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/*
         * Main content area.
         * pb-nav ensures content is never hidden behind the fixed BottomNav.
         * min-h-screen keeps the background colour full-height.
         */}
        <main className="min-h-screen pb-nav">
          {children}
        </main>

        {/* Persistent bottom navigation – present on every page */}
        <BottomNav />
      </body>
    </html>
  );
}
