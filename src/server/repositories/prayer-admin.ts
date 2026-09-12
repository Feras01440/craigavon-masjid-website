import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { prayerConfigurationSchema, type PrayerConfiguration } from "@/lib/prayer/types";
import type {
  Database,
  JumuahSessionRow,
  PrayerOverrideRow,
  PrayerSettingsRow,
  SeasonalArrangementRow,
} from "@/types/database";

function trimTime(value: string | null): string | undefined {
  return value ? value.slice(0, 5) : undefined;
}

export function mapStoredPrayerConfiguration(
  settings: PrayerSettingsRow,
  sessions: JumuahSessionRow[],
  overrides: PrayerOverrideRow[],
  seasonalArrangements: SeasonalArrangementRow[],
): PrayerConfiguration {
  return prayerConfigurationSchema.parse({
    id: settings.id,
    name: settings.name,
    version: settings.version,
    status: settings.status,
    effectiveFrom: settings.effective_from,
    effectiveTo: settings.effective_to,
    timezone: settings.timezone,
    latitude: Number(settings.latitude),
    longitude: Number(settings.longitude),
    calculationMethod: settings.calculation_method,
    madhab: settings.madhab,
    highLatitudeRule: settings.high_latitude_rule,
    adjustments: settings.adjustments,
    congregationRules: settings.congregation_rules,
    hijriAdjustment: settings.hijri_adjustment,
    sourceName: settings.source_name,
    sourceReference: settings.source_reference,
    calculationLibrary: settings.calculation_library,
    calculationLibraryVersion: settings.calculation_library_version,
    approvalNote: settings.approval_note,
    approvedBy: settings.approved_by,
    publishedAt: settings.published_at,
    updatedAt: settings.updated_at,
    jumuahSessions: sessions.map((session) => ({
      id: session.id,
      label: session.label,
      khutbahTime: session.khutbah_time.slice(0, 5),
      prayerTime: trimTime(session.prayer_time),
      displayOrder: session.display_order,
      notes: session.notes ?? undefined,
    })),
    overrides: overrides.map((override) => ({
      id: override.id,
      date: override.prayer_date,
      prayer: override.prayer,
      beginsAt: trimTime(override.begins_at),
      congregationAt: trimTime(override.congregation_at),
      unavailable: override.unavailable,
      reason: override.reason,
    })),
    seasonalArrangements: seasonalArrangements.map((arrangement) => {
      const details =
        arrangement.details &&
        typeof arrangement.details === "object" &&
        !Array.isArray(arrangement.details)
          ? arrangement.details
          : {};
      return {
        id: arrangement.id,
        kind: arrangement.kind,
        title: arrangement.title,
        startsOn: arrangement.starts_on,
        endsOn: arrangement.ends_on,
        publicNote: typeof details.public_note === "string" ? details.public_note : undefined,
        congregationRules:
          details.congregation_rules && typeof details.congregation_rules === "object"
            ? details.congregation_rules
            : {},
      };
    }),
  });
}

export async function getPrayerConfigurationForAdmin(
  client: SupabaseClient<Database>,
  id: string,
): Promise<PrayerConfiguration | null> {
  const [settingsResult, sessionsResult, overridesResult, seasonalResult] = await Promise.all([
    client.from("prayer_settings").select("*").eq("id", id).maybeSingle(),
    client.from("jumuah_sessions").select("*").eq("prayer_settings_id", id).order("display_order"),
    client.from("prayer_overrides").select("*").eq("prayer_settings_id", id).order("prayer_date"),
    client
      .from("seasonal_arrangements")
      .select("*")
      .eq("prayer_settings_id", id)
      .order("starts_on"),
  ]);
  if (
    settingsResult.error ||
    sessionsResult.error ||
    overridesResult.error ||
    seasonalResult.error
  ) {
    throw new Error("Prayer settings could not be loaded safely.");
  }
  if (!settingsResult.data) return null;
  return mapStoredPrayerConfiguration(
    settingsResult.data,
    sessionsResult.data,
    overridesResult.data,
    seasonalResult.data,
  );
}
