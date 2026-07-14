import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const noBackendExpected =
  process.env.E2E_EXPECT_NO_SUPABASE === "1" ||
  (!process.env.PLAYWRIGHT_BASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL);

function londonDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function fixtureSchedule(dateKey: string, publishedAt: string) {
  const at = (time: string) => `${dateKey}T${time}:00.000Z`;
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  const isFriday = date.getUTCDay() === 5;
  const prayer = (key: string, startsAt: string, congregationAt: string | null) => ({
    key,
    startsAt: at(startsAt),
    congregationAt: congregationAt ? at(congregationAt) : null,
    joinedWith: null,
    unavailable: false,
    overrideReason: null,
  });

  return {
    date: dateKey,
    timezone: "Europe/London",
    isFriday,
    gregorianLabel: new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeZone: "Europe/London",
    }).format(date),
    hijriLabel: new Intl.DateTimeFormat("en-GB-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/London",
    }).format(date),
    hijriAdjustment: 0,
    prayers: {
      fajr: prayer("fajr", "03:30", "04:00"),
      sunrise: prayer("sunrise", "05:00", null),
      dhuhr: prayer("dhuhr", "12:30", "13:00"),
      asr: prayer("asr", "17:00", "17:30"),
      maghrib: prayer("maghrib", "20:00", "20:10"),
      isha: prayer("isha", "22:00", "22:15"),
    },
    jumuah: isFriday
      ? [
          {
            id: null,
            label: "Friday prayer",
            khutbahAt: at("12:45"),
            prayerAt: at("13:00"),
            notes: null,
          },
        ]
      : [],
    source: {
      name: "Automated E2E fixture — not for publication",
      reference: null,
      calculationLibrary: "test-fixture",
      calculationLibraryVersion: "1",
      configurationVersion: 1,
      publishedAt,
    },
  };
}

test("TV route fills a 1080p display without clipping or document scroll", async ({ page }) => {
  const response = await page.goto("/tv", { waitUntil: "domcontentloaded" });

  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(400);
  await expect(page.locator("main")).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    clientHeight: document.documentElement.clientHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));

  expect(dimensions.clientWidth).toBe(1920);
  expect(dimensions.clientHeight).toBe(1080);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(1921);
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(1081);
});

test("TV safe state has no automatically detectable A/AA violation", async ({ page }) => {
  await page.goto("/tv", { waitUntil: "domcontentloaded" });

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(
    results.violations,
    results.violations
      .map(
        (violation) =>
          `${violation.id}: ${violation.help} (${violation.nodes.length} affected node(s))`,
      )
      .join("\n"),
  ).toEqual([]);
});

test("TV route has a safe no-timetable state and live connection status", async ({ page }) => {
  await page.goto("/tv", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("status")).toContainText(/Online|Offline/);
  await expect(page.getByText("Showing last confirmed download")).toBeVisible();

  if (noBackendExpected) {
    await expect(
      page.getByRole("heading", { level: 1, name: "Prayer information is not available" }),
    ).toBeVisible();
    await expect(page.getByText(/No approved timetable can be shown/i)).toBeVisible();
  }
});

test("TV route renders a confirmed timetable payload without overflow", async ({ page }) => {
  const generatedAt = new Date().toISOString();
  const firstDate = londonDateKey(new Date());
  const schedules = Array.from({ length: 4 }, (_, index) =>
    fixtureSchedule(addDays(firstDate, index), generatedAt),
  );

  await page.route("**/api/display", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        generatedAt,
        prayer: {
          status: "available",
          generatedAt,
          lastUpdatedAt: generatedAt,
          schedules,
          issues: [],
        },
        notices: { status: "available", notices: [] },
      }),
    });
  });

  await page.goto("/tv", { waitUntil: "domcontentloaded" });

  const timetable = page.getByRole("region", { name: "Today's prayer timetable" });
  await expect(timetable).toBeVisible();
  await expect(timetable.locator("article")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "No notices published" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Data connection checked");

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    clientHeight: document.documentElement.clientHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight + 1);
});

test("TV route reflects an offline browser state", async ({ context, page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
  });
  await page.goto("/tv", { waitUntil: "domcontentloaded" });
  await context.setOffline(true);

  await expect(page.getByRole("status")).toContainText("Offline");
});
