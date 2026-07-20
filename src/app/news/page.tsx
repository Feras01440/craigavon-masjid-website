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
  description: "News, announcements and events from Craigavon Masjid.",
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
        title="News and events"
        description="Announcements, events and what's happening at the masjid."
        current="News"
      />

      <section className="section">
        <div className="site-container">
          {content.status === "unavailable" ? (
            <PublishedContentUnavailable subject="News and events" />
          ) : content.status === "empty" ? (
            <EmptyState title="Nothing is on the noticeboard right now">
              <p>Announcements and events appear here as they are published — check back soon.</p>
            </EmptyState>
          ) : (
            <>
              <PublishedContentList items={content.items} />
              {content.omittedCount > 0 && <PublishedContentOmissionNotice />}
            </>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
