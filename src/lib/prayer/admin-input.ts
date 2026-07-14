import { z } from "zod";

import {
  congregationPrayerKeys,
  prayerConfigurationSchema,
  prayerKeys,
  type CongregationPrayerKey,
  type CongregationRule,
  type JumuahSession,
  type PrayerConfiguration,
} from "@/lib/prayer/types";
import type { Json } from "@/types/database";

const nilId = "00000000-0000-4000-8000-000000000001";
const calculationLibraryVersion = "4.4.4";

const identitySchema = z.object({
  id: z.uuid().optional(),
  expectedVersion: z.number().int().positive().optional(),
});

export type PrayerDraftInput = {
  id?: string;
  expectedVersion?: number;
  configuration: PrayerConfiguration;
  payload: Json;
  jumuahPayload: Json;
};

function value(formData: FormData, key: string): string {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

function optional(valueToCheck: string): string | undefined {
  return valueToCheck || undefined;
}

function ruleFromForm(formData: FormData, prayer: CongregationPrayerKey): unknown {
  const type = value(formData, `${prayer}RuleType`);
  if (type === "fixed") {
    return { type, time: value(formData, `${prayer}FixedTime`) };
  }
  if (type === "offset") {
    return {
      type,
      minutes: Number(value(formData, `${prayer}OffsetMinutes`)),
      roundTo: Number(value(formData, `${prayer}RoundTo`)),
      latest: optional(value(formData, `${prayer}Latest`)),
    };
  }
  if (type === "joined") {
    return { type, with: value(formData, `${prayer}JoinedWith`) };
  }
  return { type };
}

function jumuahFromForm(formData: FormData): unknown[] {
  const sessions: unknown[] = [];
  for (let index = 1; index <= 3; index += 1) {
    const label = value(formData, `jumuahLabel${index}`);
    const khutbahTime = value(formData, `jumuahKhutbah${index}`);
    const prayerTime = value(formData, `jumuahPrayer${index}`);
    const notes = value(formData, `jumuahNotes${index}`);
    if (!label && !khutbahTime && !prayerTime && !notes) continue;
    sessions.push({
      label,
      khutbahTime,
      prayerTime: optional(prayerTime),
      displayOrder: index,
      notes: optional(notes),
    });
  }
  return sessions;
}

export function parsePrayerDraftForm(
  formData: FormData,
): { success: true; data: PrayerDraftInput } | { success: false; error: z.ZodError } {
  const identity = identitySchema.safeParse({
    id: optional(value(formData, "id")),
    expectedVersion: optional(value(formData, "expectedVersion"))
      ? Number(value(formData, "expectedVersion"))
      : undefined,
  });

  const calculationMethod = value(formData, "calculationMethod");
  const jumuahSessions = jumuahFromForm(formData);
  const rawConfiguration = {
    id: identity.success ? (identity.data.id ?? nilId) : nilId,
    name: value(formData, "name"),
    version: identity.success ? (identity.data.expectedVersion ?? 1) : 1,
    status: "draft",
    effectiveFrom: value(formData, "effectiveFrom"),
    effectiveTo: optional(value(formData, "effectiveTo")) ?? null,
    timezone: value(formData, "timezone"),
    latitude: Number(value(formData, "latitude")),
    longitude: Number(value(formData, "longitude")),
    calculationMethod,
    madhab: value(formData, "madhab"),
    highLatitudeRule: value(formData, "highLatitudeRule"),
    adjustments: Object.fromEntries(
      prayerKeys.map((prayer) => [prayer, Number(value(formData, `${prayer}Adjustment`))]),
    ),
    congregationRules: Object.fromEntries(
      congregationPrayerKeys.map((prayer) => [prayer, ruleFromForm(formData, prayer)]),
    ),
    hijriAdjustment: Number(value(formData, "hijriAdjustment")),
    sourceName: value(formData, "sourceName"),
    sourceReference: optional(value(formData, "sourceReference")) ?? null,
    calculationLibrary: calculationMethod === "imported_official" ? "committee_import" : "adhan",
    calculationLibraryVersion:
      calculationMethod === "imported_official"
        ? value(formData, "sourceVersion") || "1"
        : calculationLibraryVersion,
    approvalNote: null,
    approvedBy: null,
    publishedAt: null,
    updatedAt: new Date().toISOString(),
    jumuahSessions,
    overrides: [],
  };
  const configuration = prayerConfigurationSchema.safeParse(rawConfiguration);
  if (!identity.success || !configuration.success) {
    const issues = [
      ...(identity.success ? [] : identity.error.issues),
      ...(configuration.success ? [] : configuration.error.issues),
    ];
    return { success: false, error: new z.ZodError(issues) };
  }

  const parsed = configuration.data;
  const payload: Json = {
    name: parsed.name,
    effective_from: parsed.effectiveFrom,
    effective_to: parsed.effectiveTo,
    timezone: parsed.timezone,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    calculation_method: parsed.calculationMethod,
    madhab: parsed.madhab,
    high_latitude_rule: parsed.highLatitudeRule,
    adjustments: parsed.adjustments,
    congregation_rules: parsed.congregationRules as unknown as Json,
    hijri_adjustment: parsed.hijriAdjustment,
    source_name: parsed.sourceName,
    source_reference: parsed.sourceReference,
    calculation_library: parsed.calculationLibrary,
    calculation_library_version: parsed.calculationLibraryVersion,
  };
  const jumuahPayload = parsed.jumuahSessions.map((session: JumuahSession) => ({
    label: session.label,
    khutbah_time: session.khutbahTime,
    prayer_time: session.prayerTime ?? null,
    display_order: session.displayOrder,
    notes: session.notes ?? null,
  })) as Json;

  return {
    success: true,
    data: {
      id: identity.data.id,
      expectedVersion: identity.data.expectedVersion,
      configuration: parsed,
      payload,
      jumuahPayload,
    },
  };
}

export function congregationRuleDefaults(
  rule: CongregationRule | undefined,
): Record<string, string | number> {
  if (!rule) return { type: "unavailable" };
  if (rule.type === "fixed") return { type: rule.type, fixedTime: rule.time };
  if (rule.type === "joined") return { type: rule.type, joinedWith: rule.with };
  if (rule.type === "offset") {
    return {
      type: rule.type,
      offsetMinutes: rule.minutes,
      roundTo: rule.roundTo,
      latest: rule.latest ?? "",
    };
  }
  return { type: rule.type };
}
