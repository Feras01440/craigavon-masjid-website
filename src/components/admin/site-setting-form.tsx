"use client";

import { useActionState } from "react";

import { INITIAL_ACTION_STATE, type ActionState } from "@/lib/auth/errors";
import {
  managedRouteKeys,
  managedSettingDetails,
  type ContactInformationSetting,
  type EnquiryConfigurationSetting,
  type FeatureFlagsSetting,
  type HomepageContentSetting,
  type ManagedRouteKey,
  type ManagedSettingKey,
  type ManagedSettingStatus,
  type ManagedSettingValue,
  type NavigationFooterSetting,
  type SiteIdentitySetting,
  type TvDisplaySetting,
} from "@/lib/settings/site-settings";
import { saveSiteSettingAction } from "@/server/actions/site-settings";
import { ActionFeedback, FieldError } from "./action-feedback";
import { SubmitButton } from "./submit-button";

type SettingMetadata = {
  version: number;
  status: ManagedSettingStatus;
  updatedAt: string;
  updatedByName: string | null;
  hasActor: boolean;
};

type FieldProps = {
  field: string;
  label: string;
  defaultValue: string;
  state: ActionState;
  hint?: string;
  optional?: boolean;
  type?: "text" | "email" | "url" | "tel";
  autoComplete?: string;
  maxLength?: number;
  required?: boolean;
};

function describedBy(field: string, state: ActionState, hint?: string): string | undefined {
  const ids = [
    hint ? `${field}-hint` : null,
    state.fieldErrors?.[field] ? `${field}-error` : null,
  ].filter((id): id is string => !!id);
  return ids.length ? ids.join(" ") : undefined;
}

function TextField({
  field,
  label,
  defaultValue,
  state,
  hint,
  optional,
  type = "text",
  autoComplete,
  maxLength,
  required,
}: FieldProps) {
  return (
    <div className="admin-field">
      <label htmlFor={field}>
        {label} {optional && <span className="admin-optional">optional</span>}
      </label>
      <input
        id={field}
        name={field}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        maxLength={maxLength}
        required={required}
        aria-describedby={describedBy(field, state, hint)}
        aria-invalid={state.fieldErrors?.[field]?.length ? true : undefined}
      />
      {hint && (
        <span className="admin-hint" id={`${field}-hint`}>
          {hint}
        </span>
      )}
      <FieldError errors={state.fieldErrors?.[field]} id={`${field}-error`} />
    </div>
  );
}

function TextAreaField({
  field,
  label,
  defaultValue,
  state,
  hint,
  maxLength,
  rows = 4,
}: Omit<FieldProps, "type" | "autoComplete" | "required"> & { rows?: number }) {
  return (
    <div className="admin-field">
      <label htmlFor={field}>
        {label} <span className="admin-optional">optional</span>
      </label>
      <textarea
        id={field}
        name={field}
        defaultValue={defaultValue}
        maxLength={maxLength}
        rows={rows}
        aria-describedby={describedBy(field, state, hint)}
        aria-invalid={state.fieldErrors?.[field]?.length ? true : undefined}
      />
      {hint && (
        <span className="admin-hint" id={`${field}-hint`}>
          {hint}
        </span>
      )}
      <FieldError errors={state.fieldErrors?.[field]} id={`${field}-error`} />
    </div>
  );
}

function NumberField({
  field,
  label,
  defaultValue,
  state,
  minimum,
  maximum,
  hint,
  required = true,
}: {
  field: string;
  label: string;
  defaultValue: number | null;
  state: ActionState;
  minimum: number;
  maximum: number;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="admin-field">
      <label htmlFor={field}>
        {label} {!required && <span className="admin-optional">optional in a draft</span>}
      </label>
      <input
        id={field}
        name={field}
        type="number"
        min={minimum}
        max={maximum}
        step={1}
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-describedby={describedBy(field, state, hint)}
        aria-invalid={state.fieldErrors?.[field]?.length ? true : undefined}
      />
      {hint && (
        <span className="admin-hint" id={`${field}-hint`}>
          {hint}
        </span>
      )}
      <FieldError errors={state.fieldErrors?.[field]} id={`${field}-error`} />
    </div>
  );
}

