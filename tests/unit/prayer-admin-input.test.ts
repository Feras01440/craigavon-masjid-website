import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  congregationRuleDefaults,
  congregationRulesFromForm,
  parsePrayerDraftForm,
  payloadFromConfiguration,
} from "@/lib/prayer/admin-input";
import { prayerConfigurationSchema } from "@/lib/prayer/types";
import { prayerConfigurationFixture } from "@/../tests/fixtures/prayer-configuration";

function draftForm(overrides: Record<string, string> = {}): FormData {
  const fields: Record<string, string> = {
    name: "Calculated timetable",
    effectiveFrom: "2026-09-10",
    effectiveTo: "2027-09-10",
    timezone: "Europe/London",
    latitude: "54.4478",
    longitude: "-6.3712",
    calculationMethod: "north_america",
    madhab: "standard",
    highLatitudeRule: "seventh_of_night",
    fajrAdjustment: "0",
    sunriseAdjustment: "0",
    dhuhrAdjustment: "0",
    asrAdjustment: "0",
    maghribAdjustment: "2",
    ishaAdjustment: "0",
    fajrRuleType: "offset",
    fajrOffsetMinutes: "35",
    fajrRoundTo: "15",
    dhuhrRuleType: "fixed",
    dhuhrFixedTime: "14:00",
    asrRuleType: "offset",
    asrOffsetMinutes: "60",
    asrRoundTo: "15",
    asrLatest: "18:30",
    maghribRuleType: "offset",
    maghribOffsetMinutes: "5",
    maghribRoundTo: "1",
    ishaRuleType: "joined",
    ishaJoinedWith: "maghrib",
    hijriAdjustment: "0",
    sourceName: "Astronomical calculation",
    sourceReference: "https://belfastislamiccentre.org.uk/",
    jumuahLabel1: "Jumuʿah",
    jumuahKhutbah1: "13:00",
    jumuahLabel2: "Second Jumuʿah",
    jumuahKhutbah2: "13:45",
    jumuahPrayer2: "14:00",
    jumuahNotes2: "Winter only",
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries({ ...fields, ...overrides })) {
    if (value !== "") formData.set(key, value);
  }
  return formData;
}

