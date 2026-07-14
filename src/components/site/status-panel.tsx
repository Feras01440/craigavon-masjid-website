import type { ReactNode } from "react";

type StatusPanelProps = {
  label?: string;
  title: string;
  children: ReactNode;
};

export function StatusPanel({ label = "Current status", title, children }: StatusPanelProps) {
  return (
    <aside className="status-panel" aria-label={title}>
      <p className="status-panel__label">{label}</p>
      <p className="status-panel__title">{title}</p>
      <div className="status-panel__body">{children}</div>
    </aside>
  );
}
