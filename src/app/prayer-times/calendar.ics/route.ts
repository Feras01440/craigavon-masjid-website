import { NextResponse } from "next/server";

import { prayerDisplayNames } from "@/lib/prayer/names";
import { dateKeyInZone, formatTime } from "@/lib/prayer/timezone";
import { prayerKeys, type PrayerSchedule } from "@/lib/prayer/types";
import { getPublishedPrayerBundle } from "@/server/repositories/prayer";
import { getPublicContactInformation } from "@/server/repositories/public-site-settings";

/*
 * Subscribable iCalendar feed of the published timetable: one short event
 * per Iqamah plus Jumuʿah, for the next two months. Calendar apps re-fetch
 * on their own schedule, so the feed only ever carries approved times and
 * simply shortens if the committee's coverage ends.
 */
export const revalidate = 3600;

const FEED_DAYS = 62;
const MASJID = "Craigavon Masjid";

function icsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll(/\r?\n/g, "\\n");
}

function icsStamp(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

// RFC 5545 folds content lines at 75 octets; fold on characters, which is
// always safe for the ASCII-heavy lines produced here.
function fold(line: string): string {
  const chunks: string[] = [];
  let remaining = line;
  while (remaining.length > 73) {
    chunks.push(remaining.slice(0, 73));
    remaining = ` ${remaining.slice(73)}`;
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

function event(fields: {
  uid: string;
  starts: string;
  minutes: number;
  summary: string;
  description: string;
  location: string;
  stamp: string;
}): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${fields.uid}`,
    `DTSTAMP:${fields.stamp}`,
    `DTSTART:${icsStamp(fields.starts)}`,
    `DURATION:PT${fields.minutes}M`,
    `SUMMARY:${icsText(fields.summary)}`,
    `DESCRIPTION:${icsText(fields.description)}`,
    `LOCATION:${icsText(fields.location)}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  ];
}

function scheduleEvents(schedule: PrayerSchedule, location: string, stamp: string): string[] {
  const lines: string[] = [];
  for (const key of prayerKeys) {
    if (key === "sunrise") continue;
    const prayer = schedule.prayers[key];
    const anchor = prayer.congregationAt ?? prayer.startsAt;
    if (!anchor) continue;
    const name = prayerDisplayNames[key][0];
    const begins = formatTime(prayer.startsAt, schedule.timezone);
    const iqamah = formatTime(prayer.congregationAt, schedule.timezone);
    const joined = prayer.joinedWith
      ? ` (prayed with ${prayerDisplayNames[prayer.joinedWith][0]})`
      : "";
    lines.push(
      ...event({
        uid: `${schedule.date}-${key}@craigavon-masjid`,
        starts: anchor,
        minutes: 10,
        summary: prayer.congregationAt ? `${name} Iqamah ${iqamah}` : `${name} ${begins}`,
        description: `${name} — begins ${begins}${prayer.congregationAt ? `, Iqamah ${iqamah}` : ""}${joined}. ${MASJID}.`,
        location,
        stamp,
      }),
    );
  }
  schedule.jumuah.forEach((session, index) => {
    const khutbah = formatTime(session.khutbahAt, schedule.timezone);
    lines.push(
      ...event({
        uid: `${schedule.date}-jumuah-${index + 1}@craigavon-masjid`,
        starts: session.khutbahAt,
        minutes: 45,
        summary: `${session.label || prayerDisplayNames.jumuah[0]} — khutbah ${khutbah}`,
        description: `${prayerDisplayNames.jumuah[0]} at ${MASJID}. Khutbah ${khutbah}.`,
        location,
        stamp,
      }),
    );
  });
  return lines;
}

export async function GET(): Promise<NextResponse> {
  const today = dateKeyInZone(new Date(), "Europe/London");
  const [bundle, contact] = await Promise.all([
    getPublishedPrayerBundle(today, FEED_DAYS, { allowLeadingGap: true }),
    getPublicContactInformation(),
  ]);
  if (bundle.status !== "available") {
    return new NextResponse(bundle.message, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const location = contact
    ? [MASJID, contact.address_line_1, contact.address_line_2, contact.locality, contact.postcode]
        .filter(Boolean)
        .join(", ")
    : MASJID;
  const stamp = icsStamp(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Muslim Association of Craigavon//Prayer times//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(`${MASJID} prayer times`)}`,
    "X-WR-TIMEZONE:Europe/London",
    "REFRESH-INTERVAL;VALUE=DURATION:P1D",
    "X-PUBLISHED-TTL:P1D",
    ...bundle.schedules.flatMap((schedule) => scheduleEvents(schedule, location, stamp)),
    "END:VCALENDAR",
  ];
  const body = `${lines.map(fold).join("\r\n")}\r\n`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="craigavon-masjid-prayer-times.ics"',
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
