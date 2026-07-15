import "server-only";

import { buildPrayerSchedule } from "@/lib/prayer/engine";
import { demoModeIsActive } from "@/lib/demo-mode";
import {
  prayerConfigurationSchema,
  type JumuahSession,
  type PrayerApiResponse,
  type PrayerConfiguration,
  type PrayerOverride,
  type PrayerSchedule,
  type SeasonalArrangement,
} from "@/lib/prayer/types";
import { addDaysToDateKey } from "@/lib/prayer/timezone";
import {
  publicationHorizon,
  validateJumuahWallTimes,
  validatePrayerOverrides,
  validateScheduleRange,
  validateWallTimeRules,
} from "@/lib/prayer/validation";
import { SupabaseConfigurationError } from "@/lib/supabase/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type GenericRow = Record<string, unknown>;

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) throw new Error(`Missing ${field}.`);
  return value;
}

function timeWithoutSeconds(value: unknown): string | undefined {
  return typeof value === "string" ? value.slice(0, 5) : undefined;
}

function mapJumuah(row: GenericRow): JumuahSession {
  return {
    id: requiredString(row.id, "Jumuah ID"),
    label: requiredString(row.label, "Jumuah label"),
    khutbahTime: requiredString(timeWithoutSeconds(row.khutbah_time), "Jumuah time"),
    prayerTime: timeWithoutSeconds(row.prayer_time),
    displayOrder: Number(row.display_order),
    notes: nullableString(row.notes) ?? undefined,
  };
}

function mapOverride(row: GenericRow): PrayerOverride {
  return {
    id: requiredString(row.id, "override ID"),
    date: requiredString(row.prayer_date, "override date"),
    prayer: requiredString(row.prayer, "override prayer") as PrayerOverride["prayer"],
    beginsAt: timeWithoutSeconds(row.begins_at),
    congregationAt: timeWithoutSeconds(row.congregation_at),
    unavailable: Boolean(row.unavailable),
    reason: requiredString(row.reason, "override reason"),
  };
}

function mapSeasonalArrangement(row: GenericRow): SeasonalArrangement {
  const details =
    row.details && typeof row.details === "object" && !Array.isArray(row.details)
      ? (row.details as GenericRow)
      : {};
  return {
    id: requiredString(row.id, "seasonal arrangement ID"),
    kind: requiredString(row.kind, "seasonal arrangement kind") as SeasonalArrangement["kind"],
    title: requiredString(row.title, "seasonal arrangement title"),
    startsOn: requiredString(row.starts_on, "seasonal start date"),
    endsOn: requiredString(row.ends_on, "seasonal end date"),
    publicNote: nullableString(details.public_note) ?? undefined,
    congregationRules:
      details.congregation_rules &&
      typeof details.congregation_rules === "object" &&
      !Array.isArray(details.congregation_rules)
        ? details.congregation_rules
        : {},
  };
}

function mapConfiguration(
  row: GenericRow,
  jumuahRows: GenericRow[],
  overrideRows: GenericRow[],
  seasonalRows: GenericRow[],
): PrayerConfiguration {
  return prayerConfigurationSchema.parse({
    id: row.id,
    name: row.name,
    version: Number(row.version),
    status: row.status,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    timezone: row.timezone,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    calculationMethod: row.calculation_method,
    madhab: row.madhab,
    highLatitudeRule: row.high_latitude_rule,
    adjustments: row.adjustments,
    congregationRules: row.congregation_rules,
    hijriAdjustment: Number(row.hijri_adjustment),
    sourceName: row.source_name,
    sourceReference: row.source_reference,
    calculationLibrary: row.calculation_library,
    calculationLibraryVersion: row.calculation_library_version,
    approvalNote: row.approval_note,
    approvedBy: row.approved_by,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    jumuahSessions: jumuahRows.map(mapJumuah),
    overrides: overrideRows.map(mapOverride),
    seasonalArrangements: seasonalRows.map(mapSeasonalArrangement),
  });
}

function unavailable(
  reason: Extract<PrayerApiResponse, { status: "unavailable" }>["reason"],
  message: string,
): PrayerApiResponse {
  return { status: "unavailable", generatedAt: new Date().toISOString(), reason, message };
}

