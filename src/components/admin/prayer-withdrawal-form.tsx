"use client";

import { useActionState, useState } from "react";

import { ActionFeedback } from "@/components/admin/action-feedback";
import { SubmitButton } from "@/components/admin/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import { withdrawPrayerSettingsAction } from "@/server/actions/prayer";

export type PrayerReplacementDraft = {
  id: string;
  name: string;
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export function PrayerWithdrawalForm({
  id,
  version,
  replacementDrafts,
}: {
  id: string;
  version: number;
  replacementDrafts: PrayerReplacementDraft[];
}) {
  const [state, action] = useActionState(withdrawPrayerSettingsAction, INITIAL_ACTION_STATE);
  const [replacement, setReplacement] = useState("");

  return (
    <form action={action} className="admin-form admin-danger-panel">
      <input name="id" type="hidden" value={id} />
      <input name="expectedVersion" type="hidden" value={version} />
      <h2>Withdraw or atomically replace prayer times</h2>
      <p>
        Withdrawal immediately removes this timetable from every public surface. Selecting a draft
        publishes that replacement in the same database transaction; if any part fails, neither
        change is committed.
      </p>
      <div className="admin-field">
        <label htmlFor="prayer-replacement">Replacement draft</label>
        <select
          id="prayer-replacement"
          name="replacement"
          value={replacement}
          onChange={(event) => setReplacement(event.target.value)}
        >
          <option value="">No replacement — show the safe unavailable state</option>
          {replacementDrafts.map((draft) => (
            <option key={draft.id} value={`${draft.id}:${draft.version}`}>
              {draft.name} (version {draft.version}, {draft.effectiveFrom} to{" "}
              {draft.effectiveTo ?? "no end date"})
            </option>
          ))}
        </select>
        <span className="admin-hint">
          Only a bounded draft that passes full-horizon validation can be used as a replacement.
        </span>
      </div>
      {replacement && (
        <div className="admin-field">
          <label htmlFor="replacement-approval-note">Replacement committee approval record</label>
          <textarea
            id="replacement-approval-note"
            name="replacementApprovalNote"
            rows={4}
            minLength={10}
            maxLength={1000}
            required
          />
          <span className="admin-hint">
            Record the replacement approver, decision date and source checked.
          </span>
        </div>
      )}
      <div className="admin-field">
        <label htmlFor="withdrawal-reason">Verified withdrawal reason</label>
        <textarea
          id="withdrawal-reason"
          name="withdrawalReason"
          rows={4}
          minLength={10}
          maxLength={1000}
          required
        />
        <span className="admin-hint">
          This reason, your account and the affected versions are written to the immutable audit
          trail.
        </span>
      </div>
      <div className="admin-field">
        <label htmlFor="withdrawal-confirmation">Type WITHDRAW PRAYER TIMES</label>
        <input
          id="withdrawal-confirmation"
          name="withdrawalConfirmation"
          autoComplete="off"
          required
        />
      </div>
      <ActionFeedback state={state} />
      <SubmitButton className="admin-button admin-button--danger" pendingLabel="Validating…">
        {replacement ? "Validate and replace" : "Withdraw prayer times"}
      </SubmitButton>
    </form>
  );
}
