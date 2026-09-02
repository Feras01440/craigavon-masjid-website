import Link from "next/link";

import { PublishedContentBody } from "@/components/site";
import { requirePermission } from "@/lib/auth/session";
import { contentDocumentText, isPublishableContentKind } from "@/lib/content/content-documents";
import { mapPublishedContentRow } from "@/lib/content/public-content";

export const dynamic = "force-dynamic";

export default async function ContentPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requirePermission("content:read");
  const { data: item, error } = await context.supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !item) throw new Error("This preview could not be loaded safely.");

  const now = new Date();
  const preview = isPublishableContentKind(item.kind)
    ? mapPublishedContentRow(
        {
          ...item,
          status: "published",
          publish_at: null,
          expires_at: null,
          published_by: context.userId,
          published_at: now.toISOString(),
          deleted_at: null,
        },
        now,
      )
    : null;

  return (
    <div className="admin-stack">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Protected draft preview</p>
          <h1>{item.title}</h1>
          <p>This page is visible only to an authorised administration account.</p>
        </div>
        <Link className="admin-button admin-button--quiet" href={`/admin/content/${item.id}`}>
          Back to edit
        </Link>
      </div>
      {preview ? (
        <article className="admin-card published-content-card">
          <p className="status-badge">Preview — {item.status}</p>
          <h2>{preview.title}</h2>
          {preview.summary && <p className="published-content-card__summary">{preview.summary}</p>}
          <PublishedContentBody item={preview} />
        </article>
      ) : (
        <div className="admin-card" role="status">
          <h2>Public-format preview is not available</h2>
          <p>
            This draft is incomplete or uses a legacy type. Its safely escaped plain text is shown
            below so it can still be reviewed.
          </p>
          <div className="admin-content-preview">{contentDocumentText(item.body)}</div>
        </div>
      )}
    </div>
  );
}
