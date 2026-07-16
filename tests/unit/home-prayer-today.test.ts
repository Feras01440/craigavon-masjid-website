import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { HomePrayerToday } from "@/components/prayer/home-prayer-today";
import { buildScheduleRange } from "@/lib/prayer/engine";
import type { PrayerBundle } from "@/lib/prayer/types";

import { prayerConfigurationFixture } from "../fixtures/prayer-configuration";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
  } & Record<string, unknown>) => createElement("a", { href, ...rest }, children),
}));

const configuration = prayerConfigurationFixture({
  congregationRules: {
    fajr: { type: "fixed", time: "04:15" },
    dhuhr: { type: "fixed", time: "14:00" },
    asr: { type: "fixed", time: "18:30" },
    maghrib: { type: "offset", minutes: 5, roundTo: 1 },
    isha: { type: "joined", with: "maghrib" },
  },
});

function bundleFor(firstDate: string, days: number): PrayerBundle {
  const schedules = buildScheduleRange(configuration, firstDate, days);
  return {
    status: "available",
    generatedAt: "2026-07-22T09:00:00.000Z",
    lastUpdatedAt: configuration.updatedAt,
    schedules,
    issues: [],
    coverage: {
      requestedDays: days,
      coveredDays: days,
      endsOn: schedules[schedules.length - 1]!.date,
      complete: true,
    },
  };
}

function render(bundle: PrayerBundle, now: Date): string {
  return renderToStaticMarkup(
    createElement(HomePrayerToday, { bundle, today: bundle.schedules[0]!, now }),
  );
}

function rowContaining(markup: string, needle: string): string {
  const row = markup.split("<tr").find((part) => part.includes(needle));
  expect(row, `expected a table row containing ${needle}`).toBeDefined();
  return row!;
}

describe("home page prayer table", () => {
  // 2026-07-22 is a Wednesday; the next Friday within coverage is 2026-07-24.
  const midweekNow = new Date("2026-07-22T11:00:00.000Z");

  it("lists every daily prayer with its begins and iqāmah times", () => {
    const markup = render(bundleFor("2026-07-22", 8), midweekNow);

    for (const name of ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Ish"]) {
      expect(markup).toContain(name);
    }
    expect(markup).toContain("Begins");
    expect(markup).toContain("Iqāmah");
    expect(rowContaining(markup, "Fajr")).toContain("04:15");
    expect(rowContaining(markup, "Dhuhr")).toContain("14:00");
    expect(rowContaining(markup, "Asr")).toContain("18:30");
    expect(rowContaining(markup, "Sunrise")).toContain("—");
    expect(rowContaining(markup, "with Maghrib")).toBeDefined();
    expect(markup).toContain(bundleFor("2026-07-22", 1).schedules[0]!.gregorianLabel);
    expect(markup).toContain(bundleFor("2026-07-22", 1).schedules[0]!.hijriLabel);
  });

  it("marks the next prayer of the day without inventing times", () => {
    const markup = render(bundleFor("2026-07-22", 8), midweekNow);

    const nextRow = rowContaining(markup, "home-prayer__row--next");
    expect(nextRow).toContain("Dhuhr");
    expect(nextRow).toContain(">Next<");
    expect(markup.split("home-prayer__row--next").length - 1).toBe(1);
  });

  it("shows the next covered Friday's Jumuʿah sessions on a midweek day", () => {
    const bundle = bundleFor("2026-07-22", 8);
    const friday = bundle.schedules.find((schedule) => schedule.jumuah.length > 0)!;
    const markup = render(bundle, midweekNow);

    const jumuahRow = rowContaining(markup, "Friday prayer");
    expect(friday.date).toBe("2026-07-24");
    expect(jumuahRow).toContain("14:00");
    expect(jumuahRow).toContain("14:15");
    expect(jumuahRow).toContain(friday.gregorianLabel);
  });

  it("keeps the Jumuʿah row date-free when today is Friday", () => {
    const bundle = bundleFor("2026-07-24", 2);
    const markup = render(bundle, new Date("2026-07-24T08:00:00.000Z"));

    expect(rowContaining(markup, "Friday prayer")).toBeDefined();
    // The Friday date appears only in the table caption, not as a row note.
    expect(markup.split(bundle.schedules[0]!.gregorianLabel).length - 1).toBe(1);
  });

  it("omits the Jumuʿah row entirely when no covered day carries sessions", () => {
    const markup = render(bundleFor("2026-07-25", 2), new Date("2026-07-25T08:00:00.000Z"));

    expect(markup).not.toContain("Friday prayer");
    expect(markup).not.toContain("home-prayer__row--jumuah");
  });

  it("shows a withheld marker instead of estimating an unavailable prayer", () => {
    const withOverride = prayerConfigurationFixture({
      congregationRules: configuration.congregationRules,
      overrides: [
        {
          date: "2026-07-22",
          prayer: "asr",
          unavailable: true,
          reason: "Automated test closure",
        },
      ],
    });
    const schedules = buildScheduleRange(withOverride, "2026-07-22", 2);
    const bundle: PrayerBundle = {
      status: "available",
      generatedAt: "2026-07-22T09:00:00.000Z",
      lastUpdatedAt: withOverride.updatedAt,
      schedules,
      issues: [],
      coverage: { requestedDays: 2, coveredDays: 2, endsOn: schedules[1]!.date, complete: true },
    };
    const markup = renderToStaticMarkup(
      createElement(HomePrayerToday, { bundle, today: schedules[0]!, now: midweekNow }),
    );

    const asrRow = rowContaining(markup, "Asr");
    expect(asrRow.split("—").length - 1).toBeGreaterThanOrEqual(2);
  });
});
