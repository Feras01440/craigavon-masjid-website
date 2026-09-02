"use client";

import { useActionState } from "react";

import { INITIAL_ACTION_STATE } from "@/lib/auth/errors";
import { updateEnquiryAction } from "@/server/actions/enquiries";
import type { EnquiryStatus } from "@/types/database";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function EnquiryActionForm({
  id,
  status,
  assignedTo,
  currentUserId,
}: {
  id: string;
  status: EnquiryStatus;
  assignedTo: string | null;
  currentUserId: string;
}) {
  const [state, action] = useActionState(updateEnquiryAction, INITIAL_ACTION_STATE);
  const assignedElsewhere = assignedTo && assignedTo !== currentUserId;
  return (
    <form action={action} className="admin-enquiry-action">
      <input name="id" type="hidden" value={id} />
      <div className="admin-field">
        <label htmlFor={`enquiry-status-${id}`}>Status</label>
        <select id={`enquiry-status-${id}`} name="status" defaultValue={status}>
          <option value="new">New</option>
          <option value="in_progress">In progress</option>
          <option value="awaiting_response">Awaiting response</option>
          <option value="closed">Closed</option>
          <option value="deleted">Soft delete</option>
        </select>
      </div>
      <div className="admin-field">
        <label htmlFor={`enquiry-assignee-${id}`}>Assignment</label>
        <select id={`enquiry-assignee-${id}`} name="assignedTo" defaultValue={assignedTo ?? ""}>
          <option value="">Unassigned</option>
          <option value={currentUserId}>Assigned to me</option>
          {assignedElsewhere && <option value={assignedTo}>Keep current administrator</option>}
        </select>
      </div>
      <SubmitButton pendingLabel="Saving securely…">Update enquiry</SubmitButton>
      <ActionFeedback state={state} />
    </form>
  );
}
