import Link from "next/link";

import { requirePermission } from "@/lib/auth/session";
import { roleHasPermission } from "@/lib/permissions";

const statusLabels = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
} as const;

function formatAdminDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default async function PrayerTimesIndexPage() {
  const context = await requirePermission("prayer:read");
  const { data: configurations, error } = await context.supabase
    .from("prayer_settings")
    .select(
      "id, name, status, effective_from, effective_to, timezone, source_name, version, published_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error || !configurations) {
    throw new Error("Prayer configurations could not be loaded safely.");
  }
  const canWrite = roleHasPermission(context.role, "prayer:write");

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Religiously sensitive information</p>
          <h1>Prayer timetable</h1>
          <p>
            Review calculation sources, congregation rules, dated exceptions and the exact public
            schedule before approval.
          </p>
        </div>
        {canWrite && (
          <Link className="admin-button" href="/admin/prayer-times/new">
            Create timetable draft
          </Link>
        )}
      </div>

      <div className="admin-card admin-card--narrow">
        <h2>Publication safeguard</h2>
        <p>
          Public prayer times only come from an explicitly approved configuration. Published
          versions cannot be edited; make a new draft whenever the source or arrangement changes.
        </p>
      </div>

      {configurations.length === 0 ? (
        <div className="admin-empty admin-section">
          <h2>No prayer timetable is configured</h2>
          <p>
            The public website will continue to show prayer times as unavailable. An authorised
            prayer editor can prepare a draft without publishing it.
          </p>
        </div>
      ) : (
        <div className="admin-table-wrap admin-section">
          <table className="admin-table">
            <caption className="admin-visually-hidden">Prayer timetable configurations</caption>
            <thead>
              <tr>
                <th scope="col">Configuration</th>
                <th scope="col">Effective period</th>
                <th scope="col">Source</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="admin-visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {configurations.map((configuration) => (
                <tr key={configuration.id}>
                  <th scope="row">
                    {configuration.name}
                    <span className="admin-table-secondary">
                      Version {configuration.version} · {configuration.timezone}
                    </span>
                  </th>
                  <td>
                    <time dateTime={configuration.effective_from}>
                      {formatAdminDate(configuration.effective_from)}
                    </time>
                    <span className="admin-table-secondary">
                      {configuration.effective_to ? (
                        <>
                          to{" "}
                          <time dateTime={configuration.effective_to}>
                            {formatAdminDate(configuration.effective_to)}
                          </time>
                        </>
                      ) : (
                        "No end date"
                      )}
                    </span>
                  </td>
                  <td>{configuration.source_name}</td>
                  <td>
                    <span className={`admin-status admin-status--${configuration.status}`}>
                      {statusLabels[configuration.status]}
                    </span>
                  </td>
                  <td>
                    <time dateTime={configuration.updated_at}>
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Europe/London",
                      }).format(new Date(configuration.updated_at))}
                    </time>
                  </td>
                  <td>
                    <Link href={`/admin/prayer-times/${configuration.id}`}>
                      {canWrite ? "Open" : "Review"}
                      <span className="admin-visually-hidden"> {configuration.name}</span>
                    </Link>
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
