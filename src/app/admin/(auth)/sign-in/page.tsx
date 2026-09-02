import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/components/admin/sign-in-form";

export const metadata: Metadata = { title: "Secure sign in" };

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const signedOut = query.signedOut === "1";
  const callbackError = typeof query.error === "string";
  const sessionEnded = query.reason === "session";
  return (
    <main className="admin-signin">
      <section className="admin-card admin-card--signin" aria-labelledby="signin-heading">
        <p className="admin-eyebrow">Committee area</p>
        <h1 id="signin-heading">Secure sign in</h1>
        <p>
          Access is invitation-only. We will send a single-use link to an approved committee email
          address.
        </p>
        {signedOut && (
          <p className="admin-feedback admin-feedback--success" role="status">
            You have signed out safely.
          </p>
        )}
        {sessionEnded && (
          <p className="admin-feedback" role="status">
            Your session ended. Request a fresh link to continue.
          </p>
        )}
        {callbackError && (
          <p className="admin-feedback admin-feedback--error" role="alert">
            That link is invalid, expired, or no longer approved. Request a new link or contact the
            site administrator.
          </p>
        )}
        <SignInForm />
        <p className="admin-signin-footnote">
          Need public information? <Link href="/">Return to the association website</Link>.
        </p>
      </section>
    </main>
  );
}
