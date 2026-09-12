import { dateKeySchema, timeSchema } from "@/lib/prayer/types";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  const existing = formatterCache.get(timeZone);
  if (existing) return existing;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

export function zonedParts(date: Date, timeZone: string): DateParts {
  const values: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const part of partsFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  const year = values.year;
  const month = values.month;
  const day = values.day;
  const hour = values.hour;
  const minute = values.minute;
  const second = values.second;
  if ([year, month, day, hour, minute, second].some((value) => value === undefined)) {
    throw new Error(`Could not format date in ${timeZone}.`);
  }
  return {
    year: year!,
    month: month!,
    day: day!,
    hour: hour!,
    minute: minute!,
    second: second!,
  };
}

export function dateKeyInZone(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const parsed = dateKeySchema.parse(dateKey);
  const [year, month, day] = parsed.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function dateKeyToHostNoon(dateKey: string): Date {
  const parsed = dateKeySchema.parse(dateKey);
  const [year, month, day] = parsed.split("-").map(Number) as [number, number, number];
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function offsetAt(instantMs: number, timeZone: string): number {
  const roundedInstant = Math.floor(instantMs / 1000) * 1000;
  const parts = zonedParts(new Date(roundedInstant), timeZone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedAsUtc - roundedInstant;
}

export type WallTimeResult =
  | { ok: true; instant: Date; ambiguity: "none" | "earlier" | "later" }
  | { ok: false; reason: "nonexistent" | "ambiguous" };

export function wallTimeToInstant(
  dateKey: string,
  wallTime: string,
  timeZone: string,
  disambiguation: "reject" | "earlier" | "later" = "reject",
): WallTimeResult {
  dateKeySchema.parse(dateKey);
  timeSchema.parse(wallTime);
  const [year, month, day] = dateKey.split("-").map(Number) as [number, number, number];
  const [hour, minute] = wallTime.split(":").map(Number) as [number, number];
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const probes = [
    naive - 86_400_000,
    naive - 21_600_000,
    naive,
    naive + 21_600_000,
    naive + 86_400_000,
  ];
  const offsets = new Set(probes.map((probe) => offsetAt(probe, timeZone)));
  const matches = [...offsets]
    .map((offset) => new Date(naive - offset))
    .filter((candidate) => {
      const parts = zonedParts(candidate, timeZone);
      return (
        parts.year === year &&
        parts.month === month &&
        parts.day === day &&
        parts.hour === hour &&
        parts.minute === minute
      );
    })
    .sort((a, b) => a.getTime() - b.getTime());

  if (matches.length === 0) return { ok: false, reason: "nonexistent" };
  if (matches.length > 1 && disambiguation === "reject") return { ok: false, reason: "ambiguous" };
  const index = matches.length > 1 && disambiguation === "later" ? matches.length - 1 : 0;
  const instant = matches[index];
  if (!instant) return { ok: false, reason: "nonexistent" };
  return {
    ok: true,
    instant,
    ambiguity: matches.length === 1 ? "none" : disambiguation === "later" ? "later" : "earlier",
  };
}

export function formatTime(iso: string | null, timeZone: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatGregorianDate(dateKey: string, timeZone: string): string {
  const wallNoon = wallTimeToInstant(dateKey, "12:00", timeZone, "earlier");
  if (!wallNoon.ok) return dateKey;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(wallNoon.instant);
}

export function formatHijriDate(dateKey: string, adjustment: -1 | 0 | 1): string {
  const adjusted = addDaysToDateKey(dateKey, adjustment);
  const [year, month, day] = adjusted.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-GB-u-ca-islamic", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function isFridayDateKey(dateKey: string): boolean {
  const [year, month, day] = dateKeySchema.parse(dateKey).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay() === 5;
}
