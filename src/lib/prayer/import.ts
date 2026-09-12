import { prayerKeys, type PrayerKey } from "@/lib/prayer/types";

export const IMPORT_MAX_DAYS = 400;
export const IMPORT_MAX_ENTRIES = 2600;

const START_COLUMNS = prayerKeys;
const CONGREGATION_COLUMNS = [
  "fajr_congregation",
  "dhuhr_congregation",
  "asr_congregation",
  "maghrib_congregation",
  "isha_congregation",
] as const;

export type ImportedEntry = {
  date: string;
  prayer: PrayerKey;
  beginsAt: string | null;
  congregationAt: string | null;
};

export type ImportIssue = { line: number; message: string };

export type ParsedImport = {
  days: number;
  entries: ImportedEntry[];
  errors: ImportIssue[];
  firstDate: string | null;
  finalDate: string | null;
};

function normaliseTime(raw: string): string | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(raw.trim());
  if (!match) return null;
  return `${match[1]!.padStart(2, "0")}:${match[2]!}`;
}

function normaliseDate(raw: string): string | null {
  const value = raw.trim();
  let year: number, month: number, day: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (uk) {
    [year, month, day] = [Number(uk[3]), Number(uk[2]), Number(uk[1])];
  } else {
    return null;
  }
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function splitCsvLine(line: string): string[] {
  // The timetable format has no quoted fields; a stray quote is treated as
  // literal text and will fail time/date validation with a line number.
  return line.split(",").map((cell) => cell.trim());
}

/**
 * Parse a committee timetable in wide CSV form:
 *
 *   date,fajr,sunrise,dhuhr,asr,maghrib,isha[,fajr_congregation,...]
 *
 * Dates accept YYYY-MM-DD or DD/MM/YYYY (Excel's UK export). Every row must
 * carry all six start times; congregation columns are optional per cell.
 * Returns row-precise errors and never throws on user input.
 */
export function parseTimetableCsv(
  text: string,
  options: { effectiveFrom?: string; effectiveTo?: string | null } = {},
): ParsedImport {
  const errors: ImportIssue[] = [];
  const entries: ImportedEntry[] = [];
  const seenDates = new Map<string, number>();

  const lines = text.split(/\r?\n/);
  const rows: Array<{ line: number; cells: string[] }> = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (line.trim() === "") continue;
    rows.push({ line: index + 1, cells: splitCsvLine(line) });
  }

  if (rows.length === 0) {
    return {
      days: 0,
      entries: [],
      errors: [{ line: 1, message: "The file is empty." }],
      firstDate: null,
      finalDate: null,
    };
  }

  const header = rows[0]!;
  const columns = header.cells.map((cell) => cell.toLowerCase().replaceAll(" ", "_"));
  const allowed = new Set<string>(["date", ...START_COLUMNS, ...CONGREGATION_COLUMNS]);
  for (const column of columns) {
    if (!allowed.has(column)) {
      errors.push({
        line: header.line,
        message: `Unknown column "${column}". Allowed: date, ${START_COLUMNS.join(", ")}, and optional ${CONGREGATION_COLUMNS.join(", ")}.`,
      });
    }
  }
  for (const required of ["date", ...START_COLUMNS]) {
    if (!columns.includes(required)) {
      errors.push({ line: header.line, message: `Missing required column "${required}".` });
    }
  }
  if (new Set(columns).size !== columns.length) {
    errors.push({ line: header.line, message: "A column appears more than once." });
  }
  if (errors.length > 0) {
    return { days: 0, entries: [], errors, firstDate: null, finalDate: null };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > IMPORT_MAX_DAYS) {
    return {
      days: 0,
      entries: [],
      errors: [
        {
          line: rows[IMPORT_MAX_DAYS]!.line,
          message: `An import may contain at most ${IMPORT_MAX_DAYS} dated rows.`,
        },
      ],
      firstDate: null,
      finalDate: null,
    };
  }

  for (const row of dataRows) {
    if (row.cells.length !== columns.length) {
      errors.push({
        line: row.line,
        message: `Expected ${columns.length} cells but found ${row.cells.length}.`,
      });
      continue;
    }
    const record = new Map(columns.map((column, index) => [column, row.cells[index] ?? ""]));

    const date = normaliseDate(record.get("date") ?? "");
    if (!date) {
      errors.push({ line: row.line, message: "The date must be YYYY-MM-DD or DD/MM/YYYY." });
      continue;
    }
    const duplicateOf = seenDates.get(date);
    if (duplicateOf !== undefined) {
      errors.push({
        line: row.line,
        message: `${date} already appears on line ${duplicateOf}.`,
      });
      continue;
    }
    seenDates.set(date, row.line);

    if (options.effectiveFrom && date < options.effectiveFrom) {
      errors.push({
        line: row.line,
        message: `${date} is before the timetable's effective start (${options.effectiveFrom}).`,
      });
      continue;
    }
    if (options.effectiveTo && date > options.effectiveTo) {
      errors.push({
        line: row.line,
        message: `${date} is after the timetable's effective end (${options.effectiveTo}).`,
      });
      continue;
    }

    const starts: Partial<Record<PrayerKey, string>> = {};
    let rowValid = true;
    for (const prayer of START_COLUMNS) {
      const time = normaliseTime(record.get(prayer) ?? "");
      if (!time) {
        errors.push({
          line: row.line,
          message: `${prayer} needs a 24-hour HH:MM start time.`,
        });
        rowValid = false;
        continue;
      }
      starts[prayer] = time;
    }
    if (!rowValid) continue;

    for (let index = 1; index < START_COLUMNS.length; index += 1) {
      const previous = START_COLUMNS[index - 1]!;
      const current = START_COLUMNS[index]!;
      if (starts[current]! <= starts[previous]!) {
        errors.push({
          line: row.line,
          message: `${current} (${starts[current]}) must be after ${previous} (${starts[previous]}).`,
        });
        rowValid = false;
      }
    }
    if (!rowValid) continue;

    const congregations = new Map<PrayerKey, string>();
    for (const column of CONGREGATION_COLUMNS) {
      if (!columns.includes(column)) continue;
      const raw = record.get(column) ?? "";
      if (raw.trim() === "") continue;
      const time = normaliseTime(raw);
      if (!time) {
        errors.push({
          line: row.line,
          message: `${column} needs a 24-hour HH:MM time or an empty cell.`,
        });
        rowValid = false;
        continue;
      }
      congregations.set(column.replace("_congregation", "") as PrayerKey, time);
    }
    if (!rowValid) continue;

    for (const prayer of START_COLUMNS) {
      entries.push({
        date,
        prayer,
        beginsAt: starts[prayer]!,
        congregationAt: congregations.get(prayer) ?? null,
      });
    }
  }

  const dates = [...seenDates.keys()].sort();
  if (entries.length > IMPORT_MAX_ENTRIES) {
    errors.push({
      line: dataRows[dataRows.length - 1]!.line,
      message: `The import expands to ${entries.length} dated entries; the maximum is ${IMPORT_MAX_ENTRIES}.`,
    });
  }

  return {
    days: seenDates.size,
    entries: errors.length > 0 ? [] : entries,
    errors,
    firstDate: dates[0] ?? null,
    finalDate: dates[dates.length - 1] ?? null,
  };
}
