import { addDaysToDateKey } from "@/lib/prayer/timezone";

export type CoverageOutlook = {
  /** Final contiguously covered date from `fromDate`, or null when `fromDate` itself is uncovered. */
  coveredThrough: string | null;
  /** Number of contiguous covered days starting at `fromDate` (0 when today is uncovered). */
  daysCovered: number;
  /** True when coverage reaches the horizon through an open-ended published range. */
  openEnded: boolean;
};

export type PublishedRange = {
  effectiveFrom: string;
  effectiveTo: string | null;
};

/**
 * Walk forward from `fromDate` and report how far contiguous published
 * coverage extends, so administrators can be warned before the public
 * surfaces run out of approved days.
 */
export function coverageOutlook(
  ranges: PublishedRange[],
  fromDate: string,
  horizonDays = 60,
): CoverageOutlook {
  let coveredThrough: string | null = null;
  let daysCovered = 0;
  for (let index = 0; index < horizonDays; index += 1) {
    const date = addDaysToDateKey(fromDate, index);
    const covering = ranges.find(
      (range) => range.effectiveFrom <= date && (!range.effectiveTo || range.effectiveTo >= date),
    );
    if (!covering) return { coveredThrough, daysCovered, openEnded: false };
    coveredThrough = date;
    daysCovered += 1;
    if (!covering.effectiveTo) return { coveredThrough, daysCovered, openEnded: true };
  }
  return { coveredThrough, daysCovered, openEnded: true };
}
