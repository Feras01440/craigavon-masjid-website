"use client";

import { useActionState } from "react";

import { ActionFeedback } from "@/components/admin/action-feedback";
import { SubmitButton } from "@/components/admin/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import {
  congregationPrayerKeys,
  type CongregationRule,
  type SeasonalArrangement,
} from "@/lib/prayer/types";
import { saveSeasonalArrangementAction } from "@/server/actions/prayer";

const prayerLabels = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
} as const;

function valueFor(
  rule: CongregationRule | undefined,
  field: "time" | "minutes" | "roundTo" | "latest",
) {
  if (!rule) return "";
  if (field === "time") return rule.type === "fixed" ? rule.time : "";
  if (field === "minutes") return rule.type === "offset" ? rule.minutes : "";
  if (field === "roundTo") return rule.type === "offset" ? rule.roundTo : 5;
  return rule.type === "offset" ? (rule.latest ?? "") : "";
}

export function PrayerSeasonalForm({
  settingsId,
  version,
  arrangement,
}: {
  settingsId: string;
  version: number;
  arrangement?: SeasonalArrangement;
}) {
  const [state, action] = useActionState(saveSeasonalArrangementAction, INITIAL_ACTION_STATE);
  const prefix = arrangement?.id ?? "new";
  return (
    <form action={action} className="admin-form admin-card">
      <input name="settingsId" type="hidden" value={settingsId} />
      <input name="expectedVersion" type="hidden" value={version} />
      {arrangement?.id && <input name="id" type="hidden" value={arrangement.id} />}
      <h3>
        {arrangement ? `Edit ${arrangement.title}` : "Add a Ramadan, Eid or seasonal arrangement"}
      </h3>
      <p>
        The date range and public note appear with the relevant timetable. Optional congregation
        rules replace the standard rule only during this range.
      </p>
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor={`${prefix}-seasonal-kind`}>Arrangement type</label>
          <select
            id={`${prefix}-seasonal-kind`}
            name="kind"
            defaultValue={arrangement?.kind ?? "ramadan"}
          >
            <option value="ramadan">Ramadan</option>
            <option value="eid_al_fitr">Eid al-Fitr</option>
            <option value="eid_al_adha">Eid al-Adha</option>
            <option value="closure">Temporary closure</option>
            <option value="other">Other seasonal arrangement</option>
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor={`${prefix}-seasonal-title`}>Public title</label>
          <input
            id={`${prefix}-seasonal-title`}
            name="title"
            required
            maxLength={160}
            defaultValue={arrangement?.title ?? ""}
          />
        </div>
        <div className="admin-field">
          <label htmlFor={`${prefix}-seasonal-start`}>Starts</label>
          <input
            id={`${prefix}-seasonal-start`}
            name="startsOn"
            type="date"
            required
            defaultValue={arrangement?.startsOn ?? ""}
          />
        </div>
        <div className="admin-field">
          <label htmlFor={`${prefix}-seasonal-end`}>Ends</label>
          <input
            id={`${prefix}-seasonal-end`}
            name="endsOn"
            type="date"
            required
            defaultValue={arrangement?.endsOn ?? ""}
          />
        </div>
      </div>
      <div className="admin-field">
        <label htmlFor={`${prefix}-seasonal-note`}>Public note (optional)</label>
        <textarea
          id={`${prefix}-seasonal-note`}
          name="publicNote"
          rows={3}
          maxLength={1000}
          defaultValue={arrangement?.publicNote ?? ""}
        />
      </div>
      <fieldset className="admin-fieldset">
        <legend>Seasonal congregation rules</legend>
        <p className="admin-hint">Choose “Use standard rule” where no seasonal change is needed.</p>
        {congregationPrayerKeys.map((prayer) => {
          const rule = arrangement?.congregationRules[prayer];
          return (
            <div className="admin-form-grid admin-form-grid--seasonal" key={prayer}>
              <div className="admin-field">
                <label htmlFor={`${prefix}-${prayer}-type`}>{prayerLabels[prayer]} rule</label>
                <select
                  id={`${prefix}-${prayer}-type`}
                  name={`seasonal_${prayer}_type`}
                  defaultValue={rule?.type ?? "inherit"}
                >
                  <option value="inherit">Use standard rule</option>
                  <option value="fixed">Fixed time</option>
                  <option value="offset">Minutes after start</option>
                  <option value="unavailable">Do not publish a congregation time</option>
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor={`${prefix}-${prayer}-time`}>Fixed time</label>
                <input
                  id={`${prefix}-${prayer}-time`}
                  name={`seasonal_${prayer}_time`}
                  type="time"
                  defaultValue={valueFor(rule, "time")}
                />
              </div>
              <div className="admin-field">
                <label htmlFor={`${prefix}-${prayer}-minutes`}>Offset minutes</label>
                <input
                  id={`${prefix}-${prayer}-minutes`}
                  name={`seasonal_${prayer}_minutes`}
                  type="number"
                  min={0}
                  max={240}
                  defaultValue={valueFor(rule, "minutes")}
                />
              </div>
              <div className="admin-field">
                <label htmlFor={`${prefix}-${prayer}-round`}>Round up to</label>
                <select
                  id={`${prefix}-${prayer}-round`}
                  name={`seasonal_${prayer}_round_to`}
                  defaultValue={valueFor(rule, "roundTo")}
                >
                  {[1, 5, 10, 15].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minute{minutes === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor={`${prefix}-${prayer}-latest`}>Latest time (optional)</label>
                <input
                  id={`${prefix}-${prayer}-latest`}
                  name={`seasonal_${prayer}_latest`}
                  type="time"
                  defaultValue={valueFor(rule, "latest")}
                />
              </div>
            </div>
          );
        })}
      </fieldset>
      <ActionFeedback state={state} />
      <SubmitButton pendingLabel="Saving arrangement…">
        {arrangement ? "Save arrangement" : "Add arrangement"}
      </SubmitButton>
    </form>
  );
}
