import type { Metadata } from "next";

import { DayArc } from "@/components/prayer/day-arc";
import { NextPrayerSummary } from "@/components/prayer/next-prayer-live";
import { MonthTimetable } from "@/components/prayer/month-timetable";
import { TodayTable } from "@/components/prayer/today-table";
import { PageIntro, PublicShell } from "@/components/site";
import { dateKeyInZone } from "@/lib/prayer/timezone";
import { getSiteUrl } from "@/lib/site-url";
import { getPublishedPrayerBundle } from "@/server/repositories/prayer";

import styles from "./prayer-times.module.css";
import {
  currentMonthParts,
  daysInMonth,
  monthKeyOf,
  monthLabelOf,
  shiftedMonthKey,
} from "./month-shared";

export const metadata: Metadata = {
  title: "Prayer times",
  description:
    "Daily prayer and Iqamah times, Jumuʿah and the monthly timetable at Craigavon Masjid.",
};

// ISR: rebuilt at most once a minute and purged instantly on publish.
export const revalidate = 60;

export default async function PrayerTimesPage(): Promise<React.ReactNode> {
  const now = new Date();
  const todayKey = dateKeyInZone(now, "Europe/London");
  const parts = currentMonthParts();
  const monthKey = monthKeyOf(parts);
  const firstDate = `${monthKey}-01`;
  const count = daysInMonth(parts);
  const [monthBundle, todayBundle] = await Promise.all([
    getPublishedPrayerBundle(firstDate, count, {
      allowLeadingGap: true,
      throwOnTransientError: true,
    }),
    // Eight days keeps the standing Jumuʿah row available on any weekday.
    getPublishedPrayerBundle(todayKey, 8, { throwOnTransientError: true }),
  ]);
  const todaySchedules = todayBundle.status === "available" ? todayBundle.schedules : [];
  const today = todaySchedules.find((schedule) => schedule.date === todayKey) ?? null;
  // Calendar apps subscribe over webcal:// when the public host is known.
  const siteUrl = getSiteUrl();
  const feedPath = "/prayer-times/calendar.ics";
  const subscribeHref = siteUrl ? `webcal://${siteUrl.host}${feedPath}` : feedPath;

  return (
    <PublicShell>
      <PageIntro eyebrow="Craigavon Masjid" title="Prayer times" current="Prayer times" />

      <div className={styles.content}>
        {today ? (
          <section className="section section--compact" aria-labelledby="today-heading">
            <div className="site-container">
              <div className={styles.todayHeading}>
                <h2 id="today-heading">Today&apos;s timetable</h2>
                <p className={styles.live} aria-live="off">
                  <NextPrayerSummary schedules={todaySchedules} initialNowIso={now.toISOString()} />
                </p>
              </div>
              <DayArc today={today} initialNowIso={now.toISOString()} />
              <TodayTable
                schedules={todaySchedules}
                today={today}
                initialNowIso={now.toISOString()}
                showLink={false}
              />
              <details className="feed-help">
                <summary>Add the prayer times to your phone&apos;s calendar</summary>
                <div className="feed-help__body">
                  <p>
                    <strong>iPhone:</strong> tap <a href={subscribeHref}>Subscribe on iPhone</a> and
                    confirm. The calendar updates itself every day.
                  </p>
                  <p>
                    <strong>Google Calendar (Android or web):</strong> open Google Calendar on a
                    computer, choose <em>Other calendars → From URL</em>, and paste this address:
                  </p>
                  <p>
                    <code className="feed-help__address">
                      {siteUrl ? `${siteUrl.origin}${feedPath}` : feedPath}
                    </code>
                  </p>
                  <p className="feed-help__note">
                    The address is a calendar feed, not a page: opening it directly shows the raw
                    calendar file.
                  </p>
                </div>
              </details>
              {today.seasonalArrangements.length > 0 && (
                <section className={styles.notice} aria-labelledby="seasonal-arrangements-heading">
                  <h3 id="seasonal-arrangements-heading">Current seasonal arrangements</h3>
                  {today.seasonalArrangements.map((arrangement) => (
                    <article key={arrangement.id ?? `${arrangement.startsOn}-${arrangement.title}`}>
                      <h4>{arrangement.title}</h4>
                      <p>
                        <time dateTime={arrangement.startsOn}>{arrangement.startsOn}</time> to{" "}
                        <time dateTime={arrangement.endsOn}>{arrangement.endsOn}</time>
                      </p>
                      {arrangement.publicNote && <p>{arrangement.publicNote}</p>}
                    </article>
                  ))}
                </section>
              )}
            </div>
          </section>
        ) : (
          <section className="section section--compact" aria-labelledby="prayer-unavailable">
            <div className="site-container">
              <div className={styles.notice}>
                <h2 id="prayer-unavailable">
                  Prayer information is not currently available online
                </h2>
                <p>
                  No timetable is available for today, and this website never estimates an Iqamah
                  time.
                </p>
                <p>Please check with the masjid directly before travelling.</p>
              </div>
            </div>
          </section>
        )}

        <section className="section section--compact">
          <div className="site-container">
            <MonthTimetable
              bundle={monthBundle}
              monthLabel={monthLabelOf(parts)}
              monthKey={monthKey}
              firstDate={firstDate}
              lastDate={`${monthKey}-${String(count).padStart(2, "0")}`}
              previousHref={`/prayer-times/${shiftedMonthKey(parts, -1)}`}
              nextHref={`/prayer-times/${shiftedMonthKey(parts, 1)}`}
              todayKey={todayKey}
            />
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
