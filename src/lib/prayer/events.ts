import {
  congregationPrayerKeys,
  prayerKeys,
  type PrayerKey,
  type PrayerSchedule,
} from "@/lib/prayer/types";

export type UpcomingPrayerEvent = {
  kind: "prayer_start" | "congregation" | "jumuah";
  key: PrayerKey | "jumuah";
  label: string;
  at: string;
  date: string;
};

const labels: Record<PrayerKey, string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export function scheduleEvents(schedules: PrayerSchedule[]): UpcomingPrayerEvent[] {
  const events: UpcomingPrayerEvent[] = [];
  for (const schedule of schedules) {
    for (const key of prayerKeys) {
      const prayer = schedule.prayers[key];
      if (prayer.startsAt && !prayer.unavailable) {
        events.push({
          kind: "prayer_start",
          key,
          label: `${labels[key]} starts`,
          at: prayer.startsAt,
          date: schedule.date,
        });
      }
    }
    for (const key of congregationPrayerKeys) {
      const prayer = schedule.prayers[key];
      if (prayer.congregationAt && !prayer.unavailable && !prayer.joinedWith) {
        events.push({
          kind: "congregation",
          key,
          label: `${labels[key]} congregation`,
          at: prayer.congregationAt,
          date: schedule.date,
        });
      }
    }
    for (const session of schedule.jumuah) {
      events.push({
        kind: "jumuah",
        key: "jumuah",
        label: `${session.label} prayer`,
        at: session.prayerAt ?? session.khutbahAt,
        date: schedule.date,
      });
    }
  }
  return events.sort((left, right) => left.at.localeCompare(right.at));
}

export function nextEvent(
  schedules: PrayerSchedule[],
  now: Date,
  kinds: UpcomingPrayerEvent["kind"][],
): UpcomingPrayerEvent | null {
  const nowIso = now.toISOString();
  return (
    scheduleEvents(schedules).find((event) => kinds.includes(event.kind) && event.at > nowIso) ??
    null
  );
}

export type NextPrayerDetail = {
  key: Exclude<PrayerKey, "sunrise">;
  date: string;
  startsAt: string | null;
  congregationAt: string | null;
  joinedWith: PrayerSchedule["prayers"][PrayerKey]["joinedWith"];
};

/* The next congregational prayer (sunrise excluded), keyed on whichever of its
   start or congregation instants is still ahead — shared by every "next
   prayer" surface so they can never disagree. */
export function nextPrayerDetail(schedules: PrayerSchedule[], now: Date): NextPrayerDetail | null {
  const nowIso = now.toISOString();
  for (const schedule of schedules) {
    for (const key of prayerKeys) {
      if (key === "sunrise") continue;
      const prayer = schedule.prayers[key];
      if (prayer.unavailable) continue;
      const anchor = prayer.congregationAt ?? prayer.startsAt;
      if (anchor && anchor > nowIso) {
        return {
          key,
          date: schedule.date,
          startsAt: prayer.startsAt,
          congregationAt: prayer.congregationAt,
          joinedWith: prayer.joinedWith,
        };
      }
    }
  }
  return null;
}
