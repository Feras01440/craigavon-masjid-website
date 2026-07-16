import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildPrayerSchedule, buildScheduleRange } from "@/lib/prayer/engine";
import { dateKeySchema, prayerConfigurationSchema } from "@/lib/prayer/types";
import {
  MAX_PUBLICATION_HORIZON_DAYS,
  publicationHorizon,
  validateConfigurationSchedule,
  validatePrayerOverrides,
  validatePrayerSchedule,
} from "@/lib/prayer/validation";
import { buildContiguousPublishedSchedules } from "@/server/repositories/prayer";
import { prayerConfigurationFixture } from "@/../tests/fixtures/prayer-configuration";

const completeWorkflowMigration = readFileSync(
  new URL(
    "../../supabase/migrations/20260715120000_complete_product_workflows.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("prayer input hardening", () => {
  it("accepts leap day but rejects impossible ISO calendar dates", () => {
    expect(dateKeySchema.safeParse("2024-02-29").success).toBe(true);
    for (const impossible of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10"]) {
      expect(dateKeySchema.safeParse(impossible).success).toBe(false);
    }
  });

  it("accepts the offset timestamps returned by Supabase timestamptz columns", () => {
    const parsed = prayerConfigurationSchema.safeParse(
      prayerConfigurationFixture({
        publishedAt: "2026-07-15T16:35:00+00:00",
        updatedAt: "2026-07-15T16:35:00+00:00",
      }),
    );

    expect(parsed.success).toBe(true);
  });

  it("keeps the rolling local demonstration timetable safe from 2020 through 2100", () => {
    const errors: ReturnType<typeof validateConfigurationSchedule> = [];

    for (let year = 2020; year <= 2100; year += 1) {
      const firstDate = `${year}-01-01`;
      const finalDate = `${year}-12-31`;
      const days = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
      const configuration = prayerConfigurationFixture({
        effectiveFrom: firstDate,
        effectiveTo: finalDate,
        latitude: 54.45,
        longitude: -6.39,
        calculationMethod: "umm_al_qura",
        madhab: "hanafi",
        highLatitudeRule: "middle_of_night",
        congregationRules: {
          fajr: { type: "offset", minutes: 30, roundTo: 5 },
          dhuhr: { type: "offset", minutes: 20, roundTo: 5 },
          asr: { type: "offset", minutes: 15, roundTo: 5 },
          maghrib: { type: "offset", minutes: 10, roundTo: 5 },
          // Thirty minutes is the largest Isha offset anywhere in the SQL
          // seed, so applying it all year is stricter than its seasonal use.
          isha: { type: "offset", minutes: 30, roundTo: 5 },
        },
        jumuahSessions: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            label: "[LOCAL DEMO] Friday session",
            khutbahTime: "13:50",
            prayerTime: "14:00",
            displayOrder: 1,
          },
        ],
        overrides: [
          {
            date: `${year}-02-01`,
            prayer: "maghrib",
            unavailable: true,
            reason: "[LOCAL DEMO] One-date unavailable override.",
          },
        ],
        seasonalArrangements: [],
      });
      const schedules = buildScheduleRange(configuration, firstDate, days);

      expect(publicationHorizon(configuration).ok).toBe(true);
      errors.push(
        ...validateConfigurationSchedule(configuration, schedules).filter(
          (issue) => issue.severity === "error",
        ),
      );
    }

    expect(errors).toEqual([]);
    expect(completeWorkflowMigration).toContain(
      "'Europe/London', 54.45, -6.39, 'umm_al_qura', 'hanafi', 'middle_of_night'",
    );
    expect(completeWorkflowMigration).toContain("'[LOCAL DEMO] Friday session', '13:50', '14:00'");
    expect(completeWorkflowMigration).not.toContain("[LOCAL DEMO] Second Friday session");
    expect(completeWorkflowMigration).toContain("v_prayer_id, current_date + 1, 'maghrib', true");
    expect(completeWorkflowMigration).toContain(
      '"isha":{"type":"offset","minutes":30,"roundTo":5}',
    );
    expect(completeWorkflowMigration).not.toContain('"latest"');
  }, 30_000);

  it("rejects joined congregation cycles", () => {
    const base = prayerConfigurationFixture();
    const parsed = prayerConfigurationSchema.safeParse({
      ...base,
      congregationRules: {
        ...base.congregationRules,
        fajr: { type: "joined", with: "dhuhr" },
        dhuhr: { type: "joined", with: "fajr" },
      },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes("cycle"))).toBe(true);
    }
  });

  it("rejects multi-hop and unresolved joined congregations", () => {
    const base = prayerConfigurationFixture();
    const multiHop = prayerConfigurationSchema.safeParse({
      ...base,
      congregationRules: {
        ...base.congregationRules,
        maghrib: { type: "joined", with: "asr" },
        isha: { type: "joined", with: "maghrib" },
      },
    });
    const unresolved = prayerConfigurationSchema.safeParse({
      ...base,
      congregationRules: {
        ...base.congregationRules,
        maghrib: { type: "unavailable" },
        isha: { type: "joined", with: "maghrib" },
      },
    });
    expect(multiHop.success).toBe(false);
    expect(unresolved.success).toBe(false);
  });

  it("treats a configured missing congregation as a publication error", () => {
    const base = prayerConfigurationFixture();
    const schedule = buildPrayerSchedule(
      prayerConfigurationFixture({
        congregationRules: { ...base.congregationRules, asr: { type: "unavailable" } },
      }),
      "2026-07-13",
    );
    expect(
      validatePrayerSchedule(schedule).some(
        (issue) => issue.code === "missing-congregation" && issue.severity === "error",
      ),
    ).toBe(true);
  });

  it("rejects ambiguous and nonexistent override wall times in the configured timezone", () => {
    const spring = prayerConfigurationFixture({
      effectiveFrom: "2026-03-29",
      effectiveTo: "2026-03-29",
      overrides: [
        {
          date: "2026-03-29",
          prayer: "fajr",
          beginsAt: "01:30",
          unavailable: false,
          reason: "Nonexistent spring time test",
        },
      ],
    });
    const autumn = prayerConfigurationFixture({
      effectiveFrom: "2026-10-25",
      effectiveTo: "2026-10-25",
      overrides: [
        {
          date: "2026-10-25",
          prayer: "fajr",
          congregationAt: "01:30",
          unavailable: false,
          reason: "Ambiguous autumn time test",
        },
      ],
    });
    expect(
      validatePrayerOverrides(spring).some((issue) => issue.code.endsWith("nonexistent")),
    ).toBe(true);
    expect(validatePrayerOverrides(autumn).some((issue) => issue.code.endsWith("ambiguous"))).toBe(
      true,
    );
  });
});

