"use client";

import { useActionState } from "react";

import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import { updateMediaStatusAction } from "@/server/actions/media";
import type { MediaStatus } from "@/types/database";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function MediaStatusForm({
  id,
  status,
  updatedAt,
}: {
  id: string;
  status: MediaStatus;
  updatedAt: string;
}) {
  const [state, action] = useActionState(updateMediaStatusAction, INITIAL_ACTION_STATE);
  return (
    <form action={action} className="admin-inline-form">
      <input name="id" type="hidden" value={id} />
      <input name="expectedUpdatedAt" type="hidden" value={updatedAt} />
      <label className="admin-visually-hidden" htmlFor={`media-status-${id}`}>
        Media status
      </label>
      <select id={`media-status-${id}`} name="status" defaultValue={status}>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
      <SubmitButton className="admin-button admin-button--quiet" pendingLabel="Saving…">
        Save status
      </SubmitButton>
      <ActionFeedback state={state} />
    </form>
  );
}
