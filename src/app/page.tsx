import type { Metadata } from "next";
import Link from "next/link";

import {
  ApprovalCard,
  PublicShell,
  PublishedContentList,
  PublishedContentOmissionNotice,
  PublishedContentUnavailable,
  PublishedFaqList,
  ServiceIcon,
} from "@/components/site";
import { DayArc } from "@/components/prayer/day-arc";
import { HomeNextPrayerPanel } from "@/components/prayer/home-next-prayer-panel";
import { TodayTable } from "@/components/prayer/today-table";
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

// ISR: the CDN serves this page and rebuilds it at most once a minute (and
// immediately after any committee publish via revalidateTag/Path). Live
// next-prayer behaviour is client-side, so cached HTML never goes stale for
// the reader. See docs/architecture/ADR-003-public-caching.md.
export const revalidate = 60;

const featuredServiceIds = ["new-to-islam", "funerals", "education"] as const;

export default async function HomePage() {
  const now = new Date();
  const todayKey = dateKeyInZone(now, "Europe/London");
  // Eight days always reaches the next Friday, so the standing Jumuʿah row
  // can be sourced from published data on any weekday.
  const [prayerBundle, updates, faqs, homepage, contact] = await Promise.all([
    // Transient fetch failures throw so a failed ISR regeneration keeps the
    // last good page instead of caching an apology card.
    getPublishedPrayerBundle(todayKey, 8, { throwOnTransientError: true }),
    getPublishedContent(["news", "event"], { limit: 3 }),
    getPublishedContent(["faq"], { limit: 3 }),
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
      {/* React hoists these into <head>; the hero artwork is the page's
          largest paint, so the browser starts it before the stylesheet. */}
      <link
        rel="preload"
        as="image"
        type="image/avif"
        href="/images/backdrop-gold-dome-1920.avif"
        media="(min-width: 52.01rem)"
      />
      <link
        rel="preload"
        as="image"
        type="image/avif"
        href="/images/backdrop-gold-dome-960.avif"
        media="(max-width: 52rem)"
      />
      <section className="home-hero">
        <div className="home-hero__backdrop" aria-hidden="true" />
        <div className="site-container home-hero__grid">
          <div className="home-hero__copy">
            <p className="home-hero__salam" lang="ar" dir="rtl">
              ٱلسَّلَامُ عَلَيْكُمْ
            </p>
            {homepage.eyebrow && <p className="eyebrow eyebrow--hero">{homepage.eyebrow}</p>}
            <h1>{homepage.heading}</h1>
            {homepage.introduction && <p className="home-hero__lead">{homepage.introduction}</p>}
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
            <HomeNextPrayerPanel
              schedules={prayerBundle.schedules}
              initialNowIso={now.toISOString()}
            />
          ) : (
            <aside className="hero-prayer" aria-label="Prayer times">
              <p className="hero-prayer__eyebrow">Prayer times</p>
              <p className="hero-prayer__name">Timetable</p>
              <p className="hero-prayer__unavailable">
                Today&apos;s timetable is not online right now.
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
            <h2 id="prayer-heading">Today&apos;s prayer times</h2>
          </div>
          {prayerBundle.status === "available" && todaySchedule ? (
            <>
              <DayArc today={todaySchedule} initialNowIso={now.toISOString()} />
              <TodayTable
                schedules={prayerBundle.schedules}
                today={todaySchedule}
                initialNowIso={now.toISOString()}
              />
            </>
          ) : (
            <ApprovalCard
              title="Daily prayer times"
              description="Prayer times are not currently available online — please check with the masjid."
            />
          )}
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="services-heading">
        <div className="site-container">
          <div className="section-heading" data-reveal>
            <h2 id="services-heading">How we can help</h2>
          </div>
          <div className="journey-grid">
            {featuredServices.map((category, index) => (
              <article
                className="journey-card"
                key={category.id}
                data-reveal
                style={{ "--reveal-delay": `${index * 90}ms` } as React.CSSProperties}
              >
                <ServiceIcon serviceId={category.id} />
                <h3>{category.title}</h3>
                <p>{category.summary}</p>
                {category.epigraph ? (
                  <p className="epigraph">
                    <span className="epigraph__arabic" lang="ar" dir="rtl">
                      {category.epigraph.arabic}
                    </span>
                    <span className="epigraph__english">{category.epigraph.english}</span>
                  </p>
                ) : null}
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
                <div className="section-heading" data-reveal>
                  <h2 id="updates-heading">News and events</h2>
                </div>
                <div data-reveal>
                  <PublishedContentList compact items={updates.items} />
                </div>
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

      {faqs.status === "ready" && faqs.items.length > 0 ? (
        <section className="section section--tinted" aria-labelledby="faq-heading">
          <div className="site-container">
            <div className="section-heading" data-reveal>
              <h2 id="faq-heading">Common questions</h2>
            </div>
            <div data-reveal>
              <PublishedFaqList items={faqs.items} />
            </div>
            <p className="section-more">
              <Link className="text-link" href="/services#service-faq-heading">
                All questions
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      <section className="section section--pine section--photo" aria-labelledby="find-us-heading">
        <div className="site-container home-find__grid">
          <div>
            <h2 id="find-us-heading">Find us at the Legahory Centre</h2>
            <div className="button-row">
              <Link className="button button--primary" href="/contact">
                Contact us
              </Link>
              <Link className="button button--secondary button--on-pine" href="/contact#visiting">
                Visiting the masjid
              </Link>
            </div>
          </div>
          {contact &&
          (address || contact.public_phone || contact.public_email || contact.map_url) ? (
            <div className="home-find__details">
              {address ? (
                <p>
                  <span className="home-find__label">Address</span>
                  <span className="home-find__address">{address}</span>
                </p>
              ) : null}
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
