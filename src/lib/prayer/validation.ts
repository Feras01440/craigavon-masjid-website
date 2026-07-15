import {
  prayerKeys,
  type PrayerConfiguration,
  type PrayerIssue,
  type PrayerKey,
  type PrayerSchedule,
} from "@/lib/prayer/types";
import { wallTimeToInstant } from "@/lib/prayer/timezone";

export const MAX_PUBLICATION_HORIZON_DAYS = 366;

export type PublicationHorizon =
  | { ok: true; firstDate: string; finalDate: string; days: number }
  | { ok: false; issue: PrayerIssue };

function daysBetween(firstDate: string, finalDate: string): number {
  const [firstYear, firstMonth, firstDay] = firstDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const [finalYear, finalMonth, finalDay] = finalDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return Math.floor(
    (Date.UTC(finalYear, finalMonth - 1, finalDay) -
      Date.UTC(firstYear, firstMonth - 1, firstDay)) /
      86_400_000,
  );
}

export function publicationHorizon(configuration: PrayerConfiguration): PublicationHorizon {
  if (!configuration.effectiveTo) {
    return {
      ok: false,
      issue: {
        severity: "error",
        code: "unbounded-publication-horizon",
        message:
          "Set an end date before publication so every effective day can be validated safely.",
      },
    };
  }
  const days = daysBetween(configuration.effectiveFrom, configuration.effectiveTo) + 1;
  if (days < 1 || days > MAX_PUBLICATION_HORIZON_DAYS) {
    return {
      ok: false,
      issue: {
        severity: "error",
        code: "publication-horizon-too-long",
        message: `The effective period must contain between 1 and ${MAX_PUBLICATION_HORIZON_DAYS} days, inclusive.`,
      },
    };
  }
  return {
    ok: true,
    firstDate: configuration.effectiveFrom,
    finalDate: configuration.effectiveTo,
    days,
  };
}

function nextStart(schedule: PrayerSchedule, index: number, nextDay?: PrayerSchedule): Date | null {
  const nextKey = prayerKeys[index + 1];
  if (nextKey) {
    const iso = schedule.prayers[nextKey].startsAt;
    return iso ? new Date(iso) : null;
  }
  const tomorrowFajr = nextDay?.prayers.fajr.startsAt;
  return tomorrowFajr ? new Date(tomorrowFajr) : null;
}

export function validatePrayerSchedule(
  schedule: PrayerSchedule,
  nextDay?: PrayerSchedule,
): PrayerIssue[] {
  const issues: PrayerIssue[] = [];
  let previousStart: Date | null = null;

  prayerKeys.forEach((key, index) => {
    const prayer = schedule.prayers[key];
    if (prayer.unavailable) {
      issues.push({
        severity: "warning",
        code: "missing-start-time",
        message: `${key} has no confirmed start time.`,
        date: schedule.date,
        prayer: key,
      });
      return;
    }
    if (!prayer.startsAt) {
      issues.push({
        severity: "error",
        code: "missing-start-time",
        message: `${key} has no confirmed start time.`,
        date: schedule.date,
        prayer: key,
      });
      return;
    }
    const start = new Date(prayer.startsAt);
    if (previousStart && start <= previousStart) {
      issues.push({
        severity: "error",
        code: "start-order",
        message: `${key} must be after the preceding prayer start.`,
        date: schedule.date,
        prayer: key,
      });
    }
    previousStart = start;

    if (key === "sunrise") return;
    if (!prayer.congregationAt) {
      issues.push({
        severity: "error",
        code: "missing-congregation",
        message: `${key} has no confirmed congregation time and cannot be published.`,
        date: schedule.date,
        prayer: key,
      });
      return;
    }
    const congregation = new Date(prayer.congregationAt);
    if (congregation < start) {
      issues.push({
        severity: "error",
        code: "congregation-before-start",
        message: `${key} congregation cannot be before its start time.`,
        date: schedule.date,
        prayer: key,
      });
    }
    const followingStart = nextStart(schedule, index, nextDay);
    if (followingStart && congregation >= followingStart) {
      issues.push({
        severity: "error",
        code: "congregation-after-next-prayer",
        message: `${key} congregation must be before the next prayer starts.`,
        date: schedule.date,
        prayer: key,
      });
    }
  });

  const dhuhr = schedule.prayers.dhuhr.startsAt ? new Date(schedule.prayers.dhuhr.startsAt) : null;
  const asr = schedule.prayers.asr.startsAt ? new Date(schedule.prayers.asr.startsAt) : null;
  let previousJumuah: Date | null = null;
  for (const session of schedule.jumuah) {
    const khutbah = new Date(session.khutbahAt);
    const prayer = session.prayerAt ? new Date(session.prayerAt) : khutbah;
    if (!schedule.isFriday) {
      issues.push({
        severity: "error",
        code: "jumuah-not-friday",
        message: "Friday prayer sessions can only appear on Friday.",
        date: schedule.date,
      });
    }
    if (dhuhr && khutbah < dhuhr) {
      issues.push({
        severity: "error",
        code: "jumuah-before-dhuhr",
        message: `${session.label} begins before Dhuhr starts.`,
        date: schedule.date,
      });
    }
    if (asr && prayer >= asr) {
      issues.push({
        severity: "error",
        code: "jumuah-after-asr",
        message: `${session.label} must finish before Asr starts.`,
        date: schedule.date,
      });
    }
    if (session.prayerAt && prayer < khutbah) {
      issues.push({
        severity: "error",
        code: "jumuah-prayer-before-khutbah",
        message: `${session.label} prayer cannot be before its khutbah.`,
        date: schedule.date,
      });
    }
    if (previousJumuah && khutbah <= previousJumuah) {
      issues.push({
        severity: "error",
        code: "jumuah-order",
        message: "Friday prayer sessions must be in chronological order without overlap.",
        date: schedule.date,
      });
    }
    previousJumuah = prayer;
  }
  return issues;
}

