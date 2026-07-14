import type { Metadata } from "next";

import { dateKeyInZone } from "@/lib/prayer/timezone";
import { getPublishedNotices } from "@/server/repositories/notices";
import { getPublishedPrayerBundle } from "@/server/repositories/prayer";
import { getPublicTvDisplaySetting } from "@/server/repositories/public-site-settings";

import { TvClient } from "./tv-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prayer display",
  robots: { index: false, follow: false },
};

export default async function TvPage(): Promise<React.ReactNode> {
  const generatedAt = new Date().toISOString();
  const [prayer, notices, display] = await Promise.all([
    getPublishedPrayerBundle(dateKeyInZone(new Date(), "Europe/London"), 4),
    getPublishedNotices(),
    getPublicTvDisplaySetting(),
  ]);
  return <TvClient initialPayload={{ generatedAt, prayer, notices, display }} />;
}
