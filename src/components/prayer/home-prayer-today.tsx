import Link from "next/link";

import { NextPrayerCountdown } from "@/components/prayer/next-prayer-countdown";
import { nextEvent } from "@/lib/prayer/events";
import { formatTime } from "@/lib/prayer/timezone";
import {
  prayerKeys,
  type PrayerBundle,
  type PrayerKey,
  type PrayerSchedule,
} from "@/lib/prayer/types";

const names: Record<PrayerKey | "jumuah", readonly [string, string]> = {
  fajr: ["Fajr", "الفجر"],
  sunrise: ["Sunrise", "الشروق"],
  dhuhr: ["Dhuhr", "الظهر"],
  asr: ["ʿAsr", "العصر"],
  maghrib: ["Maghrib", "المغرب"],
  isha: ["ʿIshāʾ", "العشاء"],
  jumuah: ["Jumuʿah", "الجمعة"],
};

export function HomePrayerToday({
  bundle,
  today,
  now,
}: {
  bundle: PrayerBundle;
  today: PrayerSchedule;
  now: Date;
}): React.ReactNode {
  const upcoming = nextEvent([today], now, ["prayer_start"]);
  // Jumuʿah sessions are only attached to Friday schedules, so the standing
  // row is sourced from the first covered Friday rather than re-declared here.
  const jumuahDay = bundle.schedules.find((schedule) => schedule.jumuah.length > 0) ?? null;
  const publishedOn = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: today.timezone,
  }).format(new Date(today.source.publishedAt));

  return (
    <div className="home-prayer">
      <p className="status-badge">Committee-approved timetable</p>
      <div className="home-prayer__panel">
        <table className="home-prayer__table">
          <caption className="home-prayer__caption">
            <time dateTime={today.date}>{today.gregorianLabel}</time>
            <span className="home-prayer__hijri">{today.hijriLabel}</span>
          </caption>
          <thead>
            <tr>
              <th scope="col">
                Prayer
                <span className="home-prayer__arabic" lang="ar" dir="rtl">
                  صلاة
                </span>
              </th>
              <th scope="col">Begins</th>
              <th scope="col">Iqāmah</th>
            </tr>
          </thead>
          <tbody>
            {prayerKeys.map((key) => {
              const prayer = today.prayers[key];
              const isNext = upcoming?.key === key;
              return (
                <tr className={isNext ? "home-prayer__row--next" : undefined} key={key}>
                  <th scope="row">
                    <span className="home-prayer__name">
                      {names[key][0]}
                      {isNext && <span className="home-prayer__next">Next</span>}
                    </span>
                    <span className="home-prayer__arabic" lang="ar" dir="rtl">
                      {names[key][1]}
                    </span>
                  </th>
                  <td>{formatTime(prayer.startsAt, today.timezone)}</td>
                  <td>
                    {formatTime(prayer.congregationAt, today.timezone)}
                    {prayer.joinedWith && (
                      <span className="home-prayer__note">with {names[prayer.joinedWith][0]}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {jumuahDay?.jumuah.map((session) => (
              <tr className="home-prayer__row--jumuah" key={session.id ?? session.label}>
                <th scope="row">
                  <span className="home-prayer__name">{session.label}</span>
                  <span className="home-prayer__arabic" lang="ar" dir="rtl">
                    {names.jumuah[1]}
                  </span>
                  {jumuahDay.date !== today.date && (
                    <span className="home-prayer__note">{jumuahDay.gregorianLabel}</span>
                  )}
                </th>
                <td>{formatTime(session.khutbahAt, jumuahDay.timezone)}</td>
                <td>{formatTime(session.prayerAt ?? session.khutbahAt, jumuahDay.timezone)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <NextPrayerCountdown schedules={bundle.schedules} />
      <p className="home-prayer__meta">
        Source: {today.source.name}. Published {publishedOn}. Timezone: {today.timezone}.{" "}
        <Link className="text-link" href="/prayer-times">
          Open the full timetable
        </Link>
      </p>
    </div>
  );
}
