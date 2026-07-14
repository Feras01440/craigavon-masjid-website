import { expect, test } from "@playwright/test";

import { gotoReady } from "./fixtures";

const backendConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
const noBackendExpected =
  process.env.E2E_EXPECT_NO_SUPABASE === "1" ||
  (!process.env.PLAYWRIGHT_BASE_URL && !backendConfigured);

test.describe("safe fallbacks without Supabase configuration", () => {
  test.skip(
    !noBackendExpected,
    "Set E2E_EXPECT_NO_SUPABASE=1 when targeting a dedicated no-env deployment.",
  );

  test("home withholds prayer times and reports publishing status", async ({ page }) => {
    await gotoReady(page, "/");

    await expect(
      page.getByRole("heading", { level: 2, name: "Approved prayer information only" }),
    ).toBeVisible();
    await expect(page.getByText("Start and congregational times are withheld")).toBeVisible();
    await expect(page.getByText(/could not be checked/i).first()).toBeVisible();
  });

  test("prayer page never invents a timetable", async ({ page }) => {
    await gotoReady(page, "/prayer-times");

    await expect(
      page.getByRole("heading", { level: 2, name: "Prayer information is not yet published" }),
    ).toBeVisible();
    await expect(page.getByText(/No estimated congregation time is shown/i)).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  test("content routes describe unavailable verification instead of stale content", async ({
    page,
  }) => {
    for (const route of ["/services", "/education", "/news", "/policies"]) {
      await gotoReady(page, route);
      await expect(
        page.getByText(/cannot currently (?:verify|confirm)|could not be checked/i).first(),
      ).toBeVisible();
    }
  });

  test("contact route collects no data until its controls are configured", async ({ page }) => {
    await gotoReady(page, "/contact");

    await expect(page.getByText("The public form is switched off")).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.getByText(/No data is collected on this page/i)).toBeVisible();
  });

  test("public data APIs fail closed and are never cached", async ({ request }) => {
    const prayerResponse = await request.get("/api/prayer?from=2026-07-13&days=2");
    expect(prayerResponse.status()).toBe(503);
    expect(prayerResponse.headers()["cache-control"]).toBe("no-store");
    await expect(prayerResponse.json()).resolves.toMatchObject({
      status: "unavailable",
      reason: "not_configured",
    });

    const displayResponse = await request.get("/api/display");
    expect(displayResponse.status()).toBe(503);
    expect(displayResponse.headers()["cache-control"]).toBe("no-store");
    expect(displayResponse.headers()["retry-after"]).toBe("60");
    await expect(displayResponse.json()).resolves.toMatchObject({
      prayer: { status: "unavailable", reason: "not_configured" },
      notices: { status: "unavailable", notices: [] },
    });
  });

  test("discovery metadata is safe before production indexing approval", async ({ request }) => {
    const robotsResponse = await request.get("/robots.txt");
    expect(robotsResponse.status()).toBe(200);
    expect(await robotsResponse.text()).toMatch(/Disallow:\s*\//i);

    const sitemapResponse = await request.get("/sitemap.xml");
    expect(sitemapResponse.status()).toBe(200);
    expect(await sitemapResponse.text()).not.toMatch(/<url>/i);

    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.status()).toBe(200);
    expect(await manifestResponse.json()).toMatchObject({
      name: "Muslim Association of Craigavon",
      start_url: "/",
      icons: [
        { sizes: "192x192", type: "image/png" },
        { sizes: "512x512", type: "image/png" },
      ],
    });
  });
});
