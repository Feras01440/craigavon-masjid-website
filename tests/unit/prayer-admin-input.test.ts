import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { congregationRulesFromForm, payloadFromConfiguration } from "@/lib/prayer/admin-input";
import { prayerConfigurationSchema } from "@/lib/prayer/types";
import { prayerConfigurationFixture } from "@/../tests/fixtures/prayer-configuration";

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

    const rules = congregationRulesFromForm(formData);
    const configuration = prayerConfigurationSchema.parse({
      ...prayerConfigurationFixture(),
      congregationRules: rules,
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
});
