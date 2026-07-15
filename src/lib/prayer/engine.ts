import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes } from "adhan";

import {
  congregationPrayerKeys,
  prayerConfigurationSchema,
  prayerKeys,
  type CongregationPrayerKey,
  type PrayerConfiguration,
  type PrayerKey,
  type PrayerSchedule,
  type SchedulePrayer,
} from "@/lib/prayer/types";
import {
  addDaysToDateKey,
  dateKeyToHostNoon,
  formatGregorianDate,
  formatHijriDate,
  isFridayDateKey,
  wallTimeToInstant,
} from "@/lib/prayer/timezone";

const methodFactories = {
  moonsighting_committee: CalculationMethod.MoonsightingCommittee,
  muslim_world_league: CalculationMethod.MuslimWorldLeague,
  north_america: CalculationMethod.NorthAmerica,
  karachi: CalculationMethod.Karachi,
  egyptian: CalculationMethod.Egyptian,
  umm_al_qura: CalculationMethod.UmmAlQura,
} as const;

const highLatitudeRules = {
  middle_of_night: HighLatitudeRule.MiddleOfTheNight,
  seventh_of_night: HighLatitudeRule.SeventhOfTheNight,
  twilight_angle: HighLatitudeRule.TwilightAngle,
} as const;

function roundInstantUp(date: Date, intervalMinutes: number): Date {
  const intervalMs = intervalMinutes * 60_000;
  return new Date(Math.ceil(date.getTime() / intervalMs) * intervalMs);
}

function importedStartTimes(
  configuration: PrayerConfiguration,
  dateKey: string,
): Record<PrayerKey, Date | null> {
  return Object.fromEntries(
    prayerKeys.map((key) => {
      const imported = configuration.overrides.find(
        (item) => item.date === dateKey && item.prayer === key && item.beginsAt,
      );
      const resolved = imported?.beginsAt
        ? wallTimeToInstant(dateKey, imported.beginsAt, configuration.timezone)
        : null;
      return [key, resolved?.ok ? resolved.instant : null];
    }),
  ) as Record<PrayerKey, Date | null>;
}

function startTimes(
  configuration: PrayerConfiguration,
  dateKey: string,
): Record<PrayerKey, Date | null> {
  if (configuration.calculationMethod === "imported_official") {
    return importedStartTimes(configuration, dateKey);
  }
  const parameters = methodFactories[configuration.calculationMethod]();
  parameters.madhab = configuration.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  parameters.highLatitudeRule = highLatitudeRules[configuration.highLatitudeRule];
  parameters.adjustments = { ...configuration.adjustments };
  const coordinates = new Coordinates(configuration.latitude, configuration.longitude);
  const times = new PrayerTimes(coordinates, dateKeyToHostNoon(dateKey), parameters);
  return {
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

function initialPrayer(key: PrayerKey, startsAt: Date | null): SchedulePrayer {
  return {
    key,
    startsAt: startsAt?.toISOString() ?? null,
    congregationAt: null,
    joinedWith: null,
    unavailable: false,
    overrideReason: null,
  };
}

function applyCongregationRules(
  configuration: PrayerConfiguration,
  dateKey: string,
  prayers: Record<PrayerKey, SchedulePrayer>,
): void {
  const seasonalRules = configuration.seasonalArrangements
    .filter((arrangement) => arrangement.startsOn <= dateKey && arrangement.endsOn >= dateKey)
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn))
    .reduce<Partial<PrayerConfiguration["congregationRules"]>>(
      (rules, arrangement) => ({ ...rules, ...arrangement.congregationRules }),
      {},
    );
  for (const key of congregationPrayerKeys) {
    const rule = seasonalRules[key] ?? configuration.congregationRules[key];
    const prayer = prayers[key];
    if (!prayer?.startsAt) continue;
    if (rule.type === "unavailable") continue;
    if (rule.type === "joined") {
      prayer.joinedWith = rule.with;
      continue;
    }
    if (rule.type === "fixed") {
      const fixed = wallTimeToInstant(dateKey, rule.time, configuration.timezone);
      prayer.congregationAt = fixed.ok ? fixed.instant.toISOString() : null;
      continue;
    }
    let candidate = roundInstantUp(
      new Date(new Date(prayer.startsAt).getTime() + rule.minutes * 60_000),
      rule.roundTo,
    );
    if (rule.latest) {
      const cap = wallTimeToInstant(dateKey, rule.latest, configuration.timezone);
      if (cap.ok && candidate > cap.instant) candidate = cap.instant;
    }
    prayer.congregationAt = candidate.toISOString();
  }
}

function applyStartOverrides(
  configuration: PrayerConfiguration,
  dateKey: string,
  prayers: Record<PrayerKey, SchedulePrayer>,
): void {
  for (const override of configuration.overrides.filter((item) => item.date === dateKey)) {
    const prayer = prayers[override.prayer];
    if (!prayer) continue;
    prayer.overrideReason = override.reason;
    if (override.unavailable) {
      prayer.startsAt = null;
      prayer.congregationAt = null;
      prayer.unavailable = true;
      continue;
    }
    if (override.beginsAt) {
      const start = wallTimeToInstant(dateKey, override.beginsAt, configuration.timezone);
      prayer.startsAt = start.ok ? start.instant.toISOString() : null;
    }
  }
}

