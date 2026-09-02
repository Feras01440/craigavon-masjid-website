"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/* Remounts the page body on navigation so the enter animation replays. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="page-enter" key={pathname}>
      {children}
    </div>
  );
}
