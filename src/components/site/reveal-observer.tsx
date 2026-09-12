"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/*
 * Progressive scroll reveals. Any element carrying `data-reveal` starts
 * slightly lowered and transparent (only when scripting is enabled — see the
 * `@media (scripting: enabled)` rule) and gains `.is-in` the first time it
 * enters the viewport. Reduced-motion users see everything immediately, and
 * a timed safety net reveals whatever is left so content can never stay
 * hidden behind a quirk of a browser or a headless capture.
 */
const SAFETY_NET_MS = 2500;

export function RevealObserver(): null {
  const pathname = usePathname();

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (elements.length === 0) return;
    const revealAll = () => {
      for (const element of elements) element.classList.add("is-in");
    };
    if (typeof IntersectionObserver === "undefined") {
      revealAll();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
    );
    for (const element of elements) {
      if (element.classList.contains("is-in")) continue;
      observer.observe(element);
    }
    const safetyNet = window.setTimeout(() => {
      observer.disconnect();
      revealAll();
    }, SAFETY_NET_MS);
    return () => {
      window.clearTimeout(safetyNet);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
