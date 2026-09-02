"use client";

import { useState } from "react";

export function ContentArchiveButton({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        className="admin-button admin-button--danger-quiet"
        type="button"
        onClick={() => setConfirming(true)}
      >
        Archive item
      </button>
    );
  }
  return (
    <div className="admin-inline-confirm">
      <p>Archive this item and remove it from public use?</p>
      <button className="admin-button admin-button--danger" formAction={action} type="submit">
        Yes, archive it
      </button>
      <button
        className="admin-button admin-button--quiet"
        type="button"
        onClick={() => setConfirming(false)}
      >
        Keep item
      </button>
    </div>
  );
}
