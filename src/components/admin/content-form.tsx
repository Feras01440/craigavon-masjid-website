"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import {
  contentDocumentSchema,
  contentDocumentText,
  isPublishableContentKind,
  publishableContentKinds,
  type ContentDocument,
} from "@/lib/content/content-documents";
import { createContentAction, updateContentAction } from "@/server/actions/content";
import type { ContentItemRow, ContentKind, ContentStatus } from "@/types/database";
import { ActionFeedback, FieldError } from "./action-feedback";
import { SubmitButton } from "./submit-button";

const kindLabels: Record<ContentKind, string> = {
  page: "Page",
  announcement: "Announcement",
  emergency_notice: "Emergency notice",
  event: "Event",
  recurring_programme: "Recurring programme",
  education: "Education",
  service: "Service",
  faq: "Frequently asked question",
  policy: "Policy",
  navigation: "Navigation item",
  social_link: "Social link",
  donation_appeal: "Donation appeal",
};

const publishableKindOptions = publishableContentKinds.map((value) => ({
  value,
  label: kindLabels[value],
}));

function londonInputValue(iso: string | null): string {
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

function parsedDocument(item?: ContentItemRow): ContentDocument | null {
  if (!item) return null;
  const parsed = contentDocumentSchema.safeParse(item.body);
  return parsed.success ? parsed.data : null;
}

function documentValue(
  document: ContentDocument | null,
  format: ContentDocument["format"],
  key: string,
): string {
  if (!document || document.format !== format) return "";
  const value = (document as unknown as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function ContentForm({ item }: { item?: ContentItemRow }) {
  const [state, action] = useActionState(
    item ? updateContentAction : createContentAction,
    INITIAL_ACTION_STATE,
  );
  const [kind, setKind] = useState<ContentKind>(item?.kind ?? "announcement");
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? "draft");
  const document = parsedDocument(item);
  const legacyUnsupportedKind = item && !isPublishableContentKind(item.kind) ? item.kind : null;
  const kindOptions = legacyUnsupportedKind
    ? [
        {
          value: legacyUnsupportedKind,
          label: `${kindLabels[legacyUnsupportedKind]} (legacy draft only)`,
        },
        ...publishableKindOptions,
      ]
    : publishableKindOptions;
  const kindCanBePublic = isPublishableContentKind(kind);
  const publicStatus = status === "published" || status === "scheduled";
  const emergencyPublication = kind === "emergency_notice" && publicStatus;

  function changeKind(nextKind: ContentKind) {
    setKind(nextKind);
    if (!isPublishableContentKind(nextKind) && (status === "published" || status === "scheduled")) {
      setStatus("draft");
    }
  }

  return (
    <form action={action} className="admin-form admin-form--wide">
      {item && (
        <>
          <input name="id" type="hidden" value={item.id} />
          <input name="expectedVersion" type="hidden" value={item.version} />
        </>
      )}
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="content-kind">Content type</label>
          <select
            id="content-kind"
            name="kind"
            value={kind}
            onChange={(event) => changeKind(event.target.value as ContentKind)}
          >
            {kindOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {!kindCanBePublic && (
            <span className="admin-hint">
              This legacy type has no verified public page. It can be edited as a draft, converted
              to a supported type, or archived, but it cannot be published.
            </span>
          )}
          <FieldError errors={state.fieldErrors?.kind} />
        </div>
        <div className="admin-field">
          <label htmlFor="content-status">Publication status</label>
          <select
            id="content-status"
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ContentStatus)}
          >
            <option value="draft">Draft — visible only here</option>
            {!kindCanBePublic && (status === "scheduled" || status === "published") && (
              <option value={status} disabled>
                {status === "scheduled" ? "Scheduled" : "Published"} (withdraw before saving)
              </option>
            )}
            {kindCanBePublic && <option value="scheduled">Scheduled</option>}
            {kindCanBePublic && <option value="published">Published now</option>}
            <option value="archived">Archived</option>
          </select>
          <FieldError errors={state.fieldErrors?.status} />
        </div>
      </div>
      <div className="admin-field">
        <label htmlFor="content-title">Title</label>
        <input
          id="content-title"
          name="title"
          required
          maxLength={160}
          defaultValue={item?.title ?? ""}
        />
        <FieldError errors={state.fieldErrors?.title} />
      </div>
      <div className="admin-field">
        <label htmlFor="content-slug">URL slug</label>
        <div className="admin-input-prefix">
          <span aria-hidden="true">/</span>
          <input
            id="content-slug"
            name="slug"
            required
            maxLength={120}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            defaultValue={item?.slug ?? ""}
          />
        </div>
        <span className="admin-hint">
          Lowercase words separated by hyphens, for example community-dinner.
        </span>
        <FieldError errors={state.fieldErrors?.slug} />
      </div>
      <div className="admin-field">
        <label htmlFor="content-summary">
          Short summary <span className="admin-optional">optional</span>
        </label>
        <textarea
          id="content-summary"
          name="summary"
          rows={3}
          maxLength={500}
          defaultValue={item?.summary ?? ""}
        />
        <FieldError errors={state.fieldErrors?.summary} />
      </div>
      <fieldset className="admin-fieldset">
        <legend>Search and sharing</legend>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="content-seo-title">
              Search title <span className="admin-optional">optional</span>
            </label>
            <input
              id="content-seo-title"
              name="seoTitle"
              maxLength={160}
              defaultValue={item?.seo_title ?? ""}
            />
            <FieldError errors={state.fieldErrors?.seoTitle} />
          </div>
          <div className="admin-field">
            <label htmlFor="content-seo-description">
              Search description <span className="admin-optional">optional</span>
            </label>
            <textarea
              id="content-seo-description"
              name="seoDescription"
              rows={3}
              maxLength={320}
              defaultValue={item?.seo_description ?? ""}
            />
            <FieldError errors={state.fieldErrors?.seoDescription} />
          </div>
        </div>
        <p className="admin-hint">Leave blank to use the public title and summary.</p>
      </fieldset>
      <div className="admin-field">
        <label htmlFor="content-body">
          {kind === "faq" ? "Answer" : kind === "event" ? "Event description" : "Main content"}
        </label>
        <textarea
          id="content-body"
          name="bodyText"
          rows={14}
          required
          maxLength={50_000}
          defaultValue={item ? contentDocumentText(item.body) : ""}
        />
        <span className="admin-hint">
          Use plain text and separate paragraphs with a blank line. Keep wording factual and links
          descriptive.
        </span>
        <FieldError errors={state.fieldErrors?.bodyText} />
      </div>
      {(kind === "announcement" || kind === "emergency_notice") && (
        <fieldset className="admin-fieldset">
          <legend>Optional action link</legend>
          <p className="admin-hint">
            Add both fields only when the destination is active and has been checked.
          </p>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="content-action-label">Link label</label>
              <input
                id="content-action-label"
                name="actionLabel"
                maxLength={80}
                defaultValue={documentValue(document, "notice", "action_label")}
              />
              <FieldError errors={state.fieldErrors?.actionLabel} />
            </div>
            <div className="admin-field">
              <label htmlFor="content-action-url">Secure link or site path</label>
              <input
                id="content-action-url"
                name="actionUrl"
                type="text"
                inputMode="url"
                maxLength={2048}
                placeholder="/contact or https://example.org/details"
                defaultValue={documentValue(document, "notice", "action_url")}
              />
              <FieldError errors={state.fieldErrors?.actionUrl} />
            </div>
          </div>
        </fieldset>
      )}
      {kind === "event" && (
        <fieldset className="admin-fieldset">
          <legend>Event details</legend>
          <p className="admin-hint">
            A start time and location are required before publication. Times use Europe/London.
          </p>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="content-event-start">
                Start date and time {publicStatus ? "(required)" : "(optional in draft)"}
              </label>
              <input
                id="content-event-start"
                name="eventStartsAt"
                type="datetime-local"
                required={publicStatus}
                defaultValue={londonInputValue(
                  documentValue(document, "event", "starts_at") || null,
                )}
              />
              <FieldError errors={state.fieldErrors?.eventStartsAt} />
            </div>
            <div className="admin-field">
              <label htmlFor="content-event-end">
                End date and time <span className="admin-optional">optional</span>
              </label>
              <input
                id="content-event-end"
                name="eventEndsAt"
                type="datetime-local"
                defaultValue={londonInputValue(documentValue(document, "event", "ends_at") || null)}
              />
              <FieldError errors={state.fieldErrors?.eventEndsAt} />
            </div>
          </div>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="content-event-location">
                Location {publicStatus ? "(required)" : "(optional in draft)"}
              </label>
              <input
                id="content-event-location"
                name="eventLocation"
                maxLength={300}
                required={publicStatus}
                defaultValue={documentValue(document, "event", "location")}
              />
              <span className="admin-hint">Use the approved public venue wording.</span>
              <FieldError errors={state.fieldErrors?.eventLocation} />
            </div>
            <div className="admin-field">
              <label htmlFor="content-event-url">
                Details or registration link <span className="admin-optional">optional</span>
              </label>
              <input
                id="content-event-url"
                name="eventUrl"
                type="text"
                inputMode="url"
                maxLength={2048}
                placeholder="/contact or https://example.org/register"
                defaultValue={documentValue(document, "event", "event_url")}
              />
              <FieldError errors={state.fieldErrors?.eventUrl} />
            </div>
          </div>
        </fieldset>
      )}
      {kind === "service" && (
        <fieldset className="admin-fieldset">
          <legend>Practical service details</legend>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="content-service-audience">Who it is for</label>
              <textarea
                id="content-service-audience"
                name="serviceAudience"
                rows={3}
                maxLength={500}
                defaultValue={documentValue(document, "service", "audience")}
              />
              <FieldError errors={state.fieldErrors?.serviceAudience} />
            </div>
            <div className="admin-field">
              <label htmlFor="content-service-availability">Availability</label>
              <textarea
                id="content-service-availability"
                name="serviceAvailability"
                rows={3}
                maxLength={500}
                defaultValue={documentValue(document, "service", "availability")}
              />
              <FieldError errors={state.fieldErrors?.serviceAvailability} />
            </div>
          </div>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="content-service-access">How to access the service</label>
              <textarea
                id="content-service-access"
                name="serviceAccessInstructions"
                rows={3}
                maxLength={500}
                defaultValue={documentValue(document, "service", "access_instructions")}
              />
              <FieldError errors={state.fieldErrors?.serviceAccessInstructions} />
            </div>
            <div className="admin-field">
              <label htmlFor="content-service-url">
                Monitored next-step link <span className="admin-optional">optional</span>
              </label>
              <input
                id="content-service-url"
                name="serviceUrl"
                type="text"
                inputMode="url"
                maxLength={2048}
                placeholder="/contact or https://example.org/details"
                defaultValue={documentValue(document, "service", "service_url")}
              />
              <FieldError errors={state.fieldErrors?.serviceUrl} />
            </div>
          </div>
        </fieldset>
      )}
      {(kind === "education" || kind === "recurring_programme") && (
        <fieldset className="admin-fieldset">
          <legend>
            {kind === "recurring_programme"
              ? "Recurring programme details"
              : "Learning programme details"}
          </legend>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="content-education-audience">Audience or age range</label>
              <textarea
                id="content-education-audience"
                name="educationAudience"
                rows={3}
                maxLength={500}
                defaultValue={documentValue(document, "education", "audience")}
              />
              <FieldError errors={state.fieldErrors?.educationAudience} />
            </div>
            <div className="admin-field">
              <label htmlFor="content-education-schedule">Approved schedule</label>
              <textarea
                id="content-education-schedule"
                name="educationSchedule"
                rows={3}
                maxLength={500}
                defaultValue={documentValue(document, "education", "schedule")}
              />
              <FieldError errors={state.fieldErrors?.educationSchedule} />
            </div>
          </div>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="content-education-safeguarding">
                Safeguarding or registration note <span className="admin-optional">optional</span>
              </label>
              <textarea
                id="content-education-safeguarding"
                name="educationSafeguardingNote"
                rows={3}
                maxLength={500}
                defaultValue={documentValue(document, "education", "safeguarding_note")}
              />
              <FieldError errors={state.fieldErrors?.educationSafeguardingNote} />
            </div>
            <div className="admin-field">
              <label htmlFor="content-education-url">
                Approved registration link <span className="admin-optional">optional</span>
              </label>
              <input
                id="content-education-url"
                name="educationRegistrationUrl"
                type="text"
                inputMode="url"
                maxLength={2048}
                placeholder="/contact or https://example.org/register"
                defaultValue={documentValue(document, "education", "registration_url")}
              />
              <FieldError errors={state.fieldErrors?.educationRegistrationUrl} />
            </div>
          </div>
        </fieldset>
      )}
      {kind === "policy" && (
        <fieldset className="admin-fieldset">
          <legend>Policy control information</legend>
          <p className="admin-hint">
            An owner and effective date are required before publication. Add only formally approved
            details.
          </p>
          <div className="admin-form-grid admin-form-grid--three">
            <div className="admin-field">
              <label htmlFor="content-policy-owner">
                Policy owner {publicStatus ? "(required)" : "(optional in draft)"}
              </label>
              <input
                id="content-policy-owner"
                name="policyOwner"
                maxLength={160}
                required={publicStatus}
                defaultValue={documentValue(document, "policy", "owner")}
              />
              <FieldError errors={state.fieldErrors?.policyOwner} />
            </div>
            <div className="admin-field">
              <label htmlFor="content-policy-effective">
                Effective date {publicStatus ? "(required)" : "(optional in draft)"}
              </label>
              <input
                id="content-policy-effective"
                name="policyEffectiveOn"
                type="date"
                required={publicStatus}
                defaultValue={documentValue(document, "policy", "effective_on")}
              />
              <FieldError errors={state.fieldErrors?.policyEffectiveOn} />
            </div>
            <div className="admin-field">
              <label htmlFor="content-policy-review">
                Review date <span className="admin-optional">optional</span>
              </label>
              <input
                id="content-policy-review"
                name="policyReviewOn"
                type="date"
                defaultValue={documentValue(document, "policy", "review_on")}
              />
              <FieldError errors={state.fieldErrors?.policyReviewOn} />
            </div>
          </div>
          <div className="admin-field">
            <label htmlFor="content-policy-download">
              Downloadable document <span className="admin-optional">optional</span>
            </label>
            <input
              id="content-policy-download"
              name="policyDownloadUrl"
              type="text"
              inputMode="url"
              maxLength={2048}
              placeholder="/media/document or https://example.org/policy.pdf"
              defaultValue={documentValue(document, "policy", "download_url")}
            />
            <span className="admin-hint">
              Use a checked site path or HTTPS document. Image uploads remain separate from policy
              documents.
            </span>
            <FieldError errors={state.fieldErrors?.policyDownloadUrl} />
          </div>
        </fieldset>
      )}
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="content-category">
            Category <span className="admin-optional">optional</span>
          </label>
          <input
            id="content-category"
            name="category"
            maxLength={80}
            defaultValue={item?.category ?? ""}
          />
          <FieldError errors={state.fieldErrors?.category} />
        </div>
        <label className="admin-checkbox" htmlFor="content-featured">
          <input
            id="content-featured"
            name="featured"
            type="checkbox"
            defaultChecked={item?.featured ?? false}
          />
          Feature this item prominently
        </label>
      </div>
      <fieldset className="admin-fieldset">
        <legend>Timing in Europe/London</legend>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="content-publish-at">
              Publication date and time {status === "scheduled" ? "(required)" : "(optional)"}
            </label>
            <input
              id="content-publish-at"
              name="publishAt"
              type="datetime-local"
              required={status === "scheduled"}
              defaultValue={londonInputValue(item?.publish_at ?? null)}
            />
            <FieldError errors={state.fieldErrors?.publishAt} />
          </div>
          <div className="admin-field">
            <label htmlFor="content-expires-at">
              Automatic expiry <span className="admin-optional">optional</span>
            </label>
            <input
              id="content-expires-at"
              name="expiresAt"
              type="datetime-local"
              defaultValue={londonInputValue(item?.expires_at ?? null)}
            />
            <FieldError errors={state.fieldErrors?.expiresAt} />
          </div>
        </div>
      </fieldset>
      {emergencyPublication && (
        <div className="admin-danger-panel">
          <div className="admin-field">
            <label htmlFor="emergency-confirmation">Confirm urgent public publication</label>
            <p className="admin-hint">
              Type <strong>PUBLISH EMERGENCY</strong> exactly. This notice can appear prominently
              across the public website.
            </p>
            <input
              id="emergency-confirmation"
              name="emergencyConfirmation"
              autoComplete="off"
              required
              pattern="PUBLISH EMERGENCY"
            />
            <FieldError errors={state.fieldErrors?.emergencyConfirmation} />
          </div>
        </div>
      )}
      <ActionFeedback state={state} />
      <div className="admin-form-actions">
        <SubmitButton pendingLabel="Saving securely…">
          {item ? "Save changes" : "Create content"}
        </SubmitButton>
        <Link className="admin-button admin-button--quiet" href="/admin/content">
          Cancel
        </Link>
      </div>
      <p className="admin-hint">
        Sensitive changes require a recently confirmed authenticator code and are recorded in the
        audit log.
      </p>
    </form>
  );
}