describe("bounded publication horizon", () => {
  it("requires an end date and accepts at most 366 inclusive calendar days", () => {
    expect(publicationHorizon(prayerConfigurationFixture()).ok).toBe(false);
    const maximum = publicationHorizon(
      prayerConfigurationFixture({
        effectiveFrom: "2026-01-01",
        effectiveTo: "2027-01-01",
      }),
    );
    expect(maximum).toEqual({
      ok: true,
      firstDate: "2026-01-01",
      finalDate: "2027-01-01",
      days: MAX_PUBLICATION_HORIZON_DAYS,
    });
    expect(
      publicationHorizon(
        prayerConfigurationFixture({
          effectiveFrom: "2026-01-01",
          effectiveTo: "2027-01-02",
        }),
      ).ok,
    ).toBe(false);
  });

  it("serves the covered prefix and stops at the first uncovered date", () => {
    // Valid published days must remain available right up to a timetable's
    // end date; only the uncovered tail is withheld. The bundle's coverage
    // descriptor tells callers the window is incomplete.
    const first = prayerConfigurationFixture({
      id: "41111111-1111-4111-8111-111111111111",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-01-02",
    });
    const gappedSecond = prayerConfigurationFixture({
      id: "51111111-1111-4111-8111-111111111111",
      effectiveFrom: "2026-01-04",
      effectiveTo: "2026-01-05",
    });
    expect(
      buildContiguousPublishedSchedules([first, gappedSecond], "2026-01-01", 5).map(
        (schedule) => schedule.date,
      ),
    ).toEqual(["2026-01-01", "2026-01-02"]);
  });

  it("returns nothing when the first requested date is uncovered", () => {
    const future = prayerConfigurationFixture({
      id: "81111111-1111-4111-8111-111111111111",
      effectiveFrom: "2026-01-04",
      effectiveTo: "2026-01-05",
    });
    expect(buildContiguousPublishedSchedules([future], "2026-01-01", 5)).toEqual([]);
  });

  it("returns the exact requested sequence across adjacent approved configurations", () => {
    const first = prayerConfigurationFixture({
      id: "61111111-1111-4111-8111-111111111111",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-01-02",
    });
    const second = prayerConfigurationFixture({
      id: "71111111-1111-4111-8111-111111111111",
      effectiveFrom: "2026-01-03",
      effectiveTo: "2026-01-05",
    });
    expect(
      buildContiguousPublishedSchedules([first, second], "2026-01-01", 5)?.map(
        (schedule) => schedule.date,
      ),
    ).toEqual(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"]);
  });
});

describe("prayer migration privilege boundaries", () => {
  const migration = readFileSync(
    new URL("../../supabase/migrations/20260713213000_initial_platform.sql", import.meta.url),
    "utf8",
  );

  it("runs every prayer mutation RPC as a checked security definer", () => {
    for (const functionName of [
      "save_prayer_draft",
      "publish_prayer_settings",
      "withdraw_prayer_settings",
      "clone_prayer_settings_draft",
      "save_prayer_override",
      "delete_prayer_override",
    ]) {
      const start = migration.indexOf(`create or replace function public.${functionName}(`);
      const end = migration.indexOf("\n$$;", start);
      const definition = migration.slice(start, end);
      expect(start).toBeGreaterThan(-1);
      expect(definition).toContain("security definer");
      expect(definition).toContain("public.has_aal2()");
      expect(definition).toContain("public.has_permission('prayer:");
    }
  });

  it("records atomic withdrawal or replacement reason and versions in the audit trail", () => {
    const start = migration.indexOf("create or replace function public.withdraw_prayer_settings(");
    const end = migration.indexOf("\n$$;", start);
    const definition = migration.slice(start, end);
    expect(definition).toContain("for update");
    expect(definition).toContain("app.prayer_withdrawal_authorised");
    expect(definition).toContain("insert into public.audit_log");
    expect(definition).toContain("'reason', trim(p_reason)");
    expect(definition).toContain("'replacement_version', replacement_settings_version");
  });

  it("does not grant direct mutation privileges on prayer tables", () => {
    const authenticatedGrant = migration.match(
      /grant select, insert, update on public\.admin_profiles[\s\S]*?to authenticated;/,
    )?.[0];
    expect(authenticatedGrant).toBeDefined();
    expect(authenticatedGrant).not.toContain("public.prayer_settings");
    expect(authenticatedGrant).not.toContain("public.jumuah_sessions");
    expect(authenticatedGrant).not.toContain("public.prayer_overrides");
  });

  it("allows only the trusted service boundary to publish or replace prayer settings", () => {
    expect(migration).toContain(
      "grant execute on function public.publish_prayer_settings(uuid, uuid, integer, text) to service_role;",
    );
    expect(migration).toContain(
      "grant execute on function public.withdraw_prayer_settings(uuid, uuid, integer, text, uuid, integer, text) to service_role;",
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.publish_prayer_settings\([^\n]+\) to authenticated;/,
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.withdraw_prayer_settings\([^\n]+\) to authenticated;/,
    );
  });

  it("removes anonymous base-table reads and direct site-setting writes", () => {
    expect(migration).toContain("revoke all on all tables in schema public from anon;");
    expect(migration).toContain(
      "grant execute on function public.save_site_setting(uuid, text, integer, public.content_status, jsonb) to service_role;",
    );
    expect(migration).not.toContain(
      "public.site_settings, public.content_items, public.media_assets",
    );
  });

  it("gives the authorised retention job an independent fingerprint purge", () => {
    const start = migration.indexOf(
      "create or replace function public.purge_expired_operational_data()",
    );
    const end = migration.indexOf("\n$$;", start);
    const definition = migration.slice(start, end);
    expect(definition).toContain("delete from public.enquiries");
    expect(definition).toContain("delete from public.rate_limits");
    expect(definition).toContain("interval '48 hours'");
    expect(migration).toContain(
      "grant execute on function public.purge_expired_operational_data() to service_role;",
    );
  });
});