describe("prayer draft form parsing", () => {
  it("parses a complete draft into the configuration and database payloads", () => {
    const parsed = parsePrayerDraftForm(draftForm());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const { configuration, payload, jumuahPayload } = parsed.data;
    expect(configuration.congregationRules).toEqual({
      fajr: { type: "offset", minutes: 35, roundTo: 15 },
      dhuhr: { type: "fixed", time: "14:00" },
      asr: { type: "offset", minutes: 60, roundTo: 15, latest: "18:30" },
      maghrib: { type: "offset", minutes: 5, roundTo: 1 },
      isha: { type: "joined", with: "maghrib" },
    });
    expect(configuration.adjustments.maghrib).toBe(2);
    expect(configuration.calculationLibrary).toBe("adhan");
    expect(payload).toMatchObject({
      name: "Calculated timetable",
      effective_to: "2027-09-10",
      calculation_method: "north_america",
      high_latitude_rule: "seventh_of_night",
      source_reference: "https://belfastislamiccentre.org.uk/",
    });
    expect(jumuahPayload).toEqual([
      { label: "Jumuʿah", khutbah_time: "13:00", prayer_time: null, display_order: 1, notes: null },
      {
        label: "Second Jumuʿah",
        khutbah_time: "13:45",
        prayer_time: "14:00",
        display_order: 2,
        notes: "Winter only",
      },
    ]);
  });

  it("keeps the draft identity and records an imported timetable's own version", () => {
    const parsed = parsePrayerDraftForm(
      draftForm({
        id: "11111111-1111-4111-8111-111111111111",
        expectedVersion: "3",
        calculationMethod: "imported_official",
        sourceVersion: "2026-09",
        effectiveTo: "",
        sourceReference: "",
        ishaRuleType: "unavailable",
      }),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(parsed.data.expectedVersion).toBe(3);
    expect(parsed.data.configuration.calculationLibrary).toBe("committee_import");
    expect(parsed.data.configuration.calculationLibraryVersion).toBe("2026-09");
    expect(parsed.data.configuration.effectiveTo).toBeNull();
    expect(parsed.data.configuration.sourceReference).toBeNull();
    expect(parsed.data.configuration.congregationRules.isha).toEqual({ type: "unavailable" });
  });

  it("rejects an impossible location and a malformed identity without throwing", () => {
    const badLocation = parsePrayerDraftForm(draftForm({ latitude: "95" }));
    expect(badLocation.success).toBe(false);
    if (!badLocation.success) {
      expect(badLocation.error.issues.some((issue) => issue.path[0] === "latitude")).toBe(true);
    }
    const badIdentity = parsePrayerDraftForm(draftForm({ id: "not-a-uuid" }));
    expect(badIdentity.success).toBe(false);
  });
});

describe("prayer quick-change inputs", () => {
  it("maps a configuration to the draft payload the database expects", () => {
    const configuration = prayerConfigurationFixture({
      jumuahSessions: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          label: "Jumuʿah",
          khutbahTime: "13:00",
          displayOrder: 1,
        },
      ],
    });
    const { payload, jumuahPayload } = payloadFromConfiguration(configuration);
    expect(payload).toMatchObject({
      name: configuration.name,
      effective_from: configuration.effectiveFrom,
      calculation_method: configuration.calculationMethod,
      congregation_rules: configuration.congregationRules,
      calculation_library_version: configuration.calculationLibraryVersion,
    });
    expect(jumuahPayload).toEqual([
      { label: "Jumuʿah", khutbah_time: "13:00", prayer_time: null, display_order: 1, notes: null },
    ]);
  });

  it("parses offset and fixed rules from the quick-change form", () => {
    const formData = new FormData();
    formData.set("fajrRuleType", "offset");
    formData.set("fajrOffsetMinutes", "35");
    formData.set("fajrRoundTo", "15");
    formData.set("dhuhrRuleType", "fixed");
    formData.set("dhuhrFixedTime", "14:00");
    formData.set("asrRuleType", "offset");
    formData.set("asrOffsetMinutes", "60");
    formData.set("asrRoundTo", "15");
    formData.set("maghribRuleType", "offset");
    formData.set("maghribOffsetMinutes", "5");
    formData.set("maghribRoundTo", "1");
    formData.set("ishaRuleType", "offset");
    formData.set("ishaOffsetMinutes", "20");
    formData.set("ishaRoundTo", "15");

    const configuration = prayerConfigurationSchema.parse({
      ...prayerConfigurationFixture(),
      congregationRules: congregationRulesFromForm(formData),
    });
    expect(configuration.congregationRules.fajr).toEqual({
      type: "offset",
      minutes: 35,
      roundTo: 15,
    });
    expect(configuration.congregationRules.dhuhr).toEqual({ type: "fixed", time: "14:00" });
    expect(configuration.congregationRules.maghrib).toEqual({
      type: "offset",
      minutes: 5,
      roundTo: 1,
    });
  });

  it("turns every rule shape into form defaults", () => {
    expect(congregationRuleDefaults(undefined)).toEqual({ type: "unavailable" });
    expect(congregationRuleDefaults({ type: "fixed", time: "14:00" })).toMatchObject({
      type: "fixed",
      fixedTime: "14:00",
    });
    expect(
      congregationRuleDefaults({ type: "offset", minutes: 35, roundTo: 15, latest: "07:30" }),
    ).toMatchObject({ type: "offset", offsetMinutes: 35, roundTo: 15, latest: "07:30" });
    expect(congregationRuleDefaults({ type: "joined", with: "maghrib" })).toMatchObject({
      type: "joined",
      joinedWith: "maghrib",
    });
    expect(congregationRuleDefaults({ type: "unavailable" })).toEqual({ type: "unavailable" });
  });
});
