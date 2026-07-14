import Link from "next/link";

import { roleHasPermission } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/session";

const statusLabels = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
} as const;

export default async function ContentIndexPage() {
  const context = await requirePermission("content:read");
  const { data: items, error } = await context.supabase
    .from("content_items")
    .select("id, kind, title, slug, status, publish_at, expires_at, updated_at, version")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error || !items) throw new Error("Content could not be loaded safely.");
  const canWrite = roleHasPermission(context.role, "content:write");

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Website information</p>
          <h1>Content</h1>
          <p>Create, schedule and review structured public content.</p>
        </div>
        {canWrite && (
          <Link className="admin-button" href="/admin/content/new">
            Create content
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <div className="admin-empty">
          <h2>No content yet</h2>
          <p>Start with a draft. Nothing appears publicly until it is deliberately published.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption className="admin-visually-hidden">Latest content items</caption>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="admin-visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <th scope="row">
                    <strong>{item.title}</strong>
                    <span className="admin-table-secondary">/{item.slug}</span>
                  </th>
                  <td>{item.kind.replaceAll("_", " ")}</td>
                  <td>
                    <span className={`admin-status admin-status--${item.status}`}>
                      {statusLabels[item.status]}
                    </span>
                  </td>
                  <td>
                    <time dateTime={item.updated_at}>
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Europe/London",
                      }).format(new Date(item.updated_at))}
                    </time>
                  </td>
                  <td>
                    {canWrite ? (
                      <Link href={`/admin/content/${item.id}`}>
                        Edit<span className="admin-visually-hidden"> {item.title}</span>
                      </Link>
                    ) : (
                      <Link href={`/admin/content/${item.id}`}>
                        Review<span className="admin-visually-hidden"> {item.title}</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
