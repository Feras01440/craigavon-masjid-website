"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import { submitPublicEnquiryAction } from "@/server/actions/public-enquiry";

function SubmitEnquiryButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button button--primary" disabled={pending} type="submit">
      {pending ? "Sending…" : "Send enquiry"}
    </button>
  );
}

function FieldError({ errors, id }: { errors?: string[]; id: string }) {
  if (!errors?.length) return null;
  return (
    <span className="public-form__error" id={id}>
      {errors.join(" ")}
    </span>
  );
}

export function PublicEnquiryForm() {
  const [state, action] = useActionState(submitPublicEnquiryAction, INITIAL_ACTION_STATE);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "error") feedback.current?.focus();
  }, [state.message, state.status]);
  return (
    <form action={action} className="public-form" noValidate>
      <div className="public-form__field">
        <label htmlFor="enquiry-kind">What is your enquiry about?</label>
        <select id="enquiry-kind" name="kind" defaultValue="general">
          <option value="general">General enquiry</option>
          <option value="visit">Mosque visit</option>
          <option value="new_muslim_support">New Muslim support</option>
          <option value="service">Community service</option>
          <option value="volunteering">Volunteering</option>
          <option value="class_interest">Class interest (adults only)</option>
        </select>
      </div>
      <div className="public-form__field">
        <label htmlFor="enquiry-name">Your name</label>
        <input
          id="enquiry-name"
          name="name"
          autoComplete="name"
          maxLength={120}
          required
          aria-invalid={state.fieldErrors?.name ? true : undefined}
          aria-describedby={state.fieldErrors?.name ? "enquiry-name-error" : undefined}
        />
        <FieldError errors={state.fieldErrors?.name} id="enquiry-name-error" />
      </div>
      <div className="public-form__grid">
        <div className="public-form__field">
          <label htmlFor="enquiry-email">Email address (optional)</label>
          <input
            id="enquiry-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            aria-invalid={state.fieldErrors?.email ? true : undefined}
            aria-describedby="enquiry-contact-hint enquiry-email-error"
          />
          <FieldError errors={state.fieldErrors?.email} id="enquiry-email-error" />
        </div>
        <div className="public-form__field">
          <label htmlFor="enquiry-phone">Phone number (optional)</label>
          <input
            id="enquiry-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            aria-invalid={state.fieldErrors?.phone ? true : undefined}
            aria-describedby="enquiry-contact-hint enquiry-phone-error"
          />
          <FieldError errors={state.fieldErrors?.phone} id="enquiry-phone-error" />
        </div>
      </div>
      <p className="public-form__hint" id="enquiry-contact-hint">
        Provide at least one reply method. Do not submit a child’s personal information.
      </p>
      <div className="public-form__field">
        <label htmlFor="enquiry-message">Message</label>
        <textarea
          id="enquiry-message"
          name="message"
          rows={8}
          minLength={10}
          maxLength={2000}
          required
          aria-invalid={state.fieldErrors?.message ? true : undefined}
          aria-describedby="enquiry-message-hint enquiry-message-error"
        />
        <span className="public-form__hint" id="enquiry-message-hint">
          Do not include passwords, payment details, medical records, immigration documents,
          safeguarding disclosures or other highly sensitive information.
        </span>
        <FieldError errors={state.fieldErrors?.message} id="enquiry-message-error" />
      </div>
      <div className="public-form__trap" aria-hidden="true">
        <label htmlFor="enquiry-website">Leave this field empty</label>
        <input id="enquiry-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="public-form__consent">
        <input
          name="privacyAccepted"
          type="checkbox"
          required
          aria-invalid={state.fieldErrors?.privacyAccepted ? true : undefined}
          aria-describedby={
            state.fieldErrors?.privacyAccepted ? "enquiry-privacy-error" : undefined
          }
        />
        <span>
          I have read the <Link href="/policies/privacy">privacy notice</Link> and understand how
          this enquiry will be handled.
        </span>
      </label>
      <FieldError errors={state.fieldErrors?.privacyAccepted} id="enquiry-privacy-error" />
      {state.message && (
        <p
          ref={feedback}
          className={`public-form__feedback public-form__feedback--${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
          tabIndex={state.status === "error" ? -1 : undefined}
        >
          {state.message}
        </p>
      )}
      <SubmitEnquiryButton />
    </form>
  );
}
