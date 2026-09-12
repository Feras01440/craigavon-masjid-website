"use client";

import { useActionState } from "react";

import { ActionFeedback } from "@/components/admin/action-feedback";
import { SubmitButton } from "@/components/admin/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import { publishPrayerSettingsAction } from "@/server/actions/prayer";

export function PrayerPublishForm({ id, version }: { id: string; version: number }) {
  const [state, action] = useActionState(publishPrayerSettingsAction, INITIAL_ACTION_STATE);
  return (
    <form action={action} className="admin-form admin-danger-panel">
      <input name="id" type="hidden" value={id} />
      <input name="expectedVersion" type="hidden" value={version} />
      <h2>Publish approved prayer times</h2>
      <p>
        Publishing immediately changes the public timetable and TV display. Every day in the bounded
        effective period (up to 366 days) is recalculated and checked first; any error blocks
        publication.
      </p>
      <div className="admin-field">
        <label htmlFor="prayer-approval-note">Committee approval record</label>
        <textarea
          id="prayer-approval-note"
          name="approvalNote"
          rows={4}
          minLength={10}
          maxLength={1000}
          required
        />
        <span className="admin-hint">
          Record the approver, decision date and source checked. Do not include private discussion.
        </span>
      </div>
      <div className="admin-field">
        <label htmlFor="prayer-confirmation">Type PUBLISH PRAYER TIMES</label>
        <input id="prayer-confirmation" name="confirmation" autoComplete="off" required />
      </div>
      <ActionFeedback state={state} />
      <SubmitButton className="admin-button admin-button--danger" pendingLabel="Validating…">
        Validate and publish
      </SubmitButton>
    </form>
  );
}
