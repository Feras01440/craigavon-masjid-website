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

      <section
        className="section section--tinted section--compact"
        aria-labelledby="about-next-heading"
      >
        <div className="site-container prose prose--wide">
          <p className="eyebrow">Get to know us</p>
          <h2 id="about-next-heading">Come and see for yourself</h2>
          <p>
            The best introduction is a visit. Check the{" "}
            <Link href="/prayer-times">prayer times</Link>, see{" "}
            <Link href="/services">how we can help</Link>, or{" "}
            <Link href="/contact">get in touch</Link> — we are always glad to hear from you.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
