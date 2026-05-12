"use client";

import { useMemo } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USERNAME = "Neo";

/**
 * Returns a context-aware greeting based on the current hour.
 * Keeps the tone personal and warm – not generic.
 */
function getGreeting(): { primary: string; sub: string } {
  const hour = new Date().getHours();

  if (hour < 5)  return { primary: `Up late, ${USERNAME}`,      sub: "Night sessions hit different." };
  if (hour < 12) return { primary: `Good morning, ${USERNAME}`, sub: "What's on your mind today?" };
  if (hour < 17) return { primary: `Good afternoon, ${USERNAME}`, sub: "Find your soundtrack." };
  if (hour < 21) return { primary: `Good evening, ${USERNAME}`, sub: "Wind down with something good." };
  return          { primary: `Good night, ${USERNAME}`,         sub: "One last track before bed?" };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Greeting section at the top of the Home page.
 * Time-based text ensures the app feels alive and contextual.
 */
export function GreetingSection() {
  // Memoised so it doesn't recalculate on every re-render
  const { primary, sub } = useMemo(() => getGreeting(), []);

  return (
    <section
      aria-label="Greeting"
      className="px-5 pt-3 pb-6"
    >
      {/* Primary greeting */}
      <h2
        className={[
          // Display font for the personal, prominent greeting
          "font-display italic",
          "text-[1.9rem] sm:text-[2.2rem]",
          "font-medium leading-tight tracking-tight",
          "text-swara-text-1",
        ].join(" ")}
      >
        {primary}
      </h2>

      {/* Sub-greeting / motivational line */}
      <p
        className={[
          "mt-1.5",
          "font-sans text-sm font-normal",
          "text-swara-text-2 tracking-wide",
        ].join(" ")}
      >
        {sub}
      </p>
    </section>
  );
}
