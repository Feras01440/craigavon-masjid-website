import Link from "next/link";
import type { ReactNode } from "react";

import { signOutAction } from "@/lib/auth/actions";
import { roleHasPermission, ROLE_LABELS, type Permission } from "@/lib/permissions";
import type { AdminContext } from "@/lib/auth/session";

const navigation: ReadonlyArray<{ href: string; label: string; permission?: Permission }> = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/content", label: "Content", permission: "content:read" },
  { href: "/admin/settings", label: "Website settings", permission: "content:read" },
  { href: "/admin/media", label: "Media", permission: "media:read" },
  { href: "/admin/prayer-times", label: "Prayer timetable", permission: "prayer:read" },
  { href: "/admin/enquiries", label: "Enquiries", permission: "enquiries:read" },
  { href: "/admin/audit", label: "Audit log", permission: "audit:read" },
  { href: "/admin/users", label: "People and access", permission: "users:manage" },
  { href: "/admin/security", label: "Security" },
];

export function AdminShell({ context, children }: { context: AdminContext; children: ReactNode }) {
  const links = navigation.filter(
    (item) => !item.permission || roleHasPermission(context.role, item.permission),
  );
  return (
    <div className="admin-shell">
      <a className="admin-skip-link" href="#admin-main">
        Skip to administration content
      </a>
      <header className="admin-topbar">
        <div>
          <Link className="admin-brand" href="/admin">
            MAC committee administration
          </Link>
          <p className="admin-identity">
            Signed in as {context.displayName} · {ROLE_LABELS[context.role]}
          </p>
        </div>
        <form action={signOutAction}>
          <button className="admin-button admin-button--quiet" type="submit">
            Sign out
          </button>
        </form>
      </header>
      {context.aal !== "aal2" && (
        <div className="admin-security-notice" role="status">
          <strong>Authenticator confirmation needed.</strong> Publishing and other sensitive changes
          are locked. <Link href="/admin/security">Confirm a code on the Security page</Link>.
        </div>
      )}
      <div className="admin-frame">
        <nav aria-label="Committee administration" className="admin-navigation">
          <ul>
            {links.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
          <Link className="admin-public-link" href="/">
            View public website
          </Link>
        </nav>
        <main className="admin-main" id="admin-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
