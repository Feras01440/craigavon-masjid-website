import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/site";

export const metadata: Metadata = {
  title: "Page not found",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <PublicShell>
      <section className="not-found">
        <div className="site-container not-found__inner">
          <p className="eyebrow">404</p>
          <h1>Page not found</h1>
          <p>There is nothing at this address.</p>
          <div className="button-row">
            <Link className="button button--primary" href="/">
              Go to the home page
            </Link>
            <Link className="button button--secondary" href="/prayer-times">
              View prayer times
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
