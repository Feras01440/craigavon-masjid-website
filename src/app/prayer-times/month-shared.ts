import { dateKeyInZone } from "@/lib/prayer/timezone";

export type MonthParts = { year: number; month: number };

export function currentMonthParts(): MonthParts {
  const today = dateKeyInZone(new Date(), "Europe/London");
  const [year, month] = today.split("-").map(Number) as [number, number];
  return { year, month };
}

/*
 * Accepts YYYY-MM within two calendar years of today. The clamp keeps the
 * ISR cache-entry space bounded — arbitrary far-future months 404 instead
 * of each occupying a cache slot.
 */
export function parseMonthSegment(value: string): MonthParts | null {
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number) as [number, number];
  const currentYear = currentMonthParts().year;
  if (year < currentYear - 2 || year > currentYear + 2) return null;
  return { year, month };
}

export function monthKeyOf(parts: MonthParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

export function shiftedMonthKey(parts: MonthParts, delta: number): string {
  const date = new Date(Date.UTC(parts.year, parts.month - 1 + delta, 1));
  return monthKeyOf({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 });
}

export function daysInMonth(parts: MonthParts): number {
  return new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
}

export function monthLabelOf(parts: MonthParts): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, 1)));
}
