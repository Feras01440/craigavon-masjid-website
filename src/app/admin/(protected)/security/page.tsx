import { MfaPanel } from "@/components/admin/mfa-panel";
import { ROLE_LABELS } from "@/lib/permissions";
import { requireAdmin } from "@/lib/auth/session";

export default async function SecurityPage() {
  const context = await requireAdmin();
  const { data: factors, error } = await context.supabase.auth.mfa.listFactors();
  if (error || !factors) throw new Error("Authenticator settings could not be loaded safely.");
  const hasVerifiedFactor = factors.totp.some((factor) => factor.status === "verified");
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Account protection</p>
          <h1>Security</h1>
          <p>Confirm your identity before making sensitive public or administrative changes.</p>
        </div>
      </div>
      <div className="admin-summary-grid">
        <div className="admin-card">
          <h2>Signed-in account</h2>
          <dl className="admin-definition-list">
            <div>
              <dt>Name</dt>
              <dd>{context.displayName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{context.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{ROLE_LABELS[context.role]}</dd>
            </div>
          </dl>
        </div>
        <div className="admin-card">
          <h2>Security rules</h2>
          <p>
            Magic links do not create accounts. Only invited, active committee profiles can enter.
            Disabled accounts are rejected on the server.
          </p>
        </div>
      </div>
      <MfaPanel initialAal={context.aal} hasVerifiedFactor={hasVerifiedFactor} />
    </>
  );
}
