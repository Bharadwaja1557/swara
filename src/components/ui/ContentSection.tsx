/**
 * ContentSection — reusable section wrapper used throughout the app.
 *
 * Renders a consistent heading row + optional action link, then children.
 * Replaces repeated title/layout JSX across home sections, search sections,
 * browse sections, etc.
 *
 * Usage:
 *   <ContentSection title="Recently Played">
 *     ...
 *   </ContentSection>
 *
 *   <ContentSection title="Albums" action="See all" onAction={() => nav.toLibrary()}>
 *     ...
 *   </ContentSection>
 */
import type { ReactNode } from 'react';

interface ContentSectionProps {
  /** Section heading text */
  title: string;
  /** Optional action label shown on the right of the heading */
  action?: string;
  /** Called when the action is clicked */
  onAction?: () => void;
  /** aria-labelledby heading ID — auto-generated from title if omitted */
  headingId?: string;
  /** Extra classes on the outer <section> */
  className?: string;
  /** Extra top padding override — defaults to pt-5 */
  paddingTop?: string;
  children: ReactNode;
}

const ContentSection = ({
  title,
  action,
  onAction,
  headingId,
  className = '',
  paddingTop = 'pt-5',
  children,
}: ContentSectionProps) => {
  const id = headingId ?? `section-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <section className={`${paddingTop} pb-2 ${className}`} aria-labelledby={id}>
      <div className="flex items-center justify-between px-5 mb-3">
        <h2
          id={id}
          className="text-[0.8125rem] font-semibold text-swara-muted tracking-widest uppercase"
        >
          {title}
        </h2>
        {action && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="text-[0.75rem] font-medium text-swara-accent hover:text-swara-accent-bright transition-colors"
          >
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
};

export default ContentSection;
