import { describe, expect, it } from "vitest";

import {
  addDaysToDateKey,
  dateKeyInZone,
  formatHijriDate,
  wallTimeToInstant,
} from "@/lib/prayer/timezone";

describe("prayer timezone utilities", () => {
  it("derives the London calendar date independently of the observer timezone", () => {
    const instant = new Date("2026-07-13T23:30:00.000Z");
    expect(dateKeyInZone(instant, "Europe/London")).toBe("2026-07-14");
    expect(dateKeyInZone(instant, "America/New_York")).toBe("2026-07-13");
    expect(dateKeyInZone(instant, "Asia/Tokyo")).toBe("2026-07-14");
  });

  it("rejects a nonexistent clock time during the UK spring transition", () => {
    expect(wallTimeToInstant("2026-03-29", "01:30", "Europe/London")).toEqual({
      ok: false,
      reason: "nonexistent",
    });
  });

  it("requires explicit disambiguation during the UK autumn transition", () => {
    expect(wallTimeToInstant("2026-10-25", "01:30", "Europe/London")).toEqual({
      ok: false,
      reason: "ambiguous",
    });
    const earlier = wallTimeToInstant("2026-10-25", "01:30", "Europe/London", "earlier");
    const later = wallTimeToInstant("2026-10-25", "01:30", "Europe/London", "later");
    expect(earlier.ok && later.ok).toBe(true);
    if (earlier.ok && later.ok) {
      expect(later.instant.getTime() - earlier.instant.getTime()).toBe(3_600_000);
    }
  });

  it("adds calendar days across leap day and year boundaries", () => {
    expect(addDaysToDateKey("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDaysToDateKey("2024-02-29", 1)).toBe("2024-03-01");
    expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("supports the committee's -1, 0 and +1 Hijri display adjustments", () => {
    const labels = [-1, 0, 1].map((adjustment) =>
      formatHijriDate("2026-07-13", adjustment as -1 | 0 | 1),
    );
    expect(new Set(labels).size).toBe(3);
  });
});