function BooleanField({
  field,
  label,
  description,
  defaultChecked,
}: {
  field: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="admin-setting-toggle" htmlFor={field}>
      <input id={field} name={field} type="checkbox" defaultChecked={defaultChecked} />
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </label>
  );
}

function IdentityFields({ value, state }: { value: SiteIdentitySetting; state: ActionState }) {
  return (
    <>
      <div className="admin-form-grid">
        <TextField
          field="official_name"
          label="Official organisation name"
          defaultValue={value.official_name}
          state={state}
          maxLength={160}
          hint="Use the committee-confirmed spelling. This is required before publication."
        />
        <TextField
          field="public_masjid_name"
          label="Public-facing masjid name"
          defaultValue={value.public_masjid_name}
          state={state}
          maxLength={160}
          hint="Use the name visitors should see; do not infer a name from a social account."
        />
      </div>
      <TextField
        field="short_name"
        label="Short name"
        defaultValue={value.short_name}
        state={state}
        maxLength={60}
        optional
        hint="Only use an abbreviation that the Association already uses publicly."
      />
      <TextAreaField
        field="default_meta_description"
        label="Default search description"
        defaultValue={value.default_meta_description}
        state={state}
        maxLength={300}
        rows={3}
        hint="Keep this factual and avoid geographic or service claims that have not been confirmed."
      />
    </>
  );
}

function ContactFields({ value, state }: { value: ContactInformationSetting; state: ActionState }) {
  return (
    <>
      <fieldset className="admin-fieldset">
        <legend>Address</legend>
        <div className="admin-form-grid">
          <TextField
            field="address_line_1"
            label="Address line 1"
            defaultValue={value.address_line_1}
            state={state}
            maxLength={160}
            optional
            autoComplete="address-line1"
          />
          <TextField
            field="address_line_2"
            label="Address line 2"
            defaultValue={value.address_line_2}
            state={state}
            maxLength={160}
            optional
            autoComplete="address-line2"
          />
          <TextField
            field="locality"
            label="Town or locality"
            defaultValue={value.locality}
            state={state}
            maxLength={120}
            optional
            autoComplete="address-level2"
          />
          <TextField
            field="county"
            label="County"
            defaultValue={value.county}
            state={state}
            maxLength={120}
            optional
            autoComplete="address-level1"
          />
          <TextField
            field="postcode"
            label="Postcode"
            defaultValue={value.postcode}
            state={state}
            maxLength={20}
            optional
            autoComplete="postal-code"
          />
          <TextField
            field="map_url"
            label="Map link"
            defaultValue={value.map_url}
            state={state}
            maxLength={500}
            optional
            type="url"
            hint="Use a complete, committee-approved https:// link."
          />
        </div>
      </fieldset>
      <fieldset className="admin-fieldset">
        <legend>Public contact channels</legend>
        <div className="admin-form-grid">
          <TextField
            field="public_email"
            label="Public email address"
            defaultValue={value.public_email}
            state={state}
            maxLength={254}
            optional
            type="email"
            autoComplete="email"
          />
          <TextField
            field="public_phone"
            label="Public phone number"
            defaultValue={value.public_phone}
            state={state}
            maxLength={40}
            optional
            type="tel"
            autoComplete="tel"
          />
          <TextField
            field="public_whatsapp"
            label="Public WhatsApp number"
            defaultValue={value.public_whatsapp}
            state={state}
            maxLength={40}
            optional
            type="tel"
            hint="Only publish a monitored number approved for WhatsApp enquiries."
          />
        </div>
      </fieldset>
      <fieldset className="admin-fieldset">
        <legend>Visit information</legend>
        <TextAreaField
          field="directions"
          label="Directions"
          defaultValue={value.directions}
          state={state}
          maxLength={1_000}
        />
        <TextAreaField
          field="access_information"
          label="Entrance and accessibility information"
          defaultValue={value.access_information}
          state={state}
          maxLength={1_000}
          hint="Describe only confirmed entrances, step-free routes and facilities."
        />
        <div className="admin-form-grid">
          <TextAreaField
            field="parking_information"
            label="Parking information"
            defaultValue={value.parking_information}
            state={state}
            maxLength={1_000}
          />
          <TextAreaField
            field="public_transport_information"
            label="Public transport information"
            defaultValue={value.public_transport_information}
            state={state}
            maxLength={1_000}
          />
        </div>
      </fieldset>
    </>
  );
}

