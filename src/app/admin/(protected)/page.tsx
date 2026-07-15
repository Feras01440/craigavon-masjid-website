import Link from "next/link";

import { roleHasPermission, ROLE_LABELS, type Permission } from "@/lib/permissions";
import { requireAdmin } from "@/lib/auth/session";

type Summary = {
  label: string;
  value: number | null;
  href: string;
  permission: Permission;
  detail: string;
};

export default async function AdminDashboardPage() {
  const context = await requireAdmin();
  const summaries: Summary[] = [];

  if (roleHasPermission(context.role, "content:read")) {
    const { count, error } = await context.supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft")
      .is("deleted_at", null);
    summaries.push({
      label: "Content drafts",
      value: error ? null : count,
      href: "/admin/content",
      permission: "content:read",
      detail: "Items awaiting work or review",
    });

    const { count: settingCount, error: settingError } = await context.supabase
      .from("site_settings")
      .select("key", { count: "exact", head: true })
      .eq("status", "draft");
    summaries.push({
      label: "Settings drafts",
      value: settingError ? null : settingCount,
      href: "/admin/settings",
      permission: "content:read",
      detail: "Identity and operational settings awaiting review",
    });
  }
  if (roleHasPermission(context.role, "media:read")) {
    const { count, error } = await context.supabase
      .from("media_assets")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft")
      .is("deleted_at", null);
    summaries.push({
      label: "Draft media",
      value: error ? null : count,
      href: "/admin/media",
      permission: "media:read",
      detail: "Uploads not yet public",
    });
  }
  if (roleHasPermission(context.role, "prayer:read")) {
    const { count, error } = await context.supabase
      .from("prayer_settings")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft");
    summaries.push({
      label: "Prayer timetable drafts",
      value: error ? null : count,
      href: "/admin/prayer-times",
      permission: "prayer:read",
      detail: "Configurations awaiting review or publication",
    });
  }
  if (roleHasPermission(context.role, "enquiries:read")) {
    if (context.aal !== "aal2") {
      // Enquiry data (including its count) is AAL2-gated in the database;
      // an unconfirmed session would otherwise see a misleading zero.
      summaries.push({
        label: "Open enquiries",
        value: null,
        href: "/admin/security",
        permission: "enquiries:read",
        detail: "Confirm your authenticator on the Security page to view the private queue",
      });
    } else {
      const { count, error } = await context.supabase
        .from("enquiries")
        .select("id", { count: "exact", head: true })
        .in("status", ["new", "in_progress", "awaiting_response"])
        .is("deleted_at", null);
      summaries.push({
        label: "Open enquiries",
        value: error ? null : count,
        href: "/admin/enquiries",
        permission: "enquiries:read",
        detail: "Messages still in the work queue",
      });
    }
  }
  if (roleHasPermission(context.role, "users:manage")) {
    const { count, error } = await context.supabase
      .from("admin_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "invited");
    summaries.push({
      label: "Pending administrators",
      value: error ? null : count,
      href: "/admin/users",
      permission: "users:manage",
      detail: "Committee invitations not yet activated",
    });
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">{ROLE_LABELS[context.role]}</p>
          <h1>Welcome, {context.displayName}</h1>
          <p>This dashboard only shows the areas allowed for your committee role.</p>
        </div>
      </div>
      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading">Work summary</h2>
        {summaries.length ? (
          <div className="admin-summary-grid">
            {summaries.map((summary) => (
              <Link className="admin-summary-card" href={summary.href} key={summary.href}>
                <span>{summary.label}</span>
                <strong>{summary.value ?? "Unavailable"}</strong>
                <small>{summary.detail}</small>
              </Link>
            ))}
          </div>
        ) : (
          <div className="admin-empty">
            <h3>No operational queue for this role</h3>
            <p>
              Use Security to manage authenticator confirmation, or ask a super administrator if
              your responsibilities have changed.
            </p>
          </div>
        )}
      </section>
      <section className="admin-section" aria-labelledby="session-heading">
        <h2 id="session-heading">Session protection</h2>
        <p>
          {context.aal === "aal2"
            ? "Your authenticator is confirmed, so authorised sensitive actions are unlocked for this session."
            : "Your magic-link session is active, but sensitive changes remain locked until you confirm an authenticator code."}
        </p>
        <Link className="admin-button admin-button--quiet" href="/admin/security">
          Open Security
        </Link>
      </section>
    </>
  );
}
