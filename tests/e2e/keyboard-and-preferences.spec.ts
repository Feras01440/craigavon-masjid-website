import { expect, test } from "@playwright/test";

import { gotoReady } from "./fixtures";

test("skip link is first, visible on focus and moves focus to main content", async ({ page }) => {
  await gotoReady(page, "/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page.locator("main#main-content")).toBeFocused();
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

  await page.keyboard.press("Tab");
  await expect(primaryNavigation.getByRole("link", { name: "Prayer times" })).toBeFocused();
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

test("reduced-motion preference removes smooth scrolling and animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoReady(page, "/");

  const motion = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const button = getComputedStyle(document.querySelector(".button")!);
    const maxSeconds = (value: string) =>
      Math.max(
        ...value.split(",").map((part) => {
          const duration = part.trim();
          return duration.endsWith("ms")
            ? Number.parseFloat(duration) / 1000
            : Number.parseFloat(duration);
        }),
      );
    return {
      scrollBehavior: root.scrollBehavior,
      animationDuration: maxSeconds(button.animationDuration),
      transitionDuration: maxSeconds(button.transitionDuration),
    };
  });

  expect(motion.scrollBehavior).toBe("auto");
  expect(motion.animationDuration).toBeLessThanOrEqual(0.001);
  expect(motion.transitionDuration).toBeLessThanOrEqual(0.001);
});
