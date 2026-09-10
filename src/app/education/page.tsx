import type { Metadata } from "next";
import Link from "next/link";

import { ClassCard } from "@/components/site/class-card";
import { MasjidPhoto } from "@/components/site/masjid-photo";
import {
  EmptyState,
  PageIntro,
  PublicShell,
  PublishedContentOmissionNotice,
  PublishedContentUnavailable,
} from "@/components/site";
import { getPublishedContent } from "@/server/repositories/public-content";

export const metadata: Metadata = {
  title: "Education",
  description: "Qur'an and Islamic education for children and adults at Craigavon Masjid.",
};

// ISR: shared-cached for five minutes; purged instantly on publish.
export const revalidate = 300;

export default async function EducationPage() {
  const content = await getPublishedContent(["education"], { limit: 100 });
  const programmes = content.status === "ready" ? content.items : [];

  return (
    <PublicShell>
      <PageIntro eyebrow="Education" title="Learning at the masjid" current="Education" />

      <section className="section education-lead" aria-labelledby="education-lead-heading">
        <div className="site-container education-lead__grid">
          <div className="education-lead__copy">
            <h2 id="education-lead-heading">Qur&apos;an and Islamic studies</h2>
            <p>
              Classes are held in the prayer hall at the Legahory Centre for children and adults:
              Qur&apos;an reading and memorisation, and Islamic studies. What is running now is
              listed below.
            </p>
          </div>
          <MasjidPhoto
            className="education-lead__photo"
            name="prayer-hall-minbar"
            alt="The prayer hall at Craigavon Masjid, with the mihrab and minbar, where classes are held"
            sizes="(min-width: 64rem) 48vw, 100vw"
            priority
          />
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="classes-heading">
        <div className="site-container">
          <div className="section-heading" data-reveal>
            <h2 id="classes-heading">Classes</h2>
          </div>
          {content.status === "unavailable" ? (
            <PublishedContentUnavailable subject="Class information" />
          ) : programmes.length === 0 ? (
            <EmptyState title="Class times will be announced here">
              <p>
                <Link href="/contact">Contact us</Link> to ask what is running.
              </p>
            </EmptyState>
          ) : (
            <>
              <div className="class-grid">
                {programmes.map((item, index) => (
                  <div
                    key={item.id}
                    data-reveal
                    style={{ "--reveal-delay": `${(index % 3) * 90}ms` } as React.CSSProperties}
                  >
                    <ClassCard item={item} />
                  </div>
                ))}
              </div>
              {content.omittedCount > 0 && <PublishedContentOmissionNotice />}
            </>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="education-enquire-heading">
        <div className="site-container">
          <h2 id="education-enquire-heading">Join a class</h2>
          <div className="button-row">
            <Link className="button button--primary" href="/contact">
              Contact us about learning
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
