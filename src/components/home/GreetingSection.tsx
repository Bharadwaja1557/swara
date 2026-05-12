import { getGreeting, getGreetingSubline } from '@/utils/greeting';

interface GreetingSectionProps {
  username: string;
}

/**
 * GreetingSection
 *
 * Displays a time-aware greeting with elegant display typography.
 * The greeting line uses Cormorant (display serif) for premium feel.
 */
const GreetingSection = ({ username }: GreetingSectionProps) => {
  const greeting = getGreeting(username);
  const subline = getGreetingSubline();

  return (
    <section className="px-5 pt-4 pb-2" aria-label="Greeting">
      <h1 className="font-display italic text-[1.85rem] font-medium text-swara-text leading-tight tracking-[0.01em]">
        {greeting}
      </h1>
      <p className="font-body text-[0.8125rem] text-swara-muted mt-1 font-light tracking-[0.01em]">
        {subline}
      </p>
    </section>
  );
};

export default GreetingSection;
