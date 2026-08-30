import { NextRequest, NextResponse } from "next/server";

import { prayerDisplayNames } from "@/lib/prayer/names";
import { prayerKeys } from "@/lib/prayer/types";
import { formatTime } from "@/lib/prayer/timezone";
import { getPublishedPrayerBundle } from "@/server/repositories/prayer";

function validMonth(value: string | null): value is string {
  return Boolean(value && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value));
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const month = request.nextUrl.searchParams.get("month");
  if (!validMonth(month)) return new NextResponse("Invalid month.", { status: 400 });
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const bundle = await getPublishedPrayerBundle(`${month}-01`, days, { allowLeadingGap: true });
  if (bundle.status !== "available") {
    return new NextResponse(bundle.message, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const headers = [
    "Date",
    ...prayerKeys.flatMap((key) => {
      const name = prayerDisplayNames[key][0];
      return key === "sunrise" ? [`${name} begins`] : [`${name} begins`, `${name} Iqamah`];
    }),
    "Jumuʿah khutbah",
    "Jumuʿah prayer",
  ];
  const rows = bundle.schedules.map((schedule) => {
    const jumuah = schedule.jumuah[0] ?? null;
    return [
      schedule.date,
      ...prayerKeys.flatMap((key) => {
        const prayer = schedule.prayers[key];
        const begins = formatTime(prayer.startsAt, schedule.timezone);
        if (key === "sunrise") return [begins];
        const iqamah = formatTime(prayer.congregationAt, schedule.timezone);
        return [
          begins,
          prayer.joinedWith
            ? `${iqamah} (with ${prayerDisplayNames[prayer.joinedWith][0]})`
            : iqamah,
        ];
      }),
      jumuah ? formatTime(jumuah.khutbahAt, schedule.timezone) : "",
      jumuah ? formatTime(jumuah.prayerAt ?? jumuah.khutbahAt, schedule.timezone) : "",
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prayer-times-${month}.csv"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
