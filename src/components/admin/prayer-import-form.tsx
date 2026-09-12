"use client";

import { useActionState } from "react";

import { ActionFeedback } from "@/components/admin/action-feedback";
import { SubmitButton } from "@/components/admin/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import { importPrayerTimetableAction } from "@/server/actions/prayer";

export function PrayerImportForm({ settingsId, version }: { settingsId: string; version: number }) {
  const [state, action] = useActionState(importPrayerTimetableAction, INITIAL_ACTION_STATE);
  return (
    <form action={action} className="admin-form admin-card">
      <input name="settingsId" type="hidden" value={settingsId} />
      <input name="expectedVersion" type="hidden" value={version} />
      <h2>Import a committee timetable</h2>
      <p>
        Paste a full timetable as comma-separated rows — one row per date, with a header line. Dates
        accept <code>2026-01-31</code> or <code>31/01/2026</code>; times are 24-hour. Congregation
        columns are optional.
      </p>
      <pre className="admin-code-sample" aria-label="Expected file format">
        date,fajr,sunrise,dhuhr,asr,maghrib,isha{"\n"}2026-01-01,06:45,08:46,12:41,14:12,16:07,17:56
      </pre>
      <div className="admin-field">
        <label htmlFor="import-csv">Timetable rows</label>
        <textarea
          id="import-csv"
          name="csv"
          required
          rows={8}
          spellCheck={false}
          aria-describedby="import-csv-errors"
        />
        {state.fieldErrors?.csv ? (
          <ul className="admin-field-errors" id="import-csv-errors">
            {state.fieldErrors.csv.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        ) : (
          <span id="import-csv-errors" />
        )}
      </div>
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="import-source-note">Source of this timetable</label>
          <input
            id="import-source-note"
            name="sourceNote"
            required
            minLength={3}
            maxLength={200}
            placeholder="e.g. Committee-approved 2026 timetable, version 1"
          />
        </div>
        <div className="admin-field">
          <label htmlFor="import-confirmation">Confirmation phrase (needed to import)</label>
          <input
            id="import-confirmation"
            name="confirmation"
            autoComplete="off"
            placeholder="IMPORT TIMETABLE"
          />
        </div>
      </div>
      <label className="admin-checkbox">
        <input name="replaceExisting" type="checkbox" /> Replace every existing dated entry in this
        draft (instead of updating matching dates)
      </label>
      <ActionFeedback state={state} />
      <div className="admin-actions-row">
        <SubmitButton name="mode" pendingLabel="Checking file…" value="preview">
          Check the file
        </SubmitButton>
        <SubmitButton name="mode" pendingLabel="Importing…" value="import">
          Import into this draft
        </SubmitButton>
      </div>
    </form>
  );
}
