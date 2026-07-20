import Link from "next/link";

import { nextEvent } from "@/lib/prayer/events";
import { prayerDisplayNames } from "@/lib/prayer/names";
import { formatTime } from "@/lib/prayer/timezone";
import { prayerKeys, type PrayerBundle, type PrayerSchedule } from "@/lib/prayer/types";

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
              const isNext = upcoming?.key === key;
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
                    {prayer.joinedWith && (
                      <span className="home-prayer__note">
                        with {prayerDisplayNames[prayer.joinedWith][0]}
                      </span>
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
      </div>
      <p className="home-prayer__more">
        <Link className="text-link" href="/prayer-times">
          Open the full timetable
        </Link>
      </p>
    </div>
  );
}
