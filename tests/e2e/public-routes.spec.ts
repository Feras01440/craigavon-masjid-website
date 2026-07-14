import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, gotoReady, publicRoutes } from "./fixtures";

const corruptionMarkers = [
  /\uFFFD/u,
  /\u00C2[\u0080-\u00BF]/u,
  /\u00E2[\u0080-\u00BF\u2000-\u206F\u20A0-\u20CF]/u,
  /\u00C3[\u0080-\u00BF]/u,
  /\u00D8[\u0080-\u00BF]/u,
  /\u00D9[\u0080-\u00BF]/u,
];

test.describe("public route contract", () => {
  for (const route of publicRoutes) {
    test(`${route.path} renders one labelled primary heading`, async ({ page }) => {
      const response = await gotoReady(page, route.path);

      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("main#main-content")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await expect(page).toHaveTitle(/Muslim Association of Craigavon/);
      await expectNoHorizontalOverflow(page);
      const renderedText = await page.locator("body").innerText();
      expect(corruptionMarkers.filter((marker) => marker.test(renderedText))).toEqual([]);

      expect(response.headers()["x-content-type-options"]).toBe("nosniff");
      expect(response.headers()["x-frame-options"]).toBe("DENY");
      expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    });
  }

  test("unknown routes return a useful 404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist", {
      waitUntil: "domcontentloaded",
    });

    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to the home page" })).toBeVisible();
    const robotsDirectives = await page
      .locator('meta[name="robots"]')
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("content") ?? ""));
    expect(robotsDirectives.some((directive) => /noindex/.test(directive))).toBe(true);
  });

  test("brand images load without duplicating the wordmark announcement", async ({ page }) => {
    await gotoReady(page, "/");

    const headerLogo = page.locator(".wordmark__logo");
    const footerLogo = page.locator(".site-footer__logo");
    await expect(headerLogo).toHaveAttribute("alt", "");
    await expect(footerLogo).toHaveAttribute("alt", "");
    await footerLogo.scrollIntoViewIfNeeded();
    await expect
      .poll(async () =>
        Promise.all(
          [headerLogo, footerLogo].map((logo) =>
            logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
          ),
        ),
      )
      .toEqual([true, true]);
    await expect(
      page.getByRole("link", { name: "Muslim Association of Craigavon — home" }),
    ).toBeVisible();
  });

  test("rendered internal links do not point to missing routes", async ({ page, request }) => {
    const internalLinks = new Set<string>();

    for (const route of publicRoutes) {
      await gotoReady(page, route.path);
      const links = await page.locator("a[href]").evaluateAll((anchors) =>
        anchors.flatMap((anchor) => {
          const url = new URL((anchor as HTMLAnchorElement).href);
          return url.origin === window.location.origin ? [`${url.pathname}${url.search}`] : [];
        }),
      );
      links.forEach((link) => internalLinks.add(link));
    }

    const brokenLinks: Array<{ href: string; status: number }> = [];
    for (const href of [...internalLinks].sort()) {
      const response = await request.get(href);
      if (response.status() >= 400) brokenLinks.push({ href, status: response.status() });
    }

    expect(brokenLinks).toEqual([]);
  });
});
