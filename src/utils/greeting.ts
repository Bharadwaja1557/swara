/**
 * Returns a contextual greeting based on the current hour of day.
 * Designed to feel personal and music-aware.
 */
export function getGreeting(username: string): string {
  const hour = new Date().getHours();

  if (hour >= 0 && hour < 5) {
    return `Still up, ${username}`;
  }
  if (hour >= 5 && hour < 9) {
    return `Good morning, ${username}`;
  }
  if (hour >= 9 && hour < 12) {
    return `Morning, ${username}`;
  }
  if (hour >= 12 && hour < 14) {
    return `Good afternoon, ${username}`;
  }
  if (hour >= 14 && hour < 17) {
    return `Afternoon, ${username}`;
  }
  if (hour >= 17 && hour < 20) {
    return `Good evening, ${username}`;
  }
  if (hour >= 20 && hour < 23) {
    return `Evening, ${username}`;
  }
  return `Late night, ${username}`;
}

/**
 * Returns a music-contextual sub-line for the greeting.
 */
export function getGreetingSubline(): string {
  const hour = new Date().getHours();

  if (hour < 5)  return "The night is yours.";
  if (hour < 9)  return "Start your day with something beautiful.";
  if (hour < 12) return "What's on your mind today?";
  if (hour < 14) return "A little music never hurts at lunch.";
  if (hour < 17) return "Keep the afternoon flowing.";
  if (hour < 20) return "Wind down with the right sound.";
  if (hour < 23) return "The evening is best with good music.";
  return "Just you and the music now.";
}

/**
 * Formats track duration from seconds to MM:SS string.
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Picks n random unique items from an array without mutating the original.
 */
export function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
