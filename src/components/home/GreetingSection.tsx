import { getGreeting, getGreetingSubline } from '@/utils/greeting';

interface GreetingSectionProps { username: string; }

const GreetingSection = ({ username }: GreetingSectionProps) => {
  const hour = new Date().getHours();
  const greeting = getGreeting('');      // get base greeting without name
  const subline  = getGreetingSubline();

  // Build greeting with accent-colored username
  const greetingBase = hour < 5  ? 'Still up, '
    : hour < 9  ? 'Good morning, '
    : hour < 12 ? 'Morning, '
    : hour < 14 ? 'Good afternoon, '
    : hour < 17 ? 'Afternoon, '
    : hour < 20 ? 'Good evening, '
    : hour < 23 ? 'Evening, '
    : 'Late night, ';

  return (
    <section className="px-5 pt-4 pb-2" aria-label="Greeting">
      <h1 className="text-[1.75rem] font-bold text-swara-text leading-tight tracking-[-0.03em] font-display">
        {greetingBase}
        <span className="text-swara-accent">{username}</span>
      </h1>
      <p className="text-[0.8125rem] text-swara-muted mt-1 font-normal tracking-tight">
        {subline}
      </p>
    </section>
  );
};

export default GreetingSection;
