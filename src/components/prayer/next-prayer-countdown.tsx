"use client";

import { useEffect, useMemo, useState } from "react";

import { nextEvent } from "@/lib/prayer/events";
import type { PrayerSchedule } from "@/lib/prayer/types";

function remainingLabel(target: string, now: Date): string {
  const milliseconds = Math.max(0, new Date(target).getTime() - now.getTime());
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} hr ${minutes} min`;
  return `${minutes} min`;
}

export function NextPrayerCountdown({
  schedules,
}: {
  schedules: PrayerSchedule[];
}): React.ReactNode {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const initial = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);
  const event = useMemo(
    () => (now ? nextEvent(schedules, now, ["prayer_start"]) : null),
    [now, schedules],
  );
  return (
    <aside className="next-prayer" aria-labelledby="next-prayer-heading">
      <p className="eyebrow">Next prayer start</p>
      <h3 id="next-prayer-heading">{event?.label ?? "Checking the approved timetable"}</h3>
      <p>{event && now ? `In ${remainingLabel(event.at, now)}` : "Times use Europe/London."}</p>
    </aside>
  );
}
