"use client";

import { useActionState } from "react";

import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import { inviteAdminAction } from "@/server/actions/admin-users";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function InviteAdminForm() {
  const [state, action] = useActionState(inviteAdminAction, INITIAL_ACTION_STATE);
  return (
    <form action={action} className="admin-form admin-form--wide">
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="invite-name">Committee member’s name</label>
          <input id="invite-name" name="displayName" required maxLength={100} autoComplete="name" />
        </div>
        <div className="admin-field">
          <label htmlFor="invite-email">Email address</label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
          />
        </div>
      </div>
      <div className="admin-field">
        <label htmlFor="invite-role">Role</label>
        <select id="invite-role" name="role" defaultValue="reviewer">
          <option value="reviewer">Reviewer — read content</option>
          <option value="website_editor">Website editor — content and media</option>
          <option value="prayer_editor">Prayer editor — prayer settings</option>
          <option value="enquiries_manager">Enquiries manager — private enquiry queue</option>
          <option value="super_admin">Super administrator — full administration</option>
        </select>
        <span className="admin-hint">
          Choose the least access needed for the person’s committee responsibilities.
        </span>
      </div>
      <ActionFeedback state={state} />
      <SubmitButton pendingLabel="Creating secure invitation…">Send invitation</SubmitButton>
      <p className="admin-hint">
        The invitation expires after seven days. Magic-link sign in is configured not to create
        uninvited users.
      </p>
    </form>
  );
}
