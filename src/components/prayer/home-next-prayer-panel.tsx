"use client";

import Link from "next/link";

import { useNextPrayer } from "@/components/prayer/next-prayer-live";
import { prayerDisplayNames } from "@/lib/prayer/names";
import { formatTime } from "@/lib/prayer/timezone";
import type { PrayerSchedule } from "@/lib/prayer/types";

/*
 * The hero's live panel: next prayer with its Begins and Iqamah times, a
 * live countdown, and the standing Jumuʿah time — derived on the shared
 * client clock so it agrees with every other surface and rolls over live.
 */
export function HomeNextPrayerPanel({
  schedules,
  initialNowIso,
}: {
  schedules: PrayerSchedule[];
  initialNowIso: string;
}): React.ReactNode {
  const { timezone, next, remaining, anchorLabel } = useNextPrayer(schedules, initialNowIso);
  const jumuahDay = schedules.find((schedule) => schedule.jumuah.length > 0) ?? null;
  const jumuah = jumuahDay?.jumuah[0] ?? null;

  return (
    <aside className="hero-prayer" aria-label="Next prayer">
      {next ? (
        <>
          <p className="hero-prayer__eyebrow">Next prayer</p>
          <p className="hero-prayer__name">
            {prayerDisplayNames[next.key][0]}
            <span className="hero-prayer__arabic" lang="ar" dir="rtl">
              {prayerDisplayNames[next.key][1]}
            </span>
          </p>
          <dl className="hero-prayer__times">
            <div>
              <dt>Begins</dt>
              <dd>{formatTime(next.startsAt, timezone)}</dd>
            </div>
            <div>
              <dt>Iqamah</dt>
              <dd>
                {formatTime(next.congregationAt, timezone)}
                {next.joinedWith ? (
                  <span className="hero-prayer__note">
                    with {prayerDisplayNames[next.joinedWith][0]}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
          {remaining ? (
            <p className="hero-prayer__countdown">
              {anchorLabel} in {remaining}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="hero-prayer__eyebrow">Prayer times</p>
          <p className="hero-prayer__name">See the full timetable</p>
        </>
      )}
      {jumuah ? (
        <p className="hero-prayer__jumuah">
          <span lang="ar" dir="rtl" className="hero-prayer__arabic">
            {prayerDisplayNames.jumuah[1]}
          </span>
          {jumuah.label || prayerDisplayNames.jumuah[0]} —{" "}
          {formatTime(jumuah.khutbahAt, jumuahDay?.timezone ?? timezone)}
        </p>
      ) : null}
      <Link className="hero-prayer__link" href="/prayer-times" prefetch={false}>
        Full prayer times
      </Link>
    </aside>
  );
}
