import Link from "next/link";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  before: z.iso.datetime({ offset: true }).optional(),
  entity: z
    .string()
    .trim()
    .max(100)
    .regex(/^[a-z_]*$/u)
    .optional(),
});

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string; entity?: string }>;
}) {
  const requested = querySchema.safeParse(await searchParams);
  const filters = requested.success ? requested.data : {};
  const context = await requirePermission("audit:read");
  let query = context.supabase
    .from("audit_log")
    .select("id,actor_id,action,entity_type,entity_id,created_at")
    .order("created_at", { ascending: false })
    .limit(51);
  if (filters.before) query = query.lt("created_at", filters.before);
  if (filters.entity) query = query.eq("entity_type", filters.entity);
  const { data, error } = await query;
  const rows = error ? [] : (data ?? []).slice(0, 50);
  const nextCursor = !error && (data?.length ?? 0) > 50 ? rows.at(-1)?.created_at : null;

  return (
    <div className="admin-stack">
      <header className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Accountability</p>
          <h1>Audit log</h1>
          <p>
            Metadata-only history of sensitive platform changes. Enquiry bodies are never stored
            here.
          </p>
        </div>
      </header>

      <form className="admin-filter" method="get">
        <label htmlFor="audit-entity">Filter by entity type</label>
        <input
          id="audit-entity"
          name="entity"
          defaultValue={filters.entity ?? ""}
          pattern="[a-z_]*"
          maxLength={100}
          placeholder="content_items"
        />
        <button className="admin-button admin-button--quiet" type="submit">
          Apply filter
        </button>
      </form>

      {error ? (
        <div className="admin-card" role="alert">
          <h2>Audit history is unavailable</h2>
          <p>
            No audit data was exposed. Try again or ask the technical owner to check the service.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-card">
          <h2>No matching audit entries</h2>
          <p>Change the filter or return after an authorised mutation has been recorded.</p>
        </div>
      ) : (
        <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Audit history">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
                <th scope="col">Record</th>
                <th scope="col">Actor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <time dateTime={row.created_at}>
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "medium",
                        timeZone: "Europe/London",
                      }).format(new Date(row.created_at))}
                    </time>
                  </td>
                  <td>{row.action}</td>
                  <td>{row.entity_type}</td>
                  <td>{row.entity_id ?? "—"}</td>
                  <td>{row.actor_id ? `…${row.actor_id.slice(-8)}` : "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor ? (
        <Link
          className="admin-button admin-button--quiet"
          href={`/admin/audit?${new URLSearchParams({
            before: nextCursor,
            ...(filters.entity ? { entity: filters.entity } : {}),
          }).toString()}`}
        >
          Older entries
        </Link>
      ) : null}
    </div>
  );
}
