import { describe, expect, it } from "vitest";

import {
  buildPrayerSchedule,
  buildScheduleRange,
  isCongregationPrayer,
  nextDateAfterRange,
} from "@/lib/prayer/engine";
import { nextEvent, scheduleEvents } from "@/lib/prayer/events";
import { formatTime } from "@/lib/prayer/timezone";
import { prayerKeys } from "@/lib/prayer/types";
import {
  validatePrayerSchedule,
  validateScheduleRange,
  validateWallTimeRules,
} from "@/lib/prayer/validation";
import { prayerConfigurationFixture } from "@/../tests/fixtures/prayer-configuration";

describe("approved prayer schedule generation", () => {
  it("produces strictly ordered starts in winter and high-latitude summer", () => {
    for (const date of ["2026-01-15", "2026-06-21"]) {
      const schedule = buildPrayerSchedule(prayerConfigurationFixture(), date);
      const starts = Object.values(schedule.prayers).map((prayer) =>
        new Date(prayer.startsAt!).getTime(),
      );
      expect(starts).toEqual([...starts].sort((left, right) => left - right));
    }
  });

  it("formats calculated instants in Europe/London across both clock changes", () => {
    const beforeSpring = buildPrayerSchedule(prayerConfigurationFixture(), "2026-03-28");
    const afterSpring = buildPrayerSchedule(prayerConfigurationFixture(), "2026-03-30");
    const beforeAutumn = buildPrayerSchedule(prayerConfigurationFixture(), "2026-10-24");
    const afterAutumn = buildPrayerSchedule(prayerConfigurationFixture(), "2026-10-26");
    for (const schedule of [beforeSpring, afterSpring, beforeAutumn, afterAutumn]) {
      expect(formatTime(schedule.prayers.dhuhr.startsAt, schedule.timezone)).toMatch(
        /^\d{2}:\d{2}$/,
      );
    }
    expect(beforeSpring.timezone).toBe("Europe/London");
    expect(afterAutumn.timezone).toBe("Europe/London");
  });

  it("renders a complete committee-imported timetable without calculated fallbacks", () => {
    const importedTimes = ["04:10", "05:45", "13:20", "17:30", "21:25", "22:50"];
    const configuration = prayerConfigurationFixture({
      calculationMethod: "imported_official",
      calculationLibrary: "committee_import",
      overrides: prayerKeys.map((prayer, index) => ({
        date: "2026-07-13",
        prayer,
        beginsAt: importedTimes[index],
        unavailable: false,
        reason: "Approved committee timetable import",
      })),
    });
    const schedule = buildPrayerSchedule(configuration, "2026-07-13");

    expect(
      prayerKeys.map((key) => formatTime(schedule.prayers[key].startsAt, schedule.timezone)),
    ).toEqual(importedTimes);
  });

  it("applies confirmed fixed times and a latest-time cap to congregation rules", () => {
    const base = prayerConfigurationFixture();
    const schedule = buildPrayerSchedule(
      prayerConfigurationFixture({
        congregationRules: {
          ...base.congregationRules,
          fajr: { type: "fixed", time: "06:00" },
          dhuhr: { type: "offset", minutes: 240, roundTo: 5, latest: "13:30" },
        },
      }),
      "2026-07-13",
    );

    expect(formatTime(schedule.prayers.fajr.congregationAt, schedule.timezone)).toBe("06:00");
    expect(formatTime(schedule.prayers.dhuhr.congregationAt, schedule.timezone)).toBe("13:30");
  });

  it("keeps a missing congregation value missing", () => {
    const base = prayerConfigurationFixture();
    const configuration = prayerConfigurationFixture({
      congregationRules: { ...base.congregationRules, asr: { type: "unavailable" } },
    });
    const schedule = buildPrayerSchedule(configuration, "2026-07-13");
    expect(schedule.prayers.asr.congregationAt).toBeNull();
    expect(
      validatePrayerSchedule(schedule).some(
        (issue) => issue.code === "missing-congregation" && issue.severity === "error",
      ),
    ).toBe(true);
  });

  it("applies a per-date start and congregation override with its reason", () => {
    const configuration = prayerConfigurationFixture({
      overrides: [
        {
          date: "2026-07-13",
          prayer: "dhuhr",
          beginsAt: "13:45",
          congregationAt: "14:00",
          unavailable: false,
          reason: "Approved test override",
        },
      ],
    });
    const schedule = buildPrayerSchedule(configuration, "2026-07-13");
    expect(formatTime(schedule.prayers.dhuhr.startsAt, schedule.timezone)).toBe("13:45");
    expect(formatTime(schedule.prayers.dhuhr.congregationAt, schedule.timezone)).toBe("14:00");
    expect(schedule.prayers.dhuhr.overrideReason).toBe("Approved test override");
  });

  it("recalculates an offset congregation after a start-only override", () => {
    const configuration = prayerConfigurationFixture({
      overrides: [
        {
          date: "2026-07-13",
          prayer: "dhuhr",
          beginsAt: "13:45",
          unavailable: false,
          reason: "Approved test start override",
        },
      ],
    });
    const schedule = buildPrayerSchedule(configuration, "2026-07-13");
    expect(formatTime(schedule.prayers.dhuhr.startsAt, schedule.timezone)).toBe("13:45");
    expect(formatTime(schedule.prayers.dhuhr.congregationAt, schedule.timezone)).toBe("14:00");
  });

  it("supports an explicitly targeted joined prayer without inventing a second time", () => {
    const base = prayerConfigurationFixture();
    const configuration = prayerConfigurationFixture({
      congregationRules: {
        ...base.congregationRules,
        isha: { type: "joined", with: "maghrib" },
      },
    });
    const schedule = buildPrayerSchedule(configuration, "2026-01-15");
    expect(schedule.prayers.isha.joinedWith).toBe("maghrib");
    expect(schedule.prayers.isha.congregationAt).toBe(schedule.prayers.maghrib.congregationAt);
  });

  it("resolves a joined prayer after target overrides and fails closed when the target is unavailable", () => {
    const base = prayerConfigurationFixture();
    const joinedRules = {
      ...base.congregationRules,
      isha: { type: "joined" as const, with: "maghrib" as const },
    };
    const adjusted = buildPrayerSchedule(
      prayerConfigurationFixture({
        congregationRules: joinedRules,
        overrides: [
          {
            date: "2026-01-15",
            prayer: "maghrib",
            congregationAt: "18:15",
            unavailable: false,
            reason: "Approved target override",
          },
        ],
      }),
      "2026-01-15",
    );
    expect(formatTime(adjusted.prayers.isha.congregationAt, adjusted.timezone)).toBe("18:15");

    const unavailable = buildPrayerSchedule(
      prayerConfigurationFixture({
        congregationRules: joinedRules,
        overrides: [
          {
            date: "2026-01-15",
            prayer: "maghrib",
            unavailable: true,
            reason: "Approved target closure",
          },
        ],
      }),
      "2026-01-15",
    );
    expect(unavailable.prayers.isha.congregationAt).toBeNull();
    expect(
      validatePrayerSchedule(unavailable).some(
        (issue) =>
          issue.prayer === "isha" &&
          issue.code === "missing-congregation" &&
          issue.severity === "error",
      ),
    ).toBe(true);
  });

  it("marks a date-specific unavailable prayer without fabricating times", () => {
    const configuration = prayerConfigurationFixture({
      overrides: [
        {
          date: "2026-01-15",
          prayer: "isha",
          unavailable: true,
          reason: "Test closure",
        },
      ],
    });
    const prayer = buildPrayerSchedule(configuration, "2026-01-15").prayers.isha;
    expect(prayer.unavailable).toBe(true);
    expect(prayer.startsAt).toBeNull();
    expect(prayer.congregationAt).toBeNull();
  });

  it("shows Jumuah only on Friday and keeps multiple sessions ordered", () => {
    const configuration = prayerConfigurationFixture({
      jumuahSessions: [
        { label: "Second Friday prayer", khutbahTime: "15:00", displayOrder: 2 },
        { label: "First Friday prayer", khutbahTime: "14:00", displayOrder: 1 },
      ],
    });
    const friday = buildPrayerSchedule(configuration, "2026-07-17");
    const saturday = buildPrayerSchedule(configuration, "2026-07-18");
    expect(friday.jumuah.map((session) => session.label)).toEqual([
      "First Friday prayer",
      "Second Friday prayer",
    ]);
    expect(saturday.jumuah).toEqual([]);
  });

  it("publishes the authorised Jumuah time independently of calculated Dhuhr", () => {
    // Product-owner decision (16 July 2026): the administrator-published
    // Jumu'ah time and the calculated Dhuhr start are independent facts.
    // 13:00 is the masjid's established arrangement even though calculated
    // Dhuhr in Craigavon falls after 13:00 throughout BST.
    const configuration = prayerConfigurationFixture({
      jumuahSessions: [{ label: "Jumu'ah", khutbahTime: "13:00", displayOrder: 1 }],
    });
    const friday = buildPrayerSchedule(configuration, "2026-07-17");
    expect(new Date(friday.prayers.dhuhr.startsAt!).getTime()).toBeGreaterThan(
      new Date(friday.jumuah[0]!.khutbahAt).getTime(),
    );
    expect(
      validatePrayerSchedule(friday).filter((issue) => issue.code.startsWith("jumuah-")),
    ).toEqual([]);
  });

  it("validates the joined Maghrib and Isha congregation on every season", () => {
    // The masjid currently prays Isha in congregation together with Maghrib;
    // the joined congregation legitimately precedes Isha's astronomical start
    // and must publish cleanly (product-owner decision, 16 July 2026).
    const base = prayerConfigurationFixture();
    const configuration = prayerConfigurationFixture({
      congregationRules: {
        ...base.congregationRules,
        isha: { type: "joined", with: "maghrib" },
      },
    });
    for (const date of ["2026-01-16", "2026-06-19", "2026-07-17"]) {
      const schedule = buildPrayerSchedule(configuration, date);
      expect(schedule.prayers.isha.joinedWith).toBe("maghrib");
      expect(
        validatePrayerSchedule(schedule).filter(
          (issue) => issue.prayer === "isha" && issue.severity === "error",
        ),
      ).toEqual([]);
    }
  });

  it("distinguishes the next prayer start from the next congregation", () => {
    const schedules = buildScheduleRange(prayerConfigurationFixture(), "2026-01-15", 2);
    const first = schedules[0]!;
    const fajrStart = new Date(first.prayers.fajr.startsAt!);
    const now = new Date(fajrStart.getTime() + 60_000);
    const start = nextEvent(schedules, now, ["prayer_start"]);
    const congregation = nextEvent(schedules, now, ["congregation", "jumuah"]);
    expect(start?.key).toBe("sunrise");
    expect(congregation?.key).toBe("fajr");
  });

  it("returns no next event when every allowed event is in the past", () => {
    const schedules = buildScheduleRange(prayerConfigurationFixture(), "2026-01-15", 1);
    expect(nextEvent(schedules, new Date("2027-01-01T00:00:00.000Z"), ["jumuah"])).toBeNull();
    expect(scheduleEvents([])).toEqual([]);
  });

  it("enforces bounded ranges and exposes the next-date and congregation helpers", () => {
    for (const invalidDays of [0, 1.5, 371]) {
      expect(() =>
        buildScheduleRange(prayerConfigurationFixture(), "2026-01-15", invalidDays),
      ).toThrow("between 1 and 370 days");
    }
    const schedules = buildScheduleRange(prayerConfigurationFixture(), "2026-01-15", 2);
    expect(nextDateAfterRange(schedules)).toBe("2026-01-17");
    expect(nextDateAfterRange([])).toBeNull();
    expect(isCongregationPrayer("fajr")).toBe(true);
    expect(isCongregationPrayer("sunrise")).toBe(false);
  });

  it("refuses dates outside the approved period and unpublished configurations", () => {
    const bounded = prayerConfigurationFixture({
      effectiveFrom: "2026-07-01",
      effectiveTo: "2026-07-31",
    });
    expect(() => buildPrayerSchedule(bounded, "2026-06-30")).toThrow("not effective");
    expect(() => buildPrayerSchedule(bounded, "2026-08-01")).toThrow("not effective");
    expect(() =>
      buildPrayerSchedule(
        prayerConfigurationFixture({ status: "draft", publishedAt: null }),
        "2026-07-13",
      ),
    ).toThrow("approved, published");
  });

  it("validates an entire 30-day preview before publication", () => {
    const schedules = buildScheduleRange(prayerConfigurationFixture(), "2026-11-01", 30);
    const errors = validateScheduleRange(schedules).filter((issue) => issue.severity === "error");
    expect(schedules).toHaveLength(30);
    expect(errors).toEqual([]);
  });

  it("warns that the selected Moonsighting method controls its own high-latitude behavior", () => {
    expect(
      validateWallTimeRules(prayerConfigurationFixture()).some(
        (issue) => issue.code === "method-controls-high-latitude",
      ),
    ).toBe(true);
  });

  it("rejects a fixed congregation in a nonexistent DST wall time", () => {
    const base = prayerConfigurationFixture();
    const configuration = prayerConfigurationFixture({
      effectiveFrom: "2026-03-29",
      congregationRules: {
        ...base.congregationRules,
        fajr: { type: "fixed", time: "01:30" },
      },
    });
    expect(
      validateWallTimeRules(configuration).some((issue) => issue.code === "fixed-time-nonexistent"),
    ).toBe(true);
  });
});
