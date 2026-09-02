"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useNow } from "@/components/prayer/use-now";
import { nextPrayerDetail } from "@/lib/prayer/events";
import { formatRemaining } from "@/lib/prayer/format";
import { prayerDisplayNames } from "@/lib/prayer/names";
import { formatTime } from "@/lib/prayer/timezone";
import type { PrayerSchedule } from "@/lib/prayer/types";

/*
 * The single source of truth for "what is the next prayer right now" in the
 * browser: every surface derives from nextPrayerDetail on the shared clock,
 * so the strip, the hero panel and the table highlight can never disagree.
 * Between a prayer's begins time and its Iqamah, that prayer stays current.
 */
export function useNextPrayer(schedules: PrayerSchedule[], initialNowIso: string) {
  const now = useNow(initialNowIso);
  const timezone = schedules[0]?.timezone ?? "Europe/London";
  const next = nextPrayerDetail(schedules, now);
  const anchor = next ? (next.congregationAt ?? next.startsAt) : null;
  const remaining = anchor ? formatRemaining(new Date(anchor).getTime() - now.getTime()) : null;
  const anchorLabel = next?.congregationAt ? "Iqamah" : "Begins";
  return { now, timezone, next, remaining, anchorLabel };
}

export function NextPrayerSummary({
  schedules,
  initialNowIso,
}: {
  schedules: PrayerSchedule[];
  initialNowIso: string;
}): React.ReactNode {
  const { timezone, next, remaining, anchorLabel } = useNextPrayer(schedules, initialNowIso);
  if (!next) return null;
  return (
    <span className="next-prayer-summary">
      <strong>{prayerDisplayNames[next.key][0]}</strong>
      {next.startsAt ? <span> · Begins {formatTime(next.startsAt, timezone)}</span> : null}
      {next.congregationAt ? (
        <span> · Iqamah {formatTime(next.congregationAt, timezone)}</span>
      ) : null}
      {remaining ? (
        <span className="next-prayer-summary__remaining">
          {" "}
          · {anchorLabel} in {remaining}
        </span>
      ) : null}
    </span>
  );
}

/* Slim pinned bar under the header on inner pages; the homepage hero panel
   already carries the same information, so the strip hides itself there. */
export function NextPrayerStrip({
  schedules,
  initialNowIso,
}: {
  schedules: PrayerSchedule[];
  initialNowIso: string;
}): React.ReactNode {
  const pathname = usePathname();
  const { next } = useNextPrayer(schedules, initialNowIso);
  if (pathname === "/" || !next) return null;
  return (
    <div className="next-prayer-strip">
      <Link className="site-container next-prayer-strip__inner" href="/prayer-times">
        <NextPrayerSummary schedules={schedules} initialNowIso={initialNowIso} />
      </Link>
    </div>
  );
}