export function buildContiguousPublishedSchedules(
  configurations: PrayerConfiguration[],
  firstDate: string,
  days: number,
): PrayerSchedule[] | null {
  const schedules: PrayerSchedule[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = addDaysToDateKey(firstDate, index);
    const configuration = [...configurations]
      .reverse()
      .find(
        (item) => item.effectiveFrom <= date && (!item.effectiveTo || item.effectiveTo >= date),
      );
    if (!configuration) return null;
    const schedule = buildPrayerSchedule(configuration, date);
    if (schedule.date !== date) return null;
    schedules.push(schedule);
  }
  return schedules.length === days ? schedules : null;
}

export async function getPublishedPrayerBundle(
  firstDate: string,
  days: number,
): Promise<PrayerApiResponse> {
  const finalDate = addDaysToDateKey(firstDate, days - 1);
  try {
    const client = createSupabaseServiceClient({
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    });
    let settingsRequest = client
      .from("prayer_settings")
      .select("*")
      .eq("status", "published")
      .lte("effective_from", finalDate)
      .or(`effective_to.is.null,effective_to.gte.${firstDate}`);
    if (!demoModeIsActive()) settingsRequest = settingsRequest.eq("demo_local_only", false);
    const { data: settingsData, error: settingsError } = await settingsRequest.order(
      "effective_from",
      { ascending: true },
    );

    if (settingsError) throw settingsError;
    const settingRows = (settingsData ?? []) as GenericRow[];
    if (settingRows.length === 0) {
      return unavailable(
        "not_approved",
        "No committee-approved prayer timetable is published for this period.",
      );
    }

    const ids = settingRows.map((row) => requiredString(row.id, "prayer settings ID"));
    const [jumuahResult, overridesResult, seasonalResult] = await Promise.all([
      client.from("jumuah_sessions").select("*").in("prayer_settings_id", ids),
      client
        .from("prayer_overrides")
        .select("*")
        .in("prayer_settings_id", ids)
        .gte("prayer_date", firstDate)
        .lte("prayer_date", finalDate),
      client
        .from("seasonal_arrangements")
        .select("*")
        .in("prayer_settings_id", ids)
        .lte("starts_on", finalDate)
        .gte("ends_on", firstDate),
    ]);
    if (jumuahResult.error) throw jumuahResult.error;
    if (overridesResult.error) throw overridesResult.error;
    if (seasonalResult.error) throw seasonalResult.error;
    const jumuahRows = (jumuahResult.data ?? []) as GenericRow[];
    const overrideRows = (overridesResult.data ?? []) as GenericRow[];
    const seasonalRows = (seasonalResult.data ?? []) as GenericRow[];

    const configurations = settingRows.map((row) => {
      const id = requiredString(row.id, "prayer settings ID");
      return mapConfiguration(
        row,
        jumuahRows.filter((item) => item.prayer_settings_id === id),
        overrideRows.filter((item) => item.prayer_settings_id === id),
        seasonalRows.filter((item) => item.prayer_settings_id === id),
      );
    });

    const schedules = buildContiguousPublishedSchedules(configurations, firstDate, days);
    if (!schedules) {
      return unavailable(
        "not_approved",
        "A complete committee-approved prayer timetable is not published for every requested date.",
      );
    }

    const issues = [
      ...configurations.flatMap((configuration) => {
        const horizon = publicationHorizon(configuration);
        const configurationSchedules = schedules.filter(
          (schedule) =>
            schedule.date >= configuration.effectiveFrom &&
            (!configuration.effectiveTo || schedule.date <= configuration.effectiveTo),
        );
        return [
          ...(horizon.ok ? [] : [horizon.issue]),
          ...validateWallTimeRules(configuration),
          ...validatePrayerOverrides(configuration),
          ...validateJumuahWallTimes(configuration, configurationSchedules),
        ];
      }),
      ...validateScheduleRange(schedules),
    ];
    if (issues.some((issue) => issue.severity === "error")) {
      return unavailable(
        "invalid_configuration",
        "The published prayer data did not pass safety checks. Please contact the masjid before travelling.",
      );
    }
    const lastUpdatedAt = configurations
      .map((configuration) => configuration.updatedAt)
      .sort()
      .at(-1)!;
    return {
      status: "available",
      generatedAt: new Date().toISOString(),
      lastUpdatedAt,
      schedules,
      issues,
    };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return unavailable(
        "not_configured",
        "Prayer information is awaiting committee approval and platform configuration.",
      );
    }
    console.error("Unable to load published prayer data", error);
    return unavailable(
      "temporarily_unavailable",
      "Prayer information is temporarily unavailable. Please contact the masjid before travelling.",
    );
  }
}
