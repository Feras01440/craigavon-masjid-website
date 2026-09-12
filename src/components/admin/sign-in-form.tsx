"use client";

import { useActionState } from "react";

import { requestMagicLinkAction } from "@/lib/auth/actions";
import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function SignInForm() {
  const [state, action] = useActionState(requestMagicLinkAction, INITIAL_ACTION_STATE);
  return (
    <form action={action} className="admin-form admin-form--compact">
      <div className="admin-field">
        <label htmlFor="admin-email">Invitation email address</label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={254}
        />
        <span className="admin-hint">
          Use the exact address that received your committee invitation.
        </span>
      </div>
      <ActionFeedback state={state} />
      <SubmitButton pendingLabel="Requesting secure link…">
        Email me a secure sign-in link
      </SubmitButton>
    </form>
  );
}
