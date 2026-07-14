"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  beginMfaEnrollmentAction,
  confirmMfaAction,
  type MfaEnrollmentState,
} from "@/lib/auth/actions";
import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

const INITIAL_ENROLLMENT_STATE: MfaEnrollmentState = {
  status: "idle",
  message: "",
  enrollment: null,
};

export function MfaPanel({
  initialAal,
  hasVerifiedFactor,
}: {
  initialAal: "aal1" | "aal2";
  hasVerifiedFactor: boolean;
}) {
  const router = useRouter();
  const [enrollmentState, enrollAction] = useActionState(
    beginMfaEnrollmentAction,
    INITIAL_ENROLLMENT_STATE,
  );
  const [confirmationState, confirmAction] = useActionState(confirmMfaAction, INITIAL_ACTION_STATE);

  useEffect(() => {
    if (confirmationState.status === "success") router.refresh();
  }, [confirmationState.status, router]);

  const enrollment = enrollmentState.enrollment;
  return (
    <section className="admin-card" aria-labelledby="mfa-heading">
      <p className="admin-eyebrow">Multi-factor authentication</p>
      <h2 id="mfa-heading">Authenticator app</h2>
      <p>
        Publishing, media changes, enquiry updates and account management require a current
        authenticator confirmation.
      </p>
      <p>
        <strong>Enrolment:</strong>{" "}
        {hasVerifiedFactor ? "Authenticator enrolled" : "No verified authenticator"}
      </p>
      <p>
        <strong>This session:</strong>{" "}
        {initialAal === "aal2" || confirmationState.status === "success"
          ? "Confirmed (AAL2)"
          : "Confirmation needed (AAL1)"}
      </p>

      {!hasVerifiedFactor && !enrollment && (
        <form action={enrollAction}>
          <SubmitButton pendingLabel="Starting secure setup…">Set up authenticator</SubmitButton>
        </form>
      )}
      <ActionFeedback state={enrollmentState} />

      {enrollment && (
        <div className="admin-mfa-enrollment">
          <h3>1. Scan this code</h3>
          <Image
            className="admin-qr"
            src={enrollment.qrCode}
            alt="Authenticator enrolment QR code"
            width={220}
            height={220}
            unoptimized
          />
          <details>
            <summary>Cannot scan it?</summary>
            <p>
              Enter this setup key manually: <code>{enrollment.secret}</code>
            </p>
          </details>
        </div>
      )}

      {(hasVerifiedFactor || enrollment) && initialAal !== "aal2" && (
        <form action={confirmAction} className="admin-form admin-form--compact">
          {enrollment && <input name="factorId" type="hidden" value={enrollment.factorId} />}
          <div className="admin-field">
            <label htmlFor="mfa-code">
              {enrollment ? "2. Enter the current code" : "Enter the current authenticator code"}
            </label>
            <input
              id="mfa-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </div>
          <SubmitButton pendingLabel="Confirming securely…">
            Confirm authenticator code
          </SubmitButton>
        </form>
      )}
      <ActionFeedback state={confirmationState} />
    </section>
  );
}
