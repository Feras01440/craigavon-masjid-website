import Link from "next/link";

import { ConfirmedActionButton } from "@/components/admin/confirmed-action-button";
import { InviteAdminForm } from "@/components/admin/invite-admin-form";
import { ROLE_LABELS } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { disableAdminAction, revokeAdminInviteAction } from "@/server/actions/admin-users";

export default async function AdminUsersPage() {
  const initialContext = await requirePermission("users:manage");
  if (initialContext.aal !== "aal2") {
    return (
      <div className="admin-card admin-card--narrow">
        <p className="admin-eyebrow">Protected account operation</p>
        <h1>Confirm your authenticator first</h1>
        <p>
          Committee account details and invitations stay locked until this session reaches AAL2.
        </p>
        <Link className="admin-button" href="/admin/security">
          Open Security
        </Link>
      </div>
    );
  }
  const context = await requirePermission("users:manage", { requireAal2: true });
  const service = createSupabaseServiceClient();
  const [
    { data: profiles, error: profilesError },
    { data: invites, error: invitesError },
    authUsers,
  ] = await Promise.all([
    context.supabase.from("admin_profiles").select("*").order("created_at", { ascending: true }),
    context.supabase
      .from("admin_invites")
      .select("*")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (profilesError || invitesError || authUsers.error || !profiles || !invites || !authUsers.data)
    throw new Error("The administrator directory could not be loaded safely.");
  const emails = new Map(
    authUsers.data.users.map((user) => [user.id, user.email ?? "Email unavailable"]),
  );

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Super administrator only</p>
          <h1>People and access</h1>
          <p>
            Invite committee members, review role scope, and stop access when responsibilities end.
          </p>
        </div>
      </div>
      <section className="admin-section admin-section--first" aria-labelledby="invite-heading">
        <h2 id="invite-heading">Invite a committee administrator</h2>
        <InviteAdminForm />
      </section>
      <section className="admin-section" aria-labelledby="accounts-heading">
        <h2 id="accounts-heading">Administrator accounts</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption className="admin-visually-hidden">Committee administrator accounts</caption>
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">MFA rule</th>
                <th scope="col">
                  <span className="admin-visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <th scope="row">
                    {profile.display_name}
                    <span className="admin-table-secondary">
                      {emails.get(profile.id) ?? "Email unavailable"}
                    </span>
                    {profile.id === context.userId && (
                      <span className="admin-table-secondary">Current account</span>
                    )}
                  </th>
                  <td>{ROLE_LABELS[profile.role]}</td>
                  <td>
                    <span className={`admin-status admin-status--${profile.status}`}>
                      {profile.status}
                    </span>
                  </td>
                  <td>{profile.mfa_required ? "Required" : "Not required"}</td>
                  <td>
                    {profile.status !== "disabled" && profile.id !== context.userId ? (
                      <form action={disableAdminAction}>
                        <input name="userId" type="hidden" value={profile.id} />
                        <ConfirmedActionButton
                          question={`Disable administration access for ${profile.display_name}?`}
                        >
                          Disable account
                        </ConfirmedActionButton>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-section" aria-labelledby="pending-heading">
        <h2 id="pending-heading">Pending invitations</h2>
        {!invites.length ? (
          <p className="admin-muted">No invitations are awaiting activation.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="admin-visually-hidden">Pending administrator invitations</caption>
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Expires</th>
                  <th scope="col">
                    <span className="admin-visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <th scope="row">{invite.email}</th>
                    <td>{ROLE_LABELS[invite.role]}</td>
                    <td>
                      <time dateTime={invite.expires_at}>
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Europe/London",
                        }).format(new Date(invite.expires_at))}
                      </time>
                    </td>
                    <td>
                      <form action={revokeAdminInviteAction}>
                        <input name="inviteId" type="hidden" value={invite.id} />
                        <ConfirmedActionButton
                          question={`Revoke the unused invitation for ${invite.email}?`}
                        >
                          Revoke invitation
                        </ConfirmedActionButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
