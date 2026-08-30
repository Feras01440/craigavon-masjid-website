"use client";

import { useEffect, useState } from "react";

/*
 * One clock for every live prayer surface. The server-provided instant is
 * rendered first — server HTML and the first client render are identical, so
 * hydration can never mismatch — then the device clock takes over, ticking
 * every 30 seconds and re-syncing immediately when a backgrounded tab
 * becomes visible again.
 */
export function useNow(initialNowIso: string): Date {
  const [now, setNow] = useState(() => new Date(initialNowIso));
  useEffect(() => {
    const update = () => setNow(new Date());
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
  return now;
}
