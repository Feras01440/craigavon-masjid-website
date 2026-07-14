import { expect, type Page } from "@playwright/test";

export const publicRoutes = [
  { path: "/", heading: "Muslim Association of Craigavon" },
  { path: "/prayer-times", heading: "Prayer times, with approval built in." },
  { path: "/visit", heading: "Please wait for confirmed visit details" },
  { path: "/services", heading: /service/i },
  { path: "/education", heading: /learning|programme/i },
  { path: "/news", heading: "Announcements and events" },
  { path: "/new-muslims", heading: "A private contact route is being prepared" },
  { path: "/contact", heading: "Contact the Association" },
  { path: "/about", heading: "What we can say with confidence" },
  { path: "/policies", heading: "Policy publication status" },
  { path: "/policies/privacy", heading: /privacy|policy/i },
] as const;

export async function gotoReady(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `Expected a document response for ${path}`).not.toBeNull();
  expect(response!.status(), `Expected ${path} to load successfully`).toBeLessThan(400);
  await expect(page.locator("body")).toBeVisible();
  return response!;
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(
    dimensions.scrollWidth,
    `Document width ${dimensions.scrollWidth}px exceeded viewport width ${dimensions.clientWidth}px`,
  ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}
