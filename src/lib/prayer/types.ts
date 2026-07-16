import { z } from "zod";

export const prayerKeys = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
export const congregationPrayerKeys = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

export type PrayerKey = (typeof prayerKeys)[number];
export type CongregationPrayerKey = (typeof congregationPrayerKeys)[number];

export const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Enter a time in 24-hour HH:MM format.");

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date in YYYY-MM-DD format.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number) as [number, number, number];
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() + 1 === month &&
      parsed.getUTCDate() === day
    );
  }, "Enter a real calendar date in YYYY-MM-DD format.");

const fixedRuleSchema = z.object({
  type: z.literal("fixed"),
  time: timeSchema,
});

const offsetRuleSchema = z.object({
  type: z.literal("offset"),
  minutes: z.number().int().min(0).max(240),
  roundTo: z.union([z.literal(1), z.literal(5), z.literal(10), z.literal(15)]).default(1),
  latest: timeSchema.optional(),
});

const joinedRuleSchema = z.object({
  type: z.literal("joined"),
  with: z.enum(["fajr", "dhuhr", "asr", "maghrib"]),
});

const unavailableRuleSchema = z.object({
  type: z.literal("unavailable"),
});

export const congregationRuleSchema = z.discriminatedUnion("type", [
  fixedRuleSchema,
  offsetRuleSchema,
  joinedRuleSchema,
  unavailableRuleSchema,
]);

export type CongregationRule = z.infer<typeof congregationRuleSchema>;

export const jumuahSessionSchema = z
  .object({
    id: z.string().uuid().optional(),
    label: z.string().trim().min(1).max(100),
    khutbahTime: timeSchema,
    prayerTime: timeSchema.optional(),
    displayOrder: z.number().int().min(1).max(20),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.prayerTime && value.prayerTime < value.khutbahTime) {
      context.addIssue({
        code: "custom",
        path: ["prayerTime"],
        message: "The Friday prayer cannot be before the khutbah.",
      });
    }
  });

export type JumuahSession = z.infer<typeof jumuahSessionSchema>;

export const prayerOverrideSchema = z
  .object({
    id: z.string().uuid().optional(),
    date: dateKeySchema,
    prayer: z.enum(prayerKeys),
    beginsAt: timeSchema.optional(),
    congregationAt: timeSchema.optional(),
    unavailable: z.boolean().default(false),
    reason: z.string().trim().min(1).max(500),
  })
  .superRefine((value, context) => {
    if (!value.unavailable && !value.beginsAt && !value.congregationAt) {
      context.addIssue({
        code: "custom",
        message: "Provide an adjusted time or mark the prayer unavailable.",
      });
    }
    if (value.unavailable && (value.beginsAt || value.congregationAt)) {
      context.addIssue({
        code: "custom",
        message: "An unavailable prayer cannot also have a time.",
      });
    }
  });

export type PrayerOverride = z.infer<typeof prayerOverrideSchema>;

const seasonalCongregationRulesSchema = z
  .object({
    fajr: congregationRuleSchema.optional(),
    dhuhr: congregationRuleSchema.optional(),
    asr: congregationRuleSchema.optional(),
    maghrib: congregationRuleSchema.optional(),
    isha: congregationRuleSchema.optional(),
  })
  .strict();

export const seasonalArrangementSchema = z
  .object({
    id: z.string().uuid().optional(),
    kind: z.enum(["ramadan", "eid_al_fitr", "eid_al_adha", "closure", "other"]),
    title: z.string().trim().min(1).max(160),
    startsOn: dateKeySchema,
    endsOn: dateKeySchema,
    publicNote: z.string().trim().max(1000).optional(),
    congregationRules: seasonalCongregationRulesSchema.default({}),
  })
  .superRefine((value, context) => {
    if (value.endsOn < value.startsOn) {
      context.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "The end date cannot be before the start date.",
      });
    }
  });

export type SeasonalArrangement = z.infer<typeof seasonalArrangementSchema>;

const adjustmentsSchema = z.object({
  fajr: z.number().int().min(-120).max(120).default(0),
  sunrise: z.number().int().min(-120).max(120).default(0),
  dhuhr: z.number().int().min(-120).max(120).default(0),
  asr: z.number().int().min(-120).max(120).default(0),
  maghrib: z.number().int().min(-120).max(120).default(0),
  isha: z.number().int().min(-120).max(120).default(0),
});

const congregationRulesSchema = z.object({
  fajr: congregationRuleSchema,
  dhuhr: congregationRuleSchema,
  asr: congregationRuleSchema,
  maghrib: congregationRuleSchema,
  isha: congregationRuleSchema,
});

