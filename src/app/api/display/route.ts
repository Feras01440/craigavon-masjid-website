import { NextResponse } from "next/server";

import { dateKeyInZone } from "@/lib/prayer/timezone";
import { getPublishedNotices } from "@/server/repositories/notices";
import { getPublishedPrayerBundle } from "@/server/repositories/prayer";
import { getPublicTvDisplaySetting } from "@/server/repositories/public-site-settings";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const firstDate = dateKeyInZone(new Date(), "Europe/London");
  const [prayer, notices, display] = await Promise.all([
    getPublishedPrayerBundle(firstDate, 4),
    getPublishedNotices(),
    getPublicTvDisplaySetting(),
  ]);
  const available = prayer.status === "available" && notices.status === "available";
  return NextResponse.json(
    { generatedAt: new Date().toISOString(), prayer, notices, display },
    {
      status: available ? 200 : 503,
      headers: {
        "Cache-Control": available ? "public, max-age=30, stale-while-revalidate=120" : "no-store",
        ...(available ? {} : { "Retry-After": "60" }),
      },
    },
  );
}
