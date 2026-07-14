import Link from "next/link";

import { nextEvent } from "@/lib/prayer/events";
import type { PrayerBundle } from "@/lib/prayer/types";
import { formatTime } from "@/lib/prayer/timezone";

export function HomePrayerSummary({
  bundle,
  now,
}: {
  bundle: PrayerBundle;
  now: Date;
}): React.ReactNode {
  const nextStart = nextEvent(bundle.schedules, now, ["prayer_start"]);
  const nextCongregation = nextEvent(bundle.schedules, now, ["congregation", "jumuah"]);
  const timezone = bundle.schedules[0]?.timezone ?? "Europe/London";
  return (
    <div className="approval-grid">
      <article className="approval-card">
        <p className="status-badge">Committee-approved timetable</p>
        <h3>{nextStart?.label ?? "No next prayer start is available"}</h3>
        <p>
          {nextStart
            ? `${formatTime(nextStart.at, timezone)} on ${nextStart.date}`
            : "Check the full timetable before travelling."}
        </p>
        <Link className="text-link" href="/prayer-times">
          Open the full timetable
        </Link>
      </article>
      <article className="approval-card">
        <p className="status-badge">Congregation is separate</p>
        <h3>{nextCongregation?.label ?? "No congregation time is confirmed"}</h3>
        <p>
          {nextCongregation
            ? `${formatTime(nextCongregation.at, timezone)} on ${nextCongregation.date}`
            : "A missing value is not replaced with an estimate."}
        </p>
        <Link className="text-link" href="/prayer-times">
          Check source and last update
        </Link>
      </article>
    </div>
  );
}
