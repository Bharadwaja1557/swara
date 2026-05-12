import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  /** Optional right-side action (e.g. shuffle button) */
  action?: ReactNode;
}

/**
 * Consistent section heading used across all home page sections.
 * Renders the title in a slightly larger weight + an optional right action.
 */
export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 px-5">
      <h2
        className={[
          "font-sans font-semibold",
          "text-base tracking-tight",
          "text-swara-text-1",
        ].join(" ")}
      >
        {title}
      </h2>

      {action && (
        <div className="flex items-center">{action}</div>
      )}
    </div>
  );
}
