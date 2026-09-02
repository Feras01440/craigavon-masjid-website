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
                <Link href="/contact">Contact us</Link> to ask what is running.
              </p>
            </EmptyState>
          ) : (
            <>
              <PublishedContentList items={programmes} />
              {content.omittedCount > 0 && <PublishedContentOmissionNotice />}
            </>
          )}
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="education-enquire-heading">
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
