import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const identifierSchema = z.uuid();

function notFound(): NextResponse {
  return new NextResponse("File not found.", {
    status: 404,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const parsedId = identifierSchema.safeParse(id);
  if (!parsedId.success) return notFound();

  try {
    const client = createSupabaseServiceClient();
    const { data: asset, error } = await client
      .from("media_assets")
      .select("bucket, object_path, mime_type, byte_size")
      .eq("id", parsedId.data)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !asset) return notFound();

    const { data: file, error: downloadError } = await client.storage
      .from(asset.bucket)
      .download(asset.object_path);
    if (downloadError || !file || file.size !== asset.byte_size) {
      return new NextResponse("File temporarily unavailable.", {
        status: 503,
        headers: { "Cache-Control": "private, no-store", "Retry-After": "60" },
      });
    }

    return new Response(await file.arrayBuffer(), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": "inline",
        "Content-Length": String(asset.byte_size),
        "Content-Type": asset.mime_type,
        "Cross-Origin-Resource-Policy": "same-site",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("File service unavailable.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store", "Retry-After": "60" },
    });
  }
}
