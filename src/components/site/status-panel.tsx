import type { ReactNode } from "react";

type StatusPanelProps = {
  label?: string;
  title: string;
  children: ReactNode;
};

export function StatusPanel({ label, title, children }: StatusPanelProps) {
  return (
    <aside className="status-panel" aria-label={title}>
      {label ? <p className="status-panel__label">{label}</p> : null}
      <p className="status-panel__title">{title}</p>
      <div className="status-panel__body">{children}</div>
    </aside>
  );
}
