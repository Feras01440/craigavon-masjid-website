import { defineConfig, devices } from "@playwright/test";

const defaultBaseUrl = "http://127.0.0.1:3000";
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseUrl ?? defaultBaseUrl;
const chromiumChannel = process.env.PLAYWRIGHT_CHROMIUM_CHANNEL;
const videoMode = process.env.PLAYWRIGHT_DISABLE_VIDEO === "1" ? "off" : "retain-on-failure";
const publicProjectDefaults = {
  testIgnore: /tv\.spec\.ts/,
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results/playwright",
  snapshotDir: "tests/e2e/__screenshots__",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL,
    colorScheme: "light",
    locale: "en-GB",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: videoMode,
    timezoneId: "Europe/London",
  },
  projects: [
    {
      name: "chromium-mobile",
      ...publicProjectDefaults,
      use: { ...devices["Pixel 7"], browserName: "chromium", channel: chromiumChannel },
    },
    {
      name: "chromium-tablet",
      ...publicProjectDefaults,
      use: {
        browserName: "chromium",
        channel: chromiumChannel,
        viewport: { width: 820, height: 1180 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "chromium-desktop",
      ...publicProjectDefaults,
      use: {
        ...devices["Desktop Chrome"],
        browserName: "chromium",
        channel: chromiumChannel,
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "firefox-desktop",
      ...publicProjectDefaults,
      use: {
        ...devices["Desktop Firefox"],
        browserName: "firefox",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "webkit-mobile",
      ...publicProjectDefaults,
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
    {
      name: "tv-1080p",
      use: {
        browserName: "chromium",
        channel: chromiumChannel,
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      },
      testMatch: /tv\.spec\.ts/,
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "pnpm dev",
        url: defaultBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
