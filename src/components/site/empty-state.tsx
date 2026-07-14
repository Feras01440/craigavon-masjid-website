import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children: ReactNode;
};

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty-state__kicker">Nothing approved for publication</p>
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
