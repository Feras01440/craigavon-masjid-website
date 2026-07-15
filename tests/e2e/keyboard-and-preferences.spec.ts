import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, gotoReady, publicRoutes } from "./fixtures";

async function focusSkipLink(page: Page, projectName: string) {
  const skipLink = page.getByRole("link", { name: "Skip to main content" });

  if (projectName.startsWith("webkit")) {
    // Playwright's Windows WebKit MiniBrowser leaves the native tabFocusesLinks preference off.
    // Assert the intended DOM order, then exercise the same focus/activation path explicitly.
    expect(await page.locator("a[href]").first().getAttribute("href")).toBe("#main-content");
    await skipLink.focus();
  } else {
    await page.keyboard.press("Tab");
  }

  return skipLink;
}

test.describe("keyboard access across every public route", () => {
  for (const route of publicRoutes) {
    test(`${route.path} exposes a first-focus skip link that moves focus to main`, async ({
      page,
    }, testInfo) => {
      await gotoReady(page, route.path);

      const skipLink = await focusSkipLink(page, testInfo.project.name);
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeVisible();

      await page.keyboard.press("Enter");
      await expect(page.locator("main#main-content")).toBeFocused();
    });
  }
});

test("mobile navigation opens and remains keyboard operable", async ({ page }, testInfo) => {
  test.skip(!/mobile|tablet/.test(testInfo.project.name), "Mobile/tablet navigation only");
  await gotoReady(page, "/");

  const menu = page.locator("summary.menu-button");
  await expect(menu).toBeVisible();
  await expect(menu).toContainText("Menu");
  await menu.focus();
  await page.keyboard.press("Enter");

  const primaryNavigation = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(primaryNavigation).toBeVisible();
  await expect(primaryNavigation.getByRole("link", { name: "Prayer times" })).toBeVisible();

  const prayerTimesLink = primaryNavigation.getByRole("link", { name: "Prayer times" });
  if (testInfo.project.name.startsWith("webkit")) {
    await prayerTimesLink.focus();
  } else {
    await page.keyboard.press("Tab");
  }
  await expect(prayerTimesLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/prayer-times$/);
});

test("desktop primary navigation is visible without disclosure interaction", async ({
  page,
}, testInfo) => {
  test.skip(!/desktop/.test(testInfo.project.name), "Desktop navigation only");
  await gotoReady(page, "/");

  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.locator("summary.menu-button")).toBeHidden();
});

test.describe("accessibility display preferences", () => {
  for (const route of publicRoutes) {
    test(`${route.path} honours reduced motion`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await gotoReady(page, route.path);

      const motion = await page.evaluate(() => {
        const maxSeconds = (value: string) =>
          Math.max(
            0,
            ...value.split(",").map((part) => {
              const duration = part.trim();
              return duration.endsWith("ms")
                ? Number.parseFloat(duration) / 1000
                : Number.parseFloat(duration) || 0;
            }),
          );
        const durations = [...document.querySelectorAll("*")].flatMap((element) => {
          const style = getComputedStyle(element);
          return [maxSeconds(style.animationDuration), maxSeconds(style.transitionDuration)];
        });
        return {
          scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
          maximumDuration: Math.max(0, ...durations),
          preferenceActive: matchMedia("(prefers-reduced-motion: reduce)").matches,
        };
      });

      expect(motion.preferenceActive).toBe(true);
      expect(motion.scrollBehavior).toBe("auto");
      expect(motion.maximumDuration).toBeLessThanOrEqual(0.001);
    });

    test(`${route.path} remains operable in forced colours`, async ({ page }, testInfo) => {
      await page.emulateMedia({ forcedColors: "active" });
      await gotoReady(page, route.path);

      const skipLink = await focusSkipLink(page, testInfo.project.name);
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeVisible();
      await expectNoHorizontalOverflow(page);
      expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    });
  }
});

test("every public route reflows at 200% zoom-equivalent and narrow widths", async ({ page }) => {
  // Browser zoom reduces the available CSS viewport. A 640 CSS-pixel viewport is the
  // 200% equivalent of a 1280-pixel desktop window; 320 CSS pixels exercises the
  // WCAG 1.4.10 narrow-reflow condition without relying on engine-specific browser UI.
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 900 });

    for (const route of publicRoutes) {
      await test.step(`${route.path} at ${width} CSS pixels`, async () => {
        await gotoReady(page, route.path);
        await expect(page.locator("main#main-content")).toBeVisible();
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });
    }
  }
});
