import type { Metadata } from "next";
import Link from "next/link";

import {
  ApprovalCard,
  PublicShell,
  PublishedContentList,
  PublishedContentOmissionNotice,
  PublishedContentUnavailable,
} from "@/components/site";
import { HomeNextPrayerPanel } from "@/components/prayer/home-next-prayer-panel";
import { HomePrayerToday } from "@/components/prayer/home-prayer-today";
import { serviceCategories, SITE_DESCRIPTION } from "@/content/public-copy";
import { dateKeyInZone } from "@/lib/prayer/timezone";
import { getPublishedPrayerBundle } from "@/server/repositories/prayer";
import { getPublishedContent } from "@/server/repositories/public-content";
import {
  getPublicContactInformation,
  getPublicHomepageContent,
} from "@/server/repositories/public-site-settings";

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const featuredServiceIds = ["new-to-islam", "funerals", "imam"] as const;

export default async function HomePage() {
  const now = new Date();
  const todayKey = dateKeyInZone(now, "Europe/London");
  // Eight days always reaches the next Friday, so the standing Jumuʿah row
  // can be sourced from published data on any weekday.
  const [prayerBundle, updates, homepage, contact] = await Promise.all([
    getPublishedPrayerBundle(todayKey, 8),
    getPublishedContent(["news", "event"], { limit: 3 }),
    getPublicHomepageContent(),
    getPublicContactInformation(),
  ]);
  const todaySchedule =
    prayerBundle.status === "available"
      ? (prayerBundle.schedules.find((schedule) => schedule.date === todayKey) ?? null)
      : null;
  const featuredServices = serviceCategories.filter((category) =>
    (featuredServiceIds as readonly string[]).includes(category.id),
  );
  const address = contact
    ? [contact.address_line_1, contact.address_line_2, contact.locality, contact.postcode]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <PublicShell>
      <section className="home-hero">
        <div className="site-container home-hero__grid">
          <div className="home-hero__copy">
            {homepage.eyebrow && <p className="eyebrow eyebrow--hero">{homepage.eyebrow}</p>}
            <h1>{homepage.heading}</h1>
            <p className="home-hero__lead">{homepage.introduction}</p>
            <div className="button-row">
              {homepage.primary_cta_label && homepage.primary_cta_route && (
                <Link className="button button--primary" href={`/${homepage.primary_cta_route}`}>
                  {homepage.primary_cta_label}
                </Link>
              )}
              <Link className="button button--secondary" href="/services">
                Our services
              </Link>
            </div>
          </div>

          {prayerBundle.status === "available" && todaySchedule ? (
            <HomeNextPrayerPanel bundle={prayerBundle} now={now} />
          ) : (
            <aside className="hero-prayer" aria-label="Prayer times">
              <p className="hero-prayer__eyebrow">Prayer times</p>
              <p className="hero-prayer__name">Timetable</p>
              <p className="hero-prayer__unavailable">
                Prayer times are not currently available online.
              </p>
              <Link className="hero-prayer__link" href="/prayer-times" prefetch={false}>
                Prayer times page
              </Link>
            </aside>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="prayer-heading">
        <div className="site-container">
          <div className="section-heading">
            <p className="eyebrow">Prayer times</p>
            <h2 id="prayer-heading">Today&apos;s prayer times</h2>
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
                title="Friday prayer"
                description="Friday prayer information is not currently available online."
              />
            </div>
          )}
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="services-heading">
        <div className="site-container">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">How we can help</p>
              <h2 id="services-heading">Services</h2>
            </div>
            <p>
              From your first questions about Islam to family occasions and difficult days — you can
              always reach us.
            </p>
          </div>
          <div className="journey-grid">
            {featuredServices.map((category) => (
              <article className="journey-card" key={category.id}>
                <h3>{category.title}</h3>
                <p>{category.summary}</p>
                <Link className="text-link journey-card__link" href={`/services#${category.id}`}>
                  {category.action}
                </Link>
              </article>
            ))}
          </div>
          <p className="section-more">
            <Link className="text-link" href="/services">
              All services
            </Link>
          </p>
        </div>
      </section>

      {updates.status !== "empty" && (
        <section
          className="section"
          aria-label={updates.status === "unavailable" ? "News and events" : undefined}
          aria-labelledby={updates.status === "ready" ? "updates-heading" : undefined}
        >
          <div className="site-container">
            {updates.status === "unavailable" ? (
              <PublishedContentUnavailable subject="News and events" />
            ) : (
              <>
                <div className="section-heading">
                  <p className="eyebrow">What&apos;s on</p>
                  <h2 id="updates-heading">News and events</h2>
                </div>
                <PublishedContentList compact items={updates.items} />
                {updates.omittedCount > 0 && <PublishedContentOmissionNotice />}
                <p className="section-more">
                  <Link className="text-link" href="/news">
                    All news and events
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>
      )}

      <section className="section section--pine" aria-labelledby="find-us-heading">
        <div className="site-container home-find__grid">
          <div>
            <p className="eyebrow eyebrow--hero">Find us</p>
            <h2 id="find-us-heading">{address || "Craigavon Masjid"}</h2>
            <p className="home-find__lead">
              The masjid is open for the five daily prayers and Jumuʿah. New faces are always
              welcome — come as you are.
            </p>
            <div className="button-row">
              <Link className="button button--primary" href="/contact">
                Contact us
              </Link>
              <Link className="button button--secondary button--on-pine" href="/contact#visiting">
                Visiting the masjid
              </Link>
            </div>
          </div>
          {contact && (contact.public_phone || contact.public_email || contact.map_url) ? (
            <div className="home-find__details">
              {contact.public_phone ? (
                <p>
                  <span className="home-find__label">Phone</span>
                  <a href={`tel:${contact.public_phone.replaceAll(" ", "")}`}>
                    {contact.public_phone}
                  </a>
                </p>
              ) : null}
              {contact.public_email ? (
                <p>
                  <span className="home-find__label">Email</span>
                  <a href={`mailto:${contact.public_email}`}>{contact.public_email}</a>
                </p>
              ) : null}
              {contact.map_url ? (
                <p>
                  <span className="home-find__label">Map</span>
                  <a href={contact.map_url} rel="noreferrer noopener" target="_blank">
                    Open in Google Maps
                  </a>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </PublicShell>
  );
}
