"use client";

import { useEffect, useRef } from "react";

import type { ActionState } from "@/lib/auth/errors";

export function ActionFeedback({ state }: { state: ActionState }) {
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "error") feedback.current?.focus();
  }, [state.message, state.status]);
  if (state.status === "idle" || !state.message) return null;
  return (
    <p
      ref={feedback}
      className={`admin-feedback admin-feedback--${state.status}`}
      role={state.status === "error" ? "alert" : "status"}
      tabIndex={state.status === "error" ? -1 : undefined}
    >
      {state.message}
    </p>
  );
}

export function FieldError({ errors, id }: { errors?: string[]; id?: string }) {
  if (!errors?.length) return null;
  return (
    <span className="admin-field-error" id={id}>
      {errors.join(" ")}
    </span>
  );
}