export const prayerConfigurationSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    version: z.number().int().positive(),
    status: z.enum(["draft", "scheduled", "published", "archived"]),
    effectiveFrom: dateKeySchema,
    effectiveTo: dateKeySchema.nullable(),
    timezone: z.string().trim().min(1).max(100),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    calculationMethod: z.enum([
      "moonsighting_committee",
      "muslim_world_league",
      "north_america",
      "karachi",
      "egyptian",
      "umm_al_qura",
      "imported_official",
    ]),
    madhab: z.enum(["standard", "hanafi"]),
    highLatitudeRule: z.enum(["middle_of_night", "seventh_of_night", "twilight_angle"]),
    adjustments: adjustmentsSchema,
    congregationRules: congregationRulesSchema,
    hijriAdjustment: z.number().int().min(-1).max(1),
    sourceName: z.string().trim().min(1).max(200),
    sourceReference: z.string().trim().max(500).nullable(),
    calculationLibrary: z.enum(["adhan", "committee_import"]),
    calculationLibraryVersion: z.string().trim().min(1).max(30),
    approvalNote: z.string().trim().min(1).max(1000).nullable(),
    approvedBy: z.string().uuid().nullable(),
    publishedAt: z.string().datetime({ offset: true }).nullable(),
    updatedAt: z.string().datetime({ offset: true }),
    jumuahSessions: z.array(jumuahSessionSchema).max(10),
    // A full imported year needs ~2,200 dated entries (366 days × 6 starts);
    // the ceiling leaves headroom for congregation rows on top.
    overrides: z.array(prayerOverrideSchema).max(2600),
    seasonalArrangements: z.array(seasonalArrangementSchema).max(100).default([]),
  })
  .superRefine((value, context) => {
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: value.timezone }).format();
    } catch {
      context.addIssue({
        code: "custom",
        path: ["timezone"],
        message: "Use a valid IANA timezone.",
      });
    }
    if (value.effectiveTo && value.effectiveTo < value.effectiveFrom) {
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message: "The end date cannot be before the start date.",
      });
    }
    if (
      value.status === "published" &&
      (!value.approvedBy || !value.publishedAt || !value.approvalNote)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Published prayer settings require an approver, approval note and publication time.",
      });
    }
    if (
      value.calculationMethod === "imported_official" &&
      value.calculationLibrary !== "committee_import"
    ) {
      context.addIssue({
        code: "custom",
        path: ["calculationLibrary"],
        message: "An imported timetable must identify the committee import as its source.",
      });
    }
    if (value.calculationMethod !== "imported_official" && value.calculationLibrary !== "adhan") {
      context.addIssue({
        code: "custom",
        path: ["calculationLibrary"],
        message: "Calculated timetables must use the locked Adhan calculation library.",
      });
    }
    for (const [prayer, rule] of Object.entries(value.congregationRules)) {
      if (rule.type !== "joined") continue;
      if (rule.with === prayer) {
        context.addIssue({
          code: "custom",
          path: ["congregationRules", prayer],
          message: "A prayer cannot be joined to itself.",
        });
        continue;
      }

      const visited = new Set<string>([prayer]);
      let target = rule.with;
      let cycle = false;
      while (true) {
        const targetRule = value.congregationRules[target];
        if (targetRule.type !== "joined") break;
        if (visited.has(target)) {
          cycle = true;
          break;
        }
        visited.add(target);
        target = targetRule.with;
      }
      if (cycle || visited.has(target)) {
        context.addIssue({
          code: "custom",
          path: ["congregationRules", prayer],
          message: "Joined congregation rules cannot form a cycle.",
        });
        continue;
      }

      const directTarget = value.congregationRules[rule.with];
      if (directTarget.type === "joined") {
        context.addIssue({
          code: "custom",
          path: ["congregationRules", prayer],
          message:
            "A joined congregation must point directly to a fixed or offset rule; multi-hop joins are not allowed.",
        });
      } else if (directTarget.type === "unavailable") {
        context.addIssue({
          code: "custom",
          path: ["congregationRules", prayer],
          message:
            "A joined congregation must point to a prayer with a confirmed congregation rule.",
        });
      }
    }
  });

export type PrayerConfiguration = z.infer<typeof prayerConfigurationSchema>;

export type SchedulePrayer = {
  key: PrayerKey;
  startsAt: string | null;
  congregationAt: string | null;
  joinedWith: CongregationPrayerKey | null;
  unavailable: boolean;
  overrideReason: string | null;
};

export type ScheduleJumuah = {
  id: string | null;
  label: string;
  khutbahAt: string;
  prayerAt: string | null;
  notes: string | null;
};

export type PrayerSchedule = {
  date: string;
  timezone: string;
  isFriday: boolean;
  gregorianLabel: string;
  hijriLabel: string;
  hijriAdjustment: -1 | 0 | 1;
  prayers: Record<PrayerKey, SchedulePrayer>;
  jumuah: ScheduleJumuah[];
  seasonalArrangements: Array<{
    id: string | null;
    kind: SeasonalArrangement["kind"];
    title: string;
    startsOn: string;
    endsOn: string;
    publicNote: string | null;
  }>;
  source: {
    name: string;
    reference: string | null;
    calculationLibrary: string;
    calculationLibraryVersion: string;
    configurationVersion: number;
    publishedAt: string;
  };
};

export type PrayerIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  date?: string;
  prayer?: PrayerKey;
};

export type PrayerCoverage = {
  requestedDays: number;
  coveredDays: number;
  /** Final date (YYYY-MM-DD) with published coverage in this bundle. */
  endsOn: string;
  complete: boolean;
};

export type PrayerBundle = {
  status: "available";
  generatedAt: string;
  lastUpdatedAt: string;
  schedules: PrayerSchedule[];
  issues: PrayerIssue[];
  /**
   * Optional so that cached last-known-good payloads written before this
   * field existed (e.g. the TV display's browser store) remain readable.
   */
  coverage?: PrayerCoverage;
};

export type PrayerUnavailable = {
  status: "unavailable";
  generatedAt: string;
  reason: "not_configured" | "not_approved" | "temporarily_unavailable" | "invalid_configuration";
  message: string;
};

export type PrayerApiResponse = PrayerBundle | PrayerUnavailable;
