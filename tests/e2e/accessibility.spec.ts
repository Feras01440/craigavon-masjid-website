import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { gotoReady, publicRoutes } from "./fixtures";

test.describe("WCAG 2.2 AA automated checks", () => {
  for (const route of publicRoutes) {
    test(`${route.path} has no automatically detectable A/AA violations`, async ({ page }) => {
      await gotoReady(page, route.path);

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
  }

  test("404 safe state has no automatically detectable A/AA violations", async ({ page }) => {
    await page.goto("/this-page-does-not-exist", { waitUntil: "domcontentloaded" });

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
});
