import Link from "next/link";

import { ContentArchiveButton } from "@/components/admin/content-archive-button";
import { ConfirmedActionButton } from "@/components/admin/confirmed-action-button";
import { ContentForm } from "@/components/admin/content-form";
import { roleHasPermission } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/session";
import {
  restoreContentRevisionAction,
  restoreSoftDeletedContentAction,
  softDeleteContentAction,
} from "@/server/actions/content";

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requirePermission("content:read");
  const [{ data: item, error }, { data: revisions, error: revisionsError }] = await Promise.all([
    context.supabase.from("content_items").select("*").eq("id", id).maybeSingle(),
    context.supabase
      .from("content_revisions")
      .select("id, version, reason, created_at, created_by")
      .eq("content_item_id", id)
      .order("version", { ascending: false })
      .limit(20),
  ]);
  if (error || revisionsError || !revisions)
    throw new Error("This content record could not be loaded safely.");
  if (!item) {
    return (
      <div className="admin-card admin-card--narrow">
        <p className="admin-eyebrow">Content unavailable</p>
        <h1>We could not find that content item</h1>
        <p>It may have been removed, or your committee role may not allow you to review it.</p>
        <Link className="admin-button" href="/admin/content">
          Back to all content
        </Link>
      </div>
    );
  }
  const canWrite = roleHasPermission(context.role, "content:write");

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            {item.demo_local_only ? "Local demonstration · " : ""}Content version {item.version}
          </p>
          <h1>{canWrite ? "Edit content" : "Review content"}</h1>
          <p>
            <Link href="/admin/content">Back to all content</Link>
          </p>
        </div>
        {!item.deleted_at && (
          <Link
            className="admin-button admin-button--quiet"
            href={`/admin/content/${item.id}/preview`}
          >
            Preview
          </Link>
        )}
      </div>
      {item.deleted_at ? (
        <div className="admin-card admin-card--narrow">
          <p className="admin-eyebrow">Soft-deleted archive</p>
          <h2>This item is not public or editable</h2>
          <p>Restore it to create a private draft, then review it before any publication.</p>
          {canWrite && (
            <form action={restoreSoftDeletedContentAction}>
              <input name="id" type="hidden" value={item.id} />
              <input name="expectedVersion" type="hidden" value={item.version} />
              <ConfirmedActionButton
                className="admin-button"
                question="Restore this soft-deleted item as a private draft?"
              >
                Restore as draft
              </ConfirmedActionButton>
            </form>
          )}
        </div>
      ) : canWrite ? (
        <ContentForm item={item} />
      ) : (
        <div className="admin-card">
          <h2>{item.title}</h2>
          <p>{item.summary}</p>
          <pre className="admin-content-preview">{JSON.stringify(item.body, null, 2)}</pre>
        </div>
      )}
      {canWrite && !item.deleted_at && (
        <section className="admin-section" aria-labelledby="archive-heading">
          <h2 id="archive-heading">Archive</h2>
          <p>Archiving is a soft deletion. The revision record remains available.</p>
          <form action={softDeleteContentAction}>
            <input name="id" type="hidden" value={item.id} />
            <input name="expectedVersion" type="hidden" value={item.version} />
            <ContentArchiveButton action={softDeleteContentAction} />
          </form>
        </section>
      )}
      <section className="admin-section" aria-labelledby="history-heading">
        <h2 id="history-heading">Revision history</h2>
        <p>Restoring a revision always creates a new draft. It never republishes automatically.</p>
        {!revisions.length ? (
          <p className="admin-muted">No earlier revisions have been recorded.</p>
        ) : (
          <ol className="admin-revision-list">
            {revisions.map((revision) => (
              <li key={revision.id}>
                <div>
                  <strong>Version {revision.version}</strong>
                  <span>
                    <time dateTime={revision.created_at}>
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Europe/London",
                      }).format(new Date(revision.created_at))}
                    </time>
                    {revision.reason ? ` · ${revision.reason}` : ""}
                  </span>
                </div>
                {canWrite && !item.deleted_at && (
                  <form action={restoreContentRevisionAction}>
                    <input name="id" type="hidden" value={item.id} />
                    <input name="expectedVersion" type="hidden" value={item.version} />
                    <input name="revisionId" type="hidden" value={revision.id} />
                    <button className="admin-button admin-button--quiet" type="submit">
                      Restore as draft
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
