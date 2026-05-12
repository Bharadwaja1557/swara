import { getGreeting, getGreetingSubline } from '@/utils/greeting';

interface GreetingSectionProps {
  username: string;
}

const GreetingSection = ({ username }: GreetingSectionProps) => {
  const greeting = getGreeting(username);
  const subline = getGreetingSubline();

  return (
    <section className="px-5 pt-4 pb-2" aria-label="Greeting">
      <h1 className="text-[1.75rem] font-bold text-swara-text leading-tight tracking-[-0.03em]">
        {greeting}
      </h1>
      <p className="text-[0.8125rem] text-swara-muted mt-1 font-normal tracking-tight">
        {subline}
      </p>
    </section>
  );
};

export default GreetingSection;
