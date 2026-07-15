import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const noBackendExpected =
  process.env.E2E_EXPECT_NO_SUPABASE === "1" ||
  (!process.env.PLAYWRIGHT_BASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL);
const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
});

test.afterEach(({ page }) => {
  expect(pageErrors.get(page) ?? []).toEqual([]);
});

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
            label: "Jumu'ah",
            khutbahAt: at("12:45"),
            prayerAt: at("12:50"),
            notes: null,
          },
        ]
      : [],
    seasonalArrangements: [],
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

type FixtureNotice = {
  id: string;
  kind: "announcement" | "emergency_notice";
  title: string;
  summary: string;
  featured: boolean;
  expiresAt: string | null;
  updatedAt: string;
};

function fixturePayload({
  firstDate,
  generatedAt,
  notices = [],
}: {
  firstDate: string;
  generatedAt: string;
  notices?: FixtureNotice[];
}) {
  return {
    generatedAt,
    prayer: {
      status: "available" as const,
      generatedAt,
      lastUpdatedAt: generatedAt,
      schedules: Array.from({ length: 4 }, (_, index) =>
        fixtureSchedule(addDays(firstDate, index), generatedAt),
      ),
      issues: [],
    },
    notices: { status: "available" as const, notices },
    display: {
      refresh_seconds: 30,
      notice_rotation_seconds: 10,
      prayer_hold_minutes: 10,
      show_hijri_date: true,
      show_notices: true,
      footer_message: "Accelerated soak-test fixture",
    },
  };
}

