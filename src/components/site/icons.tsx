import type { ReactNode } from "react";

/* Line-drawn symbols for the service categories, shown in soft tinted discs.
   Decorative only — every icon sits next to its written label. */

type IconProps = {
  children: ReactNode;
};

function Icon({ children }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function CrescentIcon() {
  return (
    <Icon>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </Icon>
  );
}

function MosqueIcon() {
  return (
    <Icon>
      <path d="M12 4.5c2.9 1.7 4.6 3.6 4.6 6.5H7.4c0-2.9 1.7-4.8 4.6-6.5Z" />
      <path d="M12 2.4v2.1" />
      <path d="M5 21v-6.5h14V21" />
      <path d="M2.5 21h19" />
      <path d="M12 21v-3.4" />
    </Icon>
  );
}

function RingsIcon() {
  return (
    <Icon>
      <circle cx="9.3" cy="12.6" r="5.3" />
      <circle cx="14.7" cy="11.4" r="5.3" />
    </Icon>
  );
}

function BookIcon() {
  return (
    <Icon>
      <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2Z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z" />
    </Icon>
  );
}

function PeopleIcon() {
  return (
    <Icon>
      <circle cx="9" cy="7.8" r="3.2" />
      <path d="M3.4 20c.6-3.3 2.7-5.1 5.6-5.1s5 1.8 5.6 5.1" />
      <circle cx="17.2" cy="9.3" r="2.6" />
      <path d="M16.2 14.8c2.3.4 3.8 2 4.3 4.6" />
    </Icon>
  );
}

const serviceIcons: Record<string, { icon: ReactNode; tint: "berry" | "gold" | "pine" }> = {
  "new-to-islam": { icon: <CrescentIcon />, tint: "gold" },
  funerals: { icon: <MosqueIcon />, tint: "pine" },
  nikah: { icon: <RingsIcon />, tint: "berry" },
  education: { icon: <BookIcon />, tint: "berry" },
  visits: { icon: <PeopleIcon />, tint: "pine" },
};

export function ServiceIcon({ serviceId }: { serviceId: string }) {
  const entry = serviceIcons[serviceId];
  if (!entry) return null;
  return (
    <span className={`icon-badge icon-badge--${entry.tint}`} aria-hidden="true">
      {entry.icon}
    </span>
  );
}
