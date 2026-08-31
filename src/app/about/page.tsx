import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro, PublicShell } from "@/components/site";
import { MASJID_NAME, SITE_NAME } from "@/content/public-copy";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Craigavon Masjid and the Muslim Association of Craigavon, serving the Muslim community of Craigavon, Portadown and Lurgan.",
};

export default function AboutPage() {
  return (
    <PublicShell>
      <PageIntro eyebrow="About" title="About the Association" current="About" />

      <section className="section" aria-labelledby="identity-heading">
        <div className="site-container prose prose--wide">
          <h2 id="identity-heading">{SITE_NAME}</h2>
          <p>
            The Association runs {MASJID_NAME} at the Legahory Centre — a place of worship, learning
            and community for Muslims across Craigavon, Portadown and Lurgan.
          </p>
          <p>
            The masjid hosts the five daily prayers and Jumuʿah, Qur&apos;an classes, and support at
            life&apos;s important moments.
          </p>
          <div className="button-row">
            <Link className="button button--primary" href="/prayer-times">
              Prayer times
            </Link>
            <Link className="button button--secondary" href="/contact">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
