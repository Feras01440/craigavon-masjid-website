"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Working…",
  className = "admin-button",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  /** Optional submitter name/value so one form can offer two actions (e.g. preview vs import). */
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} name={name} type="submit" value={value}>
      {pending ? pendingLabel : children}
    </button>
  );
}
