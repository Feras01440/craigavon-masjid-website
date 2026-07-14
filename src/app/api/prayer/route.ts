import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { dateKeyInZone } from "@/lib/prayer/timezone";
import { dateKeySchema } from "@/lib/prayer/types";
import { getPublishedPrayerBundle } from "@/server/repositories/prayer";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  from: dateKeySchema.optional(),
  days: z.coerce.number().int().min(1).max(40).default(3),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const parsed = querySchema.safeParse({
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    days: request.nextUrl.searchParams.get("days") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Use a valid start date and request no more than 40 days." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const firstDate = parsed.data.from ?? dateKeyInZone(new Date(), "Europe/London");
  const result = await getPublishedPrayerBundle(firstDate, parsed.data.days);
  return NextResponse.json(result, {
    status: result.status === "available" ? 200 : 503,
    headers: {
      "Cache-Control":
        result.status === "available"
          ? "public, max-age=60, stale-while-revalidate=300"
          : "no-store",
    },
  });
}
