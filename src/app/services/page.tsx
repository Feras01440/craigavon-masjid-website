import type { Metadata } from "next";
import Link from "next/link";

import {
  PageIntro,
  PublicShell,
  PublishedContentList,
  PublishedContentOmissionNotice,
  PublishedContentStructuredData,
  PublishedContentUnavailable,
  PublishedFaqList,
} from "@/components/site";
import { serviceCategories } from "@/content/public-copy";
import { getPublishedContent } from "@/server/repositories/public-content";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Shahada and new Muslim support, Islamic funerals, Nikah, speaking with the imam, education and visits at Craigavon Masjid.",
};

// ISR: shared-cached for five minutes; purged instantly on publish.
export const revalidate = 300;

export default async function ServicesPage() {
  const [serviceContent, faqContent] = await Promise.all([
    getPublishedContent(["service"], { limit: 100 }),
    getPublishedContent(["faq"], { limit: 100 }),
  ]);
  const services = serviceContent.status === "ready" ? serviceContent.items : [];
  const faqs = faqContent.status === "ready" ? faqContent.items : [];

  return (
    <PublicShell>
      {faqContent.status === "ready" && <PublishedContentStructuredData items={faqs} />}
      <PageIntro
        eyebrow="Services"
        title="How we can help"
        description="From your first questions about Islam to weddings, funerals and learning — these are the ways the masjid serves the community."
        current="Services"
      />

      <section className="section" aria-label="Services offered by the masjid">
        <div className="site-container">
          <div className="service-list">
            {serviceCategories.map((category) => (
              <article
                className="service-item"
                id={category.id}
                key={category.id}
                aria-labelledby={`${category.id}-heading`}
              >
                <div className="service-item__body">
                  <h2 id={`${category.id}-heading`}>{category.title}</h2>
                  <p>{category.summary}</p>
                  <ul className="plain-list">
                    {category.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div className="service-item__action">
                  <Link
                    className="button button--primary"
                    href={category.id === "education" ? "/education" : "/contact"}
                  >
                    {category.action}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {serviceContent.status === "unavailable" ? (
        <section className="section section--tinted">
          <div className="site-container">
            <PublishedContentUnavailable subject="Service updates" />
          </div>
        </section>
      ) : services.length > 0 ? (
        <section className="section section--tinted" aria-labelledby="service-updates-heading">
          <div className="site-container">
            <div className="section-heading">
              <p className="eyebrow">Current updates</p>
              <h2 id="service-updates-heading">Service updates</h2>
            </div>
            <PublishedContentList items={services} />
            {serviceContent.omittedCount > 0 && <PublishedContentOmissionNotice />}
          </div>
        </section>
      ) : null}

      {faqContent.status !== "empty" && (
        <section className="section section--tinted" aria-labelledby="service-faq-heading">
          <div className="site-container">
            <div className="section-heading">
              <p className="eyebrow">Good to know</p>
              <h2 id="service-faq-heading">Frequently asked questions</h2>
            </div>
            {faqContent.status === "unavailable" ? (
              <PublishedContentUnavailable subject="Frequently asked questions" />
            ) : (
              <>
                <PublishedFaqList items={faqs} />
                {faqContent.omittedCount > 0 && <PublishedContentOmissionNotice />}
              </>
            )}
          </div>
        </section>
      )}

      <section className="section section--compact" aria-label="General enquiries">
        <div className="site-container">
          <p className="service-footnote">
            Not sure where to start? Contact us anyway — we&apos;ll point you to the right person,
            and conversations are always private.{" "}
            <Link className="text-link" href="/contact">
              Contact the masjid
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
