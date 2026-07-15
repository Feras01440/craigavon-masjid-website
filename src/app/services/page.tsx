import type { Metadata } from "next";

import {
  EmptyState,
  PageIntro,
  PublicShell,
  PublishedContentList,
  PublishedContentOmissionNotice,
  PublishedContentStructuredData,
  PublishedContentUnavailable,
  PublishedFaqList,
  StatusPanel,
} from "@/components/site";
import { getPublishedContent } from "@/server/repositories/public-content";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Current publication status for services associated with the Muslim Association of Craigavon.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ServicesPage() {
  const [serviceContent, faqContent] = await Promise.all([
    getPublishedContent(["service"], { limit: 100 }),
    getPublishedContent(["faq"], { limit: 100 }),
  ]);
  const services = serviceContent.status === "ready" ? serviceContent.items : [];
  const faqs = faqContent.status === "ready" ? faqContent.items : [];
  let introTitle = "Services";
  let introDescription =
    "Current service information is listed with its availability and next step.";

  if (serviceContent.status === "unavailable") {
    introTitle = "Service publication status is unavailable";
    introDescription =
      "The website cannot currently verify the approved service register, so no fallback listing is shown.";
  } else if (services.length > 0) {
    introTitle = "Current services";
    introDescription = "Each listing states its scope, availability and practical next step.";
  }

  return (
    <PublicShell>
      {faqContent.status === "ready" && <PublishedContentStructuredData items={faqs} />}
      <PageIntro
        eyebrow="Services"
        title={introTitle}
        description={introDescription}
        current="Services"
      />

      <section className="section">
        <div className="site-container">
          {serviceContent.status === "unavailable" ? (
            <PublishedContentUnavailable subject="Current service information" />
          ) : serviceContent.status === "ready" &&
            services.length === 0 &&
            serviceContent.omittedCount > 0 ? (
            <PublishedContentOmissionNotice />
          ) : services.length === 0 ? (
            <EmptyState title="No services are currently listed online">
              <p>
                This does not necessarily mean that help is unavailable. No unconfirmed service or
                contact promise is shown here.
              </p>
            </EmptyState>
          ) : (
            <>
              <div className="section-heading">
                <p className="eyebrow">Current approved information</p>
                <h2>Published service listings</h2>
              </div>
              <PublishedContentList items={services} />
            </>
          )}
          {serviceContent.status === "ready" &&
            services.length > 0 &&
            serviceContent.omittedCount > 0 && <PublishedContentOmissionNotice />}
        </div>
      </section>

      {faqContent.status !== "empty" && (
        <section className="section section--tinted" aria-labelledby="service-faq-heading">
          <div className="site-container">
            <div className="section-heading">
              <p className="eyebrow">
                {faqContent.status === "unavailable" ? "Publication status" : "Approved answers"}
              </p>
              <h2 id="service-faq-heading">Frequently asked questions</h2>
            </div>
            {faqContent.status === "unavailable" ? (
              <PublishedContentUnavailable subject="Current frequently asked questions" />
            ) : (
              <>
                <PublishedFaqList items={faqs} />
                {faqContent.omittedCount > 0 && <PublishedContentOmissionNotice />}
              </>
            )}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="service-standard">
        <div className="site-container content-grid">
          <div className="prose">
            <p className="eyebrow">Listing information</p>
            <h2 id="service-standard">What each service listing explains</h2>
            <ul className="plain-list">
              <li>What the Association can and cannot provide</li>
              <li>Who the service is for and what information is needed</li>
              <li>Confirmed costs, venue and access details</li>
              <li>A monitored next step and realistic response expectation</li>
              <li>Clear urgent and emergency limitations</li>
            </ul>
          </div>
          <StatusPanel label="Current status" title="Online enquiries">
            <p>
              The enquiry form is not active. This website is not monitored as an emergency service;
              use the appropriate public emergency service when immediate help is needed.
            </p>
          </StatusPanel>
        </div>
      </section>
    </PublicShell>
  );
}
