import { describe, expect, it } from "vitest";

import { parseTimetableCsv } from "@/lib/prayer/import";

const HEADER = "date,fajr,sunrise,dhuhr,asr,maghrib,isha";
const ROW = "06:45,08:46,12:41,14:12,16:07,17:56";

describe("committee timetable import parsing", () => {
  it("parses ISO-dated rows into six dated entries per day", () => {
    const parsed = parseTimetableCsv(`${HEADER}\n2026-01-01,${ROW}\n2026-01-02,${ROW}`);
    expect(parsed.errors).toEqual([]);
    expect(parsed.days).toBe(2);
    expect(parsed.entries).toHaveLength(12);
    expect(parsed.firstDate).toBe("2026-01-01");
    expect(parsed.finalDate).toBe("2026-01-02");
    expect(parsed.entries[0]).toEqual({
      date: "2026-01-01",
      prayer: "fajr",
      beginsAt: "06:45",
      congregationAt: null,
    });
  });

  it("normalises UK dates, single-digit hours and CRLF line endings", () => {
    const parsed = parseTimetableCsv(
      `${HEADER}\r\n31/01/2026,6:45,8:46,12:41,14:12,16:07,17:56\r\n`,
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.entries[0]?.date).toBe("2026-01-31");
    expect(parsed.entries[0]?.beginsAt).toBe("06:45");
  });

  it("carries optional congregation columns through to the matching prayer", () => {
    const parsed = parseTimetableCsv(
      `${HEADER},asr_congregation,isha_congregation\n2026-01-01,${ROW},14:30,`,
    );
    expect(parsed.errors).toEqual([]);
    const asr = parsed.entries.find((entry) => entry.prayer === "asr");
    const isha = parsed.entries.find((entry) => entry.prayer === "isha");
    expect(asr?.congregationAt).toBe("14:30");
    expect(isha?.congregationAt).toBeNull();
  });

  it("rejects duplicate dates with both line numbers", () => {
    const parsed = parseTimetableCsv(`${HEADER}\n2026-01-01,${ROW}\n01/01/2026,${ROW}`);
    expect(parsed.entries).toEqual([]);
    expect(parsed.errors).toEqual([{ line: 3, message: "2026-01-01 already appears on line 2." }]);
  });

  it("rejects unknown and missing columns at the header", () => {
    const unknown = parseTimetableCsv(`date,fajr,sunrise,dhuhr,asr,maghrib,isha,zawal\n`);
    expect(unknown.errors[0]?.message).toContain('Unknown column "zawal"');
    const missing = parseTimetableCsv(`date,fajr,sunrise,dhuhr,asr,maghrib\n`);
    expect(missing.errors[0]?.message).toContain('Missing required column "isha"');
  });

  it("rejects invalid times, impossible dates and unordered days by line", () => {
    const parsed = parseTimetableCsv(
      [
        HEADER,
        `2026-02-30,${ROW}`,
        "2026-03-01,06:45,08:46,12:41,14:12,16:07,25:00",
        "2026-03-02,06:45,08:46,12:41,12:00,16:07,17:56",
      ].join("\n"),
    );
    expect(parsed.entries).toEqual([]);
    expect(parsed.errors).toEqual([
      { line: 2, message: "The date must be YYYY-MM-DD or DD/MM/YYYY." },
      { line: 3, message: "isha needs a 24-hour HH:MM start time." },
      { line: 4, message: "asr (12:00) must be after dhuhr (12:41)." },
    ]);
  });

  it("rejects dates outside the timetable's effective period", () => {
    const parsed = parseTimetableCsv(`${HEADER}\n2026-01-01,${ROW}\n2026-04-01,${ROW}`, {
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-03-31",
    });
    expect(parsed.errors).toEqual([
      {
        line: 3,
        message: "2026-04-01 is after the timetable's effective end (2026-03-31).",
      },
    ]);
  });

  it("rejects an empty file and oversized imports", () => {
    expect(parseTimetableCsv("").errors[0]?.message).toBe("The file is empty.");
    const bigBody = Array.from({ length: 401 }, (_, index) => {
      const day = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
      return `${day},${ROW}`;
    });
    const oversized = parseTimetableCsv([HEADER, ...bigBody].join("\n"));
    expect(oversized.errors[0]?.message).toContain("at most 400 dated rows");
  });
});
