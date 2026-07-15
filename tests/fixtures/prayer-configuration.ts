import type { PrayerConfiguration } from "@/lib/prayer/types";

// Test-only coordinates approximate the latitude used by the inherited prototype.
// They are not production content and do not imply committee approval.
export function prayerConfigurationFixture(
  overrides: Partial<PrayerConfiguration> = {},
): PrayerConfiguration {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Automated test timetable",
    version: 3,
    status: "published",
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    timezone: "Europe/London",
    latitude: 54.45,
    longitude: -6.37,
    calculationMethod: "moonsighting_committee",
    madhab: "hanafi",
    highLatitudeRule: "seventh_of_night",
    adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    congregationRules: {
      fajr: { type: "offset", minutes: 25, roundTo: 5 },
      dhuhr: { type: "offset", minutes: 15, roundTo: 5 },
      asr: { type: "offset", minutes: 15, roundTo: 5 },
      maghrib: { type: "offset", minutes: 10, roundTo: 5 },
      isha: { type: "offset", minutes: 15, roundTo: 5 },
    },
    hijriAdjustment: 0,
    sourceName: "Committee test fixture — not for publication",
    sourceReference: null,
    calculationLibrary: "adhan",
    calculationLibraryVersion: "4.4.4",
    approvalNote: "Fixture approval for automated tests only.",
    approvedBy: "22222222-2222-4222-8222-222222222222",
    publishedAt: "2026-01-01T12:00:00.000Z",
    updatedAt: "2026-01-01T12:00:00.000Z",
    jumuahSessions: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        label: "Friday prayer",
        khutbahTime: "14:00",
        prayerTime: "14:15",
        displayOrder: 1,
      },
    ],
    overrides: [],
    seasonalArrangements: [],
    ...overrides,
  };
}
