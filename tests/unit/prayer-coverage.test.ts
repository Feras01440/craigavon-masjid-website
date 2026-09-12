import { describe, expect, it } from "vitest";

import { coverageOutlook } from "@/lib/prayer/coverage";

describe("published coverage outlook", () => {
  it("reports zero coverage when the first date is uncovered", () => {
    expect(
      coverageOutlook([{ effectiveFrom: "2026-08-01", effectiveTo: "2026-08-31" }], "2026-07-16"),
    ).toEqual({ coveredThrough: null, daysCovered: 0, openEnded: false });
  });

  it("counts contiguous days across adjacent ranges and stops at a gap", () => {
    const ranges = [
      { effectiveFrom: "2026-07-01", effectiveTo: "2026-07-20" },
      { effectiveFrom: "2026-07-21", effectiveTo: "2026-07-25" },
      { effectiveFrom: "2026-07-28", effectiveTo: "2026-08-31" },
    ];
    expect(coverageOutlook(ranges, "2026-07-16")).toEqual({
      coveredThrough: "2026-07-25",
      daysCovered: 10,
      openEnded: false,
    });
  });

  it("treats an open-ended published range as covering the horizon", () => {
    expect(
      coverageOutlook([{ effectiveFrom: "2026-07-01", effectiveTo: null }], "2026-07-16"),
    ).toEqual({ coveredThrough: "2026-07-16", daysCovered: 1, openEnded: true });
  });

  it("caps the walk at the requested horizon", () => {
    const outlook = coverageOutlook(
      [{ effectiveFrom: "2026-01-01", effectiveTo: "2030-01-01" }],
      "2026-07-16",
      14,
    );
    expect(outlook.daysCovered).toBe(14);
    expect(outlook.coveredThrough).toBe("2026-07-29");
    expect(outlook.openEnded).toBe(true);
  });
});
