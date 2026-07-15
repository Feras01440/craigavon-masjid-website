"use client";

import Link from "next/link";

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="site-main" id="main-content">
      <section className="not-found">
        <div className="site-container not-found__inner">
          <p className="eyebrow">Temporary problem</p>
          <h1>This page could not be loaded</h1>
          <p>
            No private or unverified fallback information has been shown. You can try again safely.
          </p>
          <div className="button-row">
            <button className="button button--primary" onClick={reset} type="button">
              Try again
            </button>
            <Link className="button button--secondary" href="/">
              Go to the home page
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
