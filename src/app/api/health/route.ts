import { NextResponse } from "next/server";

import { SupabaseConfigurationError } from "@/lib/supabase/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const checkedAt = new Date().toISOString();
  try {
    const client = createSupabaseServiceClient({
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    });
    const { error } = await client
      .from("site_settings")
      .select("key", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json(
      {
        status: "ok",
        database: "reachable",
        checkedAt,
        release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const database = error instanceof SupabaseConfigurationError ? "not_configured" : "unreachable";
    return NextResponse.json(
      { status: "unavailable", database, checkedAt },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store", "Retry-After": "60" },
      },
    );
  }
}
