"use client";

import { useActionState } from "react";

import { ActionFeedback } from "@/components/admin/action-feedback";
import { SubmitButton } from "@/components/admin/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import { prayerKeys } from "@/lib/prayer/types";
import { savePrayerOverrideAction } from "@/server/actions/prayer";

export function PrayerOverrideForm({
  settingsId,
  version,
}: {
  settingsId: string;
  version: number;
}) {
  const [state, action] = useActionState(savePrayerOverrideAction, INITIAL_ACTION_STATE);
  return (
    <form action={action} className="admin-form admin-card">
      <input name="settingsId" type="hidden" value={settingsId} />
      <input name="expectedVersion" type="hidden" value={version} />
      <h2>Add or replace a dated override</h2>
      <p>
        Use the same date and prayer to replace an existing draft override. Give a concise
        operational reason that another committee member can audit.
      </p>
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="override-date">Date</label>
          <input id="override-date" name="date" type="date" required />
        </div>
        <div className="admin-field">
          <label htmlFor="override-prayer">Prayer</label>
          <select id="override-prayer" name="prayer">
            {prayerKeys.map((prayer) => (
              <option key={prayer} value={prayer}>
                {prayer[0]?.toUpperCase()}
                {prayer.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="override-begins">Start time (optional)</label>
          <input id="override-begins" name="beginsAt" type="time" />
        </div>
        <div className="admin-field">
          <label htmlFor="override-congregation">Congregation time (optional)</label>
          <input id="override-congregation" name="congregationAt" type="time" />
        </div>
      </div>
      <label className="admin-checkbox">
        <input name="unavailable" type="checkbox" /> Mark this prayer unavailable instead of showing
        times
      </label>
      <div className="admin-field">
        <label htmlFor="override-reason">Reason</label>
        <input id="override-reason" name="reason" required maxLength={500} />
      </div>
      <ActionFeedback state={state} />
      <SubmitButton pendingLabel="Saving override…">Save override</SubmitButton>
    </form>
  );
}
