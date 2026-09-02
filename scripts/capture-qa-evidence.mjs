import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const outputDirectory = fileURLToPath(new URL("../docs/quality/evidence/", import.meta.url));
const homeEvidencePath = join(outputDirectory, "final-home-desktop.png");
const tvEvidencePath = join(outputDirectory, "final-tv-1080p-confirmed-fixture.png");
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || undefined,
});

function londonDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function fixtureSchedule(dateKey, publishedAt) {
  const at = (time) => `${dateKey}T${time}:00.000Z`;
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  const isFriday = date.getUTCDay() === 5;
  const prayer = (key, startsAt, congregationAt) => ({
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
      name: "Automated QA fixture — not for publication",
      reference: null,
      calculationLibrary: "test-fixture",
      calculationLibraryVersion: "1",
      configurationVersion: 1,
      publishedAt,
    },
  };
}

async function settleFonts(page) {
  await page.evaluate(() => document.fonts.ready);
}

try {
  await mkdir(outputDirectory, { recursive: true });

  const homeContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
    locale: "en-GB",
    timezoneId: "Europe/London",
    serviceWorkers: "block",
  });
  const homePage = await homeContext.newPage();
  await homePage.goto(baseURL, { waitUntil: "networkidle" });
  await homePage.getByRole("heading", { level: 1 }).waitFor();
  await settleFonts(homePage);
  await homePage.screenshot({
    path: homeEvidencePath,
    animations: "disabled",
  });
  await homeContext.close();

  const tvContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    locale: "en-GB",
    timezoneId: "Europe/London",
    serviceWorkers: "block",
  });
  const tvPage = await tvContext.newPage();
  const generatedAt = new Date().toISOString();
  const firstDate = londonDateKey(new Date());
  const schedules = Array.from({ length: 4 }, (_, index) =>
    fixtureSchedule(addDays(firstDate, index), generatedAt),
  );
  await tvPage.route("**/api/display", async (route) => {
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
        display: {
          prayer_hold_minutes: 10,
          notice_rotation_seconds: 15,
          refresh_seconds: 60,
          show_hijri_date: true,
          show_notices: true,
          footer_message: "Muslim Association of Craigavon",
        },
      }),
    });
  });
  await tvPage.goto(`${baseURL}/tv`, { waitUntil: "domcontentloaded" });
  await tvPage.getByRole("region", { name: "Today's prayer timetable" }).waitFor();
  await settleFonts(tvPage);
  await tvPage.screenshot({
    path: tvEvidencePath,
    animations: "disabled",
  });
  await tvContext.close();

  process.stdout.write([homeEvidencePath, tvEvidencePath].join("\n"));
} finally {
  await browser.close();
}
