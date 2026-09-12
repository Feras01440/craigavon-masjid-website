import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorised(request: Request, secret: string): boolean {
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json(
      { error: "Retention automation is not configured." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  if (!authorised(request, secret)) {
    return NextResponse.json(
      { error: "Not authorised." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const client = createSupabaseServiceClient();
  const { data, error } = await client.rpc("purge_expired_operational_data");
  if (error || !data?.[0]) {
    console.error("Retention purge failed", error?.message ?? "No purge result was returned.");
    return NextResponse.json(
      { error: "Retention purge failed." },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store", "Retry-After": "300" },
      },
    );
  }
  return NextResponse.json(
    {
      enquiriesPurged: data[0].enquiries_purged,
      rateLimitsPurged: data[0].rate_limits_purged,
      completedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
