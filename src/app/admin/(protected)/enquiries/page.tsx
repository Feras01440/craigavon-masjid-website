import Link from "next/link";

import { EnquiryActionForm } from "@/components/admin/enquiry-action-form";
import { roleHasPermission } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/session";
import type { EnquiryStatus } from "@/types/database";

const statuses: ReadonlyArray<{ value: EnquiryStatus | "open" | "all"; label: string }> = [
  { value: "open", label: "Open queue" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "awaiting_response", label: "Awaiting response" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All except deleted" },
];
const validFilters = new Set(statuses.map((item) => item.value));

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("enquiries:read");
  const query = await searchParams;
  const rawFilter = typeof query.status === "string" ? query.status : "open";
  const filter = validFilters.has(rawFilter as EnquiryStatus | "open" | "all") ? rawFilter : "open";
  let request = context.supabase
    .from("enquiries")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(100);
  if (filter === "open")
    request = request.in("status", ["new", "in_progress", "awaiting_response"]);
  else if (filter !== "all") request = request.eq("status", filter as EnquiryStatus);
  const { data: enquiries, error } = await request;
  if (error || !enquiries) throw new Error("The enquiry queue could not be loaded safely.");
  const canWrite = roleHasPermission(context.role, "enquiries:write");

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Private messages</p>
          <h1>Enquiries</h1>
          <p>
            Handle personal information only for the purpose it was submitted and before its
            retention date.
          </p>
        </div>
      </div>
      <nav className="admin-filter-nav" aria-label="Filter enquiries">
        {statuses.map((item) => (
          <Link
            aria-current={filter === item.value ? "page" : undefined}
            href={`/admin/enquiries?status=${item.value}`}
            key={item.value}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {!enquiries.length ? (
        <div className="admin-empty">
          <h2>No enquiries in this view</h2>
          <p>The selected queue is clear.</p>
        </div>
      ) : (
        <div className="admin-enquiry-list">
          {enquiries.map((enquiry) => (
            <article className="admin-card admin-enquiry" key={enquiry.id}>
              <div className="admin-enquiry__heading">
                <div>
                  <p className="admin-eyebrow">{enquiry.kind.replaceAll("_", " ")}</p>
                  <h2>{enquiry.name}</h2>
                </div>
                <span className={`admin-status admin-status--${enquiry.status}`}>
                  {enquiry.status.replaceAll("_", " ")}
                </span>
              </div>
              <dl className="admin-compact-list">
                <div>
                  <dt>Received</dt>
                  <dd>
                    <time dateTime={enquiry.created_at}>
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Europe/London",
                      }).format(new Date(enquiry.created_at))}
                    </time>
                  </dd>
                </div>
                {enquiry.email && (
                  <div>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
                    </dd>
                  </div>
                )}
                {enquiry.phone && (
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${enquiry.phone}`}>{enquiry.phone}</a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Keep until</dt>
                  <dd>
                    <time dateTime={enquiry.retention_until}>
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "long",
                        timeZone: "UTC",
                      }).format(new Date(`${enquiry.retention_until}T12:00:00Z`))}
                    </time>
                  </dd>
                </div>
              </dl>
              <div className="admin-enquiry__message">
                <h3>Message</h3>
                <p>{enquiry.message}</p>
              </div>
              {canWrite && (
                <EnquiryActionForm
                  id={enquiry.id}
                  status={enquiry.status}
                  assignedTo={enquiry.assigned_to}
                  currentUserId={context.userId}
                />
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
