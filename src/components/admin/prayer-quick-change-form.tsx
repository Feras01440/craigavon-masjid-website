"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { ActionFeedback } from "@/components/admin/action-feedback";
import { SubmitButton } from "@/components/admin/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import {
  congregationPrayerKeys,
  type CongregationPrayerKey,
  type CongregationRule,
} from "@/lib/prayer/types";
import { quickChangeCongregationAction } from "@/server/actions/prayer-quick-change";

const prayerLabels: Record<CongregationPrayerKey, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "ʿAsr",
  maghrib: "Maghrib",
  isha: "ʿIshāʾ",
};

type Mode = "offset" | "fixed";

function initialMode(rule: CongregationRule | undefined): Mode {
  return rule?.type === "fixed" ? "fixed" : "offset";
}

/*
 * The one change the committee makes most: Iqamah rules and the Jumuʿah
 * time. One submit clones the live timetable, validates every day of its
 * period, and swaps it in atomically — the public pages, the pinned bar,
 * the CSV and the calendar feed all update within a minute.
 */
export function PrayerQuickChangeForm({
  id,
  version,
  rules,
  jumuahKhutbah,
  jumuahLabel,
}: {
  id: string;
  version: number;
  rules: Record<CongregationPrayerKey, CongregationRule>;
  jumuahKhutbah: string;
  jumuahLabel: string;
}) {
  const [state, action] = useActionState(quickChangeCongregationAction, INITIAL_ACTION_STATE);
  const [modes, setModes] = useState<Record<CongregationPrayerKey, Mode>>(
    () =>
      Object.fromEntries(
        congregationPrayerKeys.map((prayer) => [prayer, initialMode(rules[prayer])]),
      ) as Record<CongregationPrayerKey, Mode>,
  );

  return (
    <form action={action} className="admin-form" id="quick-change">
      <input name="id" type="hidden" value={id} />
      <input name="expectedVersion" type="hidden" value={version} />
      <p className="admin-eyebrow">Live timetable</p>
      <h2>Change Iqamah or Jumuʿah times</h2>
      <p>
        Set each Iqamah as minutes after the prayer begins (rounded up), or as a fixed clock time.
        Publishing checks every day of the timetable and then updates the website, the pinned bar,
        the download and the calendar feed within a minute.
      </p>

      <div className="admin-quick-rules">
        {congregationPrayerKeys.map((prayer) => {
          const rule = rules[prayer];
          const mode = modes[prayer];
          return (
            <fieldset className="admin-quick-rule" key={prayer}>
              <legend>{prayerLabels[prayer]}</legend>
              <div className="admin-field">
                <label htmlFor={`quick-${prayer}-type`}>Rule</label>
                <select
                  id={`quick-${prayer}-type`}
                  name={`${prayer}RuleType`}
                  value={mode}
                  onChange={(event) =>
                    setModes((current) => ({
                      ...current,
                      [prayer]: event.target.value as Mode,
                    }))
                  }
                >
                  <option value="offset">Minutes after it begins</option>
                  <option value="fixed">Fixed time</option>
                </select>
              </div>
              {mode === "fixed" ? (
                <div className="admin-field">
                  <label htmlFor={`quick-${prayer}-fixed`}>Iqamah at</label>
                  <input
                    id={`quick-${prayer}-fixed`}
                    name={`${prayer}FixedTime`}
                    type="time"
                    required
                    defaultValue={rule?.type === "fixed" ? rule.time : ""}
                  />
                </div>
              ) : (
                <>
                  <div className="admin-field">
                    <label htmlFor={`quick-${prayer}-minutes`}>Minutes after</label>
                    <input
                      id={`quick-${prayer}-minutes`}
                      name={`${prayer}OffsetMinutes`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={240}
                      required
                      defaultValue={rule?.type === "offset" ? rule.minutes : 15}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor={`quick-${prayer}-round`}>Round up to</label>
                    <select
                      id={`quick-${prayer}-round`}
                      name={`${prayer}RoundTo`}
                      defaultValue={rule?.type === "offset" ? String(rule.roundTo) : "15"}
                    >
                      <option value="1">The minute</option>
                      <option value="5">5 minutes</option>
                      <option value="10">10 minutes</option>
                      <option value="15">15 minutes</option>
                    </select>
                  </div>
                </>
              )}
            </fieldset>
          );
        })}

        <fieldset className="admin-quick-rule">
          <legend>{jumuahLabel}</legend>
          <div className="admin-field">
            <label htmlFor="quick-jumuah">Khutbah begins</label>
            <input
              id="quick-jumuah"
              name="jumuahKhutbah"
              type="time"
              required
              defaultValue={jumuahKhutbah}
            />
            <span className="admin-hint">Shown as the Jumuʿah time; no separate Iqamah.</span>
          </div>
        </fieldset>
      </div>

      <div className="admin-field">
        <label htmlFor="quick-approval">Approval note</label>
        <textarea
          id="quick-approval"
          name="approvalNote"
          rows={2}
          required
          minLength={10}
          maxLength={1000}
          defaultValue="Iqamah times updated by the committee."
        />
        <span className="admin-hint">Recorded against this change for the audit trail.</span>
      </div>

      <div className="admin-form-actions">
        <SubmitButton>Publish these times</SubmitButton>
        <Link className="admin-button admin-button--quiet" href="/admin/prayer-times">
          Back to timetables
        </Link>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
