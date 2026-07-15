import type { Metadata } from "next";

import {
  EmptyState,
  PageIntro,
  PublicShell,
  PublishedContentList,
  PublishedContentOmissionNotice,
  PublishedContentUnavailable,
  StatusPanel,
} from "@/components/site";
import { getPublishedContent } from "@/server/repositories/public-content";

export const metadata: Metadata = {
  title: "Learning",
  description:
    "Publication status for education and learning information from the Muslim Association of Craigavon.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EducationPage() {
  const content = await getPublishedContent(["education"], { limit: 100 });
  const programmes = content.status === "ready" ? content.items : [];
  let introTitle = "Learning information";
  let introDescription = "Current classes and recurring programmes are listed when available.";

  if (content.status === "unavailable") {
    introTitle = "Learning publication status is unavailable";
    introDescription =
      "The website cannot currently verify the approved learning register, so no fallback programme details are shown.";
  } else if (programmes.length > 0) {
    introTitle = "Learning and recurring programmes";
    introDescription =
      "Read the current audience, schedule and registration information for each listing.";
  }

  return (
    <PublicShell>
      <PageIntro
        eyebrow="Learning"
        title={introTitle}
        description={introDescription}
        current="Learning"
      />

      <section className="section">
        <div className="site-container">
          {content.status === "unavailable" ? (
            <PublishedContentUnavailable subject="Current learning information" />
          ) : programmes.length === 0 ? (
            <EmptyState title="No learning programmes are currently listed">
              <p>Please check again later. Old timetables are not reused as current information.</p>
            </EmptyState>
          ) : (
            <>
              <div className="section-heading">
                <p className="eyebrow">Current approved information</p>
                <h2>Published learning listings</h2>
              </div>
              <PublishedContentList items={programmes} />
              {content.omittedCount > 0 && <PublishedContentOmissionNotice />}
            </>
          )}
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="learning-details">
        <div className="site-container content-grid">
          <div className="prose">
            <p className="eyebrow">Listing information</p>
            <h2 id="learning-details">What each programme listing explains</h2>
            <ul className="plain-list">
              <li>Audience, age range and any prerequisite</li>
              <li>Day, time, term dates, capacity and cost</li>
              <li>Venue and access arrangements</li>
              <li>Registration process and responsible contact</li>
              <li>Safeguarding and privacy information</li>
            </ul>
          </div>
          <StatusPanel title="Children's data is not being collected">
            <p>
              No public registration form is active. A safeguarding-compliant process must be
              approved before the website requests information about a child.
            </p>
          </StatusPanel>
        </div>
      </section>
    </PublicShell>
  );
}
