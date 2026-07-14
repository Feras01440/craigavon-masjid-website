import type { Metadata } from "next";

import {
  EmptyState,
  PageIntro,
  PublicShell,
  PublishedContentList,
  PublishedContentOmissionNotice,
  PublishedContentStructuredData,
  PublishedContentUnavailable,
} from "@/components/site";
import { getPublishedContent } from "@/server/repositories/public-content";

export const metadata: Metadata = {
  title: "News",
  description: "Approved announcements and events from the Muslim Association of Craigavon.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewsPage() {
  const content = await getPublishedContent(["news", "event"], { limit: 100 });

  return (
    <PublicShell>
      {content.status === "ready" && <PublishedContentStructuredData items={content.items} />}
      <PageIntro
        eyebrow="News"
        title="Announcements and events"
        description="Only current, dated notices approved by a responsible editor will be shown here."
        current="News"
      />

      <section className="section">
        <div className="site-container">
          {content.status === "unavailable" ? (
            <PublishedContentUnavailable subject="Current notices and events" />
          ) : content.status === "empty" ? (
            <EmptyState title="There are no approved notices or events">
              <p>
                No fictional event or inherited announcement has been added to fill this space. Once
                publishing begins, notices will show publication and update times and will stop
                appearing after any approved expiry.
              </p>
            </EmptyState>
          ) : (
            <>
              <div className="section-heading">
                <p className="eyebrow">Current approved information</p>
                <h2>Published notices and events</h2>
                <p>
                  The date shown is the publication date. Any event date or practical arrangement is
                  stated in the approved item itself.
                </p>
              </div>
              <PublishedContentList items={content.items} />
              {content.omittedCount > 0 && <PublishedContentOmissionNotice />}
            </>
          )}
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="news-standard">
        <div className="site-container">
          <div className="section-heading">
            <p className="eyebrow">Publishing standard</p>
            <h2 id="news-standard">A notice should answer four questions</h2>
          </div>
          <ol className="numbered-principles">
            <li>
              <span>01</span>
              <div>
                <h3>What changed?</h3>
                <p>Use a specific title and describe the practical effect.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>When?</h3>
                <p>Give the full date, time, timezone and effective period.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Who approved it?</h3>
                <p>Prayer and urgent notices require an authorised approver.</p>
              </div>
            </li>
            <li>
              <span>04</span>
              <div>
                <h3>What next?</h3>
                <p>State the action, registration route or calm fallback.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </PublicShell>
  );
}
