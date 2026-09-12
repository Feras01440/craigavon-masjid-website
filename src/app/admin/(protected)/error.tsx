"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Protected admin page failed", error);
  }, [error]);
  return (
    <div className="admin-card admin-card--narrow" role="alert">
      <p className="admin-eyebrow">Change stopped</p>
      <h1>We could not safely open this page</h1>
      <p>
        The request did not complete as expected. Review the latest page state before trying again;
        your role, authenticator confirmation, or the administration service may need attention.
      </p>
      <button className="admin-button" type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
