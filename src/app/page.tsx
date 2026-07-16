import type { Metadata } from "next";
import Link from "next/link";

import {
  ApprovalCard,
  JourneyCard,
  PublicShell,
  PublishedContentList,
  PublishedContentOmissionNotice,
  PublishedContentUnavailable,
} from "@/components/site";
import { HomePrayerToday } from "@/components/prayer/home-prayer-today";
import { publicJourneys, SITE_DESCRIPTION } from "@/content/public-copy";
import { dateKeyInZone } from "@/lib/prayer/timezone";
import { getPublishedPrayerBundle } from "@/server/repositories/prayer";
import { getPublishedContent } from "@/server/repositories/public-content";
import { getPublicHomepageContent } from "@/server/repositories/public-site-settings";

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const now = new Date();
  const todayKey = dateKeyInZone(now, "Europe/London");
  // Eight days always reaches the next Friday, so the standing Jumuʿah row
  // can be sourced from published data on any weekday.
  const [prayerBundle, updates, homepage] = await Promise.all([
    getPublishedPrayerBundle(todayKey, 8),
    getPublishedContent(["news", "event"], { limit: 3 }),
    getPublicHomepageContent(),
  ]);
  const todaySchedule =
    prayerBundle.status === "available"
      ? (prayerBundle.schedules.find((schedule) => schedule.date === todayKey) ?? null)
      : null;
  return (
    <PublicShell>
      <section className="home-hero">
        <div className="site-container home-hero__grid">
          <div className="home-hero__copy">
            {homepage.eyebrow && <p className="eyebrow">{homepage.eyebrow}</p>}
            <h1>{homepage.heading}</h1>
            <p className="home-hero__lead">{homepage.introduction}</p>
            <div className="button-row">
              {homepage.primary_cta_label && homepage.primary_cta_route && (
                <Link className="button button--primary" href={`/${homepage.primary_cta_route}`}>
                  {homepage.primary_cta_label}
                </Link>
              )}
              {homepage.secondary_cta_label && homepage.secondary_cta_route && (
                <Link
                  className="button button--secondary"
                  href={`/${homepage.secondary_cta_route}`}
                >
                  {homepage.secondary_cta_label}
                </Link>
              )}
            </div>
          </div>

          <aside className="publication-note" aria-labelledby="publication-standard">
            <p className="publication-note__label">Essentials</p>
            <h2 id="publication-standard">{homepage.information_heading}</h2>
            <ul>
              {homepage.information_points.filter(Boolean).map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="section" aria-labelledby="prayer-heading">
        <div className="site-container">
          <div className="section-heading">
            <p className="eyebrow">Prayer information</p>
            <h2 id="prayer-heading">Today&apos;s prayer times</h2>
            <p>
              Published times include their source and last update. If no approved timetable is
              active, the website does not estimate congregation times.
            </p>
          </div>
          {prayerBundle.status === "available" && todaySchedule ? (
            <HomePrayerToday bundle={prayerBundle} today={todaySchedule} now={now} />
          ) : (
            <div className="approval-grid">
              <ApprovalCard
                title="Daily prayer times"
                description="Prayer times are not currently available online. Please use a confirmed local source before travelling."
              />
              <ApprovalCard
                title="Friday prayer information"
                description="Friday session information is not currently available online."
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
                    <p className="eyebrow">Latest updates</p>
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
                    View all updates
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
            <p>Use these direct routes for the information most visitors need.</p>
          </div>
          <div className="journey-grid">
            {publicJourneys.map((journey) => (
              <JourneyCard key={journey.href} {...journey} />
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