export function validateWallTimeRules(configuration: PrayerConfiguration): PrayerIssue[] {
  const issues: PrayerIssue[] = [];
  const dates = [configuration.effectiveFrom];
  if (configuration.effectiveTo) dates.push(configuration.effectiveTo);

  for (const date of dates) {
    for (const [prayer, rule] of Object.entries(configuration.congregationRules)) {
      if (rule.type !== "fixed") continue;
      const resolved = wallTimeToInstant(date, rule.time, configuration.timezone);
      if (!resolved.ok) {
        issues.push({
          severity: "error",
          code: `fixed-time-${resolved.reason}`,
          message: `${prayer} uses a ${resolved.reason} wall time on ${date}; choose an explicit valid time.`,
          date,
          prayer: prayer as PrayerIssue["prayer"],
        });
      }
    }
  }

  if (configuration.calculationMethod === "moonsighting_committee") {
    issues.push({
      severity: "warning",
      code: "method-controls-high-latitude",
      message:
        "Adhan's Moonsighting Committee method applies its own seasonal twilight adjustment; the separate high-latitude selection may not change output and must be checked against the approved timetable.",
    });
  }
  for (const arrangement of configuration.seasonalArrangements) {
    for (const date of [arrangement.startsOn, arrangement.endsOn]) {
      for (const [prayer, rule] of Object.entries(arrangement.congregationRules)) {
        if (rule.type !== "fixed") continue;
        const resolved = wallTimeToInstant(date, rule.time, configuration.timezone);
        if (!resolved.ok) {
          issues.push({
            severity: "error",
            code: "invalid-seasonal-fixed-time",
            message: `${arrangement.title}: ${prayer} uses a fixed time that is invalid at a clock change.`,
            date,
            prayer: prayer as PrayerKey,
          });
        }
      }
    }
  }
  return issues;
}

export function validatePrayerOverrides(configuration: PrayerConfiguration): PrayerIssue[] {
  return configuration.overrides.flatMap((override) => {
    const issues: PrayerIssue[] = [];
    if (
      override.date < configuration.effectiveFrom ||
      (configuration.effectiveTo && override.date > configuration.effectiveTo)
    ) {
      issues.push({
        severity: "error",
        code: "override-outside-effective-period",
        date: override.date,
        prayer: override.prayer,
        message: `${override.prayer} has an override outside this timetable's effective period.`,
      });
    }
    for (const [field, time] of [
      ["start", override.beginsAt],
      ["congregation", override.congregationAt],
    ] as const) {
      if (!time) continue;
      const resolved = wallTimeToInstant(override.date, time, configuration.timezone, "reject");
      if (!resolved.ok) {
        issues.push({
          severity: "error",
          code: `override-${field}-${resolved.reason}`,
          date: override.date,
          prayer: override.prayer,
          message: `${override.prayer} has a ${resolved.reason} override ${field} time on ${override.date}.`,
        });
      }
    }
    return issues;
  });
}

export function validateJumuahWallTimes(
  configuration: PrayerConfiguration,
  schedules: PrayerSchedule[],
): PrayerIssue[] {
  const fridays = schedules.filter((schedule) => schedule.isFriday);
  if (fridays.length === 0) return [];
  if (configuration.jumuahSessions.length === 0) {
    return [
      {
        severity: "warning",
        code: "missing-jumuah",
        date: fridays[0]?.date,
        message: "No Friday prayer session is configured for this timetable.",
      },
    ];
  }
  return fridays.flatMap((schedule) =>
    configuration.jumuahSessions.flatMap((session) => {
      const khutbah = wallTimeToInstant(schedule.date, session.khutbahTime, configuration.timezone);
      const prayer = session.prayerTime
        ? wallTimeToInstant(schedule.date, session.prayerTime, configuration.timezone)
        : null;
      if (khutbah.ok && (!prayer || prayer.ok)) return [];
      return [
        {
          severity: "error" as const,
          code: "invalid-jumuah-wall-time",
          date: schedule.date,
          message: `${session.label} uses a clock time that is invalid or ambiguous in ${configuration.timezone}.`,
        },
      ];
    }),
  );
}

export function validateScheduleRange(schedules: PrayerSchedule[]): PrayerIssue[] {
  return schedules.flatMap((schedule, index) =>
    validatePrayerSchedule(schedule, schedules[index + 1]),
  );
}

export function validateConfigurationSchedule(
  configuration: PrayerConfiguration,
  schedules: PrayerSchedule[],
): PrayerIssue[] {
  return [
    ...validateWallTimeRules(configuration),
    ...validatePrayerOverrides(configuration),
    ...validateScheduleRange(schedules),
    ...validateJumuahWallTimes(configuration, schedules),
  ];
}
