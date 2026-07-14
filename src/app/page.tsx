import type { Metadata } from "next";
import Link from "next/link";

import {
  ApprovalCard,
  JourneyCard,
  PublicShell,
  PublishedContentList,
  PublishedContentOmissionNotice,
  PublishedContentUnavailable,
  StatusPanel,
} from "@/components/site";
import { HomePrayerSummary } from "@/components/prayer/home-prayer-summary";
import { publicJourneys, SITE_DESCRIPTION, SITE_NAME } from "@/content/public-copy";
import { dateKeyInZone } from "@/lib/prayer/timezone";
import { getPublishedPrayerBundle } from "@/server/repositories/prayer";
import { getPublishedContent } from "@/server/repositories/public-content";

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const now = new Date();
  const [prayerBundle, updates] = await Promise.all([
    getPublishedPrayerBundle(dateKeyInZone(now, "Europe/London"), 2),
    getPublishedContent(["news", "event"], { limit: 3 }),
  ]);
  return (
    <PublicShell>
      <section className="home-hero">
        <div className="site-container home-hero__grid">
          <div className="home-hero__copy">
            <p className="eyebrow">Public information</p>
            <h1>{SITE_NAME}</h1>
            <p className="home-hero__lead">
              Prayer, visiting and community information appears here only after an accountable
              Association source has checked and approved it.
            </p>
            <div className="button-row">
              <Link className="button button--primary" href="/prayer-times">
                View prayer times
              </Link>
              <Link className="button button--secondary" href="/about">
                About the Association
              </Link>
            </div>
          </div>

          <aside className="publication-note" aria-labelledby="publication-standard">
            <p className="publication-note__label">Information standard</p>
            <h2 id="publication-standard">Clear, checked information</h2>
            <ul>
              <li>Confirmed by an accountable source</li>
              <li>Dated when information can change</li>
              <li>Clear about what to do next</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="section" aria-labelledby="prayer-heading">
        <div className="site-container">
          <div className="section-heading">
            <p className="eyebrow">Prayer information</p>
            <h2 id="prayer-heading">Approved prayer information only</h2>
            <p>
              Prayer times are religiously and operationally sensitive. The source, calculation
              settings and congregation arrangements must be approved before a time appears here.
            </p>
          </div>
          {prayerBundle.status === "available" ? (
            <HomePrayerSummary bundle={prayerBundle} now={now} />
          ) : (
            <div className="approval-grid">
              <ApprovalCard
                title="Daily prayer times"
                description="Start and congregational times are withheld while the committee reviews the source and settings."
              />
              <ApprovalCard
                title="Friday prayer information"
                description="No Friday session time is public until its effective date and approver are recorded."
              />
            </div>
          )}
        </div>
      </section>

      {updates.status !== "empty" && (
        <section
          className="section section--tinted"
          aria-label={updates.status === "unavailable" ? "Latest notices and events" : undefined}
          aria-labelledby={updates.status === "ready" ? "updates-heading" : undefined}
        >
          <div className="site-container">
            {updates.status === "unavailable" ? (
              <PublishedContentUnavailable subject="Latest notices and events" />
            ) : (
              <>
                <div className="section-heading section-heading--split">
                  <div>
                    <p className="eyebrow">Latest approved updates</p>
                    <h2 id="updates-heading">Notices and events</h2>
                  </div>
                  <p>
                    The publication date is shown on each entry. Read the approved text for any
                    event date or action.
                  </p>
                </div>
                <PublishedContentList compact items={updates.items} />
                {updates.omittedCount > 0 && <PublishedContentOmissionNotice />}
                <p>
                  <Link className="text-link" href="/news">
                    View all approved updates
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>
      )}

      <section className="section section--tinted" aria-labelledby="journeys-heading">
        <div className="site-container">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">Common tasks</p>
              <h2 id="journeys-heading">Start with what you need</h2>
            </div>
            <p>
              Each page distinguishes confirmed information from details that still require
              committee approval.
            </p>
          </div>
          <div className="journey-grid">
            {publicJourneys.map((journey) => (
              <JourneyCard key={journey.href} {...journey} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--compact">
        <div className="site-container">
          <StatusPanel title="More information is being confirmed">
            <p>
              Any contact details, directions, facilities, services, events, classes or policies not
              shown in an approved section remain unconfirmed and will appear only after the
              Association verifies them for public use.
            </p>
          </StatusPanel>
        </div>
      </section>
    </PublicShell>
  );
}