function applyCongregationOverrides(
  configuration: PrayerConfiguration,
  dateKey: string,
  prayers: Record<PrayerKey, SchedulePrayer>,
): void {
  for (const override of configuration.overrides.filter((item) => item.date === dateKey)) {
    const prayer = prayers[override.prayer];
    if (!prayer || override.unavailable) continue;
    if (override.congregationAt) {
      const congregation = wallTimeToInstant(
        dateKey,
        override.congregationAt,
        configuration.timezone,
      );
      prayer.congregationAt = congregation.ok ? congregation.instant.toISOString() : null;
      prayer.joinedWith = null;
    }
  }
}

function resolveJoinedCongregations(prayers: Record<PrayerKey, SchedulePrayer>): void {
  for (const key of congregationPrayerKeys) {
    const prayer = prayers[key];
    if (!prayer?.joinedWith) continue;
    const target = prayers[prayer.joinedWith];
    prayer.congregationAt = target?.unavailable ? null : (target?.congregationAt ?? null);
  }
}

export function buildPrayerSchedule(input: PrayerConfiguration, dateKey: string): PrayerSchedule {
  const configuration = prayerConfigurationSchema.parse(input);
  if (dateKey < configuration.effectiveFrom) {
    throw new Error("The prayer configuration is not effective on this date.");
  }
  if (configuration.effectiveTo && dateKey > configuration.effectiveTo) {
    throw new Error("The prayer configuration is not effective on this date.");
  }
  if (!configuration.publishedAt) {
    throw new Error("Only an approved, published prayer configuration can be rendered publicly.");
  }

  const starts = startTimes(configuration, dateKey);
  const prayers = Object.fromEntries(
    prayerKeys.map((key) => [key, initialPrayer(key, starts[key])]),
  ) as Record<PrayerKey, SchedulePrayer>;

  applyStartOverrides(configuration, dateKey, prayers);
  applyCongregationRules(configuration, dateKey, prayers);
  applyCongregationOverrides(configuration, dateKey, prayers);
  resolveJoinedCongregations(prayers);

  const isFriday = isFridayDateKey(dateKey);
  const jumuah = isFriday
    ? [...configuration.jumuahSessions]
        .sort((left, right) => left.displayOrder - right.displayOrder)
        .flatMap((session) => {
          const khutbah = wallTimeToInstant(dateKey, session.khutbahTime, configuration.timezone);
          const prayer = session.prayerTime
            ? wallTimeToInstant(dateKey, session.prayerTime, configuration.timezone)
            : null;
          if (!khutbah.ok || (prayer && !prayer.ok)) return [];
          return [
            {
              id: session.id ?? null,
              label: session.label,
              khutbahAt: khutbah.instant.toISOString(),
              prayerAt: prayer?.ok ? prayer.instant.toISOString() : null,
              notes: session.notes ?? null,
            },
          ];
        })
    : [];

  return {
    date: dateKey,
    timezone: configuration.timezone,
    isFriday,
    gregorianLabel: formatGregorianDate(dateKey, configuration.timezone),
    hijriLabel: formatHijriDate(dateKey, configuration.hijriAdjustment as -1 | 0 | 1),
    hijriAdjustment: configuration.hijriAdjustment as -1 | 0 | 1,
    prayers,
    jumuah,
    seasonalArrangements: configuration.seasonalArrangements
      .filter((arrangement) => arrangement.startsOn <= dateKey && arrangement.endsOn >= dateKey)
      .map((arrangement) => ({
        id: arrangement.id ?? null,
        kind: arrangement.kind,
        title: arrangement.title,
        startsOn: arrangement.startsOn,
        endsOn: arrangement.endsOn,
        publicNote: arrangement.publicNote ?? null,
      })),
    source: {
      name: configuration.sourceName,
      reference: configuration.sourceReference,
      calculationLibrary: configuration.calculationLibrary,
      calculationLibraryVersion: configuration.calculationLibraryVersion,
      configurationVersion: configuration.version,
      publishedAt: configuration.publishedAt,
    },
  };
}

export function buildScheduleRange(
  configuration: PrayerConfiguration,
  firstDate: string,
  days: number,
): PrayerSchedule[] {
  if (!Number.isInteger(days) || days < 1 || days > 370) {
    throw new Error("Schedule range must contain between 1 and 370 days.");
  }
  return Array.from({ length: days }, (_, index) =>
    buildPrayerSchedule(configuration, addDaysToDateKey(firstDate, index)),
  );
}

export function nextDateAfterRange(schedules: PrayerSchedule[]): string | null {
  const last = schedules.at(-1);
  return last ? addDaysToDateKey(last.date, 1) : null;
}

export function isCongregationPrayer(key: PrayerKey): key is CongregationPrayerKey {
  return key !== "sunrise";
}
