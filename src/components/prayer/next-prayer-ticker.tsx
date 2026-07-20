"use client";

import { useEffect, useState } from "react";

function remainingLabel(target: string, now: Date): string | null {
  const milliseconds = new Date(target).getTime() - now.getTime();
  if (milliseconds <= 0) return null;
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `in ${hours} hr ${minutes} min`;
  return `in ${minutes} min`;
}

/* Progressive enhancement: the server renders the absolute time; once
   hydrated this adds a live "in X min" alongside it, ticking every 30s. */
export function NextPrayerTicker({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const initial = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);
  const label = now ? remainingLabel(targetIso, now) : null;
  if (!label) return null;
  return <span className="next-prayer-ticker">{label}</span>;
}
