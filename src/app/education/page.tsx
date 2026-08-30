import type { Metadata } from "next";
import Link from "next/link";

import {
  EmptyState,
  PageIntro,
  PublicShell,
  PublishedContentList,
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

      <section className="section">
        <div className="site-container">
          {content.status === "unavailable" ? (
            <PublishedContentUnavailable subject="Class information" />
          ) : programmes.length === 0 ? (
            <EmptyState title="Class times will be announced here">
              <p>
                Details of current classes are being prepared. In the meantime, contact us and
                we&apos;ll let you know what is running and how to join.
              </p>
            </EmptyState>
          ) : (
            <>
              <div className="section-heading">
                <p className="eyebrow">Current programmes</p>
                <h2>Classes and programmes</h2>
              </div>
              <PublishedContentList items={programmes} />
              {content.omittedCount > 0 && <PublishedContentOmissionNotice />}
            </>
          )}
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="education-enquire-heading">
        <div className="site-container content-grid">
          <div className="prose">
            <p className="eyebrow">Joining a class</p>
            <h2 id="education-enquire-heading">Interested for yourself or your child?</h2>
            <p>
              Tell us who the learning is for and what you are looking for — Qur&apos;an reading,
              memorisation or Islamic studies — and we&apos;ll come back to you with what is
              available.
            </p>
            <Link className="text-link" href="/contact">
              Contact us about learning
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
