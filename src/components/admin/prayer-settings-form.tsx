"use client";

import { useActionState, useState } from "react";

import { ActionFeedback, FieldError } from "@/components/admin/action-feedback";
import { SubmitButton } from "@/components/admin/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import { congregationRuleDefaults } from "@/lib/prayer/admin-input";
import {
  congregationPrayerKeys,
  prayerKeys,
  type CongregationPrayerKey,
  type PrayerConfiguration,
} from "@/lib/prayer/types";
import { savePrayerDraftAction } from "@/server/actions/prayer";

const prayerLabels: Record<(typeof prayerKeys)[number], string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

function PrayerRuleField({
  prayer,
  configuration,
}: {
  prayer: CongregationPrayerKey;
  configuration?: PrayerConfiguration;
}) {
  const defaults = congregationRuleDefaults(configuration?.congregationRules[prayer]);
  const [type, setType] = useState(String(defaults.type));
  const prefix = prayerLabels[prayer];
  return (
    <fieldset className="admin-fieldset">
      <legend>{prefix} congregation</legend>
      <div className="admin-field">
        <label htmlFor={`${prayer}-rule-type`}>Rule</label>
        <select
          id={`${prayer}-rule-type`}
          name={`${prayer}RuleType`}
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="unavailable">Not yet confirmed</option>
          <option value="fixed">Fixed local time</option>
          <option value="offset">Minutes after prayer starts</option>
          <option value="joined">Joined to another congregation</option>
        </select>
      </div>
      {type === "fixed" && (
        <div className="admin-field">
          <label htmlFor={`${prayer}-fixed-time`}>Fixed time</label>
          <input
            id={`${prayer}-fixed-time`}
            name={`${prayer}FixedTime`}
            type="time"
            required
            defaultValue={String(defaults.fixedTime ?? "")}
          />
        </div>
      )}
      {type === "offset" && (
        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor={`${prayer}-offset`}>Minutes after start</label>
            <input
              id={`${prayer}-offset`}
              name={`${prayer}OffsetMinutes`}
              type="number"
              min={0}
              max={240}
              required
              defaultValue={Number(defaults.offsetMinutes ?? 15)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor={`${prayer}-round`}>Round up to</label>
            <select
              id={`${prayer}-round`}
              name={`${prayer}RoundTo`}
              defaultValue={String(defaults.roundTo ?? 5)}
            >
              <option value="1">Exact minute</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor={`${prayer}-latest`}>Latest permitted time (optional)</label>
            <input
              id={`${prayer}-latest`}
              name={`${prayer}Latest`}
              type="time"
              defaultValue={String(defaults.latest ?? "")}
            />
          </div>
        </div>
      )}
      {type === "joined" && (
        <div className="admin-field">
          <label htmlFor={`${prayer}-joined`}>Use congregation time for</label>
          <select
            id={`${prayer}-joined`}
            name={`${prayer}JoinedWith`}
            defaultValue={String(defaults.joinedWith ?? "dhuhr")}
          >
            {(["fajr", "dhuhr", "asr", "maghrib"] as const).map((target) => (
              <option key={target} value={target} disabled={target === prayer}>
                {prayerLabels[target]}
              </option>
            ))}
          </select>
        </div>
      )}
    </fieldset>
  );
}

export function PrayerSettingsForm({ configuration }: { configuration?: PrayerConfiguration }) {
  const [state, action] = useActionState(savePrayerDraftAction, INITIAL_ACTION_STATE);
  const [method, setMethod] = useState(
    configuration?.calculationMethod ?? "moonsighting_committee",
  );
  const sessions = configuration?.jumuahSessions ?? [];
  return (
    <form action={action} className="admin-form admin-form--wide">
      {configuration && (
        <>
          <input name="id" type="hidden" value={configuration.id} />
          <input name="expectedVersion" type="hidden" value={configuration.version} />
        </>
      )}

      <fieldset className="admin-fieldset">
        <legend>Effective period and source</legend>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="prayer-name">Internal timetable name</label>
            <input
              id="prayer-name"
              name="name"
              required
              maxLength={120}
              defaultValue={configuration?.name ?? ""}
            />
            <FieldError errors={state.fieldErrors?.name} />
          </div>
          <div className="admin-field">
            <label htmlFor="prayer-timezone">Timezone</label>
            <input
              id="prayer-timezone"
              name="timezone"
              required
              defaultValue={configuration?.timezone ?? "Europe/London"}
            />
            <span className="admin-hint">Use an IANA timezone such as Europe/London.</span>
          </div>
          <div className="admin-field">
            <label htmlFor="prayer-effective-from">Starts on</label>
            <input
              id="prayer-effective-from"
              name="effectiveFrom"
              type="date"
              required
              defaultValue={configuration?.effectiveFrom ?? ""}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="prayer-effective-to">Ends on (required before publication)</label>
            <input
              id="prayer-effective-to"
              name="effectiveTo"
              type="date"
              defaultValue={configuration?.effectiveTo ?? ""}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="prayer-source-name">Approved source</label>
            <input
              id="prayer-source-name"
              name="sourceName"
              required
              maxLength={200}
              defaultValue={configuration?.sourceName ?? ""}
            />
            <span className="admin-hint">
              Name the timetable or committee decision actually reviewed.
            </span>
          </div>
          <div className="admin-field">
            <label htmlFor="prayer-source-reference">Source reference (optional)</label>
            <input
              id="prayer-source-reference"
              name="sourceReference"
              maxLength={500}
              defaultValue={configuration?.sourceReference ?? ""}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Calculation</legend>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="calculation-method">Approved method</label>
            <select
              id="calculation-method"
              name="calculationMethod"
              value={method}
              onChange={(event) => setMethod(event.target.value as typeof method)}
            >
              <option value="moonsighting_committee">Moonsighting Committee</option>
              <option value="muslim_world_league">Muslim World League</option>
              <option value="north_america">North America</option>
              <option value="karachi">University of Islamic Sciences, Karachi</option>
              <option value="egyptian">Egyptian General Authority</option>
              <option value="umm_al_qura">Umm al-Qura University</option>
              <option value="imported_official">Committee-approved imported timetable</option>
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="madhab">Asr calculation</label>
            <select id="madhab" name="madhab" defaultValue={configuration?.madhab ?? "hanafi"}>
              <option value="standard">Standard shadow length</option>
              <option value="hanafi">Hanafi shadow length</option>
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="high-latitude-rule">High-latitude rule</label>
            <select
              id="high-latitude-rule"
              name="highLatitudeRule"
              defaultValue={configuration?.highLatitudeRule ?? "seventh_of_night"}
            >
              <option value="middle_of_night">Middle of the night</option>
              <option value="seventh_of_night">One seventh of the night</option>
              <option value="twilight_angle">Twilight angle</option>
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="hijri-adjustment">Local Hijri adjustment</label>
            <select
              id="hijri-adjustment"
              name="hijriAdjustment"
              defaultValue={String(configuration?.hijriAdjustment ?? 0)}
            >
              <option value="-1">Minus one day</option>
              <option value="0">No adjustment</option>
              <option value="1">Plus one day</option>
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="latitude">Latitude</label>
            <input
              id="latitude"
              name="latitude"
              type="number"
              min={-90}
              max={90}
              step="0.000001"
              required
              defaultValue={configuration?.latitude ?? ""}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="longitude">Longitude</label>
            <input
              id="longitude"
              name="longitude"
              type="number"
              min={-180}
              max={180}
              step="0.000001"
              required
              defaultValue={configuration?.longitude ?? ""}
            />
          </div>
          {method === "imported_official" && (
            <div className="admin-field">
              <label htmlFor="source-version">Import revision label</label>
              <input
                id="source-version"
                name="sourceVersion"
                maxLength={30}
                defaultValue={configuration?.calculationLibraryVersion ?? "1"}
              />
              <span className="admin-hint">
                Add every imported start time as a dated override before publication.
              </span>
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Minute adjustments</legend>
        <p className="admin-hint">
          Apply only adjustments documented in the approved source. Zero leaves the calculation
          unchanged.
        </p>
        <div className="admin-form-grid">
          {prayerKeys.map((prayer) => (
            <div className="admin-field" key={prayer}>
              <label htmlFor={`${prayer}-adjustment`}>{prayerLabels[prayer]}</label>
              <input
                id={`${prayer}-adjustment`}
                name={`${prayer}Adjustment`}
                type="number"
                min={-120}
                max={120}
                required
                defaultValue={configuration?.adjustments[prayer] ?? 0}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <section aria-labelledby="congregation-heading">
        <h2 id="congregation-heading">Congregation rules</h2>
        <p>
          Missing information remains visibly unavailable; the system never invents a congregation
          time.
        </p>
        <div className="admin-card-grid">
          {congregationPrayerKeys.map((prayer) => (
            <PrayerRuleField key={prayer} prayer={prayer} configuration={configuration} />
          ))}
        </div>
      </section>

      <fieldset className="admin-fieldset">
        <legend>Friday prayer (Jumuah)</legend>
        <p className="admin-hint">
          Up to three sessions can be managed here. Leave an entire row blank if it is not used.
        </p>
        {[0, 1, 2].map((index) => {
          const session = sessions[index];
          const number = index + 1;
          return (
            <div className="admin-section" key={number}>
              <h3>Session {number}</h3>
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label htmlFor={`jumuah-label-${number}`}>Public label</label>
                  <input
                    id={`jumuah-label-${number}`}
                    name={`jumuahLabel${number}`}
                    maxLength={100}
                    defaultValue={session?.label ?? ""}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor={`jumuah-khutbah-${number}`}>Khutbah begins</label>
                  <input
                    id={`jumuah-khutbah-${number}`}
                    name={`jumuahKhutbah${number}`}
                    type="time"
                    defaultValue={session?.khutbahTime ?? ""}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor={`jumuah-prayer-${number}`}>Prayer begins (optional)</label>
                  <input
                    id={`jumuah-prayer-${number}`}
                    name={`jumuahPrayer${number}`}
                    type="time"
                    defaultValue={session?.prayerTime ?? ""}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor={`jumuah-notes-${number}`}>Operational note (optional)</label>
                  <input
                    id={`jumuah-notes-${number}`}
                    name={`jumuahNotes${number}`}
                    maxLength={500}
                    defaultValue={session?.notes ?? ""}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </fieldset>

      <ActionFeedback state={state} />
      <div className="admin-form-actions">
        <SubmitButton pendingLabel="Saving timetable…">Save draft</SubmitButton>
      </div>
    </form>
  );
}
