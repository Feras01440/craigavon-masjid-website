"use client";

import { useActionState, useState } from "react";

import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import { uploadMediaAction } from "@/server/actions/media";
import { ActionFeedback, FieldError } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function MediaUploadForm() {
  const [state, action] = useActionState(uploadMediaAction, INITIAL_ACTION_STATE);
  const [purpose, setPurpose] = useState<"meaningful" | "decorative">("meaningful");
  const [altText, setAltText] = useState("");
  return (
    <form action={action} className="admin-form admin-form--wide" encType="multipart/form-data">
      <div className="admin-field">
        <label htmlFor="media-file">File</label>
        <input
          id="media-file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          required
        />
        <span className="admin-hint">
          JPEG, PNG, WebP or AVIF, up to 10 MB. Images are auto-rotated, resized when necessary,
          compressed and stripped of embedded metadata before storage. PDF uploads remain disabled
          until production malware scanning is configured.
        </span>
        <FieldError errors={state.fieldErrors?.file} />
      </div>
      <fieldset className="admin-fieldset">
        <legend>How should assistive technology treat this media?</legend>
        <label className="admin-radio">
          <input
            name="purpose"
            type="radio"
            value="meaningful"
            checked={purpose === "meaningful"}
            onChange={() => setPurpose("meaningful")}
          />{" "}
          Meaningful — it communicates information
        </label>
        <label className="admin-radio">
          <input
            name="purpose"
            type="radio"
            value="decorative"
            checked={purpose === "decorative"}
            onChange={() => {
              setPurpose("decorative");
              setAltText("");
            }}
          />{" "}
          Decorative — it adds no information
        </label>
        <FieldError errors={state.fieldErrors?.purpose} />
      </fieldset>
      <div className="admin-field">
        <label htmlFor="media-alt">
          Alternative text {purpose === "meaningful" ? "(required)" : "(must be empty)"}
        </label>
        <textarea
          id="media-alt"
          name="altText"
          rows={3}
          maxLength={500}
          required={purpose === "meaningful"}
          disabled={purpose === "decorative"}
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
        />
        <span className="admin-hint">
          Describe the purpose or information, not every visual detail. Do not begin with “image
          of”.
        </span>
        <FieldError errors={state.fieldErrors?.altText} />
      </div>
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="media-caption">
            Visible caption <span className="admin-optional">optional</span>
          </label>
          <textarea id="media-caption" name="caption" rows={2} maxLength={1000} />
          <FieldError errors={state.fieldErrors?.caption} />
        </div>
        <div className="admin-field">
          <label htmlFor="media-credit">
            Credit <span className="admin-optional">optional</span>
          </label>
          <input id="media-credit" name="credit" maxLength={300} />
          <FieldError errors={state.fieldErrors?.credit} />
        </div>
      </div>
      <div className="admin-field">
        <label htmlFor="media-status">Status</label>
        <select id="media-status" name="status" defaultValue="draft">
          <option value="draft">Draft — keep out of the media library</option>
          <option value="published">Published — approved for public use</option>
        </select>
      </div>
      <ActionFeedback state={state} />
      <SubmitButton pendingLabel="Checking and uploading…">Upload media</SubmitButton>
      <p className="admin-hint">
        Uploading requires a confirmed authenticator code. Filenames are replaced with safe,
        unpredictable object paths.
      </p>
    </form>
  );
}
