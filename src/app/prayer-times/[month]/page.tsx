import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { MonthTimetable } from "@/components/prayer/month-timetable";
import { PageIntro, PublicShell } from "@/components/site";
import { dateKeyInZone } from "@/lib/prayer/timezone";
import { getPublishedPrayerBundle } from "@/server/repositories/prayer";

import styles from "../prayer-times.module.css";
import {
  currentMonthParts,
  daysInMonth,
  monthKeyOf,
  monthLabelOf,
  parseMonthSegment,
  shiftedMonthKey,
} from "../month-shared";

// ISR: month pages share the 60s window so "today" derivations never go
// stale by more than a minute.
export const revalidate = 60;

type MonthPageProps = { params: Promise<{ month: string }> };

export async function generateMetadata({ params }: MonthPageProps): Promise<Metadata> {
  const { month } = await params;
  const parts = parseMonthSegment(month);
  return {
    title: parts ? `Prayer times — ${monthLabelOf(parts)}` : "Prayer times",
    description: "Monthly prayer and Iqamah timetable at Craigavon Masjid.",
  };
}

export default async function PrayerMonthPage({
  params,
}: MonthPageProps): Promise<React.ReactNode> {
  const { month } = await params;
  const parts = parseMonthSegment(month);
  if (!parts) notFound();
  // The canonical current month lives at /prayer-times.
  if (monthKeyOf(parts) === monthKeyOf(currentMonthParts())) redirect("/prayer-times");

  const todayKey = dateKeyInZone(new Date(), "Europe/London");
  const monthKey = monthKeyOf(parts);
  const firstDate = `${monthKey}-01`;
  const count = daysInMonth(parts);
  const monthBundle = await getPublishedPrayerBundle(firstDate, count, {
    allowLeadingGap: true,
    throwOnTransientError: true,
  });

  return (
    <PublicShell>
      <PageIntro
        eyebrow="Craigavon Masjid"
        title="Prayer times"
        description={`The ${monthLabelOf(parts)} prayer and Iqamah timetable.`}
        current={monthLabelOf(parts)}
        parent={{ href: "/prayer-times", label: "Prayer times" }}
      />
      <div className={styles.content}>
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
