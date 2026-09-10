"use client";

import { useEffect, useState } from "react";

import { dateKeyInZone } from "@/lib/prayer/timezone";

const TICK_MS = 5_000;

/*
 * One clock for every live prayer surface. The server-provided instant is
 * rendered first — server HTML and the first client render are identical, so
 * hydration can never mismatch — then the device clock takes over: it
 * corrects itself immediately after mount, ticks every five seconds so
 * countdowns, the day arc and the "next" highlight move without a reload,
 * re-syncs the moment a backgrounded tab returns, and reloads the page once
 * when the London date changes so the new day's timetable appears on its own.
 */
export function useNow(initialNowIso: string): Date {
  const [now, setNow] = useState(() => new Date(initialNowIso));

  useEffect(() => {
    const startedOn = dateKeyInZone(new Date(), "Europe/London");
    const update = () => {
      const current = new Date();
      setNow(current);
      if (dateKeyInZone(current, "Europe/London") !== startedOn) {
        window.location.reload();
      }
    };
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, TICK_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", update);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", update);
    };
  }, []);

  return now;
}
