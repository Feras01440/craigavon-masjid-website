import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/site";
import { NextPrayerCountdown } from "@/components/prayer/next-prayer-countdown";
import { prayerDisplayNames } from "@/lib/prayer/names";
import { prayerKeys, type PrayerSchedule } from "@/lib/prayer/types";
import { dateKeyInZone, formatTime } from "@/lib/prayer/timezone";
import { getPublishedPrayerBundle } from "@/server/repositories/prayer";

import styles from "./prayer-times.module.css";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Prayer times",
  description:
    "Daily prayer and Iqamah times, Jumuʿah and the monthly timetable at Craigavon Masjid.",
};

function monthParts(value: string | undefined): { year: number; month: number } {
  if (value && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value)) {
    const [year, month] = value.split("-").map(Number) as [number, number];
    if (year >= 2020 && year <= 2100) return { year, month };
  }
  const today = dateKeyInZone(new Date(), "Europe/London");
  const [year, month] = today.split("-").map(Number) as [number, number];
  return { year, month };
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftedMonth(year: number, month: number, delta: number): string {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return monthKey(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function TodayCards({ schedule }: { schedule: PrayerSchedule }): React.ReactNode {
  return (
    <>
      <div className={styles.today} aria-label={`Prayer times for ${schedule.gregorianLabel}`}>
        {prayerKeys.map((key) => {
          const prayer = schedule.prayers[key];
          return (
            <article className={styles.prayerCard} key={key}>
              <h3>
                {prayerDisplayNames[key][0]}
                <span className={styles.arabic} lang="ar" dir="rtl">
                  {prayerDisplayNames[key][1]}
                </span>
              </h3>
              <p className={styles.time}>{formatTime(prayer.startsAt, schedule.timezone)}</p>
              {key !== "sunrise" ? (
                <p className={styles.congregation}>
                  Iqamah: {formatTime(prayer.congregationAt, schedule.timezone)}
                  {prayer.joinedWith ? ` (with ${prayerDisplayNames[prayer.joinedWith][0]})` : ""}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
      {schedule.isFriday && schedule.jumuah.length > 0 ? (
        <section className={styles.jumuah} aria-labelledby="jumuah-heading">
          <h2 id="jumuah-heading">Friday prayer (Jumuʿah)</h2>
          <dl className={styles.jumuahList}>
            {schedule.jumuah.map((session) => (
              <div key={`${session.label}-${session.khutbahAt}`}>
                <dt>{session.label}</dt>
                <dd>
                  Khutbah {formatTime(session.khutbahAt, schedule.timezone)}; prayer{" "}
                  {formatTime(session.prayerAt ?? session.khutbahAt, schedule.timezone)}
                  {session.notes ? ` — ${session.notes}` : ""}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {schedule.seasonalArrangements.length > 0 && (
        <section className={styles.notice} aria-labelledby="seasonal-arrangements-heading">
          <h2 id="seasonal-arrangements-heading">Current seasonal arrangements</h2>
          {schedule.seasonalArrangements.map((arrangement) => (
            <article key={arrangement.id ?? `${arrangement.startsOn}-${arrangement.title}`}>
              <h3>{arrangement.title}</h3>
              <p>
                <time dateTime={arrangement.startsOn}>{arrangement.startsOn}</time> to{" "}
                <time dateTime={arrangement.endsOn}>{arrangement.endsOn}</time>
              </p>
              {arrangement.publicNote && <p>{arrangement.publicNote}</p>}
            </article>
          ))}
        </section>
      )}
    </>
  );
}

export default async function PrayerTimesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}): Promise<React.ReactNode> {
  const query = await searchParams;
  const { year, month } = monthParts(query.month);
  const firstDate = `${monthKey(year, month)}-01`;
  const count = daysInMonth(year, month);
  const [monthBundle, todayBundle] = await Promise.all([
    // A timetable that begins mid-month still renders from its first day.
    getPublishedPrayerBundle(firstDate, count, { allowLeadingGap: true }),
    getPublishedPrayerBundle(dateKeyInZone(new Date(), "Europe/London"), 2),
  ]);
  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  const todaySchedules = todayBundle.status === "available" ? todayBundle.schedules : [];
  const today = todaySchedules[0] ?? null;
  const schedules = monthBundle.status === "available" ? monthBundle.schedules : [];
  const todayKey = dateKeyInZone(new Date(), "Europe/London");

  return (
    <PublicShell>
      <div className={styles.page}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Craigavon Masjid</p>
          <h1>Prayer times</h1>
          <p className={styles.lede}>
            Daily prayer and Iqamah times, Jumuʿah, and the monthly timetable.
          </p>
        </header>

        <div className={styles.content}>
          {today ? (
            <>
              <section aria-labelledby="today-heading">
                <div className={styles.controls}>
                  <div>
                    <p className={styles.eyebrow}>Today · {today.gregorianLabel}</p>
                    <h2 id="today-heading">Today&apos;s timetable</h2>
                    <p>{today.hijriLabel}</p>
                  </div>
                </div>
                <TodayCards schedule={today} />
                <NextPrayerCountdown schedules={todaySchedules} />
              </section>
            </>
          ) : (
            <section className={styles.notice} aria-labelledby="prayer-unavailable">
              <h2 id="prayer-unavailable">Prayer information is not currently available online</h2>
              <p>
                No timetable is available for today, and this website never estimates an Iqamah
                time.
              </p>
              <p>Please check with the masjid directly before travelling.</p>
            </section>
          )}

          <section aria-labelledby="month-heading">
            <div className={styles.controls}>
              <h2 id="month-heading">{monthLabel} timetable</h2>
              <div className={styles.controlLinks} aria-label="Timetable controls">
                <Link href={`/prayer-times?month=${shiftedMonth(year, month, -1)}`}>
                  Previous month
                </Link>
                <Link href={`/prayer-times?month=${shiftedMonth(year, month, 1)}`}>Next month</Link>
                {schedules.length > 0 ? (
                  <>
                    <a href={`/prayer-times/download?month=${monthKey(year, month)}`} download>
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
            {monthBundle.status === "available" &&
            monthBundle.coverage &&
            !monthBundle.coverage.complete &&
            schedules.length > 0 &&
            schedules[schedules.length - 1]!.date !==
              `${monthKey(year, month)}-${String(count).padStart(2, "0")}` ? (
              <p className={styles.source} role="note">
                This month&apos;s timetable currently ends on{" "}
                <time dateTime={monthBundle.coverage.endsOn}>{monthBundle.coverage.endsOn}</time>.
                Later dates will appear as soon as the next timetable is published.
              </p>
            ) : null}

            {schedules.length > 0 ? (
              <div
                className={styles.tableRegion}
                role="region"
                aria-label={`${monthLabel} prayer timetable; scroll horizontally for all columns`}
                tabIndex={0}
              >
                <table className={styles.table}>
                  <caption>{monthLabel}: begins and Iqamah times</caption>
                  <thead>
                    <tr>
                      <th scope="col" rowSpan={2}>
                        Date
                      </th>
                      {prayerKeys.map((key) => (
                        <th scope="colgroup" colSpan={key === "sunrise" ? 1 : 2} key={key}>
                          {prayerDisplayNames[key][0]}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {prayerKeys.flatMap((key) =>
                        key === "sunrise"
                          ? [
                              <th scope="col" key={`${key}-start`}>
                                Begins
                              </th>,
                            ]
                          : [
                              <th scope="col" key={`${key}-start`}>
                                Begins
                              </th>,
                              <th scope="col" key={`${key}-congregation`}>
                                Iqamah
                              </th>,
                            ],
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule) => (
                      <tr
                        className={schedule.date === todayKey ? styles.todayRow : undefined}
                        key={schedule.date}
                      >
                        <th scope="row">
                          <time dateTime={schedule.date}>
                            {schedule.gregorianLabel.replace(/ \d{4}$/, "")}
                          </time>
                        </th>
                        {prayerKeys.flatMap((key) => {
                          const prayer = schedule.prayers[key];
                          const cells = [
                            <td key={`${key}-start`}>
                              {formatTime(prayer.startsAt, schedule.timezone)}
                            </td>,
                          ];
                          if (key !== "sunrise") {
                            cells.push(
                              <td key={`${key}-congregation`}>
                                {formatTime(prayer.congregationAt, schedule.timezone)}
                              </td>,
                            );
                          }
                          return cells;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.notice}>
                <p>
                  {monthBundle.status === "unavailable"
                    ? "No timetable is available for this month yet."
                    : "No timetable is available."}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </PublicShell>
  );
}
