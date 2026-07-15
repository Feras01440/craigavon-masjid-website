import "server-only";

import {
  databaseKindsFor,
  isPublicContentSlug,
  mapPublishedContentRows,
  publicContentTypeSchema,
  type PublicContentItem,
  type PublicContentType,
} from "@/lib/content/public-content";
import { demoModeIsActive } from "@/lib/demo-mode";
import { SupabaseConfigurationError } from "@/lib/supabase/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const PUBLIC_CONTENT_SELECT =
  "id,kind,slug,title,summary,seo_title,seo_description,body,category,status,featured,publish_at,expires_at,published_by,published_at,deleted_at,updated_at";

const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

type PublishedContentOptions = {
  limit?: number;
  slug?: string;
};

export type PublishedContentResult =
  | { status: "ready"; items: PublicContentItem[]; omittedCount: number }
  | { status: "empty"; items: []; omittedCount: 0 }
  | { status: "unavailable"; items: []; omittedCount: 0 };

function unavailableResult(): PublishedContentResult {
  return { status: "unavailable", items: [], omittedCount: 0 };
}

export async function getPublishedContent(
  requestedTypes: readonly PublicContentType[],
  options: PublishedContentOptions = {},
): Promise<PublishedContentResult> {
  const parsedTypes = publicContentTypeSchema.array().min(1).safeParse(requestedTypes);
  if (!parsedTypes.success) return unavailableResult();
  if (options.slug !== undefined && !isPublicContentSlug(options.slug)) {
    return { status: "empty", items: [], omittedCount: 0 };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const requestedLimit =
    typeof options.limit === "number" && Number.isFinite(options.limit)
      ? Math.trunc(options.limit)
      : 48;
  const limit = Math.min(Math.max(requestedLimit, 1), 100);

  try {
    const client = createSupabaseServiceClient({ fetch: noStoreFetch });

    let request = client
      .from("content_items")
      .select(PUBLIC_CONTENT_SELECT)
      .in("kind", databaseKindsFor(parsedTypes.data))
      .in("status", ["published", "scheduled"])
      .is("deleted_at", null)
      .not("published_by", "is", null)
      .not("published_at", "is", null)
      .lte("published_at", nowIso)
      .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
    if (!demoModeIsActive()) request = request.eq("demo_local_only", false);

    if (options.slug) request = request.eq("slug", options.slug);

    const { data, error } = await request
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Unable to load approved public content", { code: error.code });
      return unavailableResult();
    }

    const rows = data ?? [];
    const mapped = mapPublishedContentRows(rows, now);
    if (rows.length > 0 && mapped.items.length === 0) {
      console.error("Approved public content failed validation", {
        rejected: mapped.rejectedCount,
      });
      return unavailableResult();
    }
    if (mapped.items.length === 0) {
      return { status: "empty", items: [], omittedCount: 0 };
    }
    if (mapped.rejectedCount > 0) {
      console.error("Some approved public content failed validation", {
        rejected: mapped.rejectedCount,
      });
    }

    return {
      status: "ready",
      items: mapped.items,
      omittedCount: mapped.rejectedCount,
    };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) return unavailableResult();
    console.error("Unable to initialise approved public content", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return unavailableResult();
  }
}

export function getPublishedPolicy(slug: string): Promise<PublishedContentResult> {
  return getPublishedContent(["policy"], { slug, limit: 1 });
}