function HomepageFields({ value, state }: { value: HomepageContentSetting; state: ActionState }) {
  const routeOptions = [{ value: "", label: "No link" }].concat(
    managedRouteKeys.map((route) => ({ value: route, label: `/${route}` })),
  );
  return (
    <>
      <TextField
        field="eyebrow"
        label="Short heading above the title"
        defaultValue={value.eyebrow}
        state={state}
        maxLength={80}
        optional
      />
      <TextField
        field="heading"
        label="Homepage heading"
        defaultValue={value.heading}
        state={state}
        maxLength={160}
      />
      <TextAreaField
        field="introduction"
        label="Introduction"
        defaultValue={value.introduction}
        state={state}
        maxLength={600}
        rows={4}
      />
      <fieldset className="admin-fieldset">
        <legend>Homepage links</legend>
        {(["primary", "secondary"] as const).map((position) => (
          <div className="admin-form-grid" key={position}>
            <TextField
              field={`${position}_cta_label`}
              label={`${position === "primary" ? "Primary" : "Secondary"} link label`}
              defaultValue={value[`${position}_cta_label`]}
              state={state}
              maxLength={80}
              optional
            />
            <div className="admin-field">
              <label htmlFor={`${position}_cta_route`}>
                Destination <span className="admin-optional">optional</span>
              </label>
              <select
                id={`${position}_cta_route`}
                name={`${position}_cta_route`}
                defaultValue={value[`${position}_cta_route`]}
              >
                {routeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError errors={state.fieldErrors?.[`${position}_cta_route`]} />
            </div>
          </div>
        ))}
      </fieldset>
      <TextField
        field="information_heading"
        label="Information panel heading"
        defaultValue={value.information_heading}
        state={state}
        maxLength={160}
        optional
      />
      <fieldset className="admin-fieldset">
        <legend>Information panel points</legend>
        {[0, 1, 2].map((index) => (
          <div className="admin-field" key={index}>
            <label htmlFor={`information-point-${index}`}>
              Point {index + 1} <span className="admin-optional">optional</span>
            </label>
            <input
              id={`information-point-${index}`}
              name="information_points"
              maxLength={180}
              defaultValue={value.information_points[index] ?? ""}
            />
          </div>
        ))}
        <FieldError errors={state.fieldErrors?.information_points} />
      </fieldset>
    </>
  );
}

const routeLabels: Record<ManagedRouteKey, string> = {
  "prayer-times": "Prayer times",
  visit: "Visit",
  services: "Services",
  education: "Learning",
  news: "News",
  "new-muslims": "New Muslims",
  about: "About",
  contact: "Contact",
  policies: "Policies",
  accessibility: "Accessibility",
};

function RouteChecklist({
  name,
  selected,
  legend,
}: {
  name: "primary_navigation" | "footer_navigation";
  selected: ManagedRouteKey[];
  legend: string;
}) {
  return (
    <fieldset className="admin-fieldset admin-setting-checklist">
      <legend>{legend}</legend>
      <div className="admin-setting-checklist__grid">
        {managedRouteKeys.map((route) => (
          <label key={route}>
            <input
              name={name}
              type="checkbox"
              value={route}
              defaultChecked={selected.includes(route)}
            />
            <span>
              {routeLabels[route]}
              <small>/{route}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function NavigationFields({
  value,
  state,
}: {
  value: NavigationFooterSetting;
  state: ActionState;
}) {
  return (
    <>
      <p className="admin-hint">
        Routes and labels are controlled to keep navigation consistent and keyboard friendly.
      </p>
      <div className="admin-form-grid">
        <RouteChecklist
          name="primary_navigation"
          selected={value.primary_navigation}
          legend="Primary navigation"
        />
        <RouteChecklist
          name="footer_navigation"
          selected={value.footer_navigation}
          legend="Footer navigation"
        />
      </div>
      <TextAreaField
        field="footer_note"
        label="Footer information note"
        defaultValue={value.footer_note}
        state={state}
        maxLength={500}
        rows={3}
      />
      <TextAreaField
        field="footer_legal_note"
        label="Footer legal or status note"
        defaultValue={value.footer_legal_note}
        state={state}
        maxLength={500}
        rows={3}
        hint="Do not describe a policy as adopted until the committee has approved it."
      />
    </>
  );
}

function TvFields({ value, state }: { value: TvDisplaySetting; state: ActionState }) {
  return (
    <>
      <div className="admin-form-grid admin-form-grid--three">
        <NumberField
          field="refresh_seconds"
          label="Data refresh interval (seconds)"
          defaultValue={value.refresh_seconds}
          state={state}
          minimum={30}
          maximum={300}
        />
        <NumberField
          field="notice_rotation_seconds"
          label="Notice rotation interval (seconds)"
          defaultValue={value.notice_rotation_seconds}
          state={state}
          minimum={10}
          maximum={120}
        />
        <NumberField
          field="prayer_hold_minutes"
          label="Prayer-in-progress hold (minutes)"
          defaultValue={value.prayer_hold_minutes}
          state={state}
          minimum={5}
          maximum={30}
        />
      </div>
      <div className="admin-setting-toggles">
        <BooleanField
          field="show_hijri_date"
          label="Show Hijri date"
          description="The date still follows the approved prayer timetable's local adjustment."
          defaultChecked={value.show_hijri_date}
        />
        <BooleanField
          field="show_notices"
          label="Show published notices"
          description="Only approved public notices are eligible for the TV display."
          defaultChecked={value.show_notices}
        />
      </div>
      <TextField
        field="footer_message"
        label="TV footer message"
        defaultValue={value.footer_message}
        state={state}
        maxLength={240}
        optional
        hint="Use a short operational instruction, not an announcement or unverified claim."
      />
    </>
  );
}

function FeatureFlagFields({ value }: { value: FeatureFlagsSetting }) {
  return (
    <div className="admin-setting-toggles">
      <BooleanField
        field="public_enquiries"
        label="Public enquiry form"
        description="Requires a published privacy notice and published enquiry configuration."
        defaultChecked={value.public_enquiries}
      />
      <BooleanField
        field="donations"
        label="Donation links and appeals"
        description="Reserve for committee-approved payment details and donation terms."
        defaultChecked={value.donations}
      />
      <BooleanField
        field="education_registration"
        label="Education registration"
        description="Do not enable until safeguarding, recipients and data handling are approved."
        defaultChecked={value.education_registration}
      />
      <BooleanField
        field="event_registration"
        label="Event registration"
        description="Do not enable until a real registration workflow and privacy purpose exist."
        defaultChecked={value.event_registration}
      />
      <BooleanField
        field="analytics"
        label="Privacy-conscious analytics"
        description="Tracking remains off unless its provider, purpose and notice are approved."
        defaultChecked={value.analytics}
      />
    </div>
  );
}

function londonInputValue(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === name)?.value ?? "";
  const hour = part("hour") === "24" ? "00" : part("hour");
  return `${part("year")}-${part("month")}-${part("day")}T${hour}:${part("minute")}`;
}

function EnquiryFields({
  value,
  state,
}: {
  value: EnquiryConfigurationSetting;
  state: ActionState;
}) {
  return (
    <>
      <div className="admin-form-grid">
        <TextField
          field="privacy_notice_version"
          label="Adopted privacy notice version"
          defaultValue={value.privacy_notice_version}
          state={state}
          maxLength={40}
          hint="Use the exact version identifier shown on the published privacy notice."
        />
        <NumberField
          field="retention_days"
          label="Enquiry retention period (days)"
          defaultValue={value.retention_days}
          state={state}
          minimum={7}
          maximum={365}
          required={false}
          hint="Enter only the period adopted by the committee; 7 to 365 days are supported."
        />
      </div>
      <fieldset className="admin-fieldset">
        <legend>Queue ownership and monitoring</legend>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="queue_owner_role">Responsible administrator role</label>
            <select
              id="queue_owner_role"
              name="queue_owner_role"
              defaultValue={value.queue_owner_role}
              aria-describedby={`queue_owner_role-hint${state.fieldErrors?.queue_owner_role?.length ? " queue_owner_role-error" : ""}`}
              aria-invalid={state.fieldErrors?.queue_owner_role?.length ? true : undefined}
            >
              <option value="">Not confirmed</option>
              <option value="enquiries_manager">Enquiries manager</option>
              <option value="super_admin">Super administrator</option>
            </select>
            <span className="admin-hint" id="queue_owner_role-hint">
              Choose the role that has formally accepted responsibility for checking the queue.
            </span>
            <FieldError errors={state.fieldErrors?.queue_owner_role} id="queue_owner_role-error" />
          </div>
          <div className="admin-field">
            <label htmlFor="route_tested_at">Administrative route last tested</label>
            <input
              id="route_tested_at"
              name="route_tested_at"
              type="datetime-local"
              defaultValue={londonInputValue(value.route_tested_at)}
              aria-describedby={`route_tested_at-hint${state.fieldErrors?.route_tested_at?.length ? " route_tested_at-error" : ""}`}
              aria-invalid={state.fieldErrors?.route_tested_at?.length ? true : undefined}
            />
            <span className="admin-hint" id="route_tested_at-hint">
              Europe/London date and time of the latest successful end-to-end queue test.
            </span>
            <FieldError errors={state.fieldErrors?.route_tested_at} id="route_tested_at-error" />
          </div>
        </div>
        <TextAreaField
          field="monitoring_schedule"
          label="Queue monitoring schedule"
          defaultValue={value.monitoring_schedule}
          state={state}
          maxLength={300}
          rows={3}
          hint="State when the responsible role checks the dashboard; do not add private contact details."
        />
        <TextAreaField
          field="fallback_procedure"
          label="Fallback procedure"
          defaultValue={value.fallback_procedure}
          state={state}
          maxLength={500}
          rows={4}
          hint="Describe the approved operational step if the dashboard queue cannot be monitored."
        />
      </fieldset>
      <div className="admin-setting-readonly">
        <strong>Notification mode</strong>
        <span>Secure administration queue only</span>
        <small>
          Public settings never store an internal recipient email address. Notification integrations
          require a separate server-side configuration.
        </small>
        <input name="notification_mode" type="hidden" value="admin_queue" />
      </div>
    </>
  );
}

function SettingFields({
  settingKey,
  value,
  state,
}: {
  settingKey: ManagedSettingKey;
  value: ManagedSettingValue;
  state: ActionState;
}) {
  switch (settingKey) {
    case "site_identity":
      return <IdentityFields value={value as SiteIdentitySetting} state={state} />;
    case "homepage_content":
      return <HomepageFields value={value as HomepageContentSetting} state={state} />;
    case "contact_information":
      return <ContactFields value={value as ContactInformationSetting} state={state} />;
    case "navigation_footer":
      return <NavigationFields value={value as NavigationFooterSetting} state={state} />;
    case "tv_display":
      return <TvFields value={value as TvDisplaySetting} state={state} />;
    case "feature_flags":
      return <FeatureFlagFields value={value as FeatureFlagsSetting} />;
    case "enquiry_configuration":
      return <EnquiryFields value={value as EnquiryConfigurationSetting} state={state} />;
  }
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

export function SiteSettingForm({
  settingKey,
  initialValue,
  metadata,
  canWrite,
  invalidStoredValue = false,
}: {
  settingKey: ManagedSettingKey;
  initialValue: ManagedSettingValue;
  metadata: SettingMetadata | null;
  canWrite: boolean;
  invalidStoredValue?: boolean;
}) {
  const [state, action] = useActionState(saveSiteSettingAction, INITIAL_ACTION_STATE);
  const details = managedSettingDetails[settingKey];
  const headingId = `${settingKey}-heading`;
  const fieldsLegendId = `${settingKey}-fields-legend`;
  const status = metadata?.status ?? "draft";

  return (
    <article className="admin-card admin-setting-card" aria-labelledby={headingId}>
      <div className="admin-setting-card__heading">
        <div>
          <p className="admin-eyebrow">{details.eyebrow}</p>
          <h2 id={headingId}>{details.title}</h2>
          <p>{details.description}</p>
        </div>
        <span className={`admin-status admin-status--${status}`}>{status}</span>
      </div>

      {invalidStoredValue ? (
        <div className="admin-danger-panel" role="alert">
          <strong>This stored setting does not match the supported structure.</strong>
          <p>
            It has been left untouched. Ask a technical maintainer to review the database value
            before anyone edits this section.
          </p>
        </div>
      ) : (
        <form action={action} className="admin-form admin-setting-form">
          <input name="key" type="hidden" value={settingKey} />
          {metadata && <input name="expectedVersion" type="hidden" value={metadata.version} />}
          <fieldset className="admin-settings-fields" disabled={!canWrite}>
            <legend className="admin-visually-hidden" id={fieldsLegendId}>
              {details.title} fields
            </legend>
            <SettingFields settingKey={settingKey} value={initialValue} state={state} />
            <div className="admin-field admin-setting-status-field">
              <label htmlFor={`${settingKey}-status`}>Publication status</label>
              <select
                id={`${settingKey}-status`}
                name="status"
                defaultValue={status}
                aria-describedby={`${settingKey}-status-hint${state.fieldErrors?.status?.length ? ` ${settingKey}-status-error` : ""}`}
              >
                <option value="draft">Draft — private</option>
                <option value="published">Published — available to the public website</option>
                <option value="archived">Archived — retained but not public</option>
              </select>
              <span className="admin-hint" id={`${settingKey}-status-hint`}>
                Publishing requires an authenticator-confirmed session. Moving a published setting
                to Draft or Archived immediately removes that setting from public access.
              </span>
              <FieldError errors={state.fieldErrors?.status} id={`${settingKey}-status-error`} />
            </div>
          </fieldset>
          <ActionFeedback state={state} />
          {canWrite && (
            <div className="admin-form-actions">
              <SubmitButton pendingLabel="Saving securely…">
                Save {details.title.toLowerCase()}
              </SubmitButton>
            </div>
          )}
        </form>
      )}

      <p className="admin-setting-meta">
        {metadata ? (
          <>
            Version {metadata.version} · Last updated by{" "}
            {metadata.updatedByName ??
              (metadata.hasActor
                ? "an administrator whose name is restricted for this role"
                : "the system")}
            {" on "}
            <time dateTime={metadata.updatedAt}>{formatUpdatedAt(metadata.updatedAt)}</time>
          </>
        ) : (
          "No record has been saved. The values shown are private form defaults, not published facts."
        )}
      </p>
    </article>
  );
}
