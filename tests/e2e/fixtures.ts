import { expect, type Page } from "@playwright/test";

export const publicRoutes = [
  { path: "/", heading: "Muslim Association of Craigavon" },
  { path: "/prayer-times", heading: "Prayer and congregation times" },
  { path: "/visit", heading: "Visit information is not currently online" },
  { path: "/services", heading: /service/i },
  { path: "/education", heading: /learning|programme/i },
  { path: "/news", heading: "Announcements and events" },
  { path: "/new-muslims", heading: "Practical information for a first conversation" },
  { path: "/contact", heading: "Contact the Association" },
  { path: "/about", heading: "About the Association" },
  { path: "/accessibility", heading: "Using this website" },
  { path: "/policies", heading: "Policies" },
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
