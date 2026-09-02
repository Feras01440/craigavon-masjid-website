import "server-only";

import { demoModeIsActive } from "@/lib/demo-mode";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type PublicNotice = {
  id: string;
  kind: "announcement" | "emergency_notice";
  title: string;
  summary: string;
  featured: boolean;
  expiresAt: string | null;
  updatedAt: string;
};

export type PublicNoticeResult =
  | { status: "available"; notices: PublicNotice[] }
  | { status: "unavailable"; notices: []; message: string };

export async function getPublishedNotices(): Promise<PublicNoticeResult> {
  let client;
  try {
    client = createSupabaseServiceClient({
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    });
  } catch {
    return {
      status: "unavailable",
      notices: [],
      message: "The approved notice service is not configured.",
    };
  }
  const now = new Date().toISOString();
  let request = client
    .from("content_items")
    .select("id,kind,title,summary,featured,expires_at,updated_at")
    .in("kind", ["announcement", "emergency_notice"])
    .in("status", ["published", "scheduled"])
    .is("deleted_at", null)
    .not("published_by", "is", null)
    .not("published_at", "is", null)
    .lte("published_at", now)
    .or(`publish_at.is.null,publish_at.lte.${now}`)
    .or(`expires_at.is.null,expires_at.gt.${now}`);
  if (!demoModeIsActive()) request = request.eq("demo_local_only", false);
  const { data, error } = await request
    .order("featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(12);
  if (error) {
    console.error("Unable to load published notices", error);
    return {
      status: "unavailable",
      notices: [],
      message: "Approved notices could not be checked.",
    };
  }
  return {
    status: "available",
    notices: (data ?? []).map((row) => ({
      id: String(row.id),
      kind: row.kind as PublicNotice["kind"],
      title: String(row.title),
      summary: typeof row.summary === "string" ? row.summary : "",
      featured: Boolean(row.featured),
      expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
      updatedAt: String(row.updated_at),
    })),
  };
}
