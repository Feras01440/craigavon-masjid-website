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
  let introTitle = "Service details are being confirmed";
  let introDescription =
    "No ceremony, bereavement, welfare, appointment or other support service is listed until its availability, limits and contact route are approved.";

  if (serviceContent.status === "unavailable") {
    introTitle = "Service publication status is unavailable";
    introDescription =
      "The website cannot currently verify the approved service register, so no fallback listing is shown.";
  } else if (services.length > 0) {
    introTitle = "Approved service information";
    introDescription =
      "Only services that passed the publication workflow are listed. Each approved entry states its current scope and next step.";
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
            <EmptyState title="No services are approved for public listing yet">
              <p>
                This does not mean that help is unavailable. It means the website cannot yet make a
                reliable promise about what is offered, when it is available or who monitors an
                enquiry.
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
            <p className="eyebrow">Before publication</p>
            <h2 id="service-standard">Every service page must be practical</h2>
            <ul className="plain-list">
              <li>What the Association can and cannot provide</li>
              <li>Who the service is for and what information is needed</li>
              <li>Confirmed costs, venue and access details</li>
              <li>A monitored next step and realistic response expectation</li>
              <li>Clear urgent and emergency limitations</li>
            </ul>
          </div>
          <StatusPanel title="Forms remain unavailable">
            <p>
              Public enquiry forms will stay off until recipients, validation, privacy, retention,
              safeguarding and spam controls are approved. This website is not monitored as an
              emergency service.
            </p>
          </StatusPanel>
        </div>
      </section>
    </PublicShell>
  );
}
