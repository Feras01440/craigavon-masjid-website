import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAccessError } from "@/lib/auth/errors";
import { requireAdmin } from "@/lib/auth/session";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  let context;
  try {
    context = await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError && error.code === "unauthenticated") {
      redirect("/admin/sign-in?reason=session");
    }
    const message =
      error instanceof AdminAccessError
        ? error.message
        : "Committee administration is unavailable. No data has been exposed.";
    return (
      <div className="admin-access-screen">
        <div className="admin-card admin-card--narrow">
          <p className="admin-eyebrow">Access stopped</p>
          <h1>Administration is locked</h1>
          <p>{message}</p>
          <p>
            <a href="/admin/sign-in">Return to secure sign in</a>
          </p>
        </div>
      </div>
    );
  }
  return <AdminShell context={context}>{children}</AdminShell>;
}
