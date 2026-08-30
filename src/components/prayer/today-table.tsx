"use client";

import Link from "next/link";

import { useNextPrayer } from "@/components/prayer/next-prayer-live";
import { prayerDisplayNames } from "@/lib/prayer/names";
import { formatTime } from "@/lib/prayer/timezone";
import { prayerKeys, type PrayerSchedule } from "@/lib/prayer/types";

/*
 * Today's timetable, shared by the homepage and /prayer-times. The "Next"
 * highlight is client-derived on the shared clock, so it moves through the
 * day without a reload and always agrees with the hero panel and the strip.
 */
export function TodayTable({
  schedules,
  today,
  initialNowIso,
  showLink = true,
}: {
  schedules: PrayerSchedule[];
  today: PrayerSchedule;
  initialNowIso: string;
  showLink?: boolean;
}): React.ReactNode {
  const { next } = useNextPrayer([today], initialNowIso);
  const nextKey = next?.date === today.date ? next.key : null;
  // Jumuʿah sessions are only attached to Friday schedules, so the standing
  // row is sourced from the first covered Friday in the wider bundle.
  const jumuahDay = schedules.find((schedule) => schedule.jumuah.length > 0) ?? null;
  const joinedPairs = prayerKeys
    .map((key) => today.prayers[key])
    .filter((prayer) => prayer.joinedWith !== null)
    .map((prayer) => ({ key: prayer.key, partner: prayer.joinedWith! }));

  return (
    <div className="home-prayer">
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
              <th scope="col">Iqamah</th>
            </tr>
          </thead>
          <tbody>
            {prayerKeys.map((key) => {
              const prayer = today.prayers[key];
              const isNext = nextKey === key;
              return (
                <tr className={isNext ? "home-prayer__row--next" : undefined} key={key}>
                  <th scope="row">
                    <span className="home-prayer__name">
                      {prayerDisplayNames[key][0]}
                      {isNext && <span className="home-prayer__next">Next</span>}
                    </span>
                    <span className="home-prayer__arabic" lang="ar" dir="rtl">
                      {prayerDisplayNames[key][1]}
                    </span>
                  </th>
                  <td>{formatTime(prayer.startsAt, today.timezone)}</td>
                  <td>
                    {formatTime(prayer.congregationAt, today.timezone)}
                    {prayer.joinedWith && <span aria-hidden="true"> *</span>}
                  </td>
                </tr>
              );
            })}
            {jumuahDay?.jumuah.map((session) => (
              <tr className="home-prayer__row--jumuah" key={session.id ?? session.label}>
                <th scope="row">
                  <span className="home-prayer__name">{session.label}</span>
                  <span className="home-prayer__arabic" lang="ar" dir="rtl">
                    {prayerDisplayNames.jumuah[1]}
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
        {joinedPairs.length > 0 ? (
          <p className="home-prayer__legend">
            {joinedPairs.map((pair) => (
              <span key={pair.key}>
                * {prayerDisplayNames[pair.key][0]} is prayed together with{" "}
                {prayerDisplayNames[pair.partner][0]}.
              </span>
            ))}
          </p>
        ) : null}
      </div>
      {showLink ? (
        <p className="home-prayer__more">
          <Link className="text-link" href="/prayer-times">
            Open the full timetable
          </Link>
        </p>
      ) : null}
    </div>
  );
}
