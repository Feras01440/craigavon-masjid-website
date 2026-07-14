import { describe, expect, it } from "vitest";

import { congregationRuleDefaults, parsePrayerDraftForm } from "@/lib/prayer/admin-input";
import { congregationPrayerKeys, prayerKeys } from "@/lib/prayer/types";

function validPrayerForm(): FormData {
  const form = new FormData();
  form.set("id", "11111111-1111-4111-8111-111111111111");
  form.set("expectedVersion", "3");
  form.set("name", " Committee draft ");
  form.set("effectiveFrom", "2026-01-01");
  form.set("effectiveTo", "2026-12-31");
  form.set("timezone", "Europe/London");
  form.set("latitude", "54.45");
  form.set("longitude", "-6.37");
  form.set("calculationMethod", "muslim_world_league");
  form.set("madhab", "hanafi");
  form.set("highLatitudeRule", "seventh_of_night");
  form.set("hijriAdjustment", "0");
  form.set("sourceName", "Committee test source");
  form.set("sourceReference", " Approved reference ");
  for (const prayer of prayerKeys) form.set(`${prayer}Adjustment`, "0");
  for (const prayer of congregationPrayerKeys) {
    form.set(`${prayer}RuleType`, "offset");
    form.set(`${prayer}OffsetMinutes`, "15");
    form.set(`${prayer}RoundTo`, "5");
    form.set(`${prayer}Latest`, "");
  }
  form.set("jumuahLabel1", " First Friday prayer ");
  form.set("jumuahKhutbah1", "14:00");
  form.set("jumuahPrayer1", "14:15");
  form.set("jumuahNotes1", " Approved notes ");
  return form;
}

describe("prayer administration form parsing", () => {
  it("turns a validated calculated timetable into database payloads", () => {
    const result = parsePrayerDraftForm(validPrayerForm());
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      expectedVersion: 3,
      payload: {
        name: "Committee draft",
        calculation_method: "muslim_world_league",
        calculation_library: "adhan",
        calculation_library_version: "4.4.4",
        source_reference: "Approved reference",
      },
      jumuahPayload: [
        {
          label: "First Friday prayer",
          khutbah_time: "14:00",
          prayer_time: "14:15",
          display_order: 1,
          notes: "Approved notes",
        },
      ],
    });
  });

  it("supports imported timetables and every congregation rule form", () => {
    const form = validPrayerForm();
    form.delete("id");
    form.delete("expectedVersion");
    form.set("calculationMethod", "imported_official");
    form.set("sourceVersion", "2026.1");
    form.set("fajrRuleType", "fixed");
    form.set("fajrFixedTime", "06:30");
    form.set("asrRuleType", "unavailable");
    form.set("maghribRuleType", "fixed");
    form.set("maghribFixedTime", "18:00");
    form.set("ishaRuleType", "joined");
    form.set("ishaJoinedWith", "maghrib");
    form.delete("jumuahPrayer1");
    form.delete("jumuahNotes1");

    const result = parsePrayerDraftForm(form);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.id).toBeUndefined();
    expect(result.data.payload).toMatchObject({
      calculation_library: "committee_import",
      calculation_library_version: "2026.1",
      congregation_rules: {
        fajr: { type: "fixed", time: "06:30" },
        asr: { type: "unavailable" },
        isha: { type: "joined", with: "maghrib" },
      },
    });
    expect(result.data.jumuahPayload).toEqual([
      {
        label: "First Friday prayer",
        khutbah_time: "14:00",
        prayer_time: null,
        display_order: 1,
        notes: null,
      },
    ]);
  });

  it("combines identity and timetable validation failures", () => {
    const form = validPrayerForm();
    form.set("id", "not-a-uuid");
    form.set("expectedVersion", "0");
    form.set("name", "");
    form.set("effectiveFrom", "not-a-date");
    const result = parsePrayerDraftForm(form);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.length).toBeGreaterThan(2);
  });

  it("provides stable defaults for each congregation rule", () => {
    expect(congregationRuleDefaults(undefined)).toEqual({ type: "unavailable" });
    expect(congregationRuleDefaults({ type: "fixed", time: "13:30" })).toEqual({
      type: "fixed",
      fixedTime: "13:30",
    });
    expect(congregationRuleDefaults({ type: "joined", with: "maghrib" })).toEqual({
      type: "joined",
      joinedWith: "maghrib",
    });
    expect(
      congregationRuleDefaults({ type: "offset", minutes: 20, roundTo: 5, latest: "14:00" }),
    ).toEqual({
      type: "offset",
      offsetMinutes: 20,
      roundTo: 5,
      latest: "14:00",
    });
    expect(congregationRuleDefaults({ type: "offset", minutes: 10, roundTo: 5 })).toMatchObject({
      latest: "",
    });
    expect(congregationRuleDefaults({ type: "unavailable" })).toEqual({ type: "unavailable" });
  });
});
