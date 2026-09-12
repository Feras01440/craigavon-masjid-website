import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  kicker?: string;
  children: ReactNode;
};

export function EmptyState({ title, kicker, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {kicker ? <p className="empty-state__kicker">{kicker}</p> : null}
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