async function serveDisplayPayload(page: Page, payload: ReturnType<typeof fixturePayload>) {
  await page.route("**/api/display", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}

async function installClock(page: Page, time: string): Promise<void> {
  const instant = new Date(time);
  // Let hydration advance naturally, then pause at the exact assertion instant after navigation.
  await page.clock.install({ time: new Date(instant.getTime() - 60_000) });
}

async function waitForFixtureHydration(page: Page): Promise<void> {
  await expect(page.getByText("Accelerated soak-test fixture", { exact: true })).toBeVisible();
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

test("accelerated soak crosses London midnight into Friday and selects Jumu'ah", async ({
  page,
}) => {
  const generatedAt = "2026-07-16T20:00:00.000Z";
  const initialTime = "2026-07-16T22:59:58.000Z";
  await installClock(page, initialTime);
  await serveDisplayPayload(page, fixturePayload({ firstDate: "2026-07-16", generatedAt }));

  await page.goto("/tv", { waitUntil: "domcontentloaded" });
  await waitForFixtureHydration(page);
  await page.clock.pauseAt(new Date(initialTime));
  await page.clock.fastForward(1_000);
  await expect(page.locator('header time[datetime="2026-07-16"]')).toContainText(
    "Thursday, 16 July 2026",
  );
  await expect(page.locator("header").getByText("23:59", { exact: true })).toBeVisible();

  await page.clock.fastForward(3_000);

  await expect(page.locator('header time[datetime="2026-07-17"]')).toContainText(
    "Friday, 17 July 2026",
  );
  await expect(page.locator("header").getByText("00:00", { exact: true })).toBeVisible();

  await page.clock.setSystemTime(new Date("2026-07-17T11:45:00.000Z"));
  await page.clock.fastForward(1_000);
  await expect(page.getByText("Jumu'ah prayer", { exact: true })).toBeVisible();
});

for (const transition of [
  {
    name: "spring clock change",
    firstDate: "2026-03-29",
    before: "2026-03-29T00:59:58.000Z",
    beforeLabel: "00:59",
    afterLabel: "02:00",
  },
  {
    name: "autumn clock change",
    firstDate: "2026-10-25",
    before: "2026-10-25T00:59:58.000Z",
    beforeLabel: "01:59",
    afterLabel: "01:00",
  },
] as const) {
  test(`accelerated soak preserves London time through the ${transition.name}`, async ({
    page,
  }) => {
    await installClock(page, transition.before);
    await serveDisplayPayload(
      page,
      fixturePayload({ firstDate: transition.firstDate, generatedAt: transition.before }),
    );

    await page.goto("/tv", { waitUntil: "domcontentloaded" });
    await waitForFixtureHydration(page);
    await page.clock.pauseAt(new Date(transition.before));
    await page.clock.fastForward(1_000);
    await expect(
      page.locator("header").getByText(transition.beforeLabel, { exact: true }),
    ).toBeVisible();

    await page.clock.fastForward(3_000);

    await expect(
      page.locator("header").getByText(transition.afterLabel, { exact: true }),
    ).toBeVisible();
    await expect(page.locator(`header time[datetime="${transition.firstDate}"]`)).toBeVisible();
  });
}

test("accelerated five-day outage fails safe on stale data and recovers automatically", async ({
  context,
  page,
}) => {
  const firstPayload = fixturePayload({
    firstDate: "2026-07-13",
    generatedAt: "2026-07-13T10:00:00.000Z",
    notices: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        kind: "announcement",
        title: "Initial confirmed notice",
        summary: "Known-good data before the simulated outage.",
        featured: false,
        expiresAt: null,
        updatedAt: "2026-07-13T10:00:00.000Z",
      },
    ],
  });
  const recoveredPayload = fixturePayload({
    firstDate: "2026-07-18",
    generatedAt: "2026-07-18T11:00:00.000Z",
    notices: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        kind: "announcement",
        title: "Recovered live notice",
        summary: "Fresh data after connectivity returned.",
        featured: false,
        expiresAt: null,
        updatedAt: "2026-07-18T11:00:00.000Z",
      },
    ],
  });
  let shouldFail = false;
  let recovered = false;

  const initialTime = "2026-07-13T11:00:00.000Z";
  await installClock(page, initialTime);
  await page.route("**/api/display", async (route) => {
    if (shouldFail) {
      await route.abort("internetdisconnected");
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(recovered ? recoveredPayload : firstPayload),
    });
  });

  await page.goto("/tv", { waitUntil: "domcontentloaded" });
  await waitForFixtureHydration(page);
  await expect(page.getByText("Initial confirmed notice", { exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date(initialTime));
  await page.clock.fastForward(1_000);
  await expect(page.getByRole("status")).toContainText("Data connection checked");

  shouldFail = true;
  await context.setOffline(true);
  await page.clock.fastForward(30_000);
  await expect(page.getByRole("status")).toContainText("Offline");
  await expect(page.getByRole("status")).toContainText("Showing last confirmed download");

  await page.clock.setSystemTime(new Date("2026-07-18T11:00:00.000Z"));
  await page.clock.fastForward(1_000);
  await expect(
    page.getByRole("heading", { level: 1, name: "Prayer information is not available" }),
  ).toBeVisible();
  await expect(page.getByText(/Last successful data update:/)).toContainText("13 Jul 2026");

  shouldFail = false;
  recovered = true;
  await context.setOffline(false);
  await expect(page.getByRole("status")).toContainText("Data connection checked");
  await expect(page.getByText("Recovered live notice", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Today's prayer timetable" })).toBeVisible();
  await expect(page.getByText(/Last successful data update:/)).toContainText("18 Jul 2026");
});

test("accelerated soak removes an expired notice without a network refresh", async ({ page }) => {
  const generatedAt = "2026-07-13T10:00:00.000Z";
  const initialTime = "2026-07-13T11:59:58.000Z";
  await installClock(page, initialTime);
  await serveDisplayPayload(
    page,
    fixturePayload({
      firstDate: "2026-07-13",
      generatedAt,
      notices: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          kind: "announcement",
          title: "Short-lived notice",
          summary: "This fixture expires while the display remains open.",
          featured: false,
          expiresAt: "2026-07-13T12:00:00.000Z",
          updatedAt: generatedAt,
        },
      ],
    }),
  );

  await page.goto("/tv", { waitUntil: "domcontentloaded" });
  await waitForFixtureHydration(page);
  await page.clock.pauseAt(new Date(initialTime));
  await page.clock.fastForward(1_000);
  await expect(page.getByText("Short-lived notice", { exact: true })).toBeVisible();

  await page.clock.fastForward(3_000);

  await expect(page.getByText("Short-lived notice", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "No notices published" })).toBeVisible();
});

test("TV route reflects an offline browser state", async ({ context, page }) => {
  const generatedAt = new Date().toISOString();
  const firstDate = londonDateKey(new Date());
  await serveDisplayPayload(page, fixturePayload({ firstDate, generatedAt }));
  await page.goto("/tv", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Today's prayer timetable" })).toBeVisible();
  await context.setOffline(true);

  await expect(page.getByRole("status")).toContainText("Offline");
});
