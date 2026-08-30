import Link from "next/link";

import { prayerDisplayNames } from "@/lib/prayer/names";
import { formatTime } from "@/lib/prayer/timezone";
import { prayerKeys, type PrayerBundle, type PrayerSchedule } from "@/lib/prayer/types";

import styles from "@/app/prayer-times/prayer-times.module.css";
import { PrintButton } from "@/app/prayer-times/print-button";

function shortDayLabel(schedule: PrayerSchedule): string {
  // "Friday, 17 July 2026" -> "Fri 17"
  const [weekday] = schedule.gregorianLabel.split(",", 1);
  const day = Number(schedule.date.slice(8, 10));
  return `${(weekday ?? "").slice(0, 3)} ${day}`;
}

export function MonthTimetable({
  bundle,
  monthLabel,
  monthKey,
  firstDate,
  lastDate,
  previousHref,
  nextHref,
  todayKey,
}: {
  bundle: PrayerBundle | { status: "unavailable" };
  monthLabel: string;
  monthKey: string;
  firstDate: string;
  lastDate: string;
  previousHref: string;
  nextHref: string;
  todayKey: string;
}): React.ReactNode {
  const schedules = bundle.status === "available" ? bundle.schedules : [];
  const containsToday = schedules.some((schedule) => schedule.date === todayKey);
  const joinedPairs = new Map<string, string>();
  for (const schedule of schedules) {
    for (const key of prayerKeys) {
      const prayer = schedule.prayers[key];
      if (prayer.joinedWith) {
        joinedPairs.set(
          `${prayer.key}`,
          `† ${prayerDisplayNames[prayer.key][0]} is prayed together with ${prayerDisplayNames[prayer.joinedWith][0]}.`,
        );
      }
    }
  }

  return (
    <section aria-labelledby="month-heading">
      <div className={styles.controls}>
        <h2 id="month-heading">{monthLabel} timetable</h2>
        <div className={styles.controlLinks} aria-label="Timetable controls">
          <Link href={previousHref}>Previous month</Link>
          <Link href={nextHref}>Next month</Link>
          {containsToday && schedules.length > 0 ? (
            <a href={`#${todayKey}`}>Jump to today</a>
          ) : null}
          {schedules.length > 0 ? (
            <>
              <a href={`/prayer-times/download?month=${monthKey}`} download>
                Download CSV
              </a>
              <PrintButton />
            </>
          ) : null}
        </div>
      </div>

      {schedules.length > 0 && schedules[0]!.date !== firstDate ? (
        <p className={styles.source} role="note">
          This month&apos;s timetable begins on{" "}
          <time dateTime={schedules[0]!.date}>{schedules[0]!.gregorianLabel}</time>.
        </p>
      ) : null}
      {schedules.length > 0 && schedules[schedules.length - 1]!.date !== lastDate ? (
        <p className={styles.source} role="note">
          This month&apos;s timetable currently ends on{" "}
          <time dateTime={schedules[schedules.length - 1]!.date}>
            {schedules[schedules.length - 1]!.gregorianLabel}
          </time>
          . Later dates will appear as soon as the next timetable is published.
        </p>
      ) : null}

      {schedules.length > 0 ? (
        <>
          <div
            className={styles.tableRegion}
            role="region"
            aria-label={`${monthLabel} prayer timetable`}
            tabIndex={0}
          >
            <table className={styles.table}>
              <caption className={styles.tableCaption}>
                {monthLabel}: each prayer shows the Begins time above the Iqamah time.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  {prayerKeys.map((key) => (
                    <th scope="col" key={key}>
                      {prayerDisplayNames[key][0]}
                      <span className={styles.columnHint} aria-hidden="true">
                        {key === "sunrise" ? "Begins" : "Begins · Iqamah"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => {
                  const jumuah = schedule.jumuah[0] ?? null;
                  const rowClass =
                    schedule.date === todayKey
                      ? styles.todayRow
                      : schedule.isFriday
                        ? styles.fridayRow
                        : undefined;
                  return (
                    <tr className={rowClass} id={schedule.date} key={schedule.date}>
                      <th scope="row">
                        <time dateTime={schedule.date}>{shortDayLabel(schedule)}</time>
                        {jumuah ? (
                          <span className={styles.jumuahChip}>
                            Jumuʿah {formatTime(jumuah.khutbahAt, schedule.timezone)}
                          </span>
                        ) : null}
                      </th>
                      {prayerKeys.map((key) => {
                        const prayer = schedule.prayers[key];
                        return (
                          <td key={key}>
                            <span className={styles.begins}>
                              {formatTime(prayer.startsAt, schedule.timezone)}
                            </span>
                            {key !== "sunrise" ? (
                              <span className={styles.iqamah}>
                                {formatTime(prayer.congregationAt, schedule.timezone)}
                                {prayer.joinedWith ? <span aria-hidden="true"> †</span> : null}
                              </span>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {joinedPairs.size > 0 ? (
            <p className={styles.source}>{[...joinedPairs.values()].join(" ")}</p>
          ) : null}
        </>
      ) : (
        <div className={styles.notice}>
          <p>No timetable is available for this month yet.</p>
        </div>
      )}
    </section>
  );
}
