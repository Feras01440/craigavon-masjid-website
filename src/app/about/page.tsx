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
      <PageIntro
        eyebrow="About"
        title="About the Association"
        description={`${MASJID_NAME} is run by the ${SITE_NAME}, serving the Muslim community of Craigavon, Portadown and Lurgan.`}
        current="About"
      />

      <section className="section" aria-labelledby="identity-heading">
        <div className="site-container prose prose--wide">
          <p className="eyebrow">Who we are</p>
          <h2 id="identity-heading">{SITE_NAME}</h2>
          <p>
            The Association maintains the masjid at the Legahory Centre as a place of worship,
            learning and community for Muslims across the borough — and as an open door for
            neighbours who want to understand more about Islam or simply say hello.
          </p>
          <p>
            The masjid hosts the five daily prayers and Jumuʿah, Qur&apos;an and Islamic education,
            and support at life&apos;s important moments — from welcoming someone&apos;s Shahada to
            standing with families at a funeral.
          </p>
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="about-links-heading">
        <div className="site-container">
          <div className="section-heading">
            <p className="eyebrow">Get to know us</p>
            <h2 id="about-links-heading">Start here</h2>
          </div>
          <div className="journey-grid journey-grid--three">
            <article className="journey-card">
              <h3>Prayer times</h3>
              <p>Today&apos;s times, Jumuʿah and the monthly timetable.</p>
              <Link className="text-link" href="/prayer-times">
                View prayer times
              </Link>
            </article>
            <article className="journey-card">
              <h3>Services</h3>
              <p>Shahada support, funerals, Nikah, education and speaking with the imam.</p>
              <Link className="text-link" href="/services">
                See our services
              </Link>
            </article>
            <article className="journey-card">
              <h3>Visit or contact us</h3>
              <p>Where to find us, visiting information and how to get in touch.</p>
              <Link className="text-link" href="/contact">
                Contact the masjid
              </Link>
            </article>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
